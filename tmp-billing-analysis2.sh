#!/bin/bash
TOKEN="JyLH32oVwyGqUPUgNx8oqsvgaVItBc2F"
NOW=$(date +%s)
THREE_H=$((NOW - 10800))

for p in 0 1 2 3; do
  curl -s "http://127.0.0.1:3001/api/log/?p=$p&per_page=100&start_timestamp=$THREE_H" \
    -H "Authorization: Bearer $TOKEN" \
    -H "New-Api-User: 1" > "/tmp/logs_p${p}.json"
done

python3 << 'PYEOF'
import json

items=[]
for p in range(4):
    try:
        with open(f"/tmp/logs_p{p}.json") as fp:
            d=json.load(fp)
            page_items = d["data"]["items"]
            items.extend(page_items)
            if len(page_items) < 100:
                break
    except:
        break

print(f"Total calls in last 3h: {len(items)}")
sq=0; si=0; so=0
ms={}; ts={}
for i in items:
    q=i["quota"]; pt=i["prompt_tokens"]; ct=i["completion_tokens"]; m=i["model_name"]; tn=i["token_name"]
    sq+=q; si+=pt; so+=ct
    ms.setdefault(m,{"c":0,"q":0,"i":0,"o":0})
    ms[m]["c"]+=1; ms[m]["q"]+=q; ms[m]["i"]+=pt; ms[m]["o"]+=ct
    ts.setdefault(tn,{"c":0,"q":0})
    ts[tn]["c"]+=1; ts[tn]["q"]+=q
print(f"\nnew-api total quota: {sq} (new-api USD ${sq/500000:.4f})")
print(f"Input tokens: {si:,}  Output tokens: {so:,}")
print(f"\n--- By Model ---")
for m,s in sorted(ms.items(), key=lambda x:-x[1]["q"]):
    print(f"  {m}: {s['c']} calls, quota={s['q']} (${s['q']/500000:.4f}), in={s['i']:,}, out={s['o']:,}")
print(f"\n--- By Token (user key) ---")
for t,s in sorted(ts.items(), key=lambda x:-x[1]["q"]):
    print(f"  {t}: {s['c']} calls, ${s['q']/500000:.4f}")
PYEOF
