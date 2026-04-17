#!/bin/bash
TOKEN="JyLH32oVwyGqUPUgNx8oqsvgaVItBc2F"

echo "=== Group ratios ==="
curl -s "http://127.0.0.1:3001/api/group/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "New-Api-User: 1" | python3 -c "
import json, sys
data = json.load(sys.stdin)
d = data.get('data', data)
if isinstance(d, dict):
    for k, v in d.items():
        print(f'  {k}: {v}')
elif isinstance(d, list):
    for it in d:
        print(f'  {it}')
else:
    print(d)
"

echo ""
echo "=== All-time logs for token proj-7d04a917 (page 0-3) ==="
total=0
calls=0
in_total=0
out_total=0
for p in 0 1 2 3; do
  data=$(curl -s "http://127.0.0.1:3001/api/log/?p=$p&per_page=100&token_name=proj-7d04a917" \
    -H "Authorization: Bearer $TOKEN" \
    -H "New-Api-User: 1")
  count=$(echo "$data" | python3 -c "import json,sys; d=json.load(sys.stdin); items=d.get('data',{}).get('items',[]); print(len(items))")
  if [ "$count" = "0" ]; then break; fi
  result=$(echo "$data" | python3 -c "
import json,sys,datetime
d=json.load(sys.stdin)
items=d.get('data',{}).get('items',[])
q=0; inp=0; out=0
for i in items:
    q+=i.get('quota',0)
    inp+=i.get('prompt_tokens',0)
    out+=i.get('completion_tokens',0)
    ts=datetime.datetime.fromtimestamp(i.get('created_at',0)).strftime('%Y-%m-%d %H:%M')
    print(f\"  {ts} {i.get('model_name','?'):25s} in={i.get('prompt_tokens',0):>8,} out={i.get('completion_tokens',0):>8,} quota={i.get('quota',0):>10,}\")
print(f'PAGE_STATS:{q}:{inp}:{out}:{len(items)}')
")
  echo "$result" | grep -v "^PAGE_STATS:"
  stats=$(echo "$result" | grep "^PAGE_STATS:" | cut -d: -f2-)
  total=$((total + $(echo "$stats" | cut -d: -f1)))
  in_total=$((in_total + $(echo "$stats" | cut -d: -f2)))
  out_total=$((out_total + $(echo "$stats" | cut -d: -f3)))
  calls=$((calls + $(echo "$stats" | cut -d: -f4)))
done

echo ""
echo "Total: $calls calls, quota=$total (USD \$$(python3 -c "print(f'{$total/500000:.4f}')"), in=$in_total, out=$out_total"

echo ""
echo "=== AIKey lastRemoteUsedUsd for this key ==="
cd /opt/cardvela
node -e '
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const key = await p.aIKey.findFirst({ where: { newApiTokenName: "proj-7d04a917" }});
  if (!key) { console.log("key not found"); return; }
  console.log("totalUsed:", key.totalUsed);
  console.log("monthUsed:", key.monthUsed);
  console.log("lastRemoteUsedUsd:", key.lastRemoteUsedUsd);
  console.log("lastSyncAt:", key.lastSyncAt);
  console.log("createdAt:", key.createdAt);
  console.log("status:", key.status);
  
  // Get transactions for this user today
  const txs = await p.transaction.findMany({
    where: { userId: key.userId, type: "ai_usage" },
    orderBy: { createdAt: "asc" },
    take: 5,
  });
  console.log("\nFirst 5 ai_usage transactions:");
  for (const t of txs) {
    console.log("  ", t.createdAt.toISOString(), t.amount);
  }
  
  const total = await p.transaction.aggregate({
    where: { userId: key.userId, type: "ai_usage" },
    _sum: { amount: true },
    _count: true,
  });
  console.log("\nAll-time total deducted:", total._sum.amount, "across", total._count, "transactions");
  
  await p.$disconnect();
})()
' 2>&1
