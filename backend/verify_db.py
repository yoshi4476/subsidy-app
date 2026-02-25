from database import SessionLocal
from models import ApplicationCase, Subsidy
from sqlalchemy import func, text
import json

def verify_data():
    db = SessionLocal()
    try:
        # 補助金ごとの集計（タイトルも含めて取得）
        print("=== Registration Counts by Subsidy Title ===")
        results = db.query(Subsidy.title, func.count(ApplicationCase.id)).join(ApplicationCase).group_by(Subsidy.title).all()
        for title, count in results:
            print(f"{title}: {count} cases")

        # 不明なデータ（subsidy_idが異常なもの）がないかチェック
        print("\n=== Check for Orphans or Unknown IDs ===")
        orphans = db.execute(text("SELECT count(*) FROM application_cases WHERE subsidy_id = 'AUTO_GEN_SUB_ID' OR subsidy_id IS NULL")).scalar()
        print(f"Orphaned/Unknown cases: {orphans}")

        # サンプルデータの確認
        print("\n=== Data Quality Samples ===")
        # カテゴリー（補助金名）でソートして数件表示
        cases = db.query(ApplicationCase).join(Subsidy).order_by(Subsidy.title).limit(5).all()
        for c in cases:
            print(f"--- Subsidy: {c.subsidy.title} ---")
            print(f"Result: {c.result}")
            print(f"Code in AI Metadata: {c.ai_quality_score.get('subsidy_code')}")
            print(f"Summary: {c.ai_quality_score.get('plan_summary')}")
            print("\n")

    finally:
        db.close()

if __name__ == "__main__":
    verify_data()
