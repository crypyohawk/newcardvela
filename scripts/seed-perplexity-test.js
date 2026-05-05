const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('Cardvela@2026', 12);

  // 1. Admin
  const adminEmail = 'admin@cardvela.local';
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        username: 'admin_local',
        password,
        role: 'admin',
        balance: 100,
        aiBalance: 100,
        referralCode: 'ADMINLOCAL',
      },
    });
    console.log('✓ Admin created:', adminEmail, '/ Cardvela@2026');
  } else {
    await prisma.user.update({ where: { id: admin.id }, data: { password, role: 'admin', aiBalance: 100 } });
    console.log('✓ Admin updated:', admin.email, '/ Cardvela@2026  (aiBalance reset to 100)');
  }

  // 2. Test user
  const userEmail = 'tester@cardvela.local';
  let user = await prisma.user.findFirst({ where: { OR: [{ email: userEmail }, { username: 'tester' }] } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: userEmail,
        username: 'tester',
        password,
        role: 'user',
        balance: 50,
        aiBalance: 50,
        referralCode: 'TESTER01',
      },
    });
    console.log('✓ User created:', userEmail, '/ Cardvela@2026  (aiBalance: 50)');
  } else {
    await prisma.user.update({ where: { id: user.id }, data: { password, aiBalance: 50 } });
    console.log('✓ User reset:', user.email, '/ Cardvela@2026  (aiBalance reset to 50)');
  }

  // 3. Sample Pro plans
  const plans = [
    {
      code: 'pro-monthly',
      displayName: 'Cardvela Pro 月度',
      priceUsd: 22,
      durationDays: 30,
      monthlyQuotaUsd: 50,
      payAsYouGoEquivUsd: 80,
      highlight: true,
      sortOrder: 1,
      features: JSON.stringify([
        '6 大模型不限切换：Claude / GPT / Gemini / Sonar / Auto / Nemotron',
        'Sonar 联网实时搜索 · 多源引用',
        '学术写作辅助 · 论文摘要 / 文献综述',
        '不限请求并发 · 优先调度',
      ]),
      intro: `## 为什么 22 美元远比直连官方划算？

直连官方 Claude Pro / ChatGPT Plus 各需 20$/月，且**互不打通**。
Cardvela Pro 一份订阅，**6 大顶级模型任意切换**，并附赠 Perplexity 官方实时联网搜索。

- 22 美元 → 50 美元等价用量 (相比 token 计费节省约 72%)
- 学术、研究、教育场景的最佳性价比方案
- 余额不够？支持随时按 token 实时计费补充`,
    },
    {
      code: 'pro-quarterly',
      displayName: 'Cardvela Pro 季度',
      priceUsd: 60,
      durationDays: 90,
      monthlyQuotaUsd: 180,
      payAsYouGoEquivUsd: 240,
      highlight: false,
      sortOrder: 2,
      features: JSON.stringify([
        '相当于月度套餐 8.5 折',
        '180 美元等价用量 / 90 天',
        '所有 Pro 模型与功能',
        '优先客服支持',
      ]),
      intro: `## 长期重度用户首选\n\n- 平均每月仅 20 美元\n- 90 天有效期，灵活使用\n- 余额内调用免费消耗`,
    },
  ];

  for (const p of plans) {
    const existing = await prisma.perplexityPlan.findUnique({ where: { code: p.code } });
    if (existing) {
      await prisma.perplexityPlan.update({ where: { code: p.code }, data: p });
      console.log('  ✓ Plan updated:', p.code);
    } else {
      await prisma.perplexityPlan.create({ data: p });
      console.log('  ✓ Plan created:', p.code);
    }
  }

  console.log('\n=== Login URLs ===');
  console.log('  http://localhost:3000/login');
  console.log('  Admin:  admin@cardvela.local  / Cardvela@2026');
  console.log('  User:   tester@cardvela.local / Cardvela@2026  (aiBalance $50)');
  console.log('\n=== Test paths ===');
  console.log('  /admin → 🔮 Perplexity池 → 💎 Pro 套餐管理');
  console.log('  /dashboard → AI 服务 → Cardvela Pro');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
