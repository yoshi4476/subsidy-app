import sqlite3
import os

# データベースファイルのパス
DB_PATH = "backend/subsidy_platform.db"
TARGET_EMAIL = "y.wakata.linkdesign@gmail.com"

def grant_admin():
    if not os.path.exists(DB_PATH):
        print(f"[ERROR] Database not found at {DB_PATH}")
        return

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # ユーザーが存在するか確認
        cursor.execute("SELECT id, role, is_approved FROM users WHERE email = ?", (TARGET_EMAIL,))
        user = cursor.fetchone()
        
        if user:
            print(f"[INFO] Found user: {TARGET_EMAIL}")
            # roleをadminに、is_approvedをTrueに更新
            cursor.execute(
                "UPDATE users SET role = 'admin', is_approved = 1 WHERE email = ?", 
                (TARGET_EMAIL,)
            )
            conn.commit()
            print(f"[SUCCESS] User {TARGET_EMAIL} promoted to ADMIN and APPROVED.")
        else:
            print(f"[WARNING] User {TARGET_EMAIL} not found in database. Please log in first.")
            
        conn.close()
    except Exception as e:
        print(f"[ERROR] Failed to update database: {e}")

if __name__ == "__main__":
    grant_admin()
