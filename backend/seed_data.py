# デモデータ投入スクリプト
# 全ての主要補助金を最新の公募要領に基づき詳細に定義する

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from datetime import date, datetime
from database import SessionLocal, engine, Base
from models import (
    Company, FinancialStatement, HRData, BusinessProfile,
    Subsidy, ApplicationCase, TermDictionary
)

# テーブル作成
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)
db = SessionLocal()

def seed():
    # 既存データのクリア
    print("Cleaning old data...")
    db.query(ApplicationCase).delete()
    db.query(TermDictionary).delete()
    db.query(Subsidy).delete()
    db.query(BusinessProfile).delete()
    db.query(HRData).delete()
    db.query(FinancialStatement).delete()
    db.query(Company).delete()
    db.commit()

    # ============================================================
    # サンプル企業: 株式会社テスト製作所 (東京都大田区)
    # ============================================================
    company = Company(
        id="company-001",
        corporate_number="1234567890123",
        legal_name="株式会社テスト製作所",
        trade_name="テスト製作所",
        head_office_address="東京都大田区南蒲田1-2-3",
        head_office_prefecture="13",
        establishment_date=date(2010, 4, 1),
        capital_stock=30000000,
        industry_code="2599",
        executives=[{"name": "山田太郎", "title": "代表取締役", "birthdate": "1975-05-15"}],
        shareholders=[{"name": "山田太郎", "type": "individual", "ratio": 1.0}],
    )
    db.add(company)

    # 財務データ（3期分）- 直近赤字のパターンにする（持続化補助率3/4のテスト用）
    financials = [
        FinancialStatement(
            company_id="company-001", fiscal_year=2025,
            fiscal_period_start=date(2025, 4, 1), fiscal_period_end=date(2026, 3, 31),
            sales=250000000, operating_profit=-2000000, ordinary_profit=-2500000, # 赤字
            depreciation=8000000, labor_cost=80000000,
            value_added=80000000 + 8000000 - 2000000,
            labor_productivity=0,
        ),
        FinancialStatement(
            company_id="company-001", fiscal_year=2024,
            sales=230000000, operating_profit=12000000, ordinary_profit=11000000,
            fiscal_period_start=date(2024, 4, 1), fiscal_period_end=date(2025, 3, 31),
            depreciation=7500000, labor_cost=75000000,
            value_added=12000000 + 75000000 + 7500000,
        ),
        FinancialStatement(
            company_id="company-001", fiscal_year=2023,
            sales=220000000, operating_profit=10000000, ordinary_profit=9500000,
            fiscal_period_start=date(2023, 4, 1), fiscal_period_end=date(2024, 3, 31),
            depreciation=7000000, labor_cost=70000000,
            value_added=10000000 + 70000000 + 7000000,
        ),
    ]
    db.add_all(financials)

    # HRデータ
    hr = HRData(
        company_id="company-001",
        snapshot_date=date(2026, 1, 1),
        employee_count_regular=4, # 小規模事業者(5人以下)に設定
        employee_count_part=0,
        employee_count_total=4,
        lowest_wage=1100,
        employment_insurance=True,
        social_insurance=True,
        wage_raise_declared=True, # 賃上げ宣言済み
    )
    db.add(hr)

    # ============================================================
    # 補助金マスタ（リサーチに基づいた詳細版）
    # ============================================================
    
    # 1. 小規模事業者持続化補助金
    shokibo = Subsidy(
        id="subsidy-005",
        subsidy_code="shokibo_jizokuka_2026",
        title="小規模事業者持続化補助金（一般型・賃金引上げ枠）",
        administering_body="日本商工会議所 / 全国商工会連合会",
        description=(
            "小規模事業者の販路開拓（チラシ作成、HP制作、看板設置等）や生産性向上を支援。\n\n"
            "🔴 **【重要：補助率引き上げ】**\n"
            "賃金引上げ枠を申請する事業者のうち、直近の決算が赤字（営業利益か経常利益がマイナス）の場合は、補助率が通常 2/3 から **3/4** へ引き上げられます！\n"
            "また、賃金引上げ枠を選択すると、通常50万円の補助上限が **200万円** まで大幅に拡大されます。"
        ),
        simple_summary="地域の小さなお店や会社の「売上アップ」を国が応援。赤字でも前向きに賃上げする会社には、最大3/4（75%）という非常に手厚い補助が出ます。",
        requirements={
            "logic": "AND",
            "conditions": [
                {"field": "employee_count_total", "operator": "<=", "value": 20, "description": "従業員20人以下（業種により5人以下）"},
            ],
            "rate_rules": [
                {
                    "condition": {"logic": "AND", "conditions": [
                        {"field": "wage_raise_declared", "operator": "==", "value": True},
                        {"field": "operating_profit", "operator": "<", "value": 0}
                    ]},
                    "new_numerator": 3, "new_denominator": 4, 
                    "description": "✨【赤字企業特例】賃上げ枠適用の赤字事業者のため、補助率が 3/4 にアップします"
                }
            ]
        },
        subsidy_rate_numerator=2, subsidy_rate_denominator=3,
        max_amount=500000,
        status="PUBLISHED",
    )
    db.add(shokibo)

    # 2. IT導入補助金
    it_sub = Subsidy(
        id="subsidy-002",
        subsidy_code="it_introduction_2026",
        title="デジタル化・AI導入補助金（旧IT導入補助金）- インボイス枠",
        administering_body="サービスデザイン推進協議会",
        description=(
            "会計ソフト、受発注システム、ECサイト等の導入を支援。\n\n"
            "🔴 **【インボイス対応の優遇措置】**\n"
            "小規模事業者がインボイス対応のソフトを導入する場合、補助率は **4/5（80%）** となり、PC・タブレットの購入費用もセットで補助対象になります。"
        ),
        simple_summary="面倒なインボイス対応やAI活用を安く実現。PCやタブレットも一緒に買えて、小規模事業者なら最大8割を国が負担してくれます。",
        requirements={
            "logic": "AND", "conditions": [],
            "rate_rules": [
                {
                    "condition": {"field": "employee_count_total", "operator": "<=", "value": 5, "description": "小規模事業者（5人以下）"},
                    "new_numerator": 4, "new_denominator": 5,
                    "description": "✨【小規模特例】インボイス枠適用の小規模事業者のため、補助率が 4/5 にアップします"
                }
            ]
        },
        subsidy_rate_numerator=1, subsidy_rate_denominator=2,
        max_amount=4500000,
        status="PUBLISHED",
    )
    db.add(it_sub)

    # 3. 省力化投資補助金
    shoryokuka = Subsidy(
        id="subsidy-006",
        subsidy_code="shoryokuka_toushi_2026",
        title="中小企業省力化投資補助金（カタログ注文型）",
        administering_body="中小企業基盤整備機構",
        description=(
            "清掃ロボット、配膳ロボット、自動レジなど、人手不足を解消する製品カタログから選んで導入。\n\n"
            "🔴 **【賃上げによる上限アップ】**\n"
            "大幅な賃上げ（+50円以上の最低賃金アップ等）を行う場合、補助上限額が最大 **1,500万円**（通常1,000万円）まで引き上げられます。"
        ),
        simple_summary="ロボットやIT機器をカタログから選ぶだけの簡単申請。人手不足を機械で解決し、賃上げも行う会社には上限額のボーナスがあります。",
        requirements={"logic": "AND", "conditions": []},
        subsidy_rate_numerator=1, subsidy_rate_denominator=2,
        max_amount=15000000,
        status="PUBLISHED",
    )
    db.add(shoryokuka)

    # 4. 大規模成長投資補助金
    daikibo = Subsidy(
        id="subsidy-007",
        subsidy_code="daikibo_seicho_2026",
        title="中堅・中小企業大規模成長投資補助金",
        administering_body="経済産業省",
        description=(
            "工場新設や大規模な設備投資を支援し、地方での雇用創出を加速。\n\n"
            "🔴 **【圧倒的な補助規模】**\n"
            "補助上限額は **50億円**。投資額が20億円以上の大規模プロジェクトが対象となります。"
        ),
        simple_summary="世界を狙う工場建設や大型投資を国が数十億円単位でバックアップ。地方の雇用と賃上げを牽引する大プロジェクトが対象です。",
        requirements={
            "logic": "AND",
            "conditions": [
                {"field": "capital_stock", "operator": "<=", "value": 1000000000, "description": "資本金10億円以下"},
            ]
        },
        subsidy_rate_numerator=1, subsidy_rate_denominator=3,
        max_amount=5000000000,
        status="PUBLISHED",
    )
    db.add(daikibo)

    # 5. ものづくり補助金
    monodukuri = Subsidy(
        id="subsidy-001",
        subsidy_code="monodukuri_2026_18th",
        title="ものづくり・商業・サービス生産性向上促進補助金",
        administering_body="全国中小企業団体中央会",
        description="革新的な試作品開発や生産プロセスの改善（DX・GX含む）を支援。",
        simple_summary="新製品開発や工場の自動化など、自社の強みを活かした「ものづくり」の進化を数千万円規模でサポートします。",
        requirements={
            "logic": "AND",
            "conditions": [
                {"field": "value_added_growth_rate", "operator": ">=", "value": 3.0, "description": "付加価値年率3.0%向上"}
            ]
        },
        subsidy_rate_numerator=1, subsidy_rate_denominator=2,
        max_amount=12500000,
        status="PUBLISHED",
    )
    db.add(monodukuri)

    # 6. 新事業進出補助金
    shinjigyou = Subsidy(
        id="subsidy-004",
        subsidy_code="shinjigyou_shinshutsu_2026",
        title="中小企業・小規模事業者新事業進出支援補助金",
        administering_body="中小企業庁",
        description="既存事業とは異なる、成長性の高い新分野への参入を支援。",
        requirements={"logic": "AND", "conditions": []},
        subsidy_rate_numerator=2, subsidy_rate_denominator=3,
        max_amount=0, # 動的
        status="PUBLISHED",
    )
    db.add(shinjigyou)

    # 7. 東京都独自の補助金 (REGIONAL)
    tokyo = Subsidy(
        id="subsidy-tokyo-001",
        subsidy_code="tokyo_setsubi_2026",
        title="東京都躍進的な事業推進のための設備投資支援事業",
        administering_body="東京都中小企業振興公社",
        description="都内中小企業が、更なる発展を目指すための設備投資を支援します。",
        target_region="13",
        subsidy_rate_numerator=1, subsidy_rate_denominator=2,
        max_amount=100000000,
        status="PUBLISHED",
    )
    db.add(tokyo)

    db.commit()
    subs_count = db.query(Subsidy).count()
    print(f"[OK] All subsidy master data seeded successfully! Total: {subs_count} subsidies.")

if __name__ == "__main__":
    seed()
    db.close()
