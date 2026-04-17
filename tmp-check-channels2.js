const Database = require('better-sqlite3');
const db = new Database('/opt/new-api/data/one-api.db', { readonly: true });

// 1. 渠道8最近日志
console.log("=== 渠道8(4147)最近20条日志 ===");
const ch8Logs = db.prepare(`
  SELECT id, created_at, model_name, token_name, channel_id, prompt_tokens, completion_tokens, quota, token_id
  FROM logs WHERE channel_id = 8 ORDER BY id DESC LIMIT 20
`).all();
if (ch8Logs.length === 0) {
  console.log("  (无记录)");
} else {
  for (const l of ch8Logs) {
    const t = new Date(l.created_at * 1000).toISOString().slice(5, 16).replace('T', ' ');
    console.log(`${l.id} | ${t} | model=${l.model_name} | token=${l.token_name}(id=${l.token_id}) | p=${l.prompt_tokens} c=${l.completion_tokens} | quota=${l.quota}`);
  }
}

// 2. 各渠道调用统计（本月）
const monthStart = Math.floor(new Date(2026, 3, 1).getTime() / 1000); // April 2026
console.log("\n=== 各渠道本月调用统计 ===");
const chStats = db.prepare(`
  SELECT channel_id, count(*) as cnt, sum(quota) as total_quota,
    max(created_at) as last_at
  FROM logs WHERE created_at >= ? GROUP BY channel_id ORDER BY channel_id
`).all(monthStart);
for (const s of chStats) {
  const last = new Date(s.last_at * 1000).toISOString().slice(5, 16).replace('T', ' ');
  console.log(`  ch${s.channel_id}: ${s.cnt}次 | quota=${s.total_quota} ($${(s.total_quota/500000).toFixed(2)}) | last=${last}`);
}

// 3. 渠道配置
console.log("\n=== 渠道配置(端口映射) ===");
const channels = db.prepare(`SELECT id, name, base_url, status FROM channels ORDER BY id`).all();
for (const c of channels) {
  console.log(`  ch${c.id}: ${c.name} | ${c.base_url} | status=${c.status}`);
}

// 4. 各token本月调用的渠道分布
console.log("\n=== 各token本月渠道分布 ===");
const tokenChStats = db.prepare(`
  SELECT token_name, token_id, channel_id, count(*) as cnt, sum(quota) as total_quota
  FROM logs WHERE created_at >= ? GROUP BY token_name, channel_id ORDER BY token_name, channel_id
`).all(monthStart);
for (const s of tokenChStats) {
  console.log(`  token=${s.token_name}(id=${s.token_id}) -> ch${s.channel_id}: ${s.cnt}次 $${(s.total_quota/500000).toFixed(2)}`);
}

// 5. Token 列表
console.log("\n=== Token列表 ===");
const tokens = db.prepare(`SELECT id, name, key, status, used_quota, remain_quota FROM tokens ORDER BY id`).all();
for (const t of tokens) {
  console.log(`  token_id=${t.id} name=${t.name} status=${t.status} used=$${(t.used_quota/500000).toFixed(2)} remain=$${(t.remain_quota/500000).toFixed(2)} key=${t.key.slice(0,15)}...`);
}

db.close();
