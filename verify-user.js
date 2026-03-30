// 验证数据库中的用户和密码
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function verifyUser() {
  const email = 'cyga6710@gmail.com';
  const password = 'admin123';

  console.log('🔍 验证用户:', email);
  console.log('🔐 测试密码:', password);

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      console.log('❌ 用户不存在');
      return;
    }

    console.log('✅ 找到用户:');
    console.log('  ID:', user.id);
    console.log('  Email:', user.email);
    console.log('  Username:', user.username);
    console.log('  Role:', user.role);
    console.log('  Password hash length:', user.password.length);

    // 验证密码
    console.log('🔐 验证密码...');
    const isValid = await bcrypt.compare(password, user.password);
    console.log('✅ 密码验证结果:', isValid);

    if (isValid) {
      console.log('🎉 用户验证成功！可以正常登录');
    } else {
      console.log('❌ 密码不匹配');
    }

  } catch (error) {
    console.error('❌ 数据库错误:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyUser();