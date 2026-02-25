import sqlite3
import os

db_path = r"f:\補助金システム\backend\subsidy_platform.db"

def fix():
    if not os.path.exists(db_path):
        print(f"DB not found at {db_path}")
        return
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Ensure admin user has 'admin' role and is approved
    cursor.execute("UPDATE users SET role='admin', is_approved=1 WHERE email='admin@example.com'")
    print(f"Rows affected: {cursor.rowcount}")
    
    conn.commit()
    conn.close()
    print("Admin role fix script finished")

if __name__ == "__main__":
    fix()
