const Database = require('better-sqlite3');
const db = new Database('/opt/new-api/data/one-api.db', { readonly: true });

// 1. 所有负载均衡相关的 options 配置
console.log("=== 负载均衡相关配置 ===");
const opts = db.prepare(`SELECT key, value FROM options WHERE key LIKE '%channel%' OR key LIKE '%affinity%' OR key LIKE '%balance%' OR key LIKE '%weight%' OR key LIKE '%retry%' OR key LIKE '%priority%' OR key LIKE '%strategy%'`).all();
for (const o of opts) {
  console.log(`${o.key} = ${o.value}`);
}

// 2. 渠道完整配置
console.log("\n=== 渠道完整字段 ===");
const chCols = db.prepare(`PRAGMA table_info(channels)`).all();
console.log("字段:", chCols.map(c => c.name).join(', '));

const channels = db.prepare(`SELECT * FROM channels WHERE id >= 2 ORDER BY id`).all();
for (const c of channels) {
  console.log(`\nch${c.id}: ${c.name}`);
  console.log(`  base_url=${c.base_url}`);
  console.log(`  weight=${c.weight} priority=${c.priority} status=${c.status}`);
  console.log(`  used_quota=${c.used_quota} response_time=${c.response_time}`);
  console.log(`  test_time=${c.test_time} balance=${c.balance}`);
  // 其他可能影响选择的字段
  const keys = Object.keys(c).filter(k => !['key','id','name','base_url','weight','priority','status','used_quota','response_time','test_time','balance','type','models','model_mapping','created_time','other','group','tag','setting'].includes(k));
  if (keys.length > 0) {
    for (const k of keys) {
      if (c[k] !== 0 && c[k] !== '' && c[k] !== null) {
        console.log(`  ${k}=${c[k]}`);
      }
    }
  }
}

// 3. channel affinity 完整配置
console.log("\n=== Channel Affinity 完整配置 ===");
const affinityOpts = db.prepare(`SELECT key, value FROM options WHERE key LIKE '%affinity%'`).all();
for (const o of affinityOpts) {
  console.log(`${o.key}:`);
  console.log(o.value);
}

// 4. 当前各渠道在 new-api 中的 used_quota 比较
console.log("\n=== 各渠道 used_quota 对比 ===");
const quotas = db.prepare(`SELECT id, name, used_quota FROM channels WHERE id >= 2 ORDER BY id`).all();
const totalQ = quotas.reduce((s, c) => s + c.used_quota, 0);
for (const q of quotas) {
  const pct = totalQ > 0 ? (q.used_quota / totalQ * 100).toFixed(1) : '0';
  console.log(`  ch${q.id}: used_quota=${q.used_quota} ($${(q.used_quota/500000).toFixed(2)}) ${pct}%`);
}

db.close();
