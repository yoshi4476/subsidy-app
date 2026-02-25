import sqlite3
import os

db_path = 'f:/補助金システム/subsidy_platform.db'
if not os.path.exists(db_path):
    print(f"Error: {db_path} not found")
    exit(1)

conn = sqlite3.connect(db_path)
cur = conn.cursor()

def check_table(table_name):
    print(f"\n--- Table: {table_name} ---")
    cur.execute(f"PRAGMA table_info({table_name})")
    cols = cur.fetchall()
    for col in cols:
        print(f"Column: {col[1]} ({col[2]})")

try:
    check_table("companies")
    check_table("business_profiles")
    check_table("hr_data")
except Exception as e:
    print(f"Error: {e}")
finally:
    conn.close()
