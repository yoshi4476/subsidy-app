# デモデータ投入用スクリプト

import os
import sys
from datetime import date, datetime, timedelta
import uuid

# backendディレクトリをパスに追加
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import User, Company, FinancialStatement, HRData, BusinessProfile

def seed_demo_companies():
    db = SessionLocal()
    user_id = "183b5492-9b65-4e22-8360-330b7911c3d8"
    
    # ユーザーの存在確認と作成
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        print(f"Creating demo user: {user_id}")
        user = User(
            id=user_id,
            email="demo@example.com",
            name="デモ 太郎",
            role="client"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    print(f"Seeding demo companies for user: {user.name} ({user.email})")

    # 1. 製造業: 株式会社テクノフロンティア
    co1_id = "demo-company-tech-001"
    co1 = Company(
        id=co1_id,
        user_id=user_id,
        corporate_number="1010101010101",
        legal_name="株式会社テクノフロンティア",
        trade_name="テクノフロンティア",
        head_office_address="東京都大田区本羽田2-10-5",
        head_office_prefecture="13",
        establishment_date=date(2015, 6, 1),
        capital_stock=50000000.0,
        industry_code="2599", # 金属製品製造業
        executives=[{"name": "佐藤健一", "title": "代表取締役"}],
        shareholders=[{"name": "佐藤健一", "type": "individual", "ratio": 0.8}, {"name": "佐藤美由紀", "type": "individual", "ratio": 0.2}]
    )
    
    # 2. 小売・サービス業: カフェ・ド・テスト
    co2_id = "demo-company-cafe-002"
    co2 = Company(
        id=co2_id,
        user_id=user_id,
        corporate_number="2020202020202",
        legal_name="合同会社カフェ・ド・テスト",
        trade_name="カフェ・ド・テスト",
        head_office_address="東京都世田谷区北沢2-5-1",
        head_office_prefecture="13",
        establishment_date=date(2021, 10, 15),
        capital_stock=3000000.0,
        industry_code="5811", # 喫茶店
        executives=[{"name": "田中愛子", "title": "代表社員"}],
        shareholders=[{"name": "田中愛子", "type": "individual", "ratio": 1.0}]
    )

    # 3. テックスタートアップ: 未来AIソリューションズ株式会社
    co3_id = "demo-company-startup-003"
    co3 = Company(
        id=co3_id,
        user_id=user_id,
        corporate_number="3030303030303",
        legal_name="未来AIソリューションズ株式会社",
        trade_name="未来AI",
        head_office_address="東京都千代田区大手町1-1-1",
        head_office_prefecture="13",
        establishment_date=date(2023, 1, 10),
        capital_stock=100000000.0,
        industry_code="3911", # ソフトウェア業
        executives=[{"name": "鈴木一郎", "title": "代表取締役CEO"}],
        shareholders=[{"name": "鈴木一郎", "type": "individual", "ratio": 0.6}, {"name": "未来ベンチャーキャピタル", "type": "corporate", "ratio": 0.4}]
    )

    companies = [co1, co2, co3]
    for co in companies:
        # 既存チェック
        existing = db.query(Company).filter(Company.corporate_number == co.corporate_number).first()
        if existing:
            db.delete(existing)
        db.add(co)
    
    db.commit()

    # 財務データとHRデータの投入
    for co in companies:
        # 財務データ（3期分）
        for i in range(3):
            year = 2025 - i
            sales = co.capital_stock * (5 + (2-i)) + (i * 1000000)
            profit = sales * 0.05 if i > 0 else -sales * 0.01 # 直近赤字にする
            financial = FinancialStatement(
                company_id=co.id,
                fiscal_year=year,
                fiscal_period_start=date(year, 4, 1),
                fiscal_period_end=date(year+1, 3, 31),
                sales=sales,
                operating_profit=profit,
                ordinary_profit=profit * 0.9,
                depreciation=sales * 0.02,
                labor_cost=sales * 0.3,
                value_added=profit + (sales * 0.3) + (sales * 0.02)
            )
            db.add(financial)
        
        # HRデータ
        count = 10 if co.id == co1_id else (3 if co.id == co2_id else 40)
        hr = HRData(
            company_id=co.id,
            snapshot_date=date(2026, 2, 1),
            employee_count_regular=count,
            employee_count_part=count // 2,
            employee_count_total=count + (count // 2),
            lowest_wage=1150.0,
            employment_insurance=True,
            social_insurance=True,
            wage_raise_declared=True
        )
        db.add(hr)

        # 事業プロフィール
        profile = BusinessProfile(
            company_id=co.id,
            business_summary=f"{co.legal_name}は、{co.head_office_address}を拠点に展開する企業です。",
            strengths=["高い技術力", "顧客基盤"],
            weaknesses=["採用難", "IT化の遅れ"] if co.id != co3_id else ["キャッシュフロー"],
            dx_initiatives="業務プロセスのデジタル化を推進中。"
        )
        db.add(profile)

    db.commit()
    print("Done! Demo companies seeded successfully.")
    db.close()

if __name__ == "__main__":
    seed_demo_companies()
