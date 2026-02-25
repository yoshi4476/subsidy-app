import sys
import os

# backendディレクトリをパスに追加
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import Subsidy
from services.matching import match_subsidy, build_company_data

def test():
    db = SessionLocal()
    subsidy = db.query(Subsidy).filter(Subsidy.subsidy_code == 'monodukuri_2026_18th').first()
    if not subsidy:
        print("Subsidy not found")
        return

    company_data = {
        "wage_raise_declared": False,
        "certifications": [],
        "employee_count_total": 10,
        "capital_stock": 10000000,
        "prefecture": "東京都",
        "industry_code": "ALL"
    }
    
    result = match_subsidy(subsidy, company_data)
    print(f"Results for {subsidy.title}:")
    print(f"Matched Rate: {result.get('matched_rate')}")
    print(f"Matched Max Amount: {result.get('dynamic_max_amount')}")
    print(f"Max Potential Rate: {result.get('max_potential_rate')}")
    print(f"Max Potential Amount: {result.get('max_potential_amount')}")
    print(f"Gap Analysis Items: {len(result.get('gap_analysis', []))}")
    for gap in result.get('gap_analysis', []):
        print(f" - {gap['action']}: {gap['impact']}")
    
    db.close()

if __name__ == "__main__":
    test()
