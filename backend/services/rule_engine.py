# 動的ルールエンジン
# JSONベースの条件式を評価し、補助金の適格性を判定する
# 設計書 Section 0.2 / Section 5.1 準拠

import operator
from typing import Any

# 演算子マッピング
OPERATORS = {
    ">=": operator.ge,
    "<=": operator.le,
    ">": operator.gt,
    "<": operator.lt,
    "==": operator.eq,
    "!=": operator.ne,
    "IN": lambda a, b: a in b,
    "NOT_IN": lambda a, b: a not in b,
    "CONTAINS": lambda a, b: b in a if isinstance(a, list) else False,
    "NOT_CONTAINS": lambda a, b: b not in a if isinstance(a, list) else True,
}


def get_nested_value(obj: dict, field_path: str) -> Any:
    """ドット区切りのフィールドパスからネストされた値を取得する
    例: 'company.capital_stock' → obj['company']['capital_stock']
    """
    keys = field_path.split(".")
    value = obj
    for key in keys:
        if isinstance(value, dict):
            value = value.get(key)
        else:
            return None
        if value is None:
            return None
    return value


def evaluate_condition(condition: dict, company_data: dict) -> bool:
    """単一条件を評価する"""
    field = condition.get("field", "")
    op_str = condition.get("operator", "==")
    expected = condition.get("value")

    actual = get_nested_value(company_data, field)

    if actual is None:
        return False

    op_func = OPERATORS.get(op_str)
    if op_func is None:
        return False

    try:
        return op_func(actual, expected)
    except (TypeError, ValueError):
        return False


def evaluate_rule(rule: dict, company_data: dict) -> bool:
    """JSONルールを動的に評価する。コード変更なしで新補助金に対応可能。

    Args:
        rule: {"logic": "AND"|"OR", "conditions": [...]}
        company_data: 企業データの辞書

    Returns:
        ルール全体の合否
    """
    conditions = rule.get("conditions", [])
    if not conditions:
        return True

    logic = rule.get("logic", "AND")
    results = [evaluate_condition(cond, company_data) for cond in conditions]

    if logic == "AND":
        return all(results)
    elif logic == "OR":
        return any(results)
    elif logic == "NOT":
        return not any(results)
    else:
        return all(results)


def evaluate_eligibility(subsidy_requirements: dict, company_data: dict) -> dict:
    """補助金の全要件を評価し、結果を返す

    Returns:
        {
            "eligible": bool,
            "results": [{"condition": {...}, "met": bool}, ...]
        }
    """
    conditions = subsidy_requirements.get("conditions", [])
    results = []

    for cond in conditions:
        met = evaluate_condition(cond, company_data)
        results.append({
            "condition": cond,
            "met": met,
            "field": cond.get("field"),
            "description": cond.get("description", ""),
        })

    eligible = evaluate_rule(subsidy_requirements, company_data)

    return {
        "eligible": eligible,
        "results": results,
    }
