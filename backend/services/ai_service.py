# AI モデル統合サービス
# Gemini 等の多彩なAIモデルを利用して、申請書の品質評価・改善提案・文章生成を行う

import os
import json
from typing import Optional

# Gemini API キー（環境変数から取得）
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

# 利用可能なAIモデル一覧
AVAILABLE_MODELS = {
    "gemini-2.5-pro": {
        "name": "Gemini 2.5 Pro",
        "provider": "Google",
        "description": "高度な推論・分析に最適。採択判定・品質評価に使用。",
        "capabilities": ["quality_scoring", "plan_review", "improvement_suggestions"],
    },
    "gemini-2.5-flash": {
        "name": "Gemini 2.5 Flash",
        "provider": "Google",
        "description": "高速レスポンス。対話ウィザードや翻訳に使用。",
        "capabilities": ["chat", "translation", "quick_analysis"],
    },
    "gemini-2.0-flash": {
        "name": "Gemini 2.0 Flash",
        "provider": "Google",
        "description": "軽量・高速。用語解説やサマリー生成に使用。",
        "capabilities": ["summarization", "term_explanation"],
    },
}

# デフォルトモデル設定
DEFAULT_MODELS = {
    "quality_scoring": "gemini-2.5-pro",
    "plan_review": "gemini-2.5-pro",
    "improvement_suggestions": "gemini-2.5-pro",
    "chat": "gemini-2.5-flash",
    "translation": "gemini-2.5-flash",
    "summarization": "gemini-2.0-flash",
}


def get_client():
    """Google GenAI クライアントを取得"""
    if not GEMINI_API_KEY:
        return None
    try:
        from google import genai
        client = genai.Client(api_key=GEMINI_API_KEY)
        return client
    except Exception as e:
        print(f"[AI] Gemini初期化エラー: {e}")
        return None


def call_gemini(prompt: str, model: str = "gemini-2.5-flash", system_instruction: str = "") -> Optional[str]:
    """Gemini APIを呼び出す（APIキーなしの場合はNone返却）"""
    client = get_client()
    if not client:
        return None
    try:
        config = {}
        if system_instruction:
            config["system_instruction"] = system_instruction
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=config if config else None,
        )
        return response.text
    except Exception as e:
        print(f"[AI] Gemini呼び出しエラー ({model}): {e}")
        return None


# ============================================================
# AI品質評価（Gemini統合版）
# ============================================================
QUALITY_SYSTEM_PROMPT = """あなたは補助金申請書の品質評価専門AIです。
以下の4つの観点で事業計画書を評価してください。

評価基準:
- 具体性(specificity): 数値目標、固有名詞、具体的なデータの有無
- 論理一貫性(logic): 課題→解決策→効果のストーリーの整合性
- 実現可能性(feasibility): 実行体制、スケジュール、リソースの妥当性
- 差別化(differentiation): 競合との違い、自社独自の強みの明確さ

過去の採択データに基づく重要ポイント:
1. 数値の具体性が採択の最大要因（採択案件の92%が具体的Actionと数値目標を含む）
2. 「課題→解決策→効果」の論理構造が明確な案件は採択率85%以上
3. 市場データや外部データの引用がある案件は加点される傾向
4. 独自技術・特許の記載は差別化で高評価
5. 【超重要】提供された「不採択事例/反面教師」に類似する抽象的な表現、具体性の欠如、裏付けのない定性的な主張が見られた場合は、その部分を厳しく減点し、改善提案に必ず含めること。

JSON形式で回答してください:
{
  "scores": {"specificity": "A", "logic": "B", "feasibility": "A", "differentiation": "B"},
  "overall": "A",
  "feedback": [
    {"area": "具体性", "score": "A", "message": "改善提案..."},
    ...
  ],
  "adoption_probability": 75,
  "critical_improvements": ["改善点1", "改善点2"]
}

スコアはS/A/B/C/Dの5段階。adoption_probabilityは0-100の推定採択確率。"""


