import json
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal
from models import Subsidy
from datetime import datetime

def update_dates():
    db = SessionLocal()
    with open("data/subsidy_master.json", "r", encoding="utf-8") as f:
        master = json.load(f)

    for s_data in master:
        subsidy = db.query(Subsidy).filter(Subsidy.subsidy_code == s_data["subsidy_code"]).first()
        if subsidy:
            print(f"Updating {subsidy.subsidy_code}")
            subsidy.announcement_date = datetime.strptime(s_data["announcement_date"], "%Y-%m-%d").date()
            subsidy.application_start = datetime.strptime(s_data["application_start"], "%Y-%m-%d").date()
            if "T" in s_data["application_end"]:
                subsidy.application_end = datetime.strptime(s_data["application_end"], "%Y-%m-%dT%H:%M:%S")
            else:
                subsidy.application_end = datetime.strptime(s_data["application_end"], "%Y-%m-%d")
            db.commit()
            
    print("Successfully updated subsidy dates to align with 2026-02-20.")
    db.close()

if __name__ == "__main__":
    update_dates()
