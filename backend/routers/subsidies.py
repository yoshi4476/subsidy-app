# 補助金管理 + マッチング + 翻訳 APIルーター
# 設計書 Section 2, 3, 5 準拠

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta
from database import get_db
from models import Subsidy, Company, FinancialStatement, HRData, BusinessProfile, AuditLog
from schemas import (
    SubsidyCreate, SubsidyResponse, MatchingResult,
    AuditLogCreate, AuditLogResponse,
)
from services.matching import match_subsidy, build_company_data
from services.translator import translate_all_requirements
from services.subsidy_crawler import sync_subsidies, update_subsidy_statuses

router = APIRouter(prefix="/api/subsidies", tags=["補助金管理"])

# ============================================================
# マッチング・分析 (Section 5) - 最優先でマッチング
# ============================================================

@router.get("/{subsidy_id}/match", response_model=MatchingResult)
def get_subsidy_match(subsidy_id: str, company_id: str, db: Session = Depends(get_db)):
    """特定の補助金と企業の相性を判定する"""
    subsidy = db.query(Subsidy).filter(Subsidy.id == subsidy_id).first()
    if not subsidy:
        raise HTTPException(status_code=404, detail="補助金が見つかりません")

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="企業が見つかりません")

    financials = db.query(FinancialStatement).filter(
        FinancialStatement.company_id == company_id
    ).order_by(FinancialStatement.fiscal_year.desc()).limit(3).all()

    latest_hr = db.query(HRData).filter(
        HRData.company_id == company_id
    ).order_by(HRData.snapshot_date.desc()).first()

    profile = db.query(BusinessProfile).filter(
        BusinessProfile.company_id == company_id
    ).first()

    company_data = build_company_data(company, financials, latest_hr, profile)
    match_result = match_subsidy(subsidy, company_data)
    translated = translate_all_requirements(subsidy, company_data)

    return MatchingResult(
        subsidy=SubsidyResponse.model_validate(subsidy),
        eligible=match_result["eligible"],
        score=match_result["score"],
        max_score=match_result["max_score"],
        rank=match_result["rank"],
        fulfilled_items=match_result["fulfilled_items"],
        recommendations=match_result["recommendations"],
        translated_requirements=translated,
        company_data=company_data,
        matched_max_amount=match_result.get("matched_max_amount"),
        matched_rate=match_result.get("matched_rate"),
        applied_rate_description=match_result.get("applied_rate_description"),
        max_potential_amount=match_result.get("max_potential_amount"),
        max_potential_rate=match_result.get("max_potential_rate"),
        gap_analysis=match_result.get("gap_analysis", []),
    )

@router.get("/match/{company_id}", response_model=list[MatchingResult])
def match_subsidies_for_company(company_id: str, db: Session = Depends(get_db)):
    """企業に適した補助金をマッチングし、スコア付きで返す"""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="企業が見つかりません")

    financials = db.query(FinancialStatement).filter(
        FinancialStatement.company_id == company_id
    ).order_by(FinancialStatement.fiscal_year.desc()).limit(3).all()

    latest_hr = db.query(HRData).filter(
        HRData.company_id == company_id
    ).order_by(HRData.snapshot_date.desc()).first()

    profile = db.query(BusinessProfile).filter(
        BusinessProfile.company_id == company_id
    ).first()

    company_data = build_company_data(company, financials, latest_hr, profile)

    now = datetime.utcnow()
    subsidies = db.query(Subsidy).filter(
        Subsidy.status == "PUBLISHED",
        (Subsidy.application_end == None) | (Subsidy.application_end >= now)
    ).all()
    results = []

    for subsidy in subsidies:
        match_result = match_subsidy(subsidy, company_data)
        target_regions = [r.strip() for r in subsidy.target_region.split(",")] if subsidy.target_region else ["ALL"]
        if "ALL" not in target_regions and company_data.get("prefecture") not in target_regions:
            continue

        translated = translate_all_requirements(subsidy, company_data)

        results.append(MatchingResult(
            subsidy=SubsidyResponse.model_validate(subsidy),
            eligible=match_result["eligible"],
            score=match_result["score"],
            max_score=match_result["max_score"],
            rank=match_result["rank"],
            fulfilled_items=match_result["fulfilled_items"],
            recommendations=match_result["recommendations"],
            translated_requirements=translated,
            company_data=company_data,
            matched_max_amount=match_result.get("matched_max_amount"),
            matched_rate=match_result.get("matched_rate"),
            applied_rate_description=match_result.get("applied_rate_description"),
            max_potential_amount=match_result.get("max_potential_amount"),
            max_potential_rate=match_result.get("max_potential_rate"),
            gap_analysis=match_result.get("gap_analysis", []),
        ))

    results.sort(key=lambda r: (r.eligible, r.score), reverse=True)
    return results

