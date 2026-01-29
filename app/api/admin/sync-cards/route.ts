import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../src/lib/db';
import { getCards } from '../../../../src/lib/gsalary';

// 同步上游卡片到本地数据库
export async function GET(request: NextRequest) {
  try {
    // 获取上游所有卡片
    const result = await getCards({ page: 1, limit: 100 });
    const upstreamCards = result.cards || [];

    console.log('[同步] 上游卡片数量:', upstreamCards.length);

    // 获取本地所有用户卡片
    const localCards = await db.userCard.findMany();

    const synced: any[] = [];
    const notMatched: any[] = [];

    for (const upstream of upstreamCards) {
      // 尝试匹配本地卡片（通过 gsalaryCardId 或创建时间等）
      const matched = localCards.find(local => 
        local.gsalaryCardId === upstream.card_id ||
        local.gsalaryCardId?.startsWith('MOCK_')
      );

      if (matched && matched.gsalaryCardId?.startsWith('MOCK_')) {
        // 更新模拟卡片为真实卡片
        await db.userCard.update({
          where: { id: matched.id },
          data: {
            gsalaryCardId: upstream.card_id,
            cardNoLast4: upstream.card_no?.slice(-4) || upstream.card_no_last4,
            status: upstream.status?.toLowerCase() || 'active',
          },
        });
        synced.push({ local: matched.id, upstream: upstream.card_id });
      } else if (!matched) {
        notMatched.push(upstream);
      }
    }

    return NextResponse.json({
      message: '同步完成',
      upstreamCount: upstreamCards.length,
      localCount: localCards.length,
      synced,
      notMatched,
    });

  } catch (error: any) {
    console.error('同步失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 手动关联卡片
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { localCardId, gsalaryCardId, cardNoLast4 } = body;

    if (!localCardId || !gsalaryCardId) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 });
    }

    const updated = await db.userCard.update({
      where: { id: localCardId },
      data: {
        gsalaryCardId,
        cardNoLast4: cardNoLast4 || null,
        status: 'active',
      },
    });

    return NextResponse.json({ success: true, card: updated });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
