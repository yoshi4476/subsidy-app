import sqlite3
import os

db_path = "f:\\補助金システム\\backend\\subsidy_platform.db"

def check():
    if not os.path.exists(db_path):
        print("DB not found")
        return
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, role, is_approved FROM users")
    rows = cursor.fetchall()
    for row in rows:
        print(row)
    conn.close()

if __name__ == "__main__":
    check()
