const Database = require('better-sqlite3');
const db = new Database('/opt/new-api/data/one-api.db', { readonly: true });

// 1. 查渠道8的最近日志
console.log("=== 渠道8最近20条日志 ===");
const ch8Logs = db.prepare(`
  SELECT id, created_at, model_name, token_name, channel, prompt_tokens, completion_tokens, quota
  FROM logs WHERE channel = 8 ORDER BY id DESC LIMIT 20
`).all();
for (const l of ch8Logs) {
  const t = new Date(l.created_at * 1000).toISOString().slice(5, 16).replace('T', ' ');
  console.log(`${l.id} | ${t} | model=${l.model_name} | token=${l.token_name} | prompt=${l.prompt_tokens} comp=${l.completion_tokens} | quota=${l.quota}`);
}

// 2. 各渠道的调用次数和总quota
console.log("\n=== 各渠道调用统计 ===");
const chStats = db.prepare(`
  SELECT channel, count(*) as cnt, sum(quota) as total_quota, 
    min(created_at) as first_at, max(created_at) as last_at
  FROM logs GROUP BY channel ORDER BY channel
`).all();
for (const s of chStats) {
  const first = new Date(s.first_at * 1000).toISOString().slice(5, 16).replace('T', ' ');
  const last = new Date(s.last_at * 1000).toISOString().slice(5, 16).replace('T', ' ');
  console.log(`ch${s.channel}: ${s.cnt}次 | quota=${s.total_quota} ($${(s.total_quota/500000).toFixed(2)}) | ${first} ~ ${last}`);
}

// 3. 查渠道配置 - 知道每个渠道对应哪个端口
console.log("\n=== 渠道配置 ===");
const channels = db.prepare(`SELECT id, name, base_url, status FROM channels ORDER BY id`).all();
for (const c of channels) {
  console.log(`ch${c.id}: ${c.name} | ${c.base_url} | status=${c.status}`);
}

// 4. 各token的调用统计（含渠道分布）
console.log("\n=== 各token调用渠道分布 ===");
const tokenChStats = db.prepare(`
  SELECT token_name, channel, count(*) as cnt, sum(quota) as total_quota
  FROM logs GROUP BY token_name, channel ORDER BY token_name, channel
`).all();
for (const s of tokenChStats) {
  console.log(`token=${s.token_name} | ch${s.channel}: ${s.cnt}次 quota=${s.total_quota} ($${(s.total_quota/500000).toFixed(2)})`);
}

db.close();
