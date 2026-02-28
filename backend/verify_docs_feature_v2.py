import requests
import json

def verify():
    try:
        # 1. Check a specific subsidy that was updated
        r_subs = requests.get('http://localhost:8081/api/subsidies')
        subs = r_subs.json()
        target = None
        for s in subs:
            if "ものづくり" in s.get('title', ''):
                target = s
                break
        
        if target:
            print(f"Target Subsidy Found: {target.get('title')}")
            print(f"Required Docs: {len(target.get('required_documents', []))}")
            for d in target.get('required_documents', []):
                print(f"  - {d.get('name')}")
            print(f"Submission Guide exists: {'submission_guide' in target}")
            print(f"Submission Guide Data: {target.get('submission_guide')}")
        else:
            print("Target Subsidy 'ものづくり' not found in full list.")

        # 2. Check for specific_documents in a case
        r_cases = requests.get('http://localhost:8081/api/cases')
        cases = r_cases.json()
        if len(cases) > 0:
            c = cases[0]
            print(f"Case ID: {c.get('id')} has specific_documents key: {'specific_documents' in c}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    verify()
