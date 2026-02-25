from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from database import get_db
from models import AuditLog, Subsidy, User
from schemas import UserResponse
from datetime import datetime, timedelta
from typing import List, Dict, Optional

router = APIRouter(prefix="/api/admin", tags=["管理者機能"])

# ============================================================
# 権限チェック依存関係
# ============================================================

def check_admin(x_user_id: Optional[str] = Header(None, alias="X-User-ID"), db: Session = Depends(get_db)):
    """ヘッダーからユーザーを特定し、管理者ロールを持っているかチェックする"""
    if not x_user_id:
        raise HTTPException(status_code=401, detail="認証が必要です (UserID Missing)")
    
    user = db.query(User).filter(User.id == x_user_id).first()
    if not user or user.role != "admin":
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
