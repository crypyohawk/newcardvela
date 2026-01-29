import { NextResponse } from 'next/server';
import { db } from '../../../src/lib/db';

export async function GET() {
  try {
    // 从数据库获取卡片类型
    const cardTypes = await db.cardType.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    // 从数据库获取支付配置
    let paymentConfig: Record<string, string> = {};
    try {
      const configs = await db.systemConfig.findMany();
      configs.forEach((c: any) => { paymentConfig[c.key] = c.value; });
    } catch (e) {
      // SystemConfig 表可能不存在
    }

    return NextResponse.json({
      cardTypes,
      paymentConfig,
      notices: [
        '1. 开卡后请及时充值使用，长期不使用的卡片可能会被自动注销。',
        '2. 请勿用于任何违法违规用途，否则将冻结账户。',
        '3. 卡片余额支持提现，提现将扣除相应手续费。',
        '4. 如遇支付问题，请联系客服处理。',
        '5. 本平台保留最终解释权。',
      ],
    });
  } catch (error: any) {
    console.error('获取配置失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
