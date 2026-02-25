import sqlite3
import os

db_path = "f:\\補助金システム\\backend\\subsidy_platform.db"

def fix():
    if not os.path.exists(db_path):
        print("DB not found")
        return
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Ensure admin user has 'admin' role
    cursor.execute("UPDATE users SET role = 'admin', is_approved = 1 WHERE email = 'admin@example.com'")
    
    conn.commit()
    conn.close()
    print("Admin role fixed")

if __name__ == "__main__":
    fix()
