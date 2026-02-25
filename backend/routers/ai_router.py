# AI統合APIルーター
# OpenAI / ChatGPT 等のAIモデルを利用した品質評価・改善提案・文章生成エンドポイント

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from database import get_db

from services.ai_service import (
    AVAILABLE_MODELS, DEFAULT_MODELS,
    ai_quality_score, ai_generate_plan_section, ai_generate_full_plan,
    ai_improvement_suggestions, call_openai, OPENAI_API_KEY,
)
from services.adoption_knowledge import (
    analyze_plan_against_knowledge,
    get_adoption_tips,
    get_all_knowledge_summary,
    get_knowledge_for_subsidy,
)

router = APIRouter(prefix="/api/ai", tags=["AI統合"])


# ============================================================
# リクエスト/レスポンスモデル
# ============================================================
class QualityScoreRequest(BaseModel):
    plan_text: str
    subsidy_title: str = ""
    subsidy_code: str = ""

class PlanGenerateRequest(BaseModel):
    section_name: str
    user_input: str
    company_data: dict = {}
    subsidy_info: dict = {}

class ImprovementRequest(BaseModel):
    plan_text: str
    subsidy_code: str = ""

class ChatRequest(BaseModel):
    message: str
    context: dict = {}
    model: str = "gpt-5.2"

class FullPlanGenerateRequest(BaseModel):
    company_id: str
    subsidy_id: str

class CriticalReviewRequest(BaseModel):
    plan_text: str
    subsidy_requirements: str = ""
    plan_data: Optional[dict] = None


# ============================================================
# モデル情報
# ============================================================
@router.get("/models")
def list_models():
    """利用可能なAIモデル一覧を取得"""
    return {
        "models": AVAILABLE_MODELS,
        "defaults": DEFAULT_MODELS,
        "api_key_configured": bool(OPENAI_API_KEY),
    }


# ============================================================
# AI品質評価
# ============================================================
@router.post("/quality-score")
def quality_score(req: QualityScoreRequest):
    """事業計画書のAI品質評価"""
    # AI品質評価
    ai_result = ai_quality_score(req.plan_text, req.subsidy_title)

    # ナレッジベースと照合
    kb_result = {}
    if req.subsidy_code:
        kb_result = analyze_plan_against_knowledge(req.plan_text, req.subsidy_code)

    return {
        "quality": ai_result,
        "knowledge_analysis": kb_result,
        "tips": get_adoption_tips(req.subsidy_code) if req.subsidy_code else [],
    }


# ============================================================
# AI文章生成
# ============================================================
@router.post("/generate-section")
def generate_section(req: PlanGenerateRequest, db: Session = Depends(get_db)):
    """AIが申請書セクションを生成"""
    from models import ApplicationCase
    
    # 1. RAG用に過去の成功事例（実データを最優先、なければダミーデータ）を3件取得
    real_adopted_cases = db.query(ApplicationCase).filter(
        ApplicationCase.is_real_data == True,
        ApplicationCase.result == "ADOPTED"
    ).limit(3).all()
    
    knowledge_base = []
    if real_adopted_cases:
        for c in real_adopted_cases:
            knowledge_base.append("[採択事例/優良なお手本]\n" + (c.lessons_learned or c.ai_quality_score.get("raw_text_preview", "")))
            
    # 実データ（成功）が足りない場合は仮想ダミーデータ（スコア90以上）で補完
    if sum(1 for k in knowledge_base if "[採択事例" in k) < 3:
        dummy_adopted = db.query(ApplicationCase).filter(
            ApplicationCase.is_real_data == False,
            ApplicationCase.result == "ADOPTED",
            ApplicationCase.score_at_submission >= 90
        ).limit(3 - sum(1 for k in knowledge_base if "[採択事例" in k)).all()
        for c in dummy_adopted:
            if c.ai_quality_score and isinstance(c.ai_quality_score, dict):
                summary = c.ai_quality_score.get("plan_summary", "")
                factors = c.ai_quality_score.get("key_factors", [])
                text = f"[採択事例/優良なお手本]\n{summary}\n成功要因: {', '.join(factors)}"
                knowledge_base.append(text)

    # 2. RAG用に過去の不採択事例（アンチパターン）を2件取得
    real_rejected_cases = db.query(ApplicationCase).filter(
        ApplicationCase.is_real_data == True,
        ApplicationCase.result == "REJECTED"
    ).limit(2).all()

    if real_rejected_cases:
        for c in real_rejected_cases:
            knowledge_base.append("[不採択事例/反面教師]\n" + (c.lessons_learned or c.ai_quality_score.get("raw_text_preview", "")))

    # 実データ（不採択）が足りない場合は仮想ダミーデータ（スコア65以下）で補完
    if sum(1 for k in knowledge_base if "[不採択事例" in k) < 2:
        dummy_rejected = db.query(ApplicationCase).filter(
            ApplicationCase.is_real_data == False,
            ApplicationCase.result == "REJECTED",
            ApplicationCase.score_at_submission <= 65
        ).limit(2 - sum(1 for k in knowledge_base if "[不採択事例" in k)).all()
        for c in dummy_rejected:
            if c.ai_quality_score and isinstance(c.ai_quality_score, dict):
                summary = c.ai_quality_score.get("plan_summary", "")
                factors = c.ai_quality_score.get("key_factors", [])
                reasons = getattr(c, 'rejection_category', [])
                if isinstance(reasons, str):
                    import json
                    try: reasons = json.loads(reasons)
                    except: reasons = [reasons]
                text = f"[不採択事例/反面教師]\n{summary}\n不採択要因: {', '.join(reasons)}\n審査員からの指摘: {c.lessons_learned}"
                knowledge_base.append(text)

    result = ai_generate_plan_section(
        section_name=req.section_name,
        user_input=req.user_input,
        company_data=req.company_data,
        subsidy_info=req.subsidy_info,
        knowledge_base=knowledge_base
    )
    if result:
        return {"generated_text": result, "model": "gpt-4o"}
    return {"generated_text": None, "model": "none", "message": "AI APIキーが未設定のため生成できませんでした。"}


