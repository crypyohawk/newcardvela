#!/bin/bash
# 拉取 channel 15 完整 JSON, merge models/model_mapping, PUT 回去
set -e

NEWAPI_TOKEN="JyLH32oVwyGqUPUgNx8oqsvgaVItBc2F"
NEWAPI_URL="http://127.0.0.1:3001"
HDR_AUTH="Authorization: Bearer ${NEWAPI_TOKEN}"
HDR_USER="New-Api-User: 1"

echo "[1] 拉取 channel 15 完整 JSON..."
curl -s -H "$HDR_AUTH" -H "$HDR_USER" "${NEWAPI_URL}/api/channel/15" > /tmp/channel-15-full.json
echo "    success=$(python3 -c 'import json;print(json.load(open("/tmp/channel-15-full.json"))["success"])')"

echo "[2] merge models / model_mapping..."
python3 <<'PY'
import json
full = json.load(open("/tmp/channel-15-full.json"))
patch = json.load(open("/tmp/channel-15-patch.json"))
ch = full["data"]
ch["models"] = patch["models"]
ch["model_mapping"] = patch["model_mapping"]
json.dump(ch, open("/tmp/channel-15-new.json", "w"), ensure_ascii=False)
print("    new models count:", len(ch["models"].split(",")))
print("    new mapping keys:", len(json.loads(ch["model_mapping"])))
PY

echo "[3] PUT 回 new-api..."
curl -s -X PUT -H "$HDR_AUTH" -H "$HDR_USER" -H "Content-Type: application/json" \
  --data-binary @/tmp/channel-15-new.json \
  "${NEWAPI_URL}/api/channel/" | python3 -m json.tool

echo "[4] 验证..."
curl -s -H "$HDR_AUTH" -H "$HDR_USER" "${NEWAPI_URL}/api/channel/15" | python3 -c '
import json, sys
d = json.load(sys.stdin)["data"]
print("    models:", d["models"][:120], "...")
print("    mapping keys:", list(json.loads(d["model_mapping"]).keys())[:8], "...")
'

echo "[5] 测试 claude-opus-4-7 调用 (应通过映射→sonnet)..."
KEY=$(docker exec cardvela-postgres psql -U cardvela -d cardvela -tA -c "SELECT key FROM \"AIServiceKey\" WHERE \"channelGroup\"='perplexity-pool' AND status='active' LIMIT 1;" 2>/dev/null || echo "")
if [ -n "$KEY" ]; then
  echo "    using key: ${KEY:0:20}..."
  curl -s -X POST "${NEWAPI_URL}/v1/chat/completions" \
    -H "Authorization: Bearer $KEY" \
    -H "Content-Type: application/json" \
    -d '{"model":"claude-opus-4-7","messages":[{"role":"user","content":"hi, just say ok"}],"max_tokens":20,"stream":false}' \
    | python3 -m json.tool 2>&1 | head -25
else
  echo "    (no perplexity-pool key found, skip live test)"
fi
