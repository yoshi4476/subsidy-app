# OpenAI / ChatGPT 統合サービス
# 世界最高峰のプロンプトエンジニアリングを適用し、ROI、社会貢献、賃上げ、誠実性を担保した補助金申請支援を行う

import os
import json
from typing import Optional, List, Dict, Any

# OpenAI API キー（最初期化。利用時は get_api_key() を推奨）
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

def get_system_setting(key: str, default: Any = None) -> Any:
    """DBからシステム設定を取得する内部ユーティリティ"""
    from database import SessionLocal
    from models import SystemSetting
    db = SessionLocal()
    try:
        setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        return setting.value if setting else default
    except Exception as e:
        print(f"[AI_SETTINGS] Error fetching {key}: {e}")
        return default
    finally:
        db.close()

def get_api_key():
    """DBの設定、または環境変数からAPIキーを取得"""
    db_key = get_system_setting("openai_api_key")
    return db_key if db_key else OPENAI_API_KEY

# 利用可能なAIモデル一覧 (ChatGPT 5.2 対応)
AVAILABLE_MODELS = {
    "gpt-5.2": {
        "name": "ChatGPT 5.2 (Ultra Reasoning)",
        "provider": "OpenAI",
        "description": "世界最高峰の推論モデル。ROI分析、社会貢献度の策定、経営戦略の総括に最適。",
        "capabilities": ["strategic_planning", "roi_calculation", "social_impact_analysis", "total_supervision"],
    },
    "gpt-4o": {
        "name": "GPT-4o (Standard)",
        "provider": "OpenAI",
        "description": "高速かつ高精度。文章生成やサマリー作成に使用。",
        "capabilities": ["drafting", "summarization", "term_explanation"],
    },
}

# デフォルトモデル設定
DEFAULT_MODELS = {
    "quality_scoring": "gpt-5.2",
    "plan_review": "gpt-5.2",
    "improvement_suggestions": "gpt-5.2",
    "chat": "gpt-4o",
    "translation": "gpt-4o",
    "summarization": "gpt-4o",
    "total_supervision": "gpt-5.2",
}

def get_client():
    """OpenAI クライアントを取得"""
    api_key = get_api_key()
    if not api_key:
        return None
    try:
        from openai import OpenAI
        return OpenAI(api_key=api_key)
    except Exception as e:
        print(f"[AI] OpenAI初期化エラー: {e}")
        return None

def call_openai(prompt: str, model: str = None, system_instruction: str = "", response_format: str = "text") -> Optional[str]:
    """OpenAI APIを呼び出す"""
    # モデルが指定されていない場合はDBまたはデフォルト
    if not model:
        model = get_system_setting("ai_model_main", "gpt-5.2")
    
    client = get_client()
    if not client:
        return None
    try:
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})

        kwargs = {
            "model": model,
            "messages": messages,
            "temperature": 0.2, # 誠実性と論理性を重視
        }
        
        if response_format == "json_object":
            kwargs["response_format"] = {"type": "json_object"}

        response = client.chat.completions.create(**kwargs)
        return response.choices[0].message.content
    except Exception as e:
        print(f"[AI] OpenAI呼び出しエラー ({model}): {e}")
        return None

# ============================================================
# 世界最高峰のプロンプトエンジニアリング：品質評価（総括AI）
# ============================================================
QUALITY_SYSTEM_PROMPT = """あなたは補助金採択を確実にする「世界最高峰の経営コンサルタント」兼「誠実な補助金審査員」です。
提供された事業計画を、以下の「4大専門評価軸」で極めて厳格に、かつ分かりやすく評価してください。

【評価の4大専門軸】
1. ROI・経済合理性 (ROI & Economic Feasibility)
   - 補助金は単なる「もらいもの」ではなく、血税を投じた「公共投資」です。
   - 投資額に対する売上増、コスト削減、付加価値額の向上を数値（％や円）で厳密に評価。
   - 「投資回収期間」が現実的か、嘘のない誠実な予測かを診断。

2. 社会貢献・地域経済への波及効果 (Social Impact)
   - 単社の利益だけでなく、サプライチェーンや地域社会への貢献度を評価。
   - SDGs、環境負荷低減、生産性向上による社会課題解決の文脈を重視。

3. 賃上げ・人的資本経営 (Wage Increase & HR)
   - 「賃上げ税制」や「働き方改革」との整合性。
   - 賃上げが単なるコスト増ではなく、生産性向上に裏打ちされた「持続可能な再投資」であるか。

4. 独自性・競争優位 (DNA Differentiation)
   - 企業の「DNA（独自の強み）」が技術・サービスに結実しているか。
   - 専門用語を乱用せず、誰が読んでも「この会社にしかできない」と思わせる説得力。

【誠実性の原則】
- ハルシネーション（嘘の数字・実績）を一切排除し、事実に基づく論理構成のみを評価。
- 矛盾があれば容赦なく指摘し、ビジネスとして真に持続可能な改善を提案すること。

JSON形式で回答を返してください。"""

