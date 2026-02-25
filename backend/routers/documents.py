# 書類管理 APIルーター
# 設計書 Section 1.5 準拠

import os
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
from models import Document, Company

router = APIRouter(prefix="/api/companies", tags=["書類管理"])

# アップロード先ディレクトリ（開発用: ローカル / 本番: S3）
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/{company_id}/documents", status_code=201)
def upload_document(
    company_id: str,
    doc_type: str = Form(...),
    fiscal_year: int = Form(None),
    expiry_date: str = Form(None),
    category: str = Form("COMMON"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """書類をアップロードする"""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="企業が見つかりません")

    # ファイルを保存
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename or "")[1]
    save_name = f"{file_id}{ext}"
    save_path = os.path.join(UPLOAD_DIR, save_name)

    with open(save_path, "wb") as f:
        content = file.file.read()
        f.write(content)

    # 有効期限のパース
    expiry = None
    if expiry_date:
        try:
            from datetime import date
            expiry = datetime.strptime(expiry_date, "%Y-%m-%d").date()
        except ValueError:
            pass

    doc = Document(
        company_id=company_id,
        doc_type=doc_type,
        file_name=file.filename or "unknown",
        file_path=save_path,
        mime_type=file.content_type or "application/octet-stream",
        fiscal_year=fiscal_year,
        expiry_date=expiry,
        category=category,
        ocr_extracted=False,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    return {
        "id": doc.id,
        "doc_type": doc.doc_type,
        "file_name": doc.file_name,
        "mime_type": doc.mime_type,
        "fiscal_year": doc.fiscal_year,
        "expiry_date": doc.expiry_date.isoformat() if doc.expiry_date else None,
        "category": doc.category,
        "upload_date": doc.upload_date.isoformat() if doc.upload_date else None,
        "ocr_extracted": doc.ocr_extracted,
    }


@router.get("/{company_id}/documents")
def list_documents(company_id: str, db: Session = Depends(get_db)):
    """企業の書類一覧を取得する"""
    docs = db.query(Document).filter(Document.company_id == company_id).order_by(Document.upload_date.desc()).all()
    return [
        {
            "id": d.id,
            "doc_type": d.doc_type,
            "file_name": d.file_name,
            "mime_type": d.mime_type,
            "fiscal_year": d.fiscal_year,
            "expiry_date": d.expiry_date.isoformat() if d.expiry_date else None,
            "category": d.category,
            "upload_date": d.upload_date.isoformat() if d.upload_date else None,
            "ocr_extracted": d.ocr_extracted,
        }
        for d in docs
    ]


@router.post("/{company_id}/documents/{doc_id}/verify")
def verify_document(company_id: str, doc_id: str, db: Session = Depends(get_db)):
    """書類をAIで検証する"""
    from services.pdf_parser import verify_document_with_ai

    doc = db.query(Document).filter(Document.id == doc_id, Document.company_id == company_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="書類が見つかりません")
    
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="企業が見つかりません")

    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="ファイルの実体が見つかりません")

    # AIによる検証実行
    report = verify_document_with_ai(doc.file_path, company.legal_name)
    
    return report


@router.delete("/{company_id}/documents/{doc_id}", status_code=204)
def delete_document(company_id: str, doc_id: str, db: Session = Depends(get_db)):
    """書類を削除する"""
    doc = db.query(Document).filter(Document.id == doc_id, Document.company_id == company_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="書類が見つかりません")

    # ファイルも削除
    if os.path.exists(doc.file_path):
        os.remove(doc.file_path)

    db.delete(doc)
    db.commit()
