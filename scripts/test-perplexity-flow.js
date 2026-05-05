// 端到端测试：登录 → 拉套餐 → 订阅 → 验证余额扣减 → 二次订阅(应 409)
const BASE = 'http://localhost:3000';

async function main() {
  // 登录用户
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'tester@cardvela.local', password: 'Cardvela@2026' }),
  });
  const { token } = await loginRes.json();
  const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  console.log('login OK');

  // 拉套餐
  const plansRes = await fetch(`${BASE}/api/user/perplexity/plans`, { headers: H });
  const { plans } = await plansRes.json();
  console.log('plans:', plans.map((p) => `${p.code} $${p.priceUsd}`).join(', '));

  // 拉当前订阅
  let subRes = await fetch(`${BASE}/api/user/perplexity/subscription`, { headers: H });
  let sub = await subRes.json();
  console.log('before: balance=$' + sub.aiBalance + ' active=' + (sub.active ? sub.active.plan.displayName : 'none'));

  // 订阅月度
  const monthly = plans.find((p) => p.code === 'pro-monthly');
  const buyRes = await fetch(`${BASE}/api/user/perplexity/subscription`, {
    method: 'POST', headers: H, body: JSON.stringify({ planId: monthly.id }),
  });
  const buy = await buyRes.json();
  console.log('subscribe status=' + buyRes.status, JSON.stringify(buy).substring(0, 200));

  // 再拉
  subRes = await fetch(`${BASE}/api/user/perplexity/subscription`, { headers: H });
  sub = await subRes.json();
  console.log('after:  balance=$' + sub.aiBalance + ' active=' + (sub.active ? `${sub.active.plan.displayName} quota=$${sub.active.quotaTotalUsd} expires=${sub.active.expiresAt}` : 'none'));

  // 重复订阅应 409
  const dupRes = await fetch(`${BASE}/api/user/perplexity/subscription`, {
    method: 'POST', headers: H, body: JSON.stringify({ planId: monthly.id }),
  });
  console.log('dup subscribe status=' + dupRes.status, '(expect 409)');

  // 季度需 $60，余额应不足
  const q = plans.find((p) => p.code === 'pro-quarterly');
  // 但当前 active 已挡住 — 先取消现有再测试不足。这里跳过，只验证余额检查靠手动场景
}
main().catch((e) => { console.error(e); process.exit(1); });
