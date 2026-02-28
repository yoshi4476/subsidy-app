from database import engine
from sqlalchemy import text, inspect

def migrate():
    with engine.connect() as conn:
        inspector = inspect(engine)
        
        # 1. Add application_case_id to documents
        columns = [c['name'] for c in inspector.get_columns('documents')]
        if 'application_case_id' not in columns:
            try:
                conn.execute(text("ALTER TABLE documents ADD COLUMN application_case_id VARCHAR"))
                print("Added application_case_id to documents.")
            except Exception as e:
                print(f"Error adding application_case_id: {e}")
        
        # 2. Add submission_guide to subsidies
        columns = [c['name'] for c in inspector.get_columns('subsidies')]
        if 'submission_guide' not in columns:
            try:
                conn.execute(text("ALTER TABLE subsidies ADD COLUMN submission_guide JSON DEFAULT '{}'"))
                print("Added submission_guide to subsidies.")
            except Exception as e:
                # Some versions of SQLite don't handle JSON type well in ALTER, fallback to TEXT
                try:
                    conn.execute(text("ALTER TABLE subsidies ADD COLUMN submission_guide TEXT DEFAULT '{}'"))
                    print("Added submission_guide to subsidies as TEXT.")
                except Exception as e2:
                    print(f"Error adding submission_guide: {e2}")

        conn.commit()

if __name__ == "__main__":
    migrate()