@router.post("/generate-plan")
def generate_full_plan(req: FullPlanGenerateRequest, db: Session = Depends(get_db)):
    """AIが事業計画書全体のドラフトを一括生成"""
    from models import Company, Subsidy, ApplicationCase, FinancialStatement, HRData, BusinessProfile
    from services.matching import build_company_data

    # 1. データの取得
    company = db.query(Company).filter(Company.id == req.company_id).first()
    subsidy = db.query(Subsidy).filter(Subsidy.id == req.subsidy_id).first()
    
    if not (company and subsidy):
        raise HTTPException(status_code=404, detail="企業または補助金が見つかりません")

    # 企業DNAの構築
    financials = db.query(FinancialStatement).filter(
        FinancialStatement.company_id == req.company_id
    ).order_by(FinancialStatement.fiscal_year.desc()).limit(3).all()
    latest_hr = db.query(HRData).filter(
        HRData.company_id == req.company_id
    ).order_by(HRData.snapshot_date.desc()).first()
    profile = db.query(BusinessProfile).filter(
        BusinessProfile.company_id == req.company_id
    ).first()
    company_data = build_company_data(company, financials, latest_hr, profile)

    # 2. ナレッジベースの準備 (RAG)
    # 採択事例 3件
    adopted_cases = db.query(ApplicationCase).filter(
        ApplicationCase.subsidy_id == req.subsidy_id,
        ApplicationCase.result == "ADOPTED"
    ).limit(3).all()
    
    knowledge_base = []
    for c in adopted_cases:
        summary = c.ai_quality_score.get("plan_summary", "") if c.ai_quality_score else ""
        knowledge_base.append(f"[過去の採択事例]\n{summary}\n学び: {c.lessons_learned}")

    # 3. 生成実行
    subsidy_info = {
        "title": subsidy.title,
        "description": subsidy.description,
        "max_amount": subsidy.max_amount,
        "subsidy_rate": f"{subsidy.subsidy_rate_numerator}/{subsidy.subsidy_rate_denominator}" if subsidy.subsidy_rate_numerator else None
    }

    result = ai_generate_full_plan(
        company_data=company_data,
        subsidy_info=subsidy_info,
        knowledge_base=knowledge_base
    )

    if result:
        return result
    return {"message": "生成に失敗しました。APIキーを確認してください。"}


