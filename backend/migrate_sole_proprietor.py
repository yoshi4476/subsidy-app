from database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        # Add business_category if it doesn't exist
        try:
            conn.execute(text("ALTER TABLE companies ADD COLUMN business_category VARCHAR DEFAULT 'CORPORATION'"))
            print("Added business_category column.")
        except Exception as e:
            print(f"Skipped adding business_category: {e}")

        # Drop NOT NULL constraint on corporate_number
        try:
            # SQLite doesn't support ALTER COLUMN directly in many versions, 
            # but if it's Postgres or similar it might. 
            # Let's try the common syntax or handle SQLite specially if needed.
            # In SQLite, we might need a more complex migration, but let's try this first.
            conn.execute(text("ALTER TABLE companies ALTER COLUMN corporate_number DROP NOT NULL"))
            print("Dropped NOT NULL on corporate_number.")
        except Exception as e:
            print(f"Skipped altering corporate_number: {e}")
            
        conn.commit()

if __name__ == "__main__":
    migrate()
