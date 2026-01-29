const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function main() {
  const email = 'cyga6710@gmail.com'; // 你的邮箱
  
  // 生成32位随机密码
  const newPassword = crypto.randomBytes(16).toString('hex');
  
  const hashedPassword = await bcrypt.hash(newPassword, 12);
  
  const user = await prisma.user.update({
    where: { email },
    data: { 
      role: 'admin',
      password: hashedPassword,
    },
  });
  
  console.log('\n==================================================');
  console.log('✅ 管理员账户已更新');
  console.log('==================================================');
  console.log('邮箱:', user.email);
  console.log('角色:', user.role);
  console.log('新密码:', newPassword);
  console.log('==================================================');
  console.log('⚠️ 请立即保存此密码，关闭后无法再次查看！');
  console.log('==================================================\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
