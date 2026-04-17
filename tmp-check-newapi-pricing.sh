#!/bin/bash
TOKEN="JyLH32oVwyGqUPUgNx8oqsvgaVItBc2F"

echo "=== new-api group ratio ==="
curl -s "http://127.0.0.1:3001/api/group/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "New-Api-User: 1" | python3 -c "
import json, sys
data = json.load(sys.stdin)
if 'data' in data:
    for g in data['data']:
        print(f\"  Group: {g.get('group',g.get('name','?'))} ratio={g.get('ratio', '?')}\")
else:
    print(json.dumps(data, indent=2)[:500])
"

echo ""
echo "=== new-api model list (claude models) ==="
curl -s "http://127.0.0.1:3001/api/model/enabled" \
  -H "Authorization: Bearer $TOKEN" \
  -H "New-Api-User: 1" | python3 -c "
import json, sys
data = json.load(sys.stdin)
items = data.get('data', data) if isinstance(data, dict) else data
if isinstance(items, list):
    for m in items:
        mid = m.get('id', '')
        if 'claude' in str(mid).lower():
            print(f\"  {mid}: model_ratio={m.get('model_ratio', '?')} model_price={m.get('model_price', '?')} owned_by={m.get('owned_by','?')}\")
elif isinstance(items, dict):
    for k, v in items.items():
        if 'claude' in k.lower():
            print(f\"  {k}: {v}\")
"

echo ""
echo "=== Checking a recent log entry for opus pricing fields ==="
NOW=$(date +%s)
THREE_H=$((NOW - 10800))
curl -s "http://127.0.0.1:3001/api/log/?p=0&per_page=1&model_name=claude-opus-4-6&start_timestamp=$THREE_H" \
  -H "Authorization: Bearer $TOKEN" \
  -H "New-Api-User: 1" | python3 -c "
import json, sys
data = json.load(sys.stdin)
items = data.get('data', {}).get('items', data.get('data', []))
if items:
    i = items[0]
    print(f\"  model: {i.get('model_name')}\")
    print(f\"  prompt_tokens: {i.get('prompt_tokens')}\")
    print(f\"  completion_tokens: {i.get('completion_tokens')}\")
    print(f\"  quota: {i.get('quota')}\")
    print(f\"  model_ratio: {i.get('model_ratio')}\")
    print(f\"  model_price: {i.get('model_price')}\")
    print(f\"  completion_ratio: {i.get('completion_ratio')}\")
    print(f\"  group_ratio: {i.get('group_ratio')}\")
    print(f\"  channel: {i.get('channel')}\")
    # Verify formula
    mr = i.get('model_ratio', 0)
    cr = i.get('completion_ratio', 0)
    gr = i.get('group_ratio', 0)
    pt = i.get('prompt_tokens', 0)
    ct = i.get('completion_tokens', 0)
    mp = i.get('model_price', 0)
    if mp and mp > 0:
        calc = mp * 500000 * gr
        print(f\"  FIXED PRICE mode: model_price={mp} * 500000 * group_ratio={gr} = {calc:.0f} quota\")
    else:
        calc = (mr * pt + mr * cr * ct) * gr
        print(f\"  RATIO mode: ({mr}*{pt} + {mr}*{cr}*{ct}) * {gr} = {calc:.0f} (actual={i.get('quota')})\")
else:
    print('No log entries found')
"

echo ""
echo "=== Sonnet log entry ==="
curl -s "http://127.0.0.1:3001/api/log/?p=0&per_page=1&model_name=claude-sonnet-4-6&start_timestamp=$THREE_H" \
  -H "Authorization: Bearer $TOKEN" \
  -H "New-Api-User: 1" | python3 -c "
import json, sys
data = json.load(sys.stdin)
items = data.get('data', {}).get('items', data.get('data', []))
if items:
    i = items[0]
    print(f\"  model: {i.get('model_name')}\")
    print(f\"  prompt_tokens: {i.get('prompt_tokens')}\")
    print(f\"  completion_tokens: {i.get('completion_tokens')}\")
    print(f\"  quota: {i.get('quota')}\")
    print(f\"  model_ratio: {i.get('model_ratio')}\")
    print(f\"  model_price: {i.get('model_price')}\")
    print(f\"  completion_ratio: {i.get('completion_ratio')}\")
    print(f\"  group_ratio: {i.get('group_ratio')}\")
    # Verify
    mr = i.get('model_ratio', 0)
    cr = i.get('completion_ratio', 0)
    gr = i.get('group_ratio', 0)
    pt = i.get('prompt_tokens', 0)
    ct = i.get('completion_tokens', 0)
    mp = i.get('model_price', 0)
    if mp and mp > 0:
        calc = mp * 500000 * gr
        print(f\"  FIXED PRICE mode: model_price={mp} * 500000 * group_ratio={gr} = {calc:.0f} quota\")
    else:
        calc = (mr * pt + mr * cr * ct) * gr
        print(f\"  RATIO mode: ({mr}*{pt} + {mr}*{cr}*{ct}) * {gr} = {calc:.0f} (actual={i.get('quota')})\")
"