def ai_quality_score(plan_text: str, subsidy_title: str = "", knowledge_base: list = []) -> dict:
    """AI品質評価（ChatGPT 5.2利用）"""
    kb_context = ""
    if knowledge_base:
        kb_context = "\n=== 過去のナレッジ（成功のDNAと失敗のトリガー） ===\n"
        for idx, item in enumerate(knowledge_base[:8]):
            kb_context += f"- {item}\n"

    prompt = f"""以下の事業計画を多角的に査読・評価してください。誠実かつ高度な分析を求めます。

{"対象補助金: " + subsidy_title if subsidy_title else "汎用補助金枠"}
{kb_context}

--- 事業計画書 ---
{plan_text}
--- ここまで ---

出力形式（JSON）:
{{
  "scores": {{ "roi": "A", "social_impact": "B", "wage_increase": "A", "logic": "A" }},
  "overall_grade": "A",
  "adoption_probability": 85,
  "roi_analysis": "（投資対効果に関する専門的見解を、わかりやすい言葉で記述）",
  "social_contribution": "（賃上げ、地域貢献、社会への影響を評価）",
  "integrity_check": "（内容の整合性、嘘や矛盾の有無を確認）",
  "critical_improvements": ["具体的な改善提案1", "具体的な改善提案2"]
}}"""

    main_model = get_system_setting("ai_model_main", "gpt-5.2")
    result = call_openai(prompt, model=main_model, system_instruction=QUALITY_SYSTEM_PROMPT, response_format="json_object")

    if result:
        try:
            return json.loads(result)
        except Exception:
            pass

    return _fallback_quality_score(plan_text)

def _fallback_quality_score(plan_text: str) -> dict:
    """フォールバック（簡易版）"""
    return {
        "scores": {"roi": "B", "social_impact": "B", "wage_increase": "B", "logic": "B"},
        "overall_grade": "B",
        "adoption_probability": 50,
        "roi_analysis": "APIエラーのため簡易チェック。数値の具体性を確認してください。",
        "social_contribution": "社会貢献、賃上げに関する記述を強化することを推奨します。",
        "integrity_check": "整合性は概ね良好ですが、AIによる詳細検知ができませんでした。",
        "critical_improvements": ["APIキーの設定を確認してください。"]
    }

# ============================================================
# 世界最高峰のプロンプトエンジニアリング：文章生成（マスタライター）
# ============================================================
GENERATE_SYSTEM_PROMPT = """あなたは補助金申請の「マスタライター」であり、企業のDNAを言語化する専門家です。
「ChatGPT 5.2」の高度な推論を駆使し、以下の基準で文章を生成します。

1. 専門性と平易さの融合
   - 難しい専門用語を噛み砕き、審査員が「この事業は素晴らしい」と直感できる、力強くも謙虚な表現。
2. 徹底的なROI思考
   - 全ての投資には。具体的な「成果（Output）」と「価値（Outcome）」を伴わせること。
   - なぜこの金額が必要なのか、どう事業を飛躍させるのかを論理的に繋ぐ。
3. 誠実な社会性
   - 賃上げや人的資本への投資を、企業の成長エンジンとして位置づける。
   - 社会・地域経済の役に立つ「大義」を文章の端々に込める。
4. 嘘のない記述
   - 事実を誇張せず、ポテンシャルを最大限に伝える。
   - 実現不可能な約束はせず、リスクへの備えを含めた誠実な計画。"""