# ============================================================
# AI改善提案
# ============================================================
@router.post("/improvement-suggestions")
def improvement_suggestions(req: ImprovementRequest):
    """事業計画の改善提案"""
    # ナレッジベースから知見を取得
    kb = get_knowledge_for_subsidy(req.subsidy_code)
    knowledge_items = []
    if kb:
        for bp in kb.get("best_practices", []):
            knowledge_items.append(bp)
        for reason in kb.get("common_rejection_reasons", []):
            knowledge_items.append(f"不採択理由: {reason}")

    # AI改善提案
    ai_result = ai_improvement_suggestions(req.plan_text, knowledge_items)

    # ナレッジベース分析
    kb_analysis = analyze_plan_against_knowledge(req.plan_text, req.subsidy_code)

    return {
        "ai_suggestions": ai_result,
        "knowledge_analysis": kb_analysis,
    }


# ============================================================
# 審査員モード（赤入れレビュー）
# ============================================================
@router.post("/critical-review")
def critical_review(req: CriticalReviewRequest):
    """審査員モード：事業計画書の厳格な査読」"""
    from services.ai_service import ai_critical_review
    result = ai_critical_review(req.plan_text, req.subsidy_requirements, req.plan_data)
    if result:
        return result
    raise HTTPException(status_code=500, detail="AIレビューの生成に失敗しました")


# ============================================================
# 採択ナレッジベース情報
# ============================================================
@router.get("/knowledge")
def get_knowledge():
    """全補助金のナレッジベースサマリーを取得"""
    return {
        "knowledge_base": get_all_knowledge_summary(),
        "total_subsidies": len(get_all_knowledge_summary()),
    }

@router.get("/knowledge/{subsidy_code}")
def get_knowledge_detail(subsidy_code: str):
    """特定補助金のナレッジ詳細を取得"""
    kb = get_knowledge_for_subsidy(subsidy_code)
    if not kb:
        raise HTTPException(status_code=404, detail="該当するナレッジが見つかりません")
    return kb

@router.get("/tips/{subsidy_code}")
def get_tips(subsidy_code: str):
    """補助金に応じた採択ヒントを取得"""
    return {"tips": get_adoption_tips(subsidy_code)}


# ============================================================
# AIチャット（汎用）
# ============================================================
@router.post("/chat")
def ai_chat(req: ChatRequest, db: Session = Depends(get_db)):
    """AIチャット（補助金相談用 - RAG統合版）"""
    from models import ApplicationCase
    import re

    # 1. ユーザーの質問から重要なキーワードを抽出（簡易RAG）
    keywords = re.findall(r'[一-龥]{2,}|[ぁ-ん]{2,}|[ァ-ン]{2,}', req.message)
    
    # 2. データベースから関連事例を検索（採択事例を優先）
    context_cases = []
    if keywords:
        search_filters = []
        for kw in keywords[:3]: # 上位3キーワードを使用
            search_filters.append(ApplicationCase.lessons_learned.like(f"%{kw}%"))
            search_filters.append(ApplicationCase.plan_summary.like(f"%{kw}%"))
        
        # 関連する成功事例を取得
        from sqlalchemy import or_
        adopted_cases = db.query(ApplicationCase).filter(
            ApplicationCase.result == "ADOPTED",
            or_(*search_filters)
        ).limit(3).all()
        
        for c in adopted_cases:
            context_cases.append(f"[成功事例の知見]\n{c.lessons_learned or c.plan_summary}")

        # 関連する失敗事例を取得
        rejected_cases = db.query(ApplicationCase).filter(
            ApplicationCase.result == "REJECTED",
            or_(*search_filters)
        ).limit(2).all()
        
        for c in rejected_cases:
            context_cases.append(f"[失敗事例の知見]\n{c.lessons_learned or c.plan_summary}")

    # 3. AIへのシステム指示
    system_instruction = f"""あなたは中小企業向け補助金申請の専門AIアドバイザーです。
質問に対して、提供された「過去の事例ナレッジ」を最大限に活用して回答してください。
回答は日本語で丁寧に行い、具体的な数値目標の立て方や注意点をアドバイスしてください。

取得されたナレッジ:
{chr(10).join(context_cases) if context_cases else "関連する具体的なナレッジは見つかりませんでした（一般論で回答してください）"}
"""

    context_str = ""
    if req.context:
        context_str = f"\n\nユーザー状況: {str(req.context)}"

    result = call_openai(
        f"{req.message}{context_str}",
        model=req.model,
        system_instruction=system_instruction,
    )

    if result:
        return {"response": result, "model": req.model, "rag_active": len(context_cases) > 0}
    return {"response": "AI APIキーが設定されていません。", "model": "none"}
