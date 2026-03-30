// 检查数据库状态和用户
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabase() {
  console.log('🔍 检查数据库状态...\n');

  try {
    // 检查用户表
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        createdAt: true
      }
    });

    console.log(`👥 找到 ${users.length} 个用户:`);
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.username}) - 角色: ${user.role} - 创建时间: ${user.createdAt}`);
    });

    if (users.length === 0) {
      console.log('\n⚠️  没有用户！需要创建管理员用户。');
      console.log('运行以下命令创建测试用户:');
      console.log('node scripts/create-test-user.js');
    }

    // 检查 CopilotAccount 表
    const copilotAccounts = await prisma.copilotAccount.findMany();
    console.log(`\n🤖 找到 ${copilotAccounts.length} 个 Copilot 账号`);

    // 检查数据库连接
    console.log('\n✅ 数据库连接正常');

  } catch (error) {
    console.error('❌ 数据库错误:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();