from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import User
from typing import Optional

def get_current_user(x_user_id: Optional[str] = Header(None, alias="X-User-ID"), db: Session = Depends(get_db)):
    """ヘッダーからユーザーを特定する基本依存関係"""
    if not x_user_id:
        return None
    
    user = db.query(User).filter(User.id == x_user_id).first()
    return user

def get_current_approved_user(current_user: Optional[User] = Depends(get_current_user)):
    """ログイン済み かつ 承認済み（または管理者）であることをチェックする"""
    if not current_user:
        raise HTTPException(status_code=401, detail="認証が必要です")
    
    if not current_user.is_approved and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="アカウントの承認が完了していません")
    
    return current_user

def get_current_admin(current_user: Optional[User] = Depends(get_current_user)):
    """管理者権限をチェックする"""
    if not current_user:
        raise HTTPException(status_code=401, detail="認証が必要です")
    
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="管理者権限が必要です")
    
    return current_user
