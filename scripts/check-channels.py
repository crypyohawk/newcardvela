import json, sys
d = json.load(open('/tmp/ch.json'))
channels = d.get('data') or []
print(f"Total channels: {len(channels)}")
for c in channels:
    print(f"  id={c['id']} status={c['status']} group={repr(c.get('group',''))} name={c['name']}")
