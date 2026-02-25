# マッチング＆スコアリングサービス
# 設計書 Section 5 準拠

from services.rule_engine import evaluate_eligibility, evaluate_condition


def build_company_data(company, financials: list, hr, profile) -> dict:
    """ORMオブジェクトからルールエンジン用の辞書を構築する"""
    latest_financial = financials[0] if financials else None
    
    data = {
        "capital_stock": company.capital_stock,
        "industry_code": company.industry_code,
        "prefecture": company.head_office_prefecture,
        "employee_count_regular": 0,
        "employee_count_total": 0,
        "employment_insurance": True,
        "social_insurance": True,
        "wage_raise_declared": False,
        "certifications": [],
        "value_added": 0,
        "labor_productivity": 0,
        "sales": 0,
        "lowest_wage": 0,
        # 成長率・減少率指標 (NEW)
        "sales_growth_rate": 0,
        "value_added_growth_rate": 0,
        "sales_reduction_rate": 0,
        "fiscal_periods_count": len(financials) if financials else 0,
        "training_system": None,
        "training_expenses": 0,
        "social_contribution": None,
        "equipment_list": [],
    }

    if hr:
        data.update({
            "employee_count_regular": hr.employee_count_regular,
            "employee_count_total": hr.employee_count_total,
            "employment_insurance": hr.employment_insurance,
            "social_insurance": hr.social_insurance,
            "wage_raise_declared": hr.wage_raise_declared,
            "lowest_wage": hr.lowest_wage,
            "training_system": getattr(hr, 'training_system', None),
            "training_expenses": getattr(hr, 'training_expenses', 0),
        })

    if latest_financial:
        data.update({
            "value_added": latest_financial.value_added,
            "labor_productivity": latest_financial.labor_productivity or 0,
            "sales": latest_financial.sales,
            "operating_profit": latest_financial.operating_profit,
            "ordinary_profit": latest_financial.ordinary_profit,
        })
        
        # 成長率の計算 (直近2期がある場合)
        if len(financials) >= 2:
            prev_f = financials[1]
            if prev_f.sales > 0:
                data["sales_growth_rate"] = ((latest_financial.sales / prev_f.sales) - 1) * 100
                data["sales_reduction_rate"] = (1 - (latest_financial.sales / prev_f.sales)) * 100
            if prev_f.value_added > 0:
                data["value_added_growth_rate"] = ((latest_financial.value_added / prev_f.value_added) - 1) * 100

    if profile:
        data["certifications"] = profile.certifications or []
        data["social_contribution"] = profile.social_contribution
        data["equipment_list"] = profile.equipment_list or []

    return data


def calc_dynamic_max_amount(subsidy_code: str, company_data: dict) -> int:
    """従業員数等に基づき、動的な補助上限額を算出する"""
    if subsidy_code == "shinjigyou_shinshutsu_2026":
        count = company_data.get("employee_count_total", 0)
        # 賃上げ加点（ wage_raise_declared ）がある場合は上限がアップ
        has_wage_bonus = company_data.get("wage_raise_declared", False)
        
        if count <= 20:
            return 30000000 if has_wage_bonus else 25000000
        elif count <= 50:
            return 50000000 if has_wage_bonus else 40000000
        elif count <= 100:
            return 70000000 if has_wage_bonus else 55000000
        else:
            return 90000000 if has_wage_bonus else 70000000
            
    return 0


def calc_dynamic_rate(subsidy, company_data: dict) -> tuple[int, int, str | None]:
    """補助率変動ルールに基づき、最適な補助率を算出する"""
    num = subsidy.subsidy_rate_numerator or 1
    den = subsidy.subsidy_rate_denominator or 2
    applied_rule_desc = None

    requirements = subsidy.requirements or {}
    rate_rules = requirements.get("rate_rules", [])

    for rule in rate_rules:
        condition = rule.get("condition")
        if condition and evaluate_condition(condition, company_data):
            # ルールが適用された場合、より有利な補助率を選択（分子/分母の比較は簡易化）
            new_num = rule.get("new_numerator", num)
            new_den = rule.get("new_denominator", den)
            
            # 補助率の評価（ここでは単純に新しい方を採用）
            num, den = new_num, new_den
            applied_rule_desc = rule.get("description")
            break # 最初のマッチを採用

    return num, den, applied_rule_desc


