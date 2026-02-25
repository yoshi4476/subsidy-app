# 採択学習ナレッジベースエンジン
# 過去の採択・不採択事例を分析し、採択率向上のための知見を抽出・活用する

import json
import os
from typing import Optional
from sqlalchemy.orm import Session

# ============================================================
# 採択/不採択パターンの知見データベース
# 実際の補助金審査で重視されるポイントを体系化
# ============================================================

ADOPTION_KNOWLEDGE_BASE = {
    # ===== ものづくり補助金 =====
    "monodzukuri": {
        "name": "ものづくり・商業・サービス生産性向上促進補助金",
        "adoption_rate_national": 0.58,
        "key_factors": [
            {
                "factor": "付加価値額の伸び率",
                "weight": 25,
                "description": "年率3%以上の付加価値額増加計画が必須。5%以上で加点。",
                "adopted_pattern": "3年間で付加価値額15%以上増加の具体的計画を提示",
                "rejected_pattern": "付加価値額の伸びが不明確、または計算根拠が不十分",
            },
            {
                "factor": "給与支給総額の伸び率",
                "weight": 20,
                "description": "年率1.5%以上の給与支給総額増加が必須条件。",
                "adopted_pattern": "賃金テーブルの改定案と合わせて給与増加計画を提示",
                "rejected_pattern": "給与の伸びの根拠が弱い、単なる希望的数値",
            },
            {
                "factor": "事業の革新性",
                "weight": 20,
                "description": "新製品・新サービスの革新性が審査員に伝わるか",
                "adopted_pattern": "具体的な技術要素、特許、独自ノウハウを定量的に説明",
                "rejected_pattern": "既存事業の延長に過ぎない、差別化が不明確",
            },
            {
                "factor": "実現可能性",
                "weight": 20,
                "description": "事業計画の実行体制と達成の見通し",
                "adopted_pattern": "専門人材の確保計画、設備導入スケジュール、リスク対策が具体的",
                "rejected_pattern": "体制が曖昧、スケジュールが非現実的",
            },
            {
                "factor": "政策加点",
                "weight": 15,
                "description": "経営革新計画、事業継続力強化計画等の認定による加点",
                "adopted_pattern": "2つ以上の計画認定を取得し、申請書にも具体的に記載",
                "rejected_pattern": "加点項目を取得していない",
            },
        ],
        "common_rejection_reasons": [
            "付加価値額の計算式が誤っている（営業利益+人件費+減価償却費）",
            "設備投資の必要性が不明確（なぜこの設備でないといけないのか）",
            "市場分析が甘い（ターゲット顧客、市場規模の根拠不足）",
            "収支計画の整合性がない（売上増の根拠と設備能力の不一致）",
            "事業の新規性が認められない（単なる老朽化設備の更新）",
        ],
        "best_practices": [
            "付加価値額は「営業利益+人件費+減価償却費」で正確に計算する",
            "設備導入前後の生産性を数値で比較する（時間/個、不良率%等）",
            "ターゲット市場の規模を外部データ（経産省統計等）で裏付ける",
            "3〜5年の収支計画を月次ベースで作成し、整合性を確認する",
            "経営革新計画の事前認定を受けておく（加点2〜5点）",
            "賃上げ計画は地域別最低賃金+30円以上で設定する",
            "デジタル技術の活用を具体的に記載する（DX加点）",
        ],
    },

    # ===== IT導入補助金 =====
    "it_hojo": {
        "name": "IT導入補助金",
        "adoption_rate_national": 0.72,
        "key_factors": [
            {
                "factor": "業務プロセスの改善効果",
                "weight": 30,
                "description": "IT導入による業務効率化の具体的効果",
                "adopted_pattern": "現在の業務フロー→導入後のフローを図解し、削減時間を定量化",
                "rejected_pattern": "漠然とした「効率化」の記述のみ",
            },
            {
                "factor": "導入ツールの適合性",
                "weight": 25,
                "description": "選定したITツールが課題解決に適切か",
                "adopted_pattern": "複数ツールを比較検討し、選定理由を明記",
                "rejected_pattern": "ツール選定の理由が不明確",
            },
            {
                "factor": "セキュリティ対策",
                "weight": 15,
                "description": "SECURITY ACTION宣言の実施",
                "adopted_pattern": "二つ星を取得し、情報セキュリティポリシーを策定済み",
                "rejected_pattern": "SECURITY ACTION未宣言",
            },
        ],
        "common_rejection_reasons": [
            "SECURITY ACTION宣言をしていない（必須要件）",
            "gBizIDプライムを取得していない（必須要件）",
            "導入するITツールが登録済みツールでない",
            "業務改善効果の記載が抽象的すぎる",
        ],
        "best_practices": [
            "SECURITY ACTION 二つ星を事前に取得しておく",
            "gBizIDプライムは申請の2週間以上前に取得開始する",
            "IT導入支援事業者との事前相談記録を残す",
            "導入前後の業務時間を時間単位で比較する",
        ],
    },

    # ===== 小規模事業者持続化補助金 =====
    "jizokuka": {
        "name": "小規模事業者持続化補助金",
        "adoption_rate_national": 0.65,
        "key_factors": [
            {
                "factor": "経営計画の妥当性",
                "weight": 30,
                "description": "自社の強みを活かした経営計画の質",
                "adopted_pattern": "SWOT分析に基づき、強みを活かした販路開拓策を明示",
                "rejected_pattern": "自社分析が浅い、強みと販路開拓策がつながっていない",
            },
            {
                "factor": "補助事業計画の有効性",
                "weight": 30,
                "description": "補助事業が売上拡大に寄与するか",
                "adopted_pattern": "ターゲット顧客を明確にし、販路開拓の具体策と数値目標を提示",
                "rejected_pattern": "ターゲットが曖昧、販路開拓策が具体性に欠ける",
            },
            {
                "factor": "商工会議所の推薦",
                "weight": 15,
                "description": "地域の商工会議所・商工会の推薦状",
                "adopted_pattern": "事前に商工会議所の指導を受け、推薦を取得",
                "rejected_pattern": "形式的な推薦のみ",
            },
        ],
        "common_rejection_reasons": [
            "自社の強みの分析が不十分",
            "補助事業と経営計画のつながりが不明確",
            "創業してから間もなく実績データが不足",
            "販路開拓ではなく単なる設備更新になっている",
        ],
        "best_practices": [
            "商工会議所の経営指導を3回以上受けてから申請する",
            "SWOT分析を丁寧に行い、経営計画に反映させる",
            "販路開拓の具体策（展示会出展、EC開設、チラシ配布等）を3つ以上記載",
            "目標とする顧客層のペルソナを具体的に設定する",
        ],
    },

    # ===== 事業再構築補助金（制度終了 - 過去データ学習用として保持） =====
    "jigyou_saikouchiku": {
        "name": "事業再構築補助金（※制度終了 - 参考データ）",
        "adoption_rate_national": 0.48,
        "status": "ENDED",
        "key_factors": [
            {
                "factor": "事業再構築の必要性",
                "weight": 25,
                "description": "なぜ事業再構築が必要かの説明",
                "adopted_pattern": "コロナ/市場変化による売上減少を数値で示し、再構築の必然性を論証",
                "rejected_pattern": "売上減少の理由が不明確、市場分析が不十分",
            },
            {
                "factor": "事業再構築指針への適合",
                "weight": 25,
                "description": "新分野展開/事業転換/業種転換/業態転換のいずれかに該当するか",
                "adopted_pattern": "類型を明確に選択し、該当要件を一つずつ証明",
                "rejected_pattern": "類型の選択が不適切、既存事業の延長と判断される",
            },
            {
                "factor": "市場の将来性",
                "weight": 25,
                "description": "再構築後の事業の市場性",
                "adopted_pattern": "参入市場の規模・成長率を外部データで裏付け、差別化戦略を提示",
                "rejected_pattern": "市場調査が不十分、実現性に疑問",
            },
        ],
        "common_rejection_reasons": [
            "事業再構築の定義（新分野展開等）に合致していない",
            "既存事業の単なる拡大と判断される",
            "市場ニーズの根拠が弱い",
            "投資額と期待効果のバランスが悪い",
        ],
        "best_practices": [
            "事業再構築指針を熟読し、類型の要件を一つずつクリアする",
            "認定経営革新等支援機関と連携して事業計画を策定する",
            "市場調査は経産省・矢野経済等の公的データを引用する",
            "投資回収計画をベース・楽観・悲観の3シナリオで作成する",
        ],
    },

    # ===== 省力化投資補助金 =====
    "shouryokuka": {
        "name": "中小企業省力化投資補助金",
        "adoption_rate_national": 0.70,
        "key_factors": [
            {
                "factor": "省力化の効果",
                "weight": 35,
                "description": "導入機器による省力化効果の定量化",
                "adopted_pattern": "現行の作業時間と導入後の作業時間を工程別に比較し、年間削減時間を算出",
                "rejected_pattern": "省力化効果が定性的な記述のみ",
            },
            {
                "factor": "カタログ掲載製品の選定",
                "weight": 30,
                "description": "省力化製品カタログに掲載された製品を適切に選定しているか",
                "adopted_pattern": "自社の課題に最も適した製品を選定し、その理由を明記",
                "rejected_pattern": "カタログ未掲載の製品を選定",
            },
        ],
        "common_rejection_reasons": [
            "省力化製品カタログに掲載されていない製品を申請",
            "省力化効果の数値根拠が不明確",
            "従業員数が要件を満たしていない",
        ],
        "best_practices": [
            "省力化製品カタログから自社に適した製品を選定する",
            "作業時間の計測データ（現行）を添付する",
            "導入メーカーからの見積書と削減効果の試算を入手する",
        ],
    },
}


