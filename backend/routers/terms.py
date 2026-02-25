# 用語辞書 APIルーター
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import TermDictionary

router = APIRouter(prefix="/api/terms", tags=["用語辞書"])

@router.get("/")
def get_terms(db: Session = Depends(get_db)):
    """登録されている全ての用語を取得する"""
    return db.query(TermDictionary).all()
