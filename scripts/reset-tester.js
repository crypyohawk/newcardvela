const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const u = await p.user.findUnique({ where: { email: 'tester@cardvela.local' } });
  await p.perplexitySubscription.deleteMany({ where: { userId: u.id } });
  await p.user.update({ where: { id: u.id }, data: { aiBalance: 5 } });
  console.log('reset: balance=5 sub=cleared');
  await p.$disconnect();
})();
