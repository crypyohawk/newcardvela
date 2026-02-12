import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../src/lib/db';
import { verifyToken, getTokenFromRequest } from '../../../../src/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: '无效的令牌' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, paymentMethod, network } = body;

    console.log('[充值请求]', { amount, paymentMethod, network, userId: payload.userId });

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: '请输入有效的充值金额' }, { status: 400 });
    }

    // 阶梯式频率限制
    // 检查5分钟内的订单数
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentOrders5min = await db.transaction.count({
      where: {
        userId: payload.userId,
        type: 'recharge',
        createdAt: { gte: fiveMinutesAgo },
      },
    });

    if (recentOrders5min >= 2) {
      // 已触发5分钟限制，检查是否是累犯
      // 统计1小时内被限制后仍然尝试的次数（1小时内总订单数）
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentOrders1h = await db.transaction.count({
        where: {
          userId: payload.userId,
          type: 'recharge',
          createdAt: { gte: oneHourAgo },
        },
      });

      if (recentOrders1h >= 10) {
        // 第3级：1小时内超过10次，锁定1小时
        const lastOrder = await db.transaction.findFirst({
          where: { userId: payload.userId, type: 'recharge' },
          orderBy: { createdAt: 'desc' },
        });
        const timeSinceLast = lastOrder ? Date.now() - new Date(lastOrder.createdAt).getTime() : 0;
        const waitMinutes = Math.ceil((60 * 60 * 1000 - timeSinceLast) / 60000);
        return NextResponse.json({ 
          error: `操作过于频繁，账户已被临时限制充值，请${waitMinutes}分钟后再试` 
        }, { status: 429 });
      }

      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const recentOrders30min = await db.transaction.count({
        where: {
          userId: payload.userId,
          type: 'recharge',
          createdAt: { gte: thirtyMinutesAgo },
        },
      });

      if (recentOrders30min >= 6) {
        // 第2级：30分钟内超过6次，等待30分钟
        const lastOrder = await db.transaction.findFirst({
          where: { userId: payload.userId, type: 'recharge' },
          orderBy: { createdAt: 'desc' },
        });
        const timeSinceLast = lastOrder ? Date.now() - new Date(lastOrder.createdAt).getTime() : 0;
        const waitMinutes = Math.ceil((30 * 60 * 1000 - timeSinceLast) / 60000);
        return NextResponse.json({ 
          error: `操作频繁，请${waitMinutes}分钟后再试` 
        }, { status: 429 });
      }

      // 第1级：5分钟内超过2次，等待5分钟
      const lastOrder = await db.transaction.findFirst({
        where: { userId: payload.userId, type: 'recharge' },
        orderBy: { createdAt: 'desc' },
      });
      const timeSinceLast = lastOrder ? Date.now() - new Date(lastOrder.createdAt).getTime() : 0;
      const waitMinutes = Math.ceil((5 * 60 * 1000 - timeSinceLast) / 60000);
      return NextResponse.json({ 
        error: `请勿频繁操作，请${waitMinutes}分钟后再试` 
      }, { status: 429 });
    }

    // 检查是否首次充值
    const previousRecharge = await db.transaction.findFirst({
      where: { 
        userId: payload.userId, 
        type: 'recharge',
        status: 'completed',
      },
    });
    const isFirstRecharge = !previousRecharge;

    const minAmount = isFirstRecharge ? 10 : 5;
    if (amount < minAmount) {
      return NextResponse.json({ 
        error: isFirstRecharge ? '首次充值最低金额为 $10' : '充值最低金额为 $5' 
      }, { status: 400 });
    }

    // 从数据库获取配置
    let configMap: Record<string, string> = {};
    try {
      const configs = await db.systemConfig.findMany();
      configs.forEach((c: any) => { 
        configMap[c.key] = c.value; 
      });
    } catch (e) {
      console.log('[配置读取失败，使用默认值]', e);
    }

    const exchangeRate = parseFloat(configMap['recharge_usd_cny_rate'] || '7.2');

    // 创建充值订单 - 确保保存 paymentMethod
    let order;
    try {
      order = await db.transaction.create({
        data: {
          userId: payload.userId,
          type: 'recharge',
          amount: amount,
          status: 'pending',
          paymentMethod: paymentMethod || null,
          paymentNetwork: paymentMethod === 'usdt' ? (network || null) : null,
        },
      });
      console.log('[订单创建成功]', order.id, 'paymentMethod:', order.paymentMethod);
    } catch (e: any) {
      console.error('[订单创建失败]', e);
      return NextResponse.json({ error: '创建订单失败: ' + e.message }, { status: 500 });
    }

    let paymentInfo: any = {};

    if (paymentMethod === 'usdt') {
      const addresses: Record<string, { address: string; network: string; chainName: string }> = {
        trc20: {
          network: 'TRC20',
          chainName: '波场 TRON',
          address: configMap['usdt_trc20_address'] || '请管理员配置地址',
        },
        erc20: {
          network: 'ERC20',
          chainName: '以太坊 Ethereum',
          address: configMap['usdt_erc20_address'] || '请管理员配置地址',
        },
        bep20: {
          network: 'BEP20',
          chainName: '币安智能链 BSC',
          address: configMap['usdt_bep20_address'] || '请管理员配置地址',
        },
      };

      const selected = addresses[network || 'trc20'];
      paymentInfo = {
        type: 'usdt',
        currency: 'USD',
        network: selected.network,
        chainName: selected.chainName,
        address: selected.address,
        amount: amount,
        displayAmount: `${amount} USDT`,
      };
    } else if (paymentMethod === 'wechat') {
      const cnyAmount = Math.ceil(amount * exchangeRate);
      paymentInfo = {
        type: 'wechat',
        currency: 'CNY',
        qrcode: configMap['wechat_qrcode'] || '',
        amount: amount,
        cnyAmount: cnyAmount,
        displayAmount: `¥${cnyAmount}`,
        exchangeRate: exchangeRate,
      };
    } else if (paymentMethod === 'alipay') {
      const cnyAmount = Math.ceil(amount * exchangeRate);
      paymentInfo = {
        type: 'alipay',
        currency: 'CNY',
        qrcode: configMap['alipay_qrcode'] || '',
        amount: amount,
        cnyAmount: cnyAmount,
        displayAmount: `¥${cnyAmount}`,
        exchangeRate: exchangeRate,
      };
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        status: order.status,
      },
      paymentInfo,
      isFirstRecharge,
      minAmount,
    });

  } catch (error: any) {
    console.error('创建充值订单失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