def ai_quality_score(plan_text: str, subsidy_title: str = "", knowledge_base: list = []) -> dict:
    """AI品質評価（Gemini利用、フォールバックはルールベース）"""
    kb_context = ""
    if knowledge_base:
        kb_context = "\n=== 過去のナレッジ（採択事例と不採択事例） ===\n"
        for idx, item in enumerate(knowledge_base[:5]):
            kb_context += f"【ナレッジ{idx+1}】\n{item}\n\n"

    prompt = f"""以下の事業計画書を評価してください。

{"対象補助金: " + subsidy_title if subsidy_title else ""}
{kb_context}
--- 事業計画書 ---
{plan_text}
--- ここまで ---"""

    result = call_gemini(prompt, model="gemini-2.5-pro", system_instruction=QUALITY_SYSTEM_PROMPT)

    if result:
        try:
            # JSON部分を抽出
            import re
            json_match = re.search(r'\{[\s\S]*\}', result)
            if json_match:
                return json.loads(json_match.group())
        except (json.JSONDecodeError, Exception):
            pass

    # フォールバック: ルールベース評価
    return _fallback_quality_score(plan_text)


def _fallback_quality_score(plan_text: str) -> dict:
    """ルールベースのフォールバック品質評価"""
    import re
    score = {"specificity": "B", "logic": "B", "feasibility": "B", "differentiation": "B"}

    # 具体性
    numbers = re.findall(r'\d+', plan_text)
    if len(numbers) >= 10:
        score["specificity"] = "A"
    elif len(numbers) < 5:
        score["specificity"] = "C"

    # 論理一貫性
    logic_kw = ["課題", "問題", "解決", "導入", "効果", "成果", "向上"]
    found = sum(1 for kw in logic_kw if kw in plan_text)
    if found >= 5:
        score["logic"] = "A"
    elif found < 3:
        score["logic"] = "C"

    # 実現可能性
    if len(plan_text) >= 1000:
        score["feasibility"] = "A"
    elif len(plan_text) < 500:
        score["feasibility"] = "C"

    # 差別化
    diff_kw = ["独自", "強み", "特許", "競合", "差別化", "優位"]
    diff_found = sum(1 for kw in diff_kw if kw in plan_text)
    if diff_found >= 3:
        score["differentiation"] = "A"
    elif diff_found < 1:
        score["differentiation"] = "C"

    grade_map = {"S": 5, "A": 4, "B": 3, "C": 2, "D": 1}
    reverse_map = {5: "S", 4: "A", 3: "B", 2: "C", 1: "D"}
    avg = sum(grade_map.get(v, 3) for v in score.values()) / len(score)
    overall = reverse_map.get(round(avg), "B")

    # 採択確率推定
    prob_map = {"S": 92, "A": 78, "B": 55, "C": 30, "D": 10}
    probability = prob_map.get(overall, 50)

    feedback = []
    if score["specificity"] in ("C", "D"):
        feedback.append({"area": "具体性", "score": score["specificity"], "message": "数値や固有名詞をもっと追加。売上見込み、導入台数、削減時間など具体的な数字を入れると説得力が増します。"})
    if score["logic"] in ("C", "D"):
        feedback.append({"area": "論理一貫性", "score": score["logic"], "message": "「課題→解決策→効果」のストーリーが不明瞭。なぜその投資が必要で、どう解決するかを明確に。"})
    if score["feasibility"] in ("C", "D"):
        feedback.append({"area": "実現可能性", "score": score["feasibility"], "message": "計画の詳細不足。実行体制、スケジュール、必要リソースについてもう少し具体的に。"})
    if score["differentiation"] in ("C", "D"):
        feedback.append({"area": "差別化", "score": score["differentiation"], "message": "競合との違いが不明瞭。自社ならではの強み、独自技術、競合にない特徴を強調。"})
    if not feedback:
        feedback.append({"area": "総合", "score": overall, "message": "品質良好。外部データ（市場規模等）の引用でさらに加点可能。"})

    return {
        "scores": score,
        "overall": overall,
        "feedback": feedback,
        "adoption_probability": probability,
        "critical_improvements": [f["message"] for f in feedback if f["area"] != "総合"],
        "ai_model": "fallback_rule_based",
    }


