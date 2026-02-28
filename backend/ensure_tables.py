import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine, Base
from models import UserFavoriteSubsidy, ReportingProgress, ApplicationCase
import sqlalchemy as sa

def migrate():
    print("MIGRATION: Checking tables...")
    # SQLALchemyのMetadataを使って不足テーブルを作成
    try:
        # 1. 直接テーブル作成を試みる
        Base.metadata.create_all(bind=engine)
        print("MIGRATION: Tables created/verified via metadata.")
    except Exception as e:
        print(f"MIGRATION ERROR in create_all: {e}")

    # 2. 既存テーブルへのカラム追加 (ALTER TABLE)
    # status_updated_at が ApplicationCase にあるか確認
    with engine.connect() as conn:
        try:
            inspector = sa.inspect(engine)
            columns = [c['name'] for c in inspector.get_columns('application_cases')]
            if 'status_updated_at' not in columns:
                print("MIGRATION: Adding status_updated_at to application_cases...")
                conn.execute(sa.text("ALTER TABLE application_cases ADD COLUMN status_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP"))
                conn.commit()
                print("MIGRATION: Column added.")
            else:
                print("MIGRATION: status_updated_at already exists.")
        except Exception as e:
            print(f"MIGRATION ERROR in alter table: {e}")

    # 3. 補助金書類対応のマイグレーション
    try:
        from migrate_submission_docs import migrate as migrate_docs
        from update_subsidy_docs import update_docs
        
        print("MIGRATION: Running submission docs migration...")
        migrate_docs()
        print("MIGRATION: Updating subsidy document metadata...")
        update_docs()
        print("MIGRATION: Document support updates completed.")
    except Exception as e:
        print(f"MIGRATION ERROR in document updates: {e}")

if __name__ == "__main__":
    migrate()
