// 初始化脚本：将现有的默认持卡人导入 CardHolder 表
// 用法: node scripts/init-cardholder.js
// 需要在服务器上执行 prisma migrate 后运行

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const holderId = process.env.GSALARY_DEFAULT_CARD_HOLDER_ID;
  
  if (!holderId) {
    console.log('❌ 未设置 GSALARY_DEFAULT_CARD_HOLDER_ID 环境变量');
    process.exit(1);
  }

  // 统计该持卡人下的已有卡片数
  const cardCount = await prisma.userCard.count({
    where: { status: 'active' },
  });

  console.log(`📋 当前活跃卡片总数: ${cardCount}`);

  // 检查是否已存在
  const existing = await prisma.cardHolder.findUnique({
    where: { gsalaryHolderId: holderId },
  });

  if (existing) {
    // 更新计数
    await prisma.cardHolder.update({
      where: { gsalaryHolderId: holderId },
      data: { cardCount },
    });
    console.log(`✅ 持卡人 ${holderId} 已存在，更新开卡数为 ${cardCount}`);
  } else {
    // 创建记录
    await prisma.cardHolder.create({
      data: {
        gsalaryHolderId: holderId,
        firstName: 'Michael',
        lastName: 'Johnson',
        email: 'default@cardvela.com',
        cardCount,
        maxCards: 20,
        isActive: cardCount < 20,
      },
    });
    console.log(`✅ 持卡人 ${holderId} 已导入，开卡数 ${cardCount}，${cardCount >= 20 ? '已满' : '可用'}`);
  }

  const allHolders = await prisma.cardHolder.findMany();
  console.log('\n当前所有持卡人:');
  allHolders.forEach(h => {
    console.log(`  ${h.gsalaryHolderId} | ${h.firstName} ${h.lastName} | ${h.cardCount}/${h.maxCards} | ${h.isActive ? '可用' : '已满'}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
