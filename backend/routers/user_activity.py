# ユーザーアクティビティ（お気に入り・手続き進捗） APIルーター
# 設計書 Section 7 準拠

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import UserFavoriteSubsidy, ReportingProgress, ApplicationCase, Subsidy
from schemas import (
    UserFavoriteSubsidyCreate, UserFavoriteSubsidyResponse,
    ReportingProgressCreate, ReportingProgressResponse,
    ApplicationCaseResponse
)
from typing import List
from datetime import datetime

router = APIRouter(prefix="/api/user", tags=["ユーザーアクティビティ"])

# ============================================================
# お気に入り機能
# ============================================================
@router.post("/favorites", response_model=UserFavoriteSubsidyResponse, status_code=201)
def add_favorite(data: UserFavoriteSubsidyCreate, user_id: str = "default_user", db: Session = Depends(get_db)):
    """補助金をお気に入りに登録する"""
    # 存在確認
    subsidy = db.query(Subsidy).filter(Subsidy.id == data.subsidy_id).first()
    if not subsidy:
        raise HTTPException(status_code=404, detail="補助金が見つかりません")

    # 重複確認
    existing = db.query(UserFavoriteSubsidy).filter(
        UserFavoriteSubsidy.user_id == user_id,
        UserFavoriteSubsidy.subsidy_id == data.subsidy_id
    ).first()
    if existing:
        return existing

    favorite = UserFavoriteSubsidy(user_id=user_id, subsidy_id=data.subsidy_id)
    db.add(favorite)
    db.commit()
    db.refresh(favorite)
    return favorite

@router.delete("/favorites/{subsidy_id}", status_code=204)
def remove_favorite(subsidy_id: str, user_id: str = "default_user", db: Session = Depends(get_db)):
    """お気に入りから削除する"""
    favorite = db.query(UserFavoriteSubsidy).filter(
        UserFavoriteSubsidy.user_id == user_id,
        UserFavoriteSubsidy.subsidy_id == subsidy_id
    ).first()
    if favorite:
        db.delete(favorite)
        db.commit()
    return None

@router.get("/favorites", response_model=List[UserFavoriteSubsidyResponse])
def list_favorites(user_id: str = "default_user", db: Session = Depends(get_db)):
    """ユーザーのお気に入り一覧取得"""
    return db.query(UserFavoriteSubsidy).filter(UserFavoriteSubsidy.user_id == user_id).all()


# ============================================================
# 事後サポート（報告手続き）管理
# ============================================================
@router.post("/reporting", response_model=ReportingProgressResponse, status_code=201)
def create_reporting_task(data: ReportingProgressCreate, db: Session = Depends(get_db)):
    """報告タスク（実績報告等）を新規作成する"""
    # ケースの存在確認
    case = db.query(ApplicationCase).filter(ApplicationCase.id == data.application_case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="申請事例が見つかりません")

    progress = ReportingProgress(**data.model_dump())
    db.add(progress)
    db.commit()
    db.refresh(progress)
    return progress

@router.put("/reporting/{task_id}", response_model=ReportingProgressResponse)
def update_reporting_task(task_id: str, data: ReportingProgressCreate, db: Session = Depends(get_db)):
    """報告手続きのステータス・進捗を更新する"""
    progress = db.query(ReportingProgress).filter(ReportingProgress.id == task_id).first()
    if not progress:
        raise HTTPException(status_code=404, detail="タスクが見つかりません")

    for key, val in data.model_dump().items():
        setattr(progress, key, val)
    
    if data.status == "COMPLETED" and not progress.completed_at:
        progress.completed_at = datetime.utcnow()
    elif data.status != "COMPLETED":
        progress.completed_at = None

    db.commit()
    db.refresh(progress)
    return progress
