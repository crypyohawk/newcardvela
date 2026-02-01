import { NextRequest, NextResponse } from 'next/server';
import { getCardHolders, createCardHolder, testConnection, getAvailableQuotas } from '../../../src/lib/gsalary';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'holders';

    if (action === 'test') {
      // 测试连通性
      const result = await testConnection();
      return NextResponse.json(result);
    }

    if (action === 'holders') {
      // 查询持卡人列表，获取 card_holder_id
      const result = await getCardHolders({ page: 1, limit: 10 });
      return NextResponse.json({
        message: '持卡人列表',
        data: result,
      });
    }

    // 创建美国持卡人（用于所有用户开卡）
    if (action === 'create-us-holder') {
      const result = await createCardHolder({
        first_name: 'Michael',
        last_name: 'Johnson',
        birth: '1990-05-15',
        email: 'cyga6710@gmail.com',
        mobile: {
          nation_code: '1',
          mobile: '3025559876',  // 新手机号
        },
        region: 'US',
        bill_address: {
          postcode: '19801',
          address: '1209 Orange Street',
          city: 'Wilmington',
          state: 'DE',
          country: 'US',
        },
      });
      return NextResponse.json({
        message: '✅ 美国持卡人创建成功！',
        card_holder_id: result.card_holder_id || result.id,
        data: result,
        next_step: '请将 card_holder_id 添加到 .env.local',
      });
    }

    if (action === 'quota') {
      // 查询可用配额
      try {
        const shareQuota = await getAvailableQuotas('USD', 'SHARE');
        return NextResponse.json({
          message: '可用配额',
          share: shareQuota,
        });
      } catch (err: any) {
        return NextResponse.json({
          error: err.message,
          tip: '可能接口路径不对，请检查文档',
        });
      }
    }

    if (action === 'card-quota') {
      const cardId = searchParams.get('cardId');
      if (!cardId) {
        return NextResponse.json({ error: '需要 cardId 参数' }, { status: 400 });
      }
      const gsalary = await import('../../../src/lib/gsalary');
      const result = await (gsalary as any).getCardQuota(cardId);
      return NextResponse.json({
        message: '卡片配额',
        data: result,
      });
    }

    if (action === 'recharge-test') {
      const cardId = searchParams.get('cardId');
      const amount = searchParams.get('amount') || '1'; // 试试直接用 1 表示 $1
      
      if (!cardId) {
        return NextResponse.json({ error: '需要 cardId 参数' }, { status: 400 });
      }
      
      const { modifyCardBalance } = await import('../../../src/lib/gsalary');
      try {
        // 直接调用底层方法，方便调试
        const result = await modifyCardBalance({
          card_id: cardId,
          amount: parseFloat(amount),  // 试试用元而不是分
          type: 'INCREASE',
          request_id: `TEST_${Date.now()}`,
        });
        return NextResponse.json({
          message: '充值成功',
          data: result,
        });
      } catch (err: any) {
        return NextResponse.json({
          error: err.message,
          tip: '充值失败',
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      error: '未知操作',
      available_actions: ['holders', 'create-us-holder', 'test'],
    }, { status: 400 });
  } catch (error: any) {
    console.error('测试接口错误:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
