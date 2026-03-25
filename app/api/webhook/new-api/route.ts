import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../src/lib/db';
import { quotaToUSD } from '../../../../src/lib/newapi';

export const dynamic = 'force-dynamic';

/**
 * new-api 用量同步 webhook
 * new-api 在每次 API 调用完成后可配置 webhook 通知
 * 或者由定时任务主动拉取日志后调用此接口
 */
export async function POST(request: NextRequest) {
  try {
    // 验证 webhook secret
    const webhookSecret = process.env.NEW_API_WEBHOOK_SECRET;
    if (webhookSecret) {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${webhookSecret}`) {
        return NextResponse.json({ error: '未授权' }, { status: 401 });
      }
    }

    const body = await request.json();
    const { logs } = body;

    if (!Array.isArray(logs) || logs.length === 0) {
      return NextResponse.json({ message: '无日志需要同步' });
    }

    let synced = 0;
    let skipped = 0;
    let totalCostDeducted = 0;

    for (const log of logs) {
      const { token_name, model_name, prompt_tokens, completion_tokens, quota, created_at } = log;

      // 通过 token_name 找到对应的 AIKey
      // token_name 格式: "username-keyName"
      const aiKey = await db.aIKey.findFirst({
        where: {
          OR: [
            { apiKey: token_name },
            { keyName: { contains: token_name } },
          ],
        },
        include: { tier: true },
      });

      if (!aiKey) {
        skipped++;
        continue;
      }

      // 计算费用
      const inputCost = (prompt_tokens / 1000000) * aiKey.tier.pricePerMillionInput;
      const outputCost = (completion_tokens / 1000000) * aiKey.tier.pricePerMillionOutput;
      const cost = Math.round((inputCost + outputCost) * 10000) / 10000;

      // 写入用量日志
      await db.aIUsageLog.create({
        data: {
          userId: aiKey.userId,
          aiKeyId: aiKey.id,
          model: model_name || 'unknown',
          inputTokens: prompt_tokens || 0,
          outputTokens: completion_tokens || 0,
          cost,
          channel: log.channel ? String(log.channel) : null,
        },
      });

      // 更新 Key 的用量统计
      await db.aIKey.update({
        where: { id: aiKey.id },
        data: {
          monthUsed: { increment: cost },
          totalUsed: { increment: cost },
          lastUsedAt: new Date(),
          lastSyncAt: new Date(),
        },
      });

      // 从用户余额扣费
      await db.user.update({
        where: { id: aiKey.userId },
        data: { balance: { decrement: cost } },
      });

      totalCostDeducted += cost;
      synced++;

      // 检查余额是否不足，自动禁用 Key
      const updatedUser = await db.user.findUnique({
        where: { id: aiKey.userId },
        select: { balance: true },
      });
      if (updatedUser && updatedUser.balance <= 0) {
        await db.aIKey.updateMany({
          where: { userId: aiKey.userId, status: 'active' },
          data: { status: 'disabled' },
        });
        console.log(`[用量同步] 用户 ${aiKey.userId} 余额不足，已自动禁用所有 Key`);
      }

      // 检查月度预算
      if (aiKey.monthlyLimit && aiKey.monthUsed + cost > aiKey.monthlyLimit) {
        await db.aIKey.update({
          where: { id: aiKey.id },
          data: { status: 'disabled' },
        });
        console.log(`[用量同步] Key ${aiKey.id} 超出月度预算，已自动禁用`);
      }
    }

    return NextResponse.json({
      success: true,
      synced,
      skipped,
      totalCostDeducted: Math.round(totalCostDeducted * 100) / 100,
    });
  } catch (error: any) {
    console.error('webhook 处理失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
