import requests
import json

def verify():
    try:
        # 1. Cases list
        r = requests.get('http://localhost:8081/api/cases')
        data = r.json()
        print(f"Cases count: {len(data)}")
        if len(data) > 0:
            c = data[0]
            print(f"Case ID: {c.get('id')}")
            print(f"Specific Docs Field exists: {'specific_documents' in c}")
        
        # 2. Subsidy detail
        if len(data) > 0:
            sub_id = data[0].get('subsidy_id')
            r_sub = requests.get(f'http://localhost:8081/api/subsidies/{sub_id}')
            sub = r_sub.json()
            print(f"Subsidy Title: {sub.get('title')}")
            print(f"Required Docs: {len(sub.get('required_documents', []))}")
            print(f"Submission Guide exists: {'submission_guide' in sub}")
            
    except Exception as e:
        print(f"Error during verification: {e}")

if __name__ == "__main__":
    verify()
