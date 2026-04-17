const Database = require('better-sqlite3');
const db = new Database('/opt/new-api/data/one-api.db', { readonly: true });

// First check table schema
console.log("=== logs表结构 ===");
const cols = db.prepare(`PRAGMA table_info(logs)`).all();
for (const c of cols) console.log(`  ${c.name} (${c.type})`);

console.log("\n=== 查看一条日志样本 ===");
const sample = db.prepare(`SELECT * FROM logs ORDER BY id DESC LIMIT 1`).get();
console.log(JSON.stringify(sample, null, 2));

db.close();