# ============================================================
# AI申請書文章生成
# ============================================================
def ai_generate_plan_section(section_name: str, user_input: str, company_data: dict = {}, subsidy_info: dict = {}, knowledge_base: list = []) -> Optional[str]:
    """AIが申請書の各セクションを生成する"""
    system_prompt = """あなたは補助金申請書の作成支援AIです。
ユーザーの回答を元に、採択される事業計画書のセクションを作成してください。

【厳守：プロフェッショナルな論理構成】
1. 結論ファースト：各段落の冒頭で最も重要な成果や結論を述べること。
2. 定量的根拠（ROI必須）：
   - 「効率が上がる」「売上が増える」といった抽象的な表現は一切禁止。
   - 必ず「○％の削減」「○万円の増益」「投資回収期間○年」といった具体的な数値を3つ以上含めること。
   - 投資対効果（ROI）を必ず算出し、その妥当性を文章で示すこと。
3. NGワードの徹底排除：
   - 「善処する」「努力する」「検討する」「頑張る」「～だと思う」などの主観的・弱腰な表現は絶対に使用しない。
   - 「～を実現する」「～を目指し、○月までに○を完了させる」と言い切ること。

【成功事例・反面教師の活用】
提供されたナレッジ（採択事例と不採択事例）を熟読し、必ず以下の制約を守って生成してください：
1. 「採択事例（優良なお手本）」の構成、具体性の粒度、説得力のある論理展開を完全に踏襲すること。特に市場データの引用方法や、リスク対策の記述方法を模倣せよ。
2. 「不採択事例（反面教師）」に見られるような「具体性・客観性の欠如」「数値目標のない定性的なだけの表現」「独自性のない抽象的な強み」は**絶対に避ける**こと。"""

    company_context = ""
    if company_data:
        company_context = f"\n\n企業情報: {json.dumps(company_data, ensure_ascii=False, default=str)}"

    subsidy_context = ""
    if subsidy_info:
        subsidy_context = f"\n補助金情報: {json.dumps(subsidy_info, ensure_ascii=False, default=str)}"
    
    kb_context = ""
    if knowledge_base:
        kb_context = "\n\n=== 過去のナレッジ（優良な採択文脈と避けるべき不採択文脈） ===\n"
        for idx, item in enumerate(knowledge_base[:5]):
            kb_context += f"【ナレッジ{idx+1}】\n{item}\n\n"

    prompt = f"""セクション「{section_name}」を作成してください。

ユーザーの回答: {user_input}
{company_context}
{subsidy_context}
{kb_context}

採択される事業計画書のセクションとして、300-500文字で作成してください。"""

    return call_gemini(prompt, model="gemini-2.5-flash", system_instruction=system_prompt)


def ai_generate_full_plan(company_data: dict, subsidy_info: dict, knowledge_base: list = []) -> Optional[dict]:
    """事業計画書全体のドラフトを一括生成する"""
    system_prompt = """あなたは補助金申請書のマスターライターです。
企業の「DNA（強み・財務・事業実態）」と「補助金要件」を高度に融合させ、採択率を極限まで高める包括的な事業計画書を作成してください。

【構成案】
1. 事業の背景と目的（なぜ今、この事業が必要か）
2. 自社の強みと本事業の整合性（自社のDNAをどう活かすか）
3. 具体的な事業内容（何を、いつ、誰に、どう提供するか）
4. 投資対効果と将来展望（数値目標と社会・経済的インパクト）
5. 【重要】採択率向上のためのAI分析アドバイス（事例データに基づく回避策）

【生成上の注意】
- 全体で一貫性のあるストーリーを展開すること。
- 各セクションに具体的な数値（ROI等）を必ず盛り込むこと。
- 過去の採択事例（ナレッジ）のトーン＆マナーを反映させること。
- 日本語として美しく、かつ説得力のある公文書形式で出力してください。"""

    company_context = f"\n企業情報: {json.dumps(company_data, ensure_ascii=False, default=str)}"
    subsidy_context = f"\n補助金要項: {json.dumps(subsidy_info, ensure_ascii=False, default=str)}"
    
    kb_context = ""
    if knowledge_base:
        kb_context = "\n\n=== 参照ナレッジ（成功・失敗のパターン） ===\n"
        for idx, item in enumerate(knowledge_base[:8]):
            kb_context += f"- {item}\n"

    prompt = f"""以下の情報に基づき、事業計画書の全セクションのドラフトを作成してください。
{company_context}
{subsidy_context}
{kb_context}

各セクションに見出しを付け、全体で3000文字程度のボリューミーかつ詳細なドラフトを出力してください。
JSON形式ではなく、マークダウン形式で直接出力してください。"""

    result = call_gemini(prompt, model="gemini-2.5-pro", system_instruction=system_prompt)
    if result:
        return {
            "plan_markdown": result,
            "sections": [
                "1. 事業の背景と目的",
                "2. 自社の強みと本事業の整合性",
                "3. 具体的な事業内容",
                "4. 投資対効果と将来展望"
            ],
            "ai_model": "gemini-2.5-pro"
        }
    return None


