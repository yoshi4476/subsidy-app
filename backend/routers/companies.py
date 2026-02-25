# 企業データ CRUD APIルーター
# 設計書 Section 1 準拠

from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.orm import Session
from database import get_db
from models import Company, FinancialStatement, HRData, BusinessProfile
from schemas import (
    CompanyCreate, CompanyResponse,
    FinancialStatementCreate, FinancialStatementResponse,
    HRDataCreate, HRDataResponse,
    BusinessProfileCreate, BusinessProfileResponse,
    CorporateDNAUpsert, CorporateDNAResponse,
)

router = APIRouter(prefix="/api/companies", tags=["企業管理"])


# ============================================================
# 企業 CRUD
# ============================================================
@router.post("/", response_model=CompanyResponse, status_code=201)
def create_company(data: CompanyCreate, db: Session = Depends(get_db)):
    """企業を新規登録する"""
    # 法人番号の重複チェック
    existing = db.query(Company).filter(Company.corporate_number == data.corporate_number).first()
    if existing:
        raise HTTPException(status_code=409, detail="この法人番号は既に登録されています")

    company = Company(
        **data.model_dump(exclude={"executives", "shareholders"}),
        executives=[e.model_dump() for e in data.executives],
        shareholders=[s.model_dump() for s in data.shareholders],
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


@router.get("/", response_model=list[CompanyResponse])
def list_companies(skip: int = 0, limit: int = 50, user_id: str = None, db: Session = Depends(get_db)):
    """企業一覧を取得する"""
    query = db.query(Company)
    if user_id:
        query = query.filter(Company.user_id == user_id)
    results = query.offset(skip).limit(limit).all()
    return results


@router.get("/{company_id}", response_model=CompanyResponse)
def get_company(company_id: str, db: Session = Depends(get_db)):
    """企業詳細を取得する"""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="企業が見つかりません")
    return company


@router.put("/{company_id}", response_model=CompanyResponse)
def update_company(company_id: str, data: CompanyCreate, db: Session = Depends(get_db)):
    """企業情報を更新する"""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="企業が見つかりません")

    for key, val in data.model_dump(exclude={"executives", "shareholders"}).items():
        setattr(company, key, val)
    company.executives = [e.model_dump() for e in data.executives]
    company.shareholders = [s.model_dump() for s in data.shareholders]

    db.commit()
    db.refresh(company)
    return company


@router.delete("/{company_id}", status_code=204)
def delete_company(company_id: str, db: Session = Depends(get_db)):
    """企業を削除する"""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="企業が見つかりません")
    db.delete(company)
    db.commit()


# ============================================================
# 財務データ CRUD
# ============================================================
@router.post("/{company_id}/financials", response_model=FinancialStatementResponse, status_code=201)
def create_financial(company_id: str, data: FinancialStatementCreate, db: Session = Depends(get_db)):
    """財務データを登録する（付加価値額・労働生産性は自動計算）"""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="企業が見つかりません")

    # 付加価値額を自動計算
    value_added = data.operating_profit + data.labor_cost + data.depreciation

    # 労働生産性を自動計算（最新のHRデータから従業員数を取得）
    latest_hr = db.query(HRData).filter(
        HRData.company_id == company_id
    ).order_by(HRData.snapshot_date.desc()).first()

    labor_productivity = None
    if latest_hr and latest_hr.employee_count_total > 0:
        labor_productivity = value_added / latest_hr.employee_count_total

    fs = FinancialStatement(
        company_id=company_id,
        **data.model_dump(),
        value_added=value_added,
        labor_productivity=labor_productivity,
    )
    db.add(fs)
    db.commit()
    db.refresh(fs)
    return fs


@router.get("/{company_id}/financials", response_model=list[FinancialStatementResponse])
def list_financials(company_id: str, db: Session = Depends(get_db)):
    """財務データ一覧を取得する（新しい順）"""
    return db.query(FinancialStatement).filter(
        FinancialStatement.company_id == company_id
    ).order_by(FinancialStatement.fiscal_year.desc()).all()


