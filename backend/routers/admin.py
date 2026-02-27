from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from database import get_db
from models import AuditLog, Subsidy, User, Invitation, SystemSetting
from schemas import UserResponse, InvitationCreate, InvitationResponse, SystemSettingResponse, SystemSettingsBulkUpdate
from datetime import datetime, timedelta
import os
from typing import List, Dict, Optional

router = APIRouter(prefix="/api/admin", tags=["管理者機能"])

# ============================================================
# 権限チェック依存関係
# ============================================================

def check_admin(
    x_user_id: Optional[str] = Header(None, alias="X-User-ID"),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    db: Session = Depends(get_db)
):
    """ヘッダーからユーザーを特定し、管理者ロールを持っているかチェックする"""
    if not x_user_id and not x_user_email:
        raise HTTPException(status_code=401, detail="認証が必要です (UserID/Email Missing)")
    
    # God Mode 固定IDの直通
    SUPER_ADMIN_EMAIL = "y.wakata.linkdesign@gmail.com"
    if x_user_id == "super-admin-fixed-id" or (x_user_email and x_user_email.lower().strip() == SUPER_ADMIN_EMAIL):
        return User(id="super-admin-fixed-id", email=SUPER_ADMIN_EMAIL, role="admin", is_approved=True)

    # まずIDで検索
    user = None
    if x_user_id:
        user = db.query(User).filter(User.id == x_user_id).first()
    
    # IDで見つからなければメールで検索（Google OAuth IDとDB UUIDの不一致対策）
    if not user and x_user_email:
        user = db.query(User).filter(User.email.ilike(x_user_email.lower().strip())).first()

    if not user or user.role != "admin":
        print(f"[AUTH_DEBUG] Admin check failed - ID: {x_user_id}, Email: {x_user_email}")
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    return user

# ============================================================
# ユーザー管理
# ============================================================

@router.get("/users", response_model=List[UserResponse])
def list_users(db: Session = Depends(get_db), admin: User = Depends(check_admin)):
    """システム全ユーザーの一覧を取得"""
    return db.query(User).order_by(User.created_at.desc()).all()

@router.post("/users/{user_id}/approve", response_model=UserResponse)
def approve_user(user_id: str, db: Session = Depends(get_db), admin: User = Depends(check_admin)):
    """ユーザーを承認する"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    
    user.is_approved = True
    db.commit()
    db.refresh(user)
    
    log = AuditLog(actor_type="HUMAN", actor_id=admin.id, action="APPROVE", target_entity=f"user:{user.email}")
    db.add(log)
    db.commit()
    return user

@router.post("/users/{user_id}/reject", response_model=UserResponse)
def reject_user(user_id: str, db: Session = Depends(get_db), admin: User = Depends(check_admin)):
    """ユーザーの承認を取り下げる（拒否）"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    
    user.is_approved = False
    db.commit()
    db.refresh(user)
    
    log = AuditLog(actor_type="HUMAN", actor_id=admin.id, action="REJECT", target_entity=f"user:{user.email}")
    db.add(log)
    db.commit()
    return user


# ============================================================
# システム統計・ログ
# ============================================================

@router.get("/stats/overview")
def get_system_stats(db: Session = Depends(get_db), admin: User = Depends(check_admin)):
    """システム全体の統計情報を取得"""
    now = datetime.utcnow()
    last_24h = now - timedelta(days=1)
    
    # クローラーログの集計
    sync_logs = db.query(AuditLog).filter(
        AuditLog.actor_id == "subsidy_crawler",
        AuditLog.created_at >= last_24h
    ).all()
    
    # AI処理ログの集計 (ai_service などから)
    ai_logs = db.query(AuditLog).filter(
        AuditLog.action.in_(["ANALYZE", "GENERATE"]),
        AuditLog.created_at >= last_24h
    ).all()
    
    return {
        "crawler": {
            "last_sync": sync_logs[0].created_at if sync_logs else None,
            "sync_count_24h": len(sync_logs),
            "status": "HEALTHY" if len(sync_logs) > 0 else "WARNING"
        },
        "ai_usage": {
            "total_calls_24h": len(ai_logs),
            "estimated_token_usage": len(ai_logs) * 1500  # 簡易的な推定
        },
        "db": {
            "total_subsidies": db.query(Subsidy).count(),
            "active_subsidies": db.query(Subsidy).filter(Subsidy.status == "PUBLISHED").count()
        }
    }

@router.get("/logs")
def get_logs(limit: int = 50, db: Session = Depends(get_db), admin: User = Depends(check_admin)):
    """システム全体の監査ログを取得"""
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return logs

