import sqlite3
import json

db_path = 'f:/補助金システム/subsidy_platform.db'
conn = sqlite3.connect(db_path)
cur = conn.cursor()

print("--- Companies ---")
cur.execute("SELECT id, legal_name FROM companies")
for row in cur.fetchall():
    print(row)

print("\n--- Business Profiles ---")
cur.execute("SELECT company_id, equipment_list FROM business_profiles")
for row in cur.fetchall():
    # Attempt to parse json
    try:
        data = json.loads(row[1]) if row[1] else None
        print(f"Company: {row[0]}, Equipment: {data}")
    except:
        print(f"Company: {row[0]}, Raw Equipment: {row[1]}")

print("\n--- HR Data ---")
cur.execute("SELECT company_id, training_system FROM hr_data")
for row in cur.fetchall():
    print(f"Company: {row[0]}, Training System: {row[1]}")

conn.close()
