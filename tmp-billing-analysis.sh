#!/bin/bash
TOKEN="JyLH32oVwyGqUPUgNx8oqsvgaVItBc2F"
NOW=$(date +%s)
THREE_HOURS=$((NOW - 10800))

echo "=== Last 3h API logs (since timestamp $THREE_HOURS) ==="

# Get all pages
ALL_ITEMS="[]"
for p in $(seq 0 20); do
  RESP=$(curl -s "http://127.0.0.1:3001/api/log/?p=$p&per_page=100&start_timestamp=$THREE_HOURS" \
    -H "Authorization: Bearer $TOKEN" \
    -H "New-Api-User: 1")
  PAGE_ITEMS=$(echo "$RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d['data']['items']))" 2>/dev/null)
  ALL_ITEMS=$(echo "$ALL_ITEMS" "$RESP" | python3 -c "
import json,sys
lines=sys.stdin.read().strip().split('\n')
existing=json.loads(lines[0])
resp=json.loads(lines[1])
existing.extend(resp['data']['items'])
print(json.dumps(existing))
" 2>/dev/null)
  if [ "$PAGE_ITEMS" -lt 100 ] 2>/dev/null; then break; fi
done

echo "$ALL_ITEMS" | python3 -c "
import json,sys
items=json.load(sys.stdin)
print(f'Total calls in last 3h: {len(items)}')
sum_quota=0; sum_input=0; sum_output=0
model_stats={}
token_stats={}
for i in items:
    q=i['quota']; pt=i['prompt_tokens']; ct=i['completion_tokens']; m=i['model_name']; tn=i['token_name']
    sum_quota+=q; sum_input+=pt; sum_output+=ct
    if m not in model_stats: model_stats[m]={'count':0,'quota':0,'input':0,'output':0}
    model_stats[m]['count']+=1; model_stats[m]['quota']+=q; model_stats[m]['input']+=pt; model_stats[m]['output']+=ct
    if tn not in token_stats: token_stats[tn]={'count':0,'quota':0}
    token_stats[tn]['count']+=1; token_stats[tn]['quota']+=q
print(f'\nTotal new-api quota: {sum_quota} (new-api USD: \${sum_quota/500000:.4f})')
print(f'Total input tokens: {sum_input:,}')
print(f'Total output tokens: {sum_output:,}')
print(f'\n--- By Model ---')
for m,s in sorted(model_stats.items(), key=lambda x:-x[1]['quota']):
    avg_in = s['input']//max(s['count'],1)
    avg_out = s['output']//max(s['count'],1)
    print(f'  {m}: {s[\"count\"]} calls, quota={s[\"quota\"]} (USD \${s[\"quota\"]/500000:.4f}), input={s[\"input\"]:,}, output={s[\"output\"]:,}, avg_in={avg_in}, avg_out={avg_out}')
print(f'\n--- By Token (user key) ---')
for t,s in sorted(token_stats.items(), key=lambda x:-x[1]['quota']):
    print(f'  {t}: {s[\"count\"]} calls, new-api USD \${s[\"quota\"]/500000:.4f}')
"

echo ""
echo "=== Our pricing (AIServiceTier) ==="
cd /opt/cardvela
node -e '
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const tiers = await p.aIServiceTier.findMany({
    include: { provider: { select: { name: true, displayName: true, type: true }}},
    orderBy: { sortOrder: "asc" },
  });
  for (const t of tiers) {
    console.log(JSON.stringify({
      name: t.displayName || t.name,
      provider: t.provider?.displayName,
      type: t.provider?.type,
      inputPer1M: t.pricePerMillionInput,
      outputPer1M: t.pricePerMillionOutput,
      modelGroup: t.modelGroup,
      channelGroup: t.channelGroup,
      models: t.models ? (typeof t.models === "string" ? t.models.slice(0,200) : JSON.stringify(t.models).slice(0,200)) : null,
      isActive: t.isActive,
    }));
  }
  await p.$disconnect();
})()
' 2>&1

echo ""
echo "=== CardVela actual deductions last 3h ==="
node -e '
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const since = new Date(Date.now() - 3*60*60*1000);
  const txs = await p.transaction.findMany({
    where: { type: "ai_usage", createdAt: { gte: since }},
    include: { user: { select: { email: true }}},
    orderBy: { createdAt: "desc" },
  });
  let total = 0;
  for (const tx of txs) {
    total += Math.abs(tx.amount);
    console.log(`${tx.createdAt.toISOString().slice(0,19)} ${tx.amount.toFixed(4)} ${tx.user?.email}`);
  }
  console.log(`\nTotal deducted in 3h: $${total.toFixed(4)} across ${txs.length} transactions`);
  await p.$disconnect();
})()
' 2>&1
