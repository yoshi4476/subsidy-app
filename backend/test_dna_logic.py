import os
import sys
from sqlalchemy.orm import Session

# backendディレクトリをパスに追加
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import Company, FinancialStatement, HRData, BusinessProfile
from schemas import CorporateDNAResponse

def test_logic():
    db = SessionLocal()
    try:
        company_id = "demo-company-tech-001"
        company = db.query(Company).filter(Company.id == company_id).first()
        if not company:
            print("Company not found")
            return
            
        financials = db.query(FinancialStatement).filter(FinancialStatement.company_id == company_id).order_by(FinancialStatement.fiscal_year.desc()).all()
        hr = db.query(HRData).filter(HRData.company_id == company_id).order_by(HRData.snapshot_date.desc()).first()
        profile = db.query(BusinessProfile).filter(BusinessProfile.company_id == company_id).first()
        
        data = {
            "company": company,
            "financials": financials,
            "hr": hr,
            "profile": profile
        }
        
        print("Data gathered. Attempting Pydantic validation...")
        resp = CorporateDNAResponse.model_validate(data)
        print("Validation successful!")
        print(resp.model_dump_json(indent=2))
        
    except Exception as e:
        print(f"Error captured: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_logic()
