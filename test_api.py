import requests
import json

base_url = "http://localhost:8080/api"

def test_login():
    data = {
        "email": "test@example.com",
        "name": "テスト部長",
        "picture": "http://example.com/pic.jpg"
    }
    try:
        res = requests.post(f"{base_url}/users/", json=data)
        print(f"Status: {res.status_code}")
        print(f"Response: {res.json()}")
        
        user_id = res.json().get("id")
        if user_id:
            res_comp = requests.get(f"{base_url}/companies/?user_id={user_id}")
            print(f"Companies for {user_id}: {res_comp.json()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_login()
