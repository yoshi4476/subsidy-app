# 品質保証 & タイムライン APIルーター
# 設計書 Section 4.2, 6.2 準拠

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Subsidy, ApplicationCase
from services.qa_checker import run_consistency_check, evaluate_plan_quality

router = APIRouter(prefix="/api", tags=["品質保証・タイムライン"])


# ============================================================
# 矛盾検知API (Section 4.2)
# ============================================================
@router.post("/qa/consistency-check")
def consistency_check(plan_data: dict):
    """申請計画データの矛盾を検知する"""
    return run_consistency_check(plan_data)


@router.post("/qa/quality-score")
def quality_score(body: dict, db: Session = Depends(get_db)):
    """事業計画書テキストの品質を評価する"""
    plan_text = body.get("plan_text", "")
    
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

    # ai_service側のevaluate_plan_quality等のラッパー（ここではqa_checker.py）に渡す
    return evaluate_plan_quality(plan_text, knowledge_base)


# ============================================================
# タイムラインAPI (締切管理)
# ============================================================
@router.get("/timeline")
def get_timeline(db: Session = Depends(get_db)):
    """補助金の締切タイムラインを取得する"""
    now = datetime.utcnow()

    # 公開中の補助金のスケジュール
    subsidies = db.query(Subsidy).filter(Subsidy.status == "PUBLISHED").all()

    events = []
    for s in subsidies:
        # 公募開始
        if s.application_start:
            days_from_now = (datetime.combine(s.application_start, datetime.min.time()) - now).days
            events.append({
                "type": "START",
                "subsidy_id": s.id,
                "subsidy_title": s.title,
                "date": s.application_start.isoformat(),
                "days_from_now": days_from_now,
                "label": "公募開始",
                "urgency": "info",
            })

        # 締切
        if s.application_end:
            end_dt = s.application_end if isinstance(s.application_end, datetime) else datetime.combine(s.application_end, datetime.min.time())
            days_until = (end_dt - now).days
            urgency = "critical" if days_until <= 7 else "warning" if days_until <= 30 else "normal"
            events.append({
                "type": "DEADLINE",
                "subsidy_id": s.id,
                "subsidy_title": s.title,
                "date": end_dt.isoformat(),
                "days_from_now": days_until,
                "label": "申請締切",
                "urgency": urgency,
            })

        # 事業完了期限
        if s.project_end:
            days_until = (datetime.combine(s.project_end, datetime.min.time()) - now).days
            events.append({
                "type": "PROJECT_END",
                "subsidy_id": s.id,
                "subsidy_title": s.title,
                "date": s.project_end.isoformat(),
                "days_from_now": days_until,
                "label": "事業完了期限",
                "urgency": "normal",
            })

    # 日付順にソート
    events.sort(key=lambda x: x["date"])

    # 直近のアラート（30日以内の締切）
    alerts = [e for e in events if e["type"] == "DEADLINE" and 0 <= e["days_from_now"] <= 30]

    return {
        "events": events,
        "alerts": alerts,
        "total_active": len(subsidies),
    }


# ============================================================
# 事例分析API (Section 6.2 Feedback Loop)
# ============================================================
@router.get("/analytics/cases")
def get_case_analytics(db: Session = Depends(get_db)):
    """事例の分析データ（採択率推移・不採択理由分布）を取得する"""
    # 全事例を取得
    cases = db.query(ApplicationCase).all()

    total = len(cases)
    adopted = sum(1 for c in cases if c.result == "ADOPTED")
    rejected = sum(1 for c in cases if c.result == "REJECTED")
    pending = sum(1 for c in cases if c.result == "PENDING")

    adoption_rate = (adopted / (adopted + rejected) * 100) if (adopted + rejected) > 0 else 0

    # 不採択理由の分布
    rejection_reasons = {}
    for c in cases:
        if c.result == "REJECTED" and c.rejection_category:
            for cat in c.rejection_category:
                rejection_reasons[cat] = rejection_reasons.get(cat, 0) + 1

    # 補助金別の採択率
    subsidy_stats = {}
    for c in cases:
        sid = c.subsidy_id
        if sid not in subsidy_stats:
            subsidy_stats[sid] = {"adopted": 0, "rejected": 0, "pending": 0, "subsidy_id": sid}
        subsidy_stats[sid][c.result.lower()] = subsidy_stats[sid].get(c.result.lower(), 0) + 1

    for key, val in subsidy_stats.items():
        total_decided = val["adopted"] + val["rejected"]
        val["adoption_rate"] = (val["adopted"] / total_decided * 100) if total_decided > 0 else 0

    # AI品質スコアの集計
    quality_distribution = {"S": 0, "A": 0, "B": 0, "C": 0, "D": 0}
    for c in cases:
        if c.ai_quality_score and isinstance(c.ai_quality_score, dict):
            overall = c.ai_quality_score.get("overall", "B")
            quality_distribution[overall] = quality_distribution.get(overall, 0) + 1

    # 学びの集約
    lessons = []
    for c in cases:
        if c.lessons_learned:
            lessons.append({
                "case_id": c.id,
                "result": c.result,
                "lesson": c.lessons_learned,
            })

    return {
        "summary": {
            "total": total,
            "adopted": adopted,
            "rejected": rejected,
            "pending": pending,
            "adoption_rate": round(adoption_rate, 1),
        },
        "rejection_reasons": rejection_reasons,
        "subsidy_stats": list(subsidy_stats.values()),
        "quality_distribution": quality_distribution,
        "lessons": lessons,
    }
