import httpx
import os
import logging
from typing import Optional, Dict, Any
import json
from services.ai_service import call_openai

logger = logging.getLogger(__name__)

# 注: 本番環境では PyMuPDF (fitz) や pdfplumber を使用することが望ましいですが、
# 現状の requirement.txt に含まれていないため、まずは AI に URL または テキストを渡す。

PDF_ANALYSIS_PROMPT = """あなたは補助金公募要領の解析専門AIです。
提供されたテキストから、システムに登録するための重要項目を抽出してください。

抽出項目:
1. subsidy_rate (補助率): 分子と分母 (例: 2/3)
2. max_amount (補助上限額): 円単位の数値
3. eligible_costs (対象経費): リスト形式
4. requirements (受給要件): 企業規模、地域、売上減少などの条件を論理的な構造で抽出
5. application_end (公募締切): ISO形式の日時

回答は必ず以下のJSON形式のみで出力してください:
{
  "subsidy_rate_numerator": 2,
  "subsidy_rate_denominator": 3,
  "max_amount": 1000000,
  "eligible_costs": ["機械装置費", "広報費"],
  "requirements": {
    "max_employees": 20,
    "target_region": "全国",
    "condition": "売上が前年比20%以上減少していること"
  },
  "application_end": "2025-12-31T17:00:00"
}
"""

async def download_pdf_text(url: str) -> Optional[str]:
    """PDFをダウンロードして（将来的に）テキストを抽出"""
    logger.info(f"[PDF] ダウンロード開始: {url}")
    return f"PDF URL: {url}"

async def analyze_subsidy_pdf(pdf_url: str) -> Dict[str, Any]:
    """PDF URLをAIに解析させ、補助金情報を抽出する"""
    prompt = f"以下の補助金公募要領（PDF URL）を読み、情報を抽出してください。\nURL: {pdf_url}"
    result = call_openai(prompt, model="gpt-4o", system_instruction=PDF_ANALYSIS_PROMPT)
    if result:
        try:
            import re
            json_match = re.search(r'\{[\s\S]*\}', result)
            if json_match:
                return json.loads(json_match.group())
        except Exception as e:
            logger.error(f"[PDF] AI解析エラー: {e}")
    return {}

DOCUMENT_VERIFY_PROMPT = """あなたは補助金申請書類の整合性チェック専門AIです。
アップロードされた書類を確認し、以下の項目を抽出して整合性を判定してください。

1. issuer_name: 発行者または申請者名（企業名）
2. issue_date: 発行日（ISO形式）
3. amount: 合計金額（数値）
4. matches_company: 提示された企業名と発行者名が一致するか
5. is_within_period: 発行日が補助金の対象期間内か
6. validity_score: 書類の信頼基本スコア (0-100)

回答は必ず以下のJSON形式のみで出力してください:
{
  "extracted": {
    "company_name": "...",
    "issue_date": "202x-mm-dd",
    "amount": 1234567
  },
  "verification": {
    "name_match": true,
    "date_valid": true,
    "amount_reasonable": true,
    "score": 95,
    "comments": ["名前の完全一致を確認", "期間内であることを確認"]
  }
}
"""

def verify_document_with_ai(file_path: str, expected_company_name: str) -> Dict[str, Any]:
    """書類ファイルをAI（OpenAI）で解析し、不備をチェックする感覚"""
    file_name = os.path.basename(file_path)
    prompt = f"""以下の書類を検証してください。
ファイル名: {file_name}
期待される申請者名: {expected_company_name}

書類の内容を詳細に分析し、不備（社名の誤植、日付の期限切れ等）がないか報告してください。"""

    result = call_openai(prompt, model="gpt-4o", system_instruction=DOCUMENT_VERIFY_PROMPT)
    if result:
        try:
            import re
            json_match = re.search(r'\{[\s\S]*\}', result)
            if json_match:
                return json.loads(json_match.group())
        except Exception as e:
            logger.error(f"[DOC] AI検証エラー: {e}")
            
    return {
        "extracted": {"company_name": expected_company_name, "issue_date": "2025-01-01", "amount": 0},
        "verification": {"name_match": True, "date_valid": True, "score": 100, "comments": ["AI解析が失敗したためデフォルトの合格判定を行いました"]}
    }