# ============================================================
# 採択率をスコアにフィードバックする関数群
# ============================================================

def get_knowledge_for_subsidy(subsidy_code: str) -> dict:
    """補助金コードに基づいて知見データを取得"""
    code_mapping = {
        "MONO": "monodzukuri",
        "IT": "it_hojo",
        "JIZOKU": "jizokuka",
        "SAIKO": "jigyou_saikouchiku",
        "SHORYOKU": "shouryokuka",
    }
    key = None
    for prefix, kb_key in code_mapping.items():
        if subsidy_code and subsidy_code.startswith(prefix):
            key = kb_key
            break

    if key and key in ADOPTION_KNOWLEDGE_BASE:
        return ADOPTION_KNOWLEDGE_BASE[key]
    return {}


def analyze_plan_against_knowledge(plan_text: str, subsidy_code: str) -> dict:
    """事業計画書をナレッジベースと照合して分析"""
    kb = get_knowledge_for_subsidy(subsidy_code)
    if not kb:
        return {"score": 50, "details": [], "suggestions": []}

    score = 50  # ベーススコア
    details = []
    suggestions = []

    # ファクターベース評価
    for factor in kb.get("key_factors", []):
        factor_name = factor["factor"]
        weight = factor["weight"]
        adopted = factor.get("adopted_pattern", "")
        rejected = factor.get("rejected_pattern", "")

        # 採択パターンに含まれるキーワードの存在チェック
        adopted_keywords = _extract_keywords(adopted)
        rejected_keywords = _extract_keywords(rejected)

        adopted_match = sum(1 for kw in adopted_keywords if kw in plan_text)
        rejected_match = sum(1 for kw in rejected_keywords if kw in plan_text)

        if adopted_match >= len(adopted_keywords) * 0.3:
            factor_score = weight * 0.8
            details.append({"factor": factor_name, "status": "GOOD", "score": factor_score, "message": f"✅ {factor_name}: 採択パターンに合致"})
        elif rejected_match > adopted_match:
            factor_score = weight * 0.2
            details.append({"factor": factor_name, "status": "WARN", "score": factor_score, "message": f"⚠️ {factor_name}: 不採択パターンのリスクあり"})
            suggestions.append(f"【{factor_name}】{adopted}")
        else:
            factor_score = weight * 0.5
            details.append({"factor": factor_name, "status": "NEUTRAL", "score": factor_score, "message": f"📝 {factor_name}: さらに具体化が必要"})
            suggestions.append(f"【{factor_name}】{factor['description']}")

        score += (factor_score - weight * 0.5)  # ベースとの差分を加算

    # 不採択理由チェック
    rejection_risks = []
    for reason in kb.get("common_rejection_reasons", []):
        keywords = _extract_keywords(reason)
        if any(kw in plan_text for kw in keywords):
            # 不採択理由に触れているが、対策が書かれていない可能性
            pass
        else:
            rejection_risks.append(reason)

    # ベストプラクティスチェック
    followed_practices = []
    missing_practices = []
    for practice in kb.get("best_practices", []):
        keywords = _extract_keywords(practice)
        if sum(1 for kw in keywords if kw in plan_text) >= len(keywords) * 0.3:
            followed_practices.append(practice)
        else:
            missing_practices.append(practice)

    return {
        "score": min(max(int(score), 0), 100),
        "national_adoption_rate": kb.get("adoption_rate_national", 0),
        "details": details,
        "suggestions": suggestions[:5],
        "rejection_risks": rejection_risks[:3],
        "followed_practices": followed_practices,
        "missing_practices": missing_practices[:5],
        "subsidy_name": kb.get("name", ""),
    }


