import sqlite3
import os

db_path = "f:\\補助金システム\\subsidy_platform.db"
# backendディレクトリにコピーがある場合もあるので両方チェック
db_path_backend = "f:\\補助金システム\\backend\\subsidy_platform.db"

def migrate(path):
    if not os.path.exists(path):
        print(f"Database not found at {path}")
        return
    
    print(f"Migrating database at {path}...")
    conn = sqlite3.connect(path)
    cursor = conn.cursor()
    
    try:
        # application_cases テーブルに status_updated_at を追加
        cursor.execute("ALTER TABLE application_cases ADD COLUMN status_updated_at DATETIME")
        print("Added status_updated_at to application_cases.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("Column status_updated_at already exists.")
        else:
            print(f"Error adding column: {e}")
    
    conn.commit()
    conn.close()
    print("Migration finished.")

migrate(db_path)
migrate(db_path_backend)
