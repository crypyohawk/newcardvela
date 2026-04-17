const Database = require('better-sqlite3');
const db = new Database('/opt/new-api/data/one-api.db');

// 读取当前配置
const current = db.prepare(`SELECT value FROM options WHERE key = 'channel_affinity_setting.default_ttl_seconds'`).get();
console.log("当前 TTL:", current?.value);

// 更新为 3600 秒
db.prepare(`UPDATE options SET value = '3600' WHERE key = 'channel_affinity_setting.default_ttl_seconds'`).run();

// 同时更新 rules 里各规则的 ttl_seconds
const rulesRow = db.prepare(`SELECT value FROM options WHERE key = 'channel_affinity_setting.rules'`).get();
if (rulesRow) {
  const rules = JSON.parse(rulesRow.value);
  for (const rule of rules) {
    console.log(`规则 "${rule.name}": ttl ${rule.ttl_seconds} -> 3600`);
    rule.ttl_seconds = 3600;
  }
  db.prepare(`UPDATE options SET value = ? WHERE key = 'channel_affinity_setting.rules'`).run(JSON.stringify(rules));
}

// 验证
const updated = db.prepare(`SELECT key, value FROM options WHERE key LIKE 'channel_affinity%'`).all();
for (const o of updated) {
  if (o.key.includes('rules')) {
    const rules = JSON.parse(o.value);
    for (const r of rules) {
      console.log(`验证 - 规则 "${r.name}": ttl_seconds=${r.ttl_seconds}`);
    }
  } else {
    console.log(`验证 - ${o.key} = ${o.value}`);
  }
}

db.close();
console.log("\nDone: TTL updated to 3600s (1 hour)");
console.log("Note: restart new-api container to apply");
