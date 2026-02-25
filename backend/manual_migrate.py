import sqlite3
import os

db_path = r"f:\補助金システム\backend\subsidy_platform.db"

# 追加するカラム
cols_to_add = {
    "documents": [
        ("expiry_date", "DATE"),
        ("category", "TEXT DEFAULT 'COMMON'")
    ]
}

# 新規テーブル作成
create_tables_sql = [
    """
    CREATE TABLE IF NOT EXISTS cash_flow_simulations (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        subsidy_id TEXT NOT NULL,
        total_project_cost INTEGER NOT NULL,
        subsidy_amount INTEGER NOT NULL,
        initial_outlay INTEGER NOT NULL,
        loan_amount INTEGER DEFAULT 0,
        monthly_projections TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES companies(id),
        FOREIGN KEY (subsidy_id) REFERENCES subsidies(id)
    );
    """
]

if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # カラム追加
    for table, cols in cols_to_add.items():
        for col_name, col_type in cols:
            try:
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type};")
                print(f"Added column {col_name} to {table}")
            except sqlite3.OperationalError:
                print(f"Column {col_name} already exists in {table}")
                
    # テーブル作成
    for sql in create_tables_sql:
        cursor.execute(sql)
        print("Ensured cash_flow_simulations table exists.")
        
    conn.commit()
    conn.close()
    print("Migration complete.")
else:
    print(f"DB not found at {db_path}")
