import requests
import json

URL = "http://localhost:8080/api/companies"

def test_dna():
    # 1. Get companies
    res = requests.get(URL)
    companies = res.json()
    if not companies:
        print("No companies found")
        return
    
    company_ids = [c['id'] for c in companies[:3]]
    for cid in company_ids:
        print(f"\n--- Testing DNA for company: {cid} ---")
        dna_url = f"{URL}/{cid}/dna"
        res = requests.get(dna_url)
        print(f"Status Code: {res.status_code}")
        try:
            print(f"Response Summary: {json.dumps(res.json(), indent=2, ensure_ascii=False)[:500]}...")
        except:
            print(f"Raw Response: {res.text}")

if __name__ == "__main__":
    test_dna()
