from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Invitation
from schemas import UserCreate, UserResponse

router = APIRouter(prefix="/api/users", tags=["ユーザー管理"])

@router.post("/", response_model=UserResponse)
def create_or_get_user(data: UserCreate, db: Session = Depends(get_db)):
    """Googleログイン時のユーザー情報をもとに、DBにユーザーが存在しなければ作成し、存在すれば返す"""
    email_lower = data.email.lower().strip()
    user = db.query(User).filter(User.email.ilike(email_lower)).first()
    
    # 最高管理者のメールアドレス (小文字で比較)
    SUPER_ADMIN_EMAIL = "y.wakata.linkdesign@gmail.com".lower()
    
    print(f"[AUTH_DEBUG] Incoming login: {email_lower}")
    
    if user:
        # 最高管理者の場合は常に管理者ロールと承認済み状態を維持
        if user.email.lower() == SUPER_ADMIN_EMAIL:
            print(f"[AUTH_DEBUG] Super Admin detected (existing): {user.email}")
            user.role = "admin"
            user.is_approved = True
            
        # Update name and picture if changed
        if data.name and user.name != data.name:
            user.name = data.name
        if data.picture and user.picture != data.picture:
            user.picture = data.picture
        db.commit()
        db.refresh(user)
        return user
    
    # 招待リストに含まれているかチェック
    invitation = db.query(Invitation).filter(Invitation.email == email_lower).first()
    is_invited = invitation is not None
    
    # Create new user
    is_super = email_lower == SUPER_ADMIN_EMAIL
    if is_super:
        print(f"[AUTH_DEBUG] Super Admin detected (new): {email_lower}")
        
    new_user = User(
        email=data.email,
        name=data.name,
        picture=data.picture,
        role="admin" if is_super else "client",
        is_approved=True if (is_super or is_invited) else False
    )
    db.add(new_user)
    db.commit()
    
    # 招待されていた場合は、招待ステータスを更新（削除はしない）
    if is_invited:
        print(f"[AUTH_DEBUG] User was invited: {email_lower}. Marking as accepted.")
        invitation.status = "accepted"
        db.commit()
        
    db.refresh(new_user)
    return new_user

@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: str, db: Session = Depends(get_db)):
    """ユーザーIDからユーザー情報を取得"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    return user