@router.get("/{subsidy_id}/analysis")
def get_subsidy_analysis(subsidy_id: str, db: Session = Depends(get_db)):
    """補助金に関連する事例データから傾向を分析する"""
    from models import ApplicationCase
    cases = db.query(ApplicationCase).filter(ApplicationCase.subsidy_id == subsidy_id).all()
    if not cases:
        return {"count": 0, "adoption_rate": 0, "success_factors": [], "rejection_reasons": []}

    total_count = len(cases)
    adopted_cases = [c for c in cases if c.result == "ADOPTED"]
    rejected_cases = [c for c in cases if c.result == "REJECTED"]
    adopted_count = len(adopted_cases)
    adoption_rate = (adopted_count / total_count) * 100 if total_count > 0 else 0

    success_factors = {}
    for c in adopted_cases:
        factors = c.ai_quality_score.get("key_factors", []) if c.ai_quality_score else []
        for f in factors:
            success_factors[f] = success_factors.get(f, 0) + 1
    sorted_factors = sorted(success_factors.items(), key=lambda x: x[1], reverse=True)[:5]

    rejection_reasons = {}
    for c in rejected_cases:
        cats = c.rejection_category or []
        for cat in cats:
            rejection_reasons[cat] = rejection_reasons.get(cat, 0) + 1
        factors = c.ai_quality_score.get("key_factors", []) if c.ai_quality_score else []
        for f in factors:
            rejection_reasons[f] = rejection_reasons.get(f, 0) + 1
    sorted_rejections = sorted(rejection_reasons.items(), key=lambda x: x[1], reverse=True)[:5]

    insight_text = ""
    if total_count > 10:
        top_rejection = sorted_rejections[0][0] if sorted_rejections else "なし"
        if adoption_rate < 30:
            insight_text = f"この補助金は採択率が{round(adoption_rate)}%と低く、特に「{top_rejection}」による不採択が目立ちます。申請時にはこれらの項目に対する具体的かつ客観的なエビデンスの提示が不可欠です。"
        else:
            insight_text = f"採択率{round(adoption_rate)}%と比較的高めですが、成功案件の多くは「{sorted_factors[0][0] if sorted_factors else '具体性'}」を強調しています。これらを計画書に盛り込むことで、上位ランクでの採択が期待できます。"
    else:
        insight_text = "事例データが蓄積中のため、一般的な公募要領の傾向に基づき、ROI（投資対効果）の定量的エビデンスと市場分析の具体性を重視してください。"

    return {
        "count": total_count,
        "adoption_rate": round(adoption_rate, 1),
        "top_success_factors": [{"factor": k, "count": v} for k, v in sorted_factors],
        "top_rejection_reasons": [{"reason": k, "count": v} for k, v in sorted_rejections],
        "insights": insight_text
    }


# ============================================================
# 補助金基本・承認
# ============================================================

@router.get("/latest")
def get_latest_subsidies(days: int = 30, db: Session = Depends(get_db)):
    """新着・更新された補助金を取得（直近N日）"""
    cutoff = datetime.utcnow() - timedelta(days=days)
    subsidies = db.query(Subsidy).filter(
        Subsidy.status.in_(["PUBLISHED", "PENDING_REVIEW"]),
    ).order_by(Subsidy.created_at.desc()).all()
    today = date.today()
    result = []
    for s in subsidies:
        days_left = None
        if s.application_end:
            end_d = s.application_end.date() if isinstance(s.application_end, datetime) else s.application_end
            days_left = (end_d - today).days
        result.append({
            "id": s.id,
            "title": s.title,
            "administering_body": s.administering_body,
            "status": s.status,
            "max_amount": s.max_amount,
            "subsidy_rate": f"{s.subsidy_rate_numerator}/{s.subsidy_rate_denominator}" if s.subsidy_rate_numerator else None,
            "application_start": s.application_start.isoformat() if s.application_start else None,
            "application_end": s.application_end.isoformat() if s.application_end else None,
            "days_left": days_left,
            "source_url": s.source_url,
            "description": s.description,
            "eligible_costs": s.eligible_costs,
        })
    result.sort(key=lambda x: x["days_left"] if x["days_left"] is not None else 9999)
    return result

