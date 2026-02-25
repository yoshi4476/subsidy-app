import sqlite3
import os

db_path = "f:\\補助金システム\\subsidy_platform.db"
db_path_backend = "f:\\補助金システム\\backend\\subsidy_platform.db"

def migrate_users(path):
    if not os.path.exists(path):
        print(f"Database not found at {path}")
        return
    
    print(f"Migrating users table at {path}...")
    conn = sqlite3.connect(path)
    cursor = conn.cursor()
    
    try:
        # users テーブルに is_approved を追加
        cursor.execute("ALTER TABLE users ADD COLUMN is_approved BOOLEAN DEFAULT 0")
        print("Added is_approved to users.")
        
        # 既存の admin ユーザーがいれば自動的に承認済みにする（便宜上）
        cursor.execute("UPDATE users SET is_approved = 1 WHERE role = 'admin'")
        print("Set is_approved=1 for existing admins.")
        
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("Column is_approved already exists.")
        else:
            print(f"Error adding column: {e}")
    
    conn.commit()
    conn.close()
    print("Migration finished.")

migrate_users(db_path)
migrate_users(db_path_backend)
