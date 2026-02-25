# RAG用ナレッジ登録（実データのアップロードと学習）API
# ユーザーがアップロードした採択済み申請書からテキストを抽出し、AIのナレッジとして保存する

import os
import uuid
import tempfile
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from database import get_db
from models import ApplicationCase, Company, Subsidy

router = APIRouter(prefix="/api/knowledge", tags=["RAGナレッジ管理"])

def extract_text(file_path: str, filename: str) -> str:
    """PDFまたはWordファイルからテキストをインメモリで抽出する"""
    ext = os.path.splitext(filename)[1].lower()
    text = ""
    
    try:
        if ext == ".pdf":
            # PyMuPDF (fitz) を使用したPDFテキスト抽出
            import fitz
            doc = fitz.open(file_path)
            for page in doc:
                text += page.get_text("text") + "\n"
                
        elif ext in [".docx", ".doc"]:
            # docx 抽出
            import docx
            doc = docx.Document(file_path)
            for para in doc.paragraphs:
                text += para.text + "\n"
                
        elif ext == ".txt":
            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read()
        else:
            raise ValueError(f"サポートされていないファイル形式です: {ext}")
            
        return text.strip()
    except Exception as e:
        print(f"[RAG EXTRACT ERROR] {e}")
        raise ValueError(f"テキストの抽出に失敗しました: {e}")

@router.post("/upload_success_case", status_code=201)
def upload_success_case(
    company_id: str = Form(...),
    subsidy_id: str = Form(...),
    year: int = Form(2025),
    result: str = Form("ADOPTED"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    過去の採択書類（PDF/Word等）をアップロードし、テキスト抽出後に
    システムに「学習用実データ(is_real_data=True)」として登録する
    """
    # 存在確認
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="企業が見つかりません")
        
    subsidy = db.query(Subsidy).filter(Subsidy.id == subsidy_id).first()
    if not subsidy:
        raise HTTPException(status_code=404, detail="対象の補助金情報が見つかりません")

    # 一時ファイルとして保存して解析
    with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
        content = file.file.read()
        tmp_file.write(content)
        temp_path = tmp_file.name

    try:
        extracted_text = extract_text(temp_path, file.filename)
    except ValueError as ve:
        os.remove(temp_path)
        raise HTTPException(status_code=400, detail=str(ve))
    
    os.remove(temp_path)
    
    if len(extracted_text) < 50:
        raise HTTPException(status_code=400, detail="抽出されたテキストが短すぎます。スキャンされた画像PDFの可能性があります。")

    # 実データとして「ApplicationCase」テーブルに保存
    # 抽出した全文を「plan_summary」または「lessons_learned」などの箱に格納してRAGで使用する
    
    # 簡単な概要生成(AIを利用しても良いがここでは冒頭数文字で代用)
    summary_preview = extracted_text[:500] + "..." if len(extracted_text) > 500 else extracted_text

    new_case = ApplicationCase(
        id=str(uuid.uuid4()),
        company_id=company_id,
        subsidy_id=subsidy_id,
        result=result,
        score_at_submission=None, # 実データなので不明
        lessons_learned=extracted_text, # 実データの全文をここに保存する運用
        is_anonymized=False, # 自社の生データなので匿名化されていない
        is_real_data=True,   # RAGで最優先にヒットさせるフラグ
        ai_quality_score={
            "plan_summary": f"【実データ登録】 {file.filename}",
            "raw_text_preview": summary_preview,
            "year": year
        }
    )
    
    db.add(new_case)
    db.commit()
    db.refresh(new_case)

    return {
        "id": new_case.id,
        "message": "学習用データの抽出と保存が完了しました",
        "extracted_length": len(extracted_text)
    }

@router.get("/my_cases")
def list_real_cases(company_id: str, db: Session = Depends(get_db)):
    """自社がアップロードした実データ事例の一覧"""
    cases = db.query(ApplicationCase).filter(
        ApplicationCase.company_id == company_id,
        ApplicationCase.is_real_data == True
    ).all()
    
    return [
        {
            "id": c.id,
            "filename": c.ai_quality_score.get("plan_summary", ""),
            "result": c.result,
            "year": c.ai_quality_score.get("year", 0),
            "text_length": len(c.lessons_learned) if c.lessons_learned else 0,
            "created_at": c.created_at
        }
        for c in cases
    ]