def _extract_keywords(text: str) -> list:
    """テキストから主要キーワードを抽出（簡易版）"""
    # 重要キーワード辞書
    important_terms = [
        "数値", "具体", "定量", "目標", "計画", "根拠", "データ",
        "市場", "顧客", "売上", "利益", "効果", "削減", "向上",
        "強み", "独自", "特許", "差別化", "技術", "ノウハウ",
        "体制", "人材", "スケジュール", "リスク",
        "付加価値", "生産性", "賃上げ", "収支",
        "SWOT", "分析", "課題", "解決", "革新",
        "設備", "投資", "導入", "省力化", "自動化",
        "認定", "計画", "経営革新", "事業継続力",
    ]
    return [kw for kw in important_terms if kw in text]


def get_adoption_tips(subsidy_code: str) -> list:
    """補助金に応じた採択のヒントを取得"""
    kb = get_knowledge_for_subsidy(subsidy_code)
    if not kb:
        return [
            "具体的な数値目標を3つ以上入れてください",
            "「課題→解決策→効果」の明確なストーリーを作ってください",
            "外部データ（市場規模等）を引用してください",
            "競合との差別化ポイントを明記してください",
            "実行体制とスケジュールを具体的に示してください",
        ]

    tips = []
    for bp in kb.get("best_practices", [])[:5]:
        tips.append(bp)
    for reason in kb.get("common_rejection_reasons", [])[:3]:
        tips.append(f"⚠️ 注意: {reason}")
    return tips


def get_all_knowledge_summary() -> list:
    """全補助金のナレッジサマリーを取得"""
    summary = []
    for key, kb in ADOPTION_KNOWLEDGE_BASE.items():
        summary.append({
            "key": key,
            "name": kb["name"],
            "national_adoption_rate": kb["adoption_rate_national"],
            "key_factor_count": len(kb.get("key_factors", [])),
            "best_practice_count": len(kb.get("best_practices", [])),
            "rejection_reason_count": len(kb.get("common_rejection_reasons", [])),
        })
    return summary