def ai_generate_full_plan(company_data: dict, subsidy_info: dict, knowledge_base: list = []) -> Optional[dict]:
    """事業計画書の全ドラフトを「専門性」と「社会性」を込めて一括生成"""
    
    company_context = f"\n企業DNA情報: {json.dumps(company_data, ensure_ascii=False, default=str)}"
    subsidy_context = f"\n補助金要件: {json.dumps(subsidy_info, ensure_ascii=False, default=str)}"
    
    kb_context = ""
    if knowledge_base:
        kb_context = "\n\n=== 参照ナレッジ（成功の型と失敗の教訓） ===\n"
        for item in knowledge_base[:10]:
            kb_context += f"- {item}\n"

    prompt = f"""企業の魂（DNA）を補助金に結実させる、最高品質の事業計画書を作成してください。
{company_context}
{subsidy_context}
{kb_context}

【必須構成】
1. 事業の背景と社会的意義（なぜこの会社が、今やるべきなのか）
2. 投資対効果（ROI）の最大化（どう利益を生み、どう回収するか）
3. 賃上げと雇用への貢献（従業員の幸せと会社の成長の両立）
4. 具体的な実施内容とリスク管理（誠実で確実な実行計画）

出力はマークダウン形式で行い、各セクションに見出しを付けてください。総文字数は3500文字程度を目指し、魂の震えるような説得力を持たせてください。"""

    main_model = get_system_setting("ai_model_main", "gpt-5.2")
    result = call_openai(prompt, model=main_model, system_instruction=GENERATE_SYSTEM_PROMPT)
    if result:
        return {
            "plan_markdown": result,
            "ai_model": main_model,
            "supervision": f"Total Controlled by {main_model}"
        }
    return None

def ai_generate_plan_section(section_name: str, user_input: str, company_data: dict = {}, subsidy_info: dict = {}, knowledge_base: list = []) -> Optional[str]:
    """特定の申請書セクションを生成する（RAG対応）"""
    kb_context = ""
    if knowledge_base:
        kb_context = "\n=== 参照ナレッジ ===\n"
        for item in knowledge_base[:5]:
            kb_context += f"- {item}\n"

    prompt = f"""以下の情報に基づき、補助金申請書の「{section_name}」セクションを生成してください。
ユーザーの入力内容: {user_input}
企業DNA: {json.dumps(company_data, ensure_ascii=False)}
補助金情報: {json.dumps(subsidy_info, ensure_ascii=False)}
{kb_context}

要件:
- 企業の強み（DNA）を活かした論理的な文章にすること。
- ROI（投資効果）と社会貢献の視点を必ず含めること。
- 誠実かつ専門的なトーンで記述すること。
"""
    sub_model = get_system_setting("ai_model_sub", "gpt-4o")
    return call_openai(prompt, model=sub_model, system_instruction=GENERATE_SYSTEM_PROMPT)

def ai_improvement_suggestions(plan_text: str, knowledge_base: list = []) -> Optional[dict]:
    """誠実なAIによる総括的な改善提案"""
    system_prompt = """あなたは「誠実な経営軍師」です。
AIならではの冷徹な分析と、人間味のある応援のメッセージを組み合わせ、事業計画の「勝率」を究極まで引き上げるアドバイスを行います。"""

    prompt = f"""現在の事業計画書を査読し、ROI（収益性）、社会貢献、賃上げ、論理矛盾の観点から改善案を提示してください。
嘘や誇張があれば厳しく指摘し、企業のDNAをより輝かせる方法を教えてください。

--- 事業計画書 ---
{plan_text}

JSON形式で回答:
{{
  "win_rate": 70,
  "roi_score": 8,
  "social_score": 7,
  "integrity_check": "矛盾点の抽出",
  "advice": [
    {{ "priority": "高", "theme": "ROIの再設計", "content": "具体的な計算式を加えることで説得力が倍増します。" }},
    ...
  ],
  "message_from_ai": "（企業への激励メッセージ）"
}}"""

    main_model = get_system_setting("ai_model_main", "gpt-5.2")
    result = call_openai(prompt, model=main_model, system_instruction=system_prompt, response_format="json_object")
    if result:
        try:
            return json.loads(result)
        except Exception:
            pass
    return None

def ai_critical_review(plan_text: str, subsidy_requirements: str = "", plan_data: dict = None) -> Optional[dict]:
    """審査員モード：最高峰の査読機能"""
    system_prompt = """あなたは「国家予算を預かる厳格な審査員」です。
一円の無駄も許さない冷徹な視点と、事業を成功に導きたいという深い情熱を持って、計画に『赤入れ（添削）』をします。
専門用語におもねらず、本質的な収益性と社会性を問い、嘘や矛盾を絶対に見逃しません。"""

    prompt = f"""以下の事業計画を審査員として査読し、修正が必要な箇所を「赤入れ」として抽出してください。
要件: {subsidy_requirements}

--- 事業計画 ---
{plan_text}

JSON形式で、指摘箇所(target_text)と具体的修正案を出力してください。"""

    main_model = get_system_setting("ai_model_main", "gpt-5.2")
    result = call_openai(prompt, model=main_model, system_instruction=system_prompt, response_format="json_object")
    if result:
        try:
            return json.loads(result)
        except Exception:
            pass
    return None
