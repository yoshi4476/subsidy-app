# 申請書品質保証・矛盾検知サービス
# 設計書 Section 4.2 Logic Consistency Check 準拠

from typing import Optional


# ============================================================
# ルールベース矛盾検知 (Section 4.2)
# ============================================================

# 検証ルール定義
CONSISTENCY_RULES = [
    {
        "rule_id": "CHK-001",
        "name": "リソース整合性",
        "description": "売上2倍計画なのに人員増・設備投資なし",
        "severity": "WARNING",
    },
    {
        "rule_id": "CHK-002",
        "name": "償却費整合性",
        "description": "減価償却費が設備投資額/耐用年数と乖離",
        "severity": "ERROR",
    },
    {
        "rule_id": "CHK-003",
        "name": "賃上げ整合性",
        "description": "賃上げ表明ありなのに人件費計画が横ばい",
        "severity": "WARNING",
    },
    {
        "rule_id": "CHK-004",
        "name": "期間整合性",
        "description": "交付決定前の着手は補助対象外",
        "severity": "ERROR",
    },
]


def check_resource_consistency(plan_data: dict) -> Optional[dict]:
    """CHK-001: 売上2倍計画 AND 人員増なし AND 設備投資なし → 警告"""
    current_sales = plan_data.get("current_sales", 0)
    target_sales = plan_data.get("target_sales", 0)
    current_employees = plan_data.get("current_employees", 0)
    target_employees = plan_data.get("target_employees", 0)
    investment_amount = plan_data.get("investment_amount", 0)

    if current_sales > 0 and target_sales >= current_sales * 1.8:
        # 売上80%以上増の計画
        if target_employees <= current_employees and investment_amount == 0:
            return {
                "rule_id": "CHK-001",
                "severity": "WARNING",
                "message": f"売上を{(target_sales / current_sales - 1) * 100:.0f}%増やす計画ですが、"
                           f"人員増加・設備投資の計画がありません。売上達成の根拠を補強してください。",
                "suggestion": "従業員の増員計画、または生産性向上のための設備投資計画を追記してください。",
            }
    return None


def check_wage_consistency(plan_data: dict) -> Optional[dict]:
    """CHK-003: 賃上げ表明あり AND 人件費横ばい → 警告"""
    wage_raise_declared = plan_data.get("wage_raise_declared", False)
    current_labor_cost = plan_data.get("current_labor_cost", 0)
    target_labor_cost = plan_data.get("target_labor_cost", 0)

    if wage_raise_declared and current_labor_cost > 0:
        growth_rate = (target_labor_cost - current_labor_cost) / current_labor_cost * 100
        if growth_rate < 1.0:
            return {
                "rule_id": "CHK-003",
                "severity": "WARNING",
                "message": f"賃上げを表明していますが、人件費計画の増加率が{growth_rate:.1f}%です。"
                           f"賃上げが人件費計画に反映されていない可能性があります。",
                "suggestion": "賃上げ計画率に基づいた人件費の増加を計画に反映してください。",
            }
    return None


def check_timeline_consistency(plan_data: dict) -> Optional[dict]:
    """CHK-004: 事業開始日 < 交付決定予定日 → エラー"""
    project_start = plan_data.get("project_start_date")
    grant_decision = plan_data.get("grant_decision_date")

    if project_start and grant_decision:
        if project_start < grant_decision:
            return {
                "rule_id": "CHK-004",
                "severity": "ERROR",
                "message": "事業開始日が交付決定予定日より前です。"
                           "交付決定前の着手は補助対象外となる可能性があります。",
                "suggestion": "事業開始日を交付決定日以降に設定してください。",
            }
    return None


def run_consistency_check(plan_data: dict) -> dict:
    """全矛盾検知ルールを実行し、結果を返す"""
    results = []
    errors = 0
    warnings = 0

    # 各チェックを実行
    checks = [
        check_resource_consistency(plan_data),
        check_wage_consistency(plan_data),
        check_timeline_consistency(plan_data),
    ]

    for result in checks:
        if result:
            results.append(result)
            if result["severity"] == "ERROR":
                errors += 1
            else:
                warnings += 1

    return {
        "passed": errors == 0,
        "total_checks": len(CONSISTENCY_RULES),
        "errors": errors,
        "warnings": warnings,
        "results": results,
        "available_rules": CONSISTENCY_RULES,
    }


# ============================================================
# AI品質評価スコアリング (Section 4.2 LLM検証)
# ============================================================
def evaluate_plan_quality(plan_text: str, knowledge_base: list = []) -> dict:
    """事業計画書の品質を評価する（OpenAI/ChatGPT AIを利用し、RAGコンテキストを渡す）"""
    # ai_serviceモジュールのAI品質評価を利用する
    from services.ai_service import ai_quality_score
    return ai_quality_score(plan_text, subsidy_title="", knowledge_base=knowledge_base)


def _generate_feedback(scores: dict) -> list:
    """スコアに基づく改善フィードバックを生成"""
    feedback = []
    if scores["specificity"] in ("C", "D"):
        feedback.append({
            "area": "具体性",
            "message": "数値や固有名詞をもっと追加してください。売上見込み、導入台数、削減時間など具体的な数字を入れると説得力が増します。",
        })
    if scores["logic"] in ("C", "D"):
        feedback.append({
            "area": "論理一貫性",
            "message": "「課題 → 解決策 → 効果」のストーリーが不明瞭です。なぜその投資が必要で、どう解決するのかを明確に記述してください。",
        })
    if scores["feasibility"] in ("C", "D"):
        feedback.append({
            "area": "実現可能性",
            "message": "計画の詳細が不足しています。実行体制、スケジュール、必要なリソースについてもう少し具体的に記述してください。",
        })
    if scores["differentiation"] in ("C", "D"):
        feedback.append({
            "area": "差別化",
            "message": "競合との違いが不明瞭です。自社ならではの強み、独自技術、競合にない特徴を強調してください。",
        })
    if not feedback:
        feedback.append({
            "area": "総合",
            "message": "計画書の品質は良好です。さらに改善するには、外部データ（市場規模等）の引用を検討してください。",
        })
    return feedback
