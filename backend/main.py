# 補助金検索・申請プラットフォーム Backend
# FastAPI アプリケーションエントリーポイント

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base, SessionLocal
from routers import companies, subsidies, applications, documents, qa, rag_knowledge, users, user_activity, simulation, admin, terms, auth
from routers import ai_router
import traceback
from fastapi import Request
from fastapi.responses import JSONResponse

# テーブル自動作成
Base.metadata.create_all(bind=engine)

from services.subsidy_crawler import sync_subsidies, update_subsidy_statuses, fetch_from_jgrants_and_sync
from seed_cases import seed_adoption_cases
from apscheduler.schedulers.asyncio import AsyncIOScheduler

# 定期実行スケジューラーの設定
scheduler = AsyncIOScheduler()

async def scheduled_sync_job():
    """定期実行される同期ジョブ"""
    print(f"[SCHEDULED] 補助金同期ジョブ開始: {datetime.now()}")
    try:
        db = SessionLocal()
        # J-Grants APIからの同期
        await fetch_from_jgrants_and_sync(db)
        # ステータス更新（期限切れ判定等）
        update_subsidy_statuses(db)
        db.close()
        print("[SCHEDULED] 補助金同期ジョブ完了")
    except Exception as e:
        print(f"[SCHEDULED] ジョブ実行エラー: {e}")

from datetime import datetime
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 起動時の処理
    print("[STARTUP] 補助金マスターの初期同期中...")
    try:
        db = SessionLocal()
        sync_subsidies(db)
        update_subsidy_statuses(db)
        db.close()
        seed_adoption_cases()
        print("[STARTUP] 初期同期・事例投入完了")
    except Exception as e:
        print(f"[STARTUP] 初期処理エラー（継続）: {e}")
    
    # スケジューラーの開始 (毎日深夜3時に実行)
    scheduler.add_job(scheduled_sync_job, "cron", hour=3, minute=0)
    scheduler.start()
    print("[STARTUP] 定期更新スケジューラー開始 (毎日 03:00 AM)")
    
    yield
    
    # 終了時の処理
    scheduler.shutdown()
    print("[SHUTDOWN] スケジューラーを停止しました")

app = FastAPI(
    title="補助金検索・申請プラットフォーム API",
    description="中小企業のための補助金マッチング・申請支援システム",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS設定 - 全オリジンを許可（Vercel↔Railway間の通信を確実にする）
import os
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # allow_origins=["*"] の場合、credentials は False にする必要がある
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーター登録
@app.middleware("http")
async def catch_exceptions_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        print(f"DEBUG EXCEPTION: {e}")
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"detail": str(e), "traceback": traceback.format_exc()})

app.include_router(companies.router)
app.include_router(subsidies.router)
app.include_router(applications.router)
app.include_router(documents.router)
app.include_router(qa.router)
app.include_router(ai_router.router)
app.include_router(rag_knowledge.router)
app.include_router(users.router)
app.include_router(user_activity.router)
app.include_router(simulation.router)
app.include_router(admin.router)
app.include_router(terms.router)
app.include_router(auth.router)


@app.get("/")
def root():
    return {
        "name": "補助金検索・申請プラットフォーム API",
        "version": "2.0.0",
        "docs": "/docs",
    }


@app.get("/api/health")
def health_check():
    return {"status": "healthy"}
