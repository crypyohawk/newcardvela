import requests, json, time

BASE = "http://127.0.0.1:3001"
TOKEN = "JyLH32oVwyGqUPUgNx8oqsvgaVItBc2F"
HEADERS = {"Authorization": f"Bearer {TOKEN}", "New-Api-User": "1", "Content-Type": "application/json"}

name = f"test-pplx-{int(time.time())}"

# Step 1: Create token
payload = {"name": name, "remain_quota": 500000, "unlimited_quota": False,
           "expired_time": -1, "model_limits_enabled": False, "model_limits": "", "group": "perplexity-pool"}
r = requests.post(f"{BASE}/api/token/", json=payload, headers=HEADERS)
d = r.json()
print("POST response:", json.dumps(d, indent=2))

token_id = None
if isinstance(d.get("data"), dict):
    token_id = d["data"].get("id")
elif isinstance(d.get("data"), (int, float)):
    token_id = int(d["data"])

print("token_id from POST:", token_id)

# Step 2: GET by id
if token_id:
    r2 = requests.get(f"{BASE}/api/token/{token_id}", headers=HEADERS)
    print("GET by id:", json.dumps(r2.json(), indent=2)[:500])

# Step 3: Search by name
time.sleep(0.5)
r3 = requests.get(f"{BASE}/api/token/search?keyword={name}", headers=HEADERS)
print("Search response:", json.dumps(r3.json(), indent=2)[:500])
