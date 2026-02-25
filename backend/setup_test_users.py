import sqlite3
import os

db_path = "f:\\補助金システム\\backend\\subsidy_platform.db"

def setup():
    if not os.path.exists(db_path):
        print("DB not found")
        return
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if admin exists
    cursor.execute("SELECT id FROM users WHERE role = 'admin'")
    if not cursor.fetchone():
        print("Creating admin user...")
        cursor.execute("INSERT INTO users (id, email, name, role, is_approved) VALUES (?, ?, ?, ?, ?)",
                       ('admin-uuid', 'admin@example.com', '管理者', 'admin', 1))
    
    # Ensure test user is UNAPPROVED
    cursor.execute("UPDATE users SET is_approved = 0 WHERE email = 'test@example.com'")
    
    conn.commit()
    conn.close()
    print("Setup finished")

if __name__ == "__main__":
    setup()
