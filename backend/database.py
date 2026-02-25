# データベース接続設定
# 開発環境: SQLite / 本番環境: PostgreSQL（DATABASE_URL環境変数で切替）

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# プロジェクトルートの絶対パスを取得
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATABASE_PATH = os.path.join(BASE_DIR, "subsidy_platform.db")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DATABASE_PATH}")

# SQLite用のcheck_same_thread設定
connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI依存性注入用のDBセッション取得関数"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