@router.post("/{company_id}/financials/bulk", status_code=200)
def update_financials_bulk(company_id: str, data: List[FinancialStatementCreate], db: Session = Depends(get_db)):
    """財務データを一括で登録・更新する"""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="企業が見つかりません")

    # 最新のHRデータ（生産性計算用）
    latest_hr = db.query(HRData).filter(HRData.company_id == company_id).order_by(HRData.snapshot_date.desc()).first()
    emp_count = latest_hr.employee_count_total if latest_hr and latest_hr.employee_count_total > 0 else None

    for item in data:
        # 年度で既存データを検索
        existing = db.query(FinancialStatement).filter(
            FinancialStatement.company_id == company_id,
            FinancialStatement.fiscal_year == item.fiscal_year
        ).first()

        value_added = item.operating_profit + item.labor_cost + item.depreciation
        prod = value_added / emp_count if emp_count else None

        if existing:
            for key, val in item.model_dump().items():
                setattr(existing, key, val)
            existing.value_added = value_added
            existing.labor_productivity = prod
        else:
            fs = FinancialStatement(
                company_id=company_id,
                **item.model_dump(),
                value_added=value_added,
                labor_productivity=prod
            )
            db.add(fs)
    
    db.commit()
    return {"status": "success", "count": len(data)}


# ============================================================
# 人事・労務データ CRUD
# ============================================================
@router.post("/{company_id}/hr", response_model=HRDataResponse, status_code=201)
def create_hr(company_id: str, data: HRDataCreate, db: Session = Depends(get_db)):
    """人事・労務データを登録する（従業員合計は自動計算）"""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="企業が見つかりません")

    total = data.employee_count_regular + data.employee_count_part
    hr = HRData(
        company_id=company_id,
        **data.model_dump(),
        employee_count_total=total,
    )
    db.add(hr)
    db.commit()
    db.refresh(hr)
    return hr


@router.get("/{company_id}/hr", response_model=list[HRDataResponse])
def list_hr(company_id: str, db: Session = Depends(get_db)):
    """人事・労務データ一覧を取得する"""
    return db.query(HRData).filter(
        HRData.company_id == company_id
    ).order_by(HRData.snapshot_date.desc()).all()


# ============================================================
# 事業プロフィール CRUD
# ============================================================
@router.post("/{company_id}/profile", response_model=BusinessProfileResponse, status_code=201)
def create_or_update_profile(company_id: str, data: BusinessProfileCreate, db: Session = Depends(get_db)):
    """事業プロフィールを登録・更新する"""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="企業が見つかりません")

    profile = db.query(BusinessProfile).filter(BusinessProfile.company_id == company_id).first()

    if profile:
        for key, val in data.model_dump().items():
            setattr(profile, key, val)
    else:
        profile = BusinessProfile(company_id=company_id, **data.model_dump())
        db.add(profile)

    db.commit()
    db.refresh(profile)
    return profile


@router.get("/{company_id}/profile", response_model=BusinessProfileResponse)
def get_profile(company_id: str, db: Session = Depends(get_db)):
    """事業プロフィールを取得する"""
    profile = db.query(BusinessProfile).filter(BusinessProfile.company_id == company_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="プロフィールが未登録です")
    return profile
# ============================================================
# 統合カルテ (Corporate DNA)
# ============================================================
@router.post("/{company_id}/dna", response_model=CorporateDNAResponse)
def upsert_full_dna(company_id: str, data: CorporateDNAUpsert, db: Session = Depends(get_db)):
    """企業情報、財務、人事、プロファイルを一括で登録・更新する"""
    # 1. Company
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="企業が見つかりません")
    
    for key, val in data.company.model_dump(exclude={"executives", "shareholders"}).items():
        setattr(company, key, val)
    company.executives = [e.model_dump() for e in data.company.executives]
    company.shareholders = [s.model_dump() for s in data.company.shareholders]

    # 2. Financials (Bulk)
    update_financials_bulk(company_id, data.financials, db)

    # 3. HR
    if data.hr:
        create_hr(company_id, data.hr, db)

    # 4. Profile
    if data.profile:
        create_or_update_profile(company_id, data.profile, db)

    db.commit()
    
    # 最新データを取得して返す
    return get_full_dna(company_id, db)


@router.get("/{company_id}/dna", response_model=CorporateDNAResponse)
def get_full_dna(company_id: str, db: Session = Depends(get_db)):
    """企業の全データをまとめて取得する"""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="企業が見つかりません")
    
    financials = db.query(FinancialStatement).filter(FinancialStatement.company_id == company_id).order_by(FinancialStatement.fiscal_year.desc()).all()
    hr = db.query(HRData).filter(HRData.company_id == company_id).order_by(HRData.snapshot_date.desc()).first()
    profile = db.query(BusinessProfile).filter(BusinessProfile.company_id == company_id).first()
    
    return {
        "company": company,
        "financials": financials,
        "hr": hr,
        "profile": profile
    }
