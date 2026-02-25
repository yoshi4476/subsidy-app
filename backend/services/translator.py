# Personalized Translator サービス
# 設計書 Section 3.1 準拠
# 公募要領の一般的な要件文を、ユーザー固有の財務データに基づく具体的金額へ変換する


def translate_requirement(condition: dict, company_data: dict) -> dict:
    """要件を企業固有の数値に翻訳する

    Args:
        condition: {"field": "value_added_growth_rate", "operator": ">=", "value": 3.0, ...}
        company_data: 企業データ辞書

    Returns:
        {
            "original_text": "原文",
            "translated_text": "翻訳後の文言",
            "current_value": float,
            "target_value": float,
            "gap": float,
            "source_page": int
        }
    """
    field = condition.get("field", "")
    value = condition.get("value", 0)
    description = condition.get("description", "")
    source_page = condition.get("source_page")

    result = {
        "original_text": description,
        "translated_text": description,  # デフォルトは原文のまま
        "current_value": None,
        "target_value": None,
        "gap": None,
        "source_page": source_page,
    }

    # 付加価値額の成長率要件
    if field == "value_added_growth_rate":
        current_va = company_data.get("value_added", 0)
        if current_va > 0:
            rate = value / 100
            years = 3
            target_va = current_va * (1 + rate) ** years
            gap = target_va - current_va
            result.update({
                "translated_text": (
                    f"今後{years}年間の事業計画において、付加価値額（営業利益+人件費+減価償却費）を"
                    f"年率平均 {value}% 以上（合計 {( (1+rate)**years - 1 ) * 100:.1f}%以上）向上させる必要があります。"
                    f"具体的には、現在の {current_va / 10000:,.0f}万円 から 3年後には {target_va / 10000:,.0f}万円 （+{gap / 10000:,.0f}万円）を目指す計画を策定してください。"
                ),
                "current_value": current_va,
                "target_value": target_va,
                "gap": gap,
            })

    # 賃上げ率要件
    elif field == "wage_raise_rate":
        lowest = company_data.get("lowest_wage", 0)
        if lowest > 0:
            rate = value / 100
            target_wage = lowest * (1 + rate)
            gap = target_wage - lowest
            result.update({
                "translated_text": (
                    f"従業員の給与総額を年率 {value}% 以上引き上げる計画が必要です。"
                    f"（最低賃金を {gap:,.0f}円/時間 引き上げてください）"
                ),
                "current_value": lowest,
                "target_value": target_wage,
                "gap": gap,
            })

    # 従業員数要件
    elif field in ("employee_count_regular", "employee_count_total"):
        current = company_data.get(field, 0)
        result.update({
            "translated_text": f"従業員数が {value}人以下であることが必要です。（あなたの会社: {current}人）",
            "current_value": current,
            "target_value": value,
        })

    # 資本金要件
    elif field == "capital_stock":
        current = company_data.get("capital_stock", 0)
        result.update({
            "translated_text": f"資本金が {value / 10000:,.0f}万円以下であることが必要です。（あなたの会社: {current / 10000:,.0f}万円）",
            "current_value": current,
            "target_value": value,
        })

    # 認定・資格要件
    elif field == "certifications":
        certs = company_data.get("certifications", [])
        has_cert = value in certs if isinstance(value, str) else False
        status = "✅ 取得済み" if has_cert else "❌ 未取得"
        result.update({
            "translated_text": f"「{value}」の認定が必要です。（{status}）",
        })

    # 決算期数要件 (NEW)
    elif field == "fiscal_periods_count":
        current = company_data.get("fiscal_periods_count", 0)
        status = "✅ 達成" if current >= value else "❌ 実績不足"
        result.update({
            "translated_text": f"少なくとも {value}期分の決算実績が必要です。（あなたの会社: {current}期分済 {status}）",
            "current_value": current,
            "target_value": value,
        })

    return result


def translate_all_requirements(subsidy, company_data: dict) -> list[dict]:
    """補助金の全要件を翻訳する"""
    requirements = subsidy.requirements or {}
    conditions = requirements.get("conditions", [])

    translated = []
    for cond in conditions:
        translated.append(translate_requirement(cond, company_data))

    return translated
