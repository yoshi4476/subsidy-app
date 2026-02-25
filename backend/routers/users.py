from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import UserCreate, UserResponse

router = APIRouter(prefix="/api/users", tags=["ユーザー管理"])

@router.post("/", response_model=UserResponse)
def create_or_get_user(data: UserCreate, db: Session = Depends(get_db)):
    """Googleログイン時のユーザー情報をもとに、DBにユーザーが存在しなければ作成し、存在すれば返す"""
    user = db.query(User).filter(User.email == data.email).first()
    
    if user:
        # Update name and picture if changed
        if data.name and user.name != data.name:
            user.name = data.name
        if data.picture and user.picture != data.picture:
            user.picture = data.picture
        db.commit()
        db.refresh(user)
        return user
    
    # Create new user
    new_user = User(
        email=data.email,
        name=data.name,
        picture=data.picture,
        role="client"
    )
    db.add(new_user)
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