def match_subsidy(subsidy, company_data: dict) -> dict:
    """1つの補助金に対してマッチング＆スコアリングを実行する
    現状の判定に加え、最大化シミュレーション(Max Potential)も実行する。
    """
    # 既存のロジック: 現状の判定
    requirements = subsidy.requirements or {"logic": "AND", "conditions": []}
    eligibility = evaluate_eligibility(requirements, company_data)

    target_regions = [r.strip() for r in subsidy.target_region.split(",")] if subsidy.target_region else ["ALL"]
    region_ok = "ALL" in target_regions or company_data.get("prefecture") in target_regions
    
    target_inds = [i.strip() for i in subsidy.target_industries.split(",")] if subsidy.target_industries else ["ALL"]
    industry_ok = "ALL" in target_inds or company_data.get("industry_code", "") in target_inds
    
    capital_ok = subsidy.max_capital is None or company_data.get("capital_stock", 0) <= subsidy.max_capital
    employees_ok = subsidy.max_employees is None or company_data.get("employee_count_regular", 0) <= subsidy.max_employees

    basic_eligible = region_ok and industry_ok and capital_ok and employees_ok
    final_eligible = basic_eligible and eligibility["eligible"]

    # 現状のスコアリング
    bonus_points = subsidy.bonus_points or []
    score = 0
    max_score = 0
    fulfilled = []
    unfulfilled = []

    for bonus in bonus_points:
        points = bonus.get("points", 0)
        max_score += points
        if evaluate_condition(bonus, company_data):
            score += points
            fulfilled.append(bonus.get("description", bonus.get("field", "")))
        else:
            unfulfilled.append(bonus)

    # 動的上限と補助率
    rate_num, rate_den, applied_rate_desc = calc_dynamic_rate(subsidy, company_data)
    final_max_amount = subsidy.max_amount
    if not final_max_amount:
        final_max_amount = calc_dynamic_max_amount(subsidy.subsidy_code, company_data) or 0

    # --- NEW: 最大化シミュレーション (Max Potential) ---
    # すべての優遇条件を満たしたと仮定した仮想データを作成
    max_data = company_data.copy()
    max_data["wage_raise_declared"] = True # 最も一般的な優遇条件
    max_data["certifications"] = list(set(max_data.get("certifications", []) + ["DX認定", "くるみん認定", "えるぼし認定"]))
    
    # 仮想データでの上限と率
    pot_num, pot_den, pot_desc = calc_dynamic_rate(subsidy, max_data)
    pot_max_amount = subsidy.max_amount
    if not pot_max_amount:
        pot_max_amount = calc_dynamic_max_amount(subsidy.subsidy_code, max_data) or 0
    
    # ギャップ分析（最大化するために何が必要か）
    gap_analysis = []
    
    # 未達成の補助率アップルールを抽出
    for rule in (requirements.get("rate_rules", [])):
        condition = rule.get("condition")
        if condition and not evaluate_condition(condition, company_data):
            # このルールが適用された場合の仮想補助率
            new_num = rule.get("new_numerator", rate_num)
            new_den = rule.get("new_denominator", rate_den)
            
            # 現状より有利な場合のみ提案
            if (new_num / new_den) > (rate_num / rate_den):
                gap_analysis.append({
                    "action": f"{rule.get('description', '特定の条件')}を満たしてください",
                    "impact": f"補助率が {new_num}/{new_den} にアップします",
                    "type": "RATE_UP",
                    "difficulty": "MEDIUM",
                    "estimated_time": "1ヶ月"
                })

    # 既存の賃上げによる上限アップロジック（暫定）
    if not company_data.get("wage_raise_declared") and pot_max_amount > final_max_amount:
        gap_analysis.append({
            "action": "賃上げ表明を実行してください",
            "impact": f"補助上限が {int(pot_max_amount/10000):,}万円 にアップします",
            "type": "AMOUNT_UP",
            "difficulty": "MEDIUM",
            "estimated_time": "即時"
        })

    # 加点メタ定義
    BONUS_METADATA = {
        "経営革新計画": {
            "difficulty": "HARD",
            "time": "3-4ヶ月",
            "steps": [
                "「付加価値額」年率3%以上の向上を軸とした新事業計画の策定",
                "認定経営革新等支援機関（商工会議所・銀行等）による確認・指導",
                "都道府県知事への申請・審査会でのヒアリング対応",
                "承認通知の受領（多くの補助金で最大級の加点要素）"
            ]
        },
        "事業継続力強化計画": {
            "difficulty": "EASY",
            "time": "2週間-1ヶ月",
            "steps": [
                "自社のハザードマップ確認と自然災害リスクの特定",
                "防災・減災設備の導入および安否確認フローの策定",
                "経済産業局への電子申請（GビズIDが必要）",
                "認定通知の受領（ものづくり補助金等の必須級加点）"
            ]
        },
        "賃上げ表明": {
            "difficulty": "MEDIUM",
            "time": "即時（決議のみ）",
            "steps": [
                "「給与総額」を1.5%〜3%以上引き上げる具体的シミュレーション",
                "全従業員への方針周知（表明書の作成・署名含む）",
                "採択後の実績不達成による「補助金返還規定」の十分な理解",
                "申請画面での誓約チェック（または書類添付）"
            ]
        },
        "パートナーシップ構築宣言": {
            "difficulty": "EASY",
            "time": "1-3日",
            "steps": [
                "ポータルサイトでの「下請け取引適正化」等の宣言文作成",
                "企業代表者名での登録ボタン押下",
                "ポータルサイトへの掲載確認（定期的な更新が必要）"
            ]
        },
        "DX認定": {
            "difficulty": "MEDIUM",
            "time": "2-4ヶ月",
            "steps": [
                "「DX推進の方向性」および「デジタル技術活用の戦略」の明文化",
                "IPAの自己診断システムを実施し、現状のデジタル成熟度を把握",
                "経済産業省（IPA）への電子申請および審査対応",
                "認定ロゴの受領（IT導入補助金等の加点対象）"
            ]
        },
        "健康経営優良法人": {
            "difficulty": "MEDIUM",
            "time": "6ヶ月-1年（年1回募集）",
            "steps": [
                "協会けんぽ等の「健康宣言」へのエントリー",
                "健康診断受診率100%の維持および再検査勧奨の徹底",
                "毎年の申請期間内（夏〜秋）でのウェブ申請",
                "「日本健康会議」による認定発表（翌年3月頃）"
            ]
        },
        "SECURITY ACTION": {
            "difficulty": "EASY",
            "time": "1日",
            "steps": [
                "IPAサイトでの「一つ星」または「二つ星」自己宣言",
                "情報セキュリティ5か条（一つ星）の実践誓約",
                "自己宣言IDの取得（IT導入補助金の必須要件）"
            ]
        }
    }

    for item in unfulfilled:
        desc = item.get('description', item.get('field', ''))
        meta = next((v for k, v in BONUS_METADATA.items() if k in desc), {
            "difficulty": "MEDIUM",
            "time": "1-2ヶ月",
            "steps": ["要件の詳細確認", "必要書類の準備", "申請手続き"]
        })
        
        gap_analysis.append({
            "action": f"「{desc}」を満たしてください",
            "impact": f"採択スコアが {item.get('points', 0)}点 加算されます",
            "type": "SCORE_UP",
            "difficulty": meta["difficulty"],
            "estimated_time": meta["time"],
            "steps": meta["steps"]
        })

    # レコメンデーションは既存互換のため残す
    recommendations = []
    for g in gap_analysis:
        recommendations.append({
            "action": g["action"],
            "points_gain": 0, # スコア以外も含むためダミー
            "difficulty": "MEDIUM",
            "new_rank_if_fulfilled": "S",
        })

    ratio = score / max_score if max_score > 0 else 0
    rank = "S" if ratio >= 0.8 else "A" if ratio >= 0.6 else "B" if ratio >= 0.4 else "C"

    return {
        "subsidy_id": subsidy.id,
        "eligible": final_eligible,
        "score": score,
        "max_score": max_score,
        "rank": rank,
        "fulfilled_items": fulfilled,
        "recommendations": recommendations,
        "eligibility_details": eligibility["results"],
        "matched_max_amount": final_max_amount,
        "matched_rate": f"{rate_num}/{rate_den}",
        "applied_rate_description": applied_rate_desc,
        "max_potential_amount": pot_max_amount, # NEW
        "max_potential_rate": f"{pot_num}/{pot_den}", # NEW
        "gap_analysis": gap_analysis, # NEW
    }
