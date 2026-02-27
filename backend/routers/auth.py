from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Invitation
from schemas import UserResponse, LoginRequest, PasswordSetRequest
from passlib.hash import bcrypt

router = APIRouter(prefix="/api/auth", tags=["認証"])

@router.post("/login", response_model=UserResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    """メールアドレスとパスワードでログイン"""
    email_lower = data.email.lower().strip()
    user = db.query(User).filter(User.email.ilike(email_lower)).first()
    
    if not user or not user.hashed_password:
        raise HTTPException(status_code=401, detail="メールアドレスまたはパスワードが正しくありません")
    
    if not bcrypt.verify(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="メールアドレスまたはパスワードが正しくありません")
    
    return user

@router.post("/set-password", response_model=UserResponse)
def set_password(data: PasswordSetRequest, db: Session = Depends(get_db)):
    """招待されたユーザーが初回パスワードを設定する"""
    email_lower = data.email.lower().strip()
    
    # 招待リストにあるか確認
    invitation = db.query(Invitation).filter(Invitation.email.ilike(email_lower)).first()
    if not invitation:
        raise HTTPException(status_code=403, detail="このメールアドレスは招待されていません")
    
    # すでにユーザーがいるか
    user = db.query(User).filter(User.email.ilike(email_lower)).first()
    
    hashed = bcrypt.hash(data.password)
    
    if user:
        if user.hashed_password:
             raise HTTPException(status_code=400, detail="パスワードは既に設定されています")
        user.hashed_password = hashed
        user.is_approved = True # 招待されているので承認
    else:
        # 新規作成
        user = User(
            email=data.email,
            hashed_password=hashed,
            is_approved=True,
            role="client"
        )
        db.add(user)
    
    # 招待ステータスを更新
    invitation.status = "accepted"
    
    db.commit()
    db.refresh(user)
    return user