@router.get("/", response_model=list[SubsidyResponse])
def list_subsidies(
    status: str = Query(None, description="ステータスフィルタ"),
    db: Session = Depends(get_db)
):
    """補助金一覧を取得する"""
    query = db.query(Subsidy)
    if status:
        query = query.filter(Subsidy.status == status)
    return query.order_by(Subsidy.created_at.desc()).all()


@router.get("/{subsidy_id}", response_model=SubsidyResponse)
def get_subsidy(subsidy_id: str, db: Session = Depends(get_db)):
    """補助金詳細を取得する"""
    subsidy = db.query(Subsidy).filter(Subsidy.id == subsidy_id).first()
    if not subsidy:
        raise HTTPException(status_code=404, detail="補助金が見つかりません")
    return subsidy

@router.put("/{subsidy_id}", response_model=SubsidyResponse)
def update_subsidy(subsidy_id: str, data: SubsidyCreate, db: Session = Depends(get_db)):
    """補助金情報を更新する"""
    subsidy = db.query(Subsidy).filter(Subsidy.id == subsidy_id).first()
    if not subsidy:
        raise HTTPException(status_code=404, detail="補助金が見つかりません")
    for key, val in data.model_dump().items():
        setattr(subsidy, key, val)
    db.commit()
    db.refresh(subsidy)
    return subsidy

@router.post("/", response_model=SubsidyResponse, status_code=201)
def create_subsidy(data: SubsidyCreate, db: Session = Depends(get_db)):
    existing = db.query(Subsidy).filter(Subsidy.subsidy_code == data.subsidy_code).first()
    if existing:
        raise HTTPException(status_code=409, detail="この補助金コードは既に登録されています")
    subsidy = Subsidy(**data.model_dump())
    db.add(subsidy)
    db.commit()
    db.refresh(subsidy)
    log = AuditLog(actor_type="SYSTEM", actor_id="subsidy_api", action="GENERATE", target_entity=f"subsidy:{subsidy.subsidy_code}", details={"title": subsidy.title})
    db.add(log)
    db.commit()
    return subsidy

@router.post("/refresh")
async def refresh_subsidies(db: Session = Depends(get_db)):
    master_result = sync_subsidies(db)
    from services.subsidy_crawler import fetch_from_jgrants_and_sync
    jgrants_result = await fetch_from_jgrants_and_sync(db)
    update_subsidy_statuses(db)
    return {"master_sync": master_result, "jgrants_sync": jgrants_result}

@router.post("/{subsidy_id}/approve", response_model=SubsidyResponse)
def approve_subsidy(subsidy_id: str, approved_by: str = "expert", db: Session = Depends(get_db)):
    subsidy = db.query(Subsidy).filter(Subsidy.id == subsidy_id).first()
    if not subsidy:
        raise HTTPException(status_code=404, detail="補助金が見つかりません")
    subsidy.status = "PUBLISHED"
    subsidy.approved_by = approved_by
    subsidy.approved_at = datetime.utcnow()
    log = AuditLog(actor_type="HUMAN", actor_id=approved_by, action="APPROVE", target_entity=f"subsidy:{subsidy.subsidy_code}")
    db.add(log)
    db.commit()
    db.refresh(subsidy)
    return subsidy

@router.post("/{subsidy_id}/reject", response_model=SubsidyResponse)
def reject_subsidy(subsidy_id: str, reason: str = "", db: Session = Depends(get_db)):
    subsidy = db.query(Subsidy).filter(Subsidy.id == subsidy_id).first()
    if not subsidy:
        raise HTTPException(status_code=404, detail="補助金が見つかりません")
    subsidy.status = "PENDING_REVIEW"
    log = AuditLog(actor_type="HUMAN", actor_id="expert", action="REJECT", target_entity=f"subsidy:{subsidy.subsidy_code}", details={"reason": reason})
    db.add(log)
    db.commit()
    db.refresh(subsidy)
    return subsidy
