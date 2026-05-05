import requests, json

BASE = "http://127.0.0.1:3001"
TOKEN = "JyLH32oVwyGqUPUgNx8oqsvgaVItBc2F"
HEADERS = {"Authorization": f"Bearer {TOKEN}", "New-Api-User": "1"}

# Check GET by id (id=53 from previous test)
r = requests.get(f"{BASE}/api/token/53", headers=HEADERS)
print("GET /api/token/53:")
print(json.dumps(r.json(), indent=2))
