// 重置管理员密码为已知值
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetAdminPassword() {
  const email = 'cyga6710@gmail.com';
  const newPassword = 'admin123'; // 简单密码用于测试

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const user = await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        role: 'ADMIN' // 确保角色是大写
      },
    });

    console.log('\n==================================================');
    console.log('✅ 管理员密码已重置');
    console.log('==================================================');
    console.log('邮箱:', user.email);
    console.log('新密码:', newPassword);
    console.log('角色:', user.role);
    console.log('==================================================');
    console.log('现在可以用以下信息登录:');
    console.log('邮箱: cyga6710@gmail.com');
    console.log('密码: admin123');
    console.log('==================================================\n');

  } catch (error) {
    console.error('❌ 重置密码失败:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdminPassword();