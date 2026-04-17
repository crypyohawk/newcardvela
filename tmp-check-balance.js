const Database = require('better-sqlite3');
const db = new Database('/opt/new-api/data/one-api.db', { readonly: true });

const monthStart = Math.floor(new Date(2026, 3, 1).getTime() / 1000);

// 1. 各渠道本月总负载对比
console.log("=== 各渠道本月负载分布 ===");
const chStats = db.prepare(`
  SELECT channel_id, count(*) as cnt, sum(quota) as total_quota,
    sum(prompt_tokens) as total_prompt, sum(completion_tokens) as total_comp
  FROM logs WHERE created_at >= ? AND channel_id > 0
  GROUP BY channel_id ORDER BY channel_id
`).all(monthStart);

const totalCalls = chStats.reduce((s, c) => s + c.cnt, 0);
const totalQuota = chStats.reduce((s, c) => s + c.total_quota, 0);

for (const s of chStats) {
  const pct = (s.cnt / totalCalls * 100).toFixed(1);
  const qpct = (s.total_quota / totalQuota * 100).toFixed(1);
  console.log(`  ch${s.channel_id}: ${s.cnt}次(${pct}%) | $${(s.total_quota/500000).toFixed(2)}(${qpct}%) | prompt=${s.total_prompt} comp=${s.total_comp}`);
}
console.log(`  总计: ${totalCalls}次 | $${(totalQuota/500000).toFixed(2)}`);

// 2. 最近24小时负载(看当前实时分布)
const last24h = Math.floor(Date.now() / 1000) - 86400;
console.log("\n=== 最近24h各渠道负载 ===");
const recent = db.prepare(`
  SELECT channel_id, count(*) as cnt, sum(quota) as total_quota
  FROM logs WHERE created_at >= ? AND channel_id > 0
  GROUP BY channel_id ORDER BY channel_id
`).all(last24h);

const recentTotal = recent.reduce((s, c) => s + c.cnt, 0);
for (const s of recent) {
  const pct = (s.cnt / recentTotal * 100).toFixed(1);
  console.log(`  ch${s.channel_id}: ${s.cnt}次(${pct}%) | $${(s.total_quota/500000).toFixed(2)}`);
}

// 3. 最近6小时按小时看各渠道分布
console.log("\n=== 最近6小时逐小时分布 ===");
const last6h = Math.floor(Date.now() / 1000) - 21600;
const hourly = db.prepare(`
  SELECT channel_id, (created_at / 3600) as hour_bucket, count(*) as cnt
  FROM logs WHERE created_at >= ? AND channel_id > 0
  GROUP BY hour_bucket, channel_id ORDER BY hour_bucket, channel_id
`).all(last6h);

const hourMap = new Map();
for (const h of hourly) {
  const hourStr = new Date(h.hour_bucket * 3600 * 1000).toISOString().slice(11, 16);
  if (!hourMap.has(hourStr)) hourMap.set(hourStr, {});
  hourMap.get(hourStr)[`ch${h.channel_id}`] = h.cnt;
}
for (const [hour, chs] of hourMap) {
  const parts = Object.entries(chs).map(([k,v]) => `${k}:${v}`).join(' ');
  console.log(`  ${hour} | ${parts}`);
}

// 4. 检查 new-api 渠道的权重和优先级配置
console.log("\n=== 渠道权重/优先级配置 ===");
const channels = db.prepare(`SELECT id, name, weight, priority, status, base_url FROM channels WHERE id >= 2 ORDER BY id`).all();
for (const c of channels) {
  console.log(`  ch${c.id}: weight=${c.weight} priority=${c.priority} status=${c.status} | ${c.name}`);
}

// 5. 有没有 channel_affinity 设置
console.log("\n=== 检查channel affinity配置 ===");
const options = db.prepare(`SELECT key, value FROM options WHERE key LIKE '%affinity%' OR key LIKE '%channel%' OR key LIKE '%balance%'`).all();
if (options.length === 0) console.log("  (无相关配置)");
for (const o of options) {
  console.log(`  ${o.key} = ${o.value.slice(0, 200)}`);
}

db.close();
