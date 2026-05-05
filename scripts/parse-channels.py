import json
d=json.load(open('/tmp/ch.json'))
items = d.get('data',{}).get('items',[]) or []
print('Total:', len(items))
for c in items:
    print('id=%s status=%s group=%s name=%s' % (c.get('id'), c.get('status'), repr(c.get('group','')), c.get('name')))