@router.post("/crawler/run")
async def run_crawler_manually(db: Session = Depends(get_db), admin: User = Depends(check_admin)):
    """手動でクローラーを実行 (jGrants同期)"""
    from services.subsidy_crawler import fetch_from_jgrants_and_sync
    result = await fetch_from_jgrants_and_sync(db)
    return result


# ============================================================
# 招待管理 (Invitations)
# ============================================================

@router.get("/invitations/", response_model=List[InvitationResponse])
def list_invitations(db: Session = Depends(get_db), admin: User = Depends(check_admin)):
    """招待リストを取得"""
    return db.query(Invitation).order_by(Invitation.created_at.desc()).all()

@router.post("/invitations/", response_model=InvitationResponse)
def create_invitation(data: InvitationCreate, db: Session = Depends(get_db), admin: User = Depends(check_admin)):
    """新規ユーザーを招待（事前承認リストに追加）"""
    email = data.email.lower().strip()
    
    # 重複チェック
    existing = db.query(Invitation).filter(Invitation.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="このメールアドレスは既に招待済みです")
    
    # 既にユーザーとして存在するかチェック
    user = db.query(User).filter(User.email == email).first()
    if user and user.is_approved:
        raise HTTPException(status_code=400, detail="このユーザーは既に承認済みです")

    new_invitation = Invitation(
        email=email,
        invited_by=admin.id
    )
    db.add(new_invitation)
    db.commit()
    db.refresh(new_invitation)

    # 招待メールの送信
    from services.email_service import email_service
    email_service.send_invitation_email(email, admin.name or "管理者")
    
    log = AuditLog(actor_type="HUMAN", actor_id=admin.id, action="INVITE", target_entity=f"invite:{email}")
    db.add(log)
    db.commit()
    
    return new_invitation

@router.delete("/invitations/{invitation_id}/")
def delete_invitation(invitation_id: str, db: Session = Depends(get_db), admin: User = Depends(check_admin)):
    """招待を取り消す"""
    inv = db.query(Invitation).filter(Invitation.id == invitation_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="招待が見つかりません")
    
    email = inv.email
    db.delete(inv)
    
    log = AuditLog(actor_type="HUMAN", actor_id=admin.id, action="REVOKE_INVITE", target_entity=f"invite:{email}")
    db.add(log)
    db.commit()
    
    return {"message": "招待を取り消しました"}


# ============================================================
# システム設定 (System Settings)
# ============================================================

@router.get("/settings", response_model=List[SystemSettingResponse])
def list_system_settings(db: Session = Depends(get_db), admin: User = Depends(check_admin)):
    """全システム設定を取得"""
    settings = db.query(SystemSetting).all()
    
    # デフォルト値の定義
    defaults = {
        "openai_api_key": {"value": os.environ.get("OPENAI_API_KEY", ""), "description": "OpenAI API Key (ChatGPT 5.2/4o)"},
        "ai_model_main": {"value": "gpt-5.2", "description": "メイン推論・品質評価モデル"},
        "ai_model_sub": {"value": "gpt-4o", "description": "高速生成・サマリー用モデル"},
        "crawler_interval_hours": {"value": 24, "description": "クローラー実行間隔(時間)"},
        "system_notice": {"value": "", "description": "システム全体のお知らせメッセージ"}
    }
    
    # DBにない項目をデフォルト値で補完（DBに保存してIDを振る）
    db_keys = {s.key for s in settings}
    new_settings = []
    for key, info in defaults.items():
        if key not in db_keys:
            new_setting = SystemSetting(key=key, value=info["value"], description=info["description"])
            db.add(new_setting)
            new_settings.append(new_setting)
            
    if new_settings:
        db.commit()
        for s in new_settings:
            db.refresh(s)
            settings.append(s)
            
    return settings

@router.post("/settings", response_model=List[SystemSettingResponse])
def update_system_settings(data: SystemSettingsBulkUpdate, db: Session = Depends(get_db), admin: User = Depends(check_admin)):
    """システム設定を一括更新"""
    results = []
    for s_data in data.settings:
        setting = db.query(SystemSetting).filter(SystemSetting.key == s_data.key).first()
        if not setting:
            setting = SystemSetting(key=s_data.key)
            db.add(setting)
        
        setting.value = s_data.value
        if s_data.description:
            setting.description = s_data.description
        
        results.append(setting)
    
    db.commit()
    for r in results:
        db.refresh(r)
        
    log = AuditLog(actor_type="HUMAN", actor_id=admin.id, action="UPDATE_SETTINGS", target_entity="system:settings")
    db.add(log)
    db.commit()
    
    return results
