from database import engine, SessionLocal
from sqlalchemy import text, inspect

def migrate():
    with engine.connect() as conn:
        inspector = inspect(engine)
        columns = [c['name'] for c in inspector.get_columns('companies')]
        
        # 1. Add business_category if missing
        if 'business_category' not in columns:
            try:
                conn.execute(text("ALTER TABLE companies ADD COLUMN business_category VARCHAR DEFAULT 'CORPORATION'"))
                print("Added business_category column.")
            except Exception as e:
                print(f"Error adding business_category: {e}")

        # 2. Check corporate_number nullability
        col_info = next((c for c in inspector.get_columns('companies') if c['name'] == 'corporate_number'), None)
        is_nullable = col_info.get('nullable', True) if col_info else True
        
        if col_info and not is_nullable:
            if "sqlite" in str(engine.url):
                print("SQLite detected. Performing table recreation to drop NOT NULL constraint...")
                try:
                    # Rename old table
                    conn.execute(text("ALTER TABLE companies RENAME TO companies_old"))
                    
                    # Create new table with updated schema (Base.metadata.create_all is better but we want to be surgical)
                    # For simplicity, we use the model's structure. 
                    # But since we have other relationships, let's just use the SQL we know.
                    # This is slightly risky but necessary for SQLite.
                    
                    # Get the original CREATE statement or just write it.
                    # Since I've updated the models.py, I can use it.
                    from models import Base
                    Base.metadata.create_all(engine) # This will create the new 'companies' table
                    
                    # Copy data
                    conn.execute(text("""
                        INSERT INTO companies (id, user_id, corporate_number, business_category, legal_name, trade_name, 
                        head_office_address, head_office_prefecture, establishment_date, capital_stock, industry_code, 
                        executives, shareholders, created_at, updated_at)
                        SELECT id, user_id, corporate_number, business_category, legal_name, trade_name, 
                        head_office_address, head_office_prefecture, establishment_date, capital_stock, industry_code, 
                        executives, shareholders, created_at, updated_at FROM companies_old
                    """))
                    
                    # Drop old table
                    conn.execute(text("DROP TABLE companies_old"))
                    print("Successfully recreated companies table for SQLite.")
                except Exception as e:
                    print(f"Error during SQLite table recreation: {e}")
                    # Try to restore if failed
                    try:
                        conn.execute(text("ALTER TABLE companies_old RENAME TO companies"))
                    except: pass
            else:
                # Postgres
                try:
                    conn.execute(text("ALTER TABLE companies ALTER COLUMN corporate_number DROP NOT NULL"))
                    print("Dropped NOT NULL on corporate_number (Postgres/Other).")
                except Exception as e:
                    print(f"Error altering corporate_number: {e}")
            
        conn.commit()

if __name__ == "__main__":
    migrate()