# ============================================================
# AI改善提案
# ============================================================
def ai_improvement_suggestions(plan_text: str, knowledge_base: list = []) -> Optional[dict]:
    """AIが過去の採択・不採択データに基づく改善提案を生成"""
    kb_context = ""
    if knowledge_base:
        kb_context = "\n\n=== 過去の採択・不採択事例から学んだ知見 ===\n"
        for item in knowledge_base[:10]:
            kb_context += f"- {item}\n"

    system_prompt = """あなたは補助金申請の採択率を向上させる専門AIアドバイザーです。
過去の採択・不採択データの知見を活用して、具体的な改善提案を行ってください。

JSON形式で回答:
{
  "current_probability": 60,
  "improved_probability": 85,
  "suggestions": [
    {"priority": 1, "area": "具体性", "suggestion": "...", "impact": "high"},
    ...
  ],
  "best_practices": ["..."],
  "common_mistakes_to_avoid": ["..."]
}"""

    prompt = f"""以下の事業計画書を分析し、採択確率を向上させる改善提案をしてください。
{kb_context}

--- 事業計画書 ---
{plan_text}
--- ここまで ---"""

    result = call_gemini(prompt, model="gemini-2.5-pro", system_instruction=system_prompt)
    if result:
        try:
            import re
            json_match = re.search(r'\{[\s\S]*\}', result)
            if json_match:
                return json.loads(json_match.group())
        except Exception:
            pass
    return None


# ============================================================
# 審査員モード（赤入れ）
# ============================================================
def ai_critical_review(plan_text: str, subsidy_requirements: str = "", plan_data: dict = None) -> Optional[dict]:
    """審査員モード：事業計画書を厳しく査読し、赤入れ箇所を特定する (Hybrid Checker)"""
    
    # 1. ルールベース矛盾検知 (Logic Check) を実行
    logic_results = []
    if plan_data:
        from services.qa_checker import run_consistency_check
        check_res = run_consistency_check(plan_data)
        logic_results = check_res.get("results", [])

    # 2. AI査読を実行
    system_prompt = """あなたは補助金審査委員会のベテラン審査員です。
提出された事業計画書を、採択基準（具体性、実現可能性、波及効果など）に基づいて冷徹かつ客観的に査読してください。

【査読のポイント】
1. 曖昧な表現：主観的な「頑張る」「思われる」等の表現は全てNG。
2. 根拠のない数値：売上や利益予測の算出根拠が不明瞭な部分は厳しく指摘。
3. 要件不適合：補助金の公募要領（もし提示されれば）に抵触、あるいは不足している点。
4. ストーリーの飛躍：課題の特定から解決策の導入までの論理が繋がっていない部分。

【出力形式】
JSON形式で、以下の通りの「赤入れリスト」を作成してください。指摘箇所(target_text)は原文から正確に抜き出してください。
{
  "total_score": 65,
  "judgement": "採択の可能性はあるが、財務根拠が極めて脆弱",
  "critical_flaws": [
    {
      "target_text": "売上の大幅な向上を目指します",
      "issue": "「大幅」という言葉が極めて抽象的。具体的な増加率や市場背景に基づく算出根拠が欠由している。",
      "severity": "high",
      "red_ink_comment": "数値目標（○％増）と、その計算根拠（客単価×客数増など）を明記せよ。"
    }
  ],
  "overall_summary": "全体的に具体性に欠け、補助金の目的を果たせるか疑問が残る。"
}"""

    prompt = f"""以下の事業計画書を査読してください。
{"公募要領の要点: " + subsidy_requirements if subsidy_requirements else ""}

--- 事業計画書 ---
{plan_text}
--- ここまで ---"""

    result = call_gemini(prompt, model="gemini-2.5-pro", system_instruction=system_prompt)
    if result:
        try:
            import re
            json_match = re.search(r'\{[\s\S]*\}', result)
            if json_match:
                final_data = json.loads(json_match.group())
                
                # 3. ルールベースの指摘をAIの結果にマージ（ハイブリッド）
                for lr in logic_results:
                    final_data.setdefault("critical_flaws", []).append({
                        "target_text": "数値整合性チェック (System)",
                        "issue": lr["message"],
                        "severity": lr["severity"].lower(),
                        "red_ink_comment": lr["suggestion"]
                    })
                    # 重大なロジックエラーがある場合、全体の判断を厳しくする
                    if lr["severity"] == "ERROR":
                        current_score = final_data.get("total_score", 100)
                        final_data["total_score"] = min(current_score, 45)
                        final_data["judgement"] = (final_data.get("judgement", "") + " [重大な数値矛盾を検知]").strip()

                return final_data
        except Exception:
            pass
    return None
