import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../src/lib/db';
import { updateNewApiToken } from '../../../../src/lib/newapi';

export const dynamic = 'force-dynamic';

// 同步禁用 new-api 侧的 token，防止用户继续调用上游
async function disableKeyOnNewApi(newApiTokenId: number | null) {
  if (!newApiTokenId) return;
  try {
    await updateNewApiToken(newApiTokenId, { status: 2 });
  } catch (e) {
    console.error(`[用量同步] 同步禁用 new-api token ${newApiTokenId} 失败:`, e);
  }
}

/**
 * new-api 用量同步 webhook
 * new-api 在每次 API 调用完成后可配置 webhook 通知
 * 或者由定时任务主动拉取日志后调用此接口
 */
export async function POST(request: NextRequest) {
  try {
    // 验证 webhook secret（必须配置，否则拒绝请求）
    const webhookSecret = process.env.NEW_API_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[webhook] NEW_API_WEBHOOK_SECRET 未配置，拒绝请求');
      return NextResponse.json({ error: 'Webhook 未配置' }, { status: 503 });
    }
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
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
      const { token_name, model_name, prompt_tokens, completion_tokens } = log;

      // 验证必要字段
      if (!token_name || !model_name) {
        skipped++;
        continue;
      }

      const inputTokens = Math.max(0, Number(prompt_tokens) || 0);
      const outputTokens = Math.max(0, Number(completion_tokens) || 0);
      if (inputTokens === 0 && outputTokens === 0) {
        skipped++;
        continue;
      }

      // 通过 token_name 精确匹配 AIKey
      const aiKey = await db.aIKey.findFirst({
        where: {
          OR: [
            { apiKey: token_name },
            { keyName: token_name },
          ],
        },
        include: { tier: true },
      });

      if (!aiKey) {
        skipped++;
        continue;
      }

      // 月度懒重置：如果 Key 的 lastSyncAt 在上个月，重置 monthUsed
      const now = new Date();
      if (aiKey.lastSyncAt) {
        const lastMonth = aiKey.lastSyncAt.getMonth();
        const lastYear = aiKey.lastSyncAt.getFullYear();
        if (lastMonth !== now.getMonth() || lastYear !== now.getFullYear()) {
          await db.aIKey.update({
            where: { id: aiKey.id },
            data: { monthUsed: 0 },
          });
          aiKey.monthUsed = 0;
          console.log(`[用量同步] Key ${aiKey.id} 跨月重置 monthUsed`);
        }
      }

      // 计算费用
      const inputCost = (inputTokens / 1000000) * aiKey.tier.pricePerMillionInput;
      const outputCost = (outputTokens / 1000000) * aiKey.tier.pricePerMillionOutput;
      const cost = Math.round((inputCost + outputCost) * 10000) / 10000;

      // 检查月度预算（在扣费前检查）
      if (aiKey.monthlyLimit && aiKey.monthUsed + cost > aiKey.monthlyLimit) {
        await db.aIKey.update({
          where: { id: aiKey.id },
          data: { status: 'disabled' },
        });
        await disableKeyOnNewApi(aiKey.newApiTokenId);
        console.log(`[用量同步] Key ${aiKey.id} 超出月度预算，已自动禁用（含new-api侧）`);
        skipped++;
        continue;
      }

      // 检查子账户预算限制
      const subAccount = await db.enterpriseSubAccount.findFirst({
        where: { subUserId: aiKey.userId, isActive: true },
      });
      if (subAccount) {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        // 检查日限额
        if (subAccount.dailyBudget) {
          const todayUsage = await db.aIUsageLog.aggregate({
            where: { userId: aiKey.userId, createdAt: { gte: todayStart } },
            _sum: { cost: true },
          });
          if ((todayUsage._sum.cost || 0) + cost > subAccount.dailyBudget) {
            await db.aIKey.updateMany({
              where: { userId: aiKey.userId, status: 'active' },
              data: { status: 'disabled' },
            });
            const keys = await db.aIKey.findMany({
              where: { userId: aiKey.userId },
              select: { newApiTokenId: true },
            });
            for (const k of keys) await disableKeyOnNewApi(k.newApiTokenId);
            console.log(`[用量同步] 子账户 ${aiKey.userId} 超出日限额 $${subAccount.dailyBudget}`);
            skipped++;
            continue;
          }
        }

        // 检查周限额
        if (subAccount.weeklyBudget) {
          const weekUsage = await db.aIUsageLog.aggregate({
            where: { userId: aiKey.userId, createdAt: { gte: weekStart } },
            _sum: { cost: true },
          });
          if ((weekUsage._sum.cost || 0) + cost > subAccount.weeklyBudget) {
            await db.aIKey.updateMany({
              where: { userId: aiKey.userId, status: 'active' },
              data: { status: 'disabled' },
            });
            const keys = await db.aIKey.findMany({
              where: { userId: aiKey.userId },
              select: { newApiTokenId: true },
            });
            for (const k of keys) await disableKeyOnNewApi(k.newApiTokenId);
            console.log(`[用量同步] 子账户 ${aiKey.userId} 超出周限额 $${subAccount.weeklyBudget}`);
            skipped++;
            continue;
          }
        }

        // 检查月限额
        if (subAccount.monthlyBudget) {
          const monthUsage = await db.aIUsageLog.aggregate({
            where: { userId: aiKey.userId, createdAt: { gte: monthStart } },
            _sum: { cost: true },
          });
          if ((monthUsage._sum.cost || 0) + cost > subAccount.monthlyBudget) {
            await db.aIKey.updateMany({
              where: { userId: aiKey.userId, status: 'active' },
              data: { status: 'disabled' },
            });
            const keys = await db.aIKey.findMany({
              where: { userId: aiKey.userId },
              select: { newApiTokenId: true },
            });
            for (const k of keys) await disableKeyOnNewApi(k.newApiTokenId);
            console.log(`[用量同步] 子账户 ${aiKey.userId} 超出月限额 $${subAccount.monthlyBudget}`);
            skipped++;
            continue;
          }
        }
      }

      // 获取信用额度配置（默认允许透支 $5）
      const creditConfig = await db.systemConfig.findUnique({ where: { key: 'ai_credit_limit' } });
      const creditLimit = creditConfig ? parseFloat(creditConfig.value) : 5;

      // 查当前余额
      const currentUser = await db.user.findUnique({
        where: { id: aiKey.userId },
        select: { balance: true },
      });
      if (!currentUser) {
        skipped++;
        continue;
      }

      // 如果余额已经低于信用下限（如 -$5），禁用所有 Key 并跳过
      // 注意：请求已完成但用户欠太多了，不再记账避免无底洞
      if (currentUser.balance <= -creditLimit) {
        const activeKeys = await db.aIKey.findMany({
          where: { userId: aiKey.userId, status: 'active' },
          select: { id: true, newApiTokenId: true },
        });
        if (activeKeys.length > 0) {
          await db.aIKey.updateMany({
            where: { userId: aiKey.userId, status: 'active' },
            data: { status: 'disabled' },
          });
          for (const k of activeKeys) {
            await disableKeyOnNewApi(k.newApiTokenId);
          }
          console.log(`[用量同步] 用户 ${aiKey.userId} 已超出信用额度(余额$${currentUser.balance.toFixed(4)}, 信用上限-$${creditLimit})，禁用所有Key`);
        }
        skipped++;
        continue;
      }

      // 无论余额是否足够，都要扣费（请求已经完成，上游已经扣了我们的钱）
      await db.$transaction([
        db.aIUsageLog.create({
          data: {
            userId: aiKey.userId,
            aiKeyId: aiKey.id,
            model: model_name,
            inputTokens,
            outputTokens,
            cost,
            channel: log.channel ? String(log.channel) : null,
          },
        }),
        db.aIKey.update({
          where: { id: aiKey.id },
          data: {
            monthUsed: { increment: cost },
            totalUsed: { increment: cost },
            lastUsedAt: new Date(),
            lastSyncAt: new Date(),
          },
        }),
        db.user.update({
          where: { id: aiKey.userId },
          data: { balance: { decrement: cost } },
        }),
      ]);

      totalCostDeducted += cost;
      synced++;

      // 扣费后检查：余额低于信用下限则禁用所有 Key
      const updatedUser = await db.user.findUnique({
        where: { id: aiKey.userId },
        select: { balance: true },
      });
      if (updatedUser && updatedUser.balance <= -creditLimit) {
        const activeKeys = await db.aIKey.findMany({
          where: { userId: aiKey.userId, status: 'active' },
          select: { id: true, newApiTokenId: true },
        });
        await db.aIKey.updateMany({
          where: { userId: aiKey.userId, status: 'active' },
          data: { status: 'disabled' },
        });
        for (const k of activeKeys) {
          await disableKeyOnNewApi(k.newApiTokenId);
        }
        console.log(`[用量同步] 用户 ${aiKey.userId} 扣费后超出信用额度(余额$${updatedUser.balance.toFixed(4)})，已禁用所有 Key（含new-api侧）`);
      }
    }

    return NextResponse.json({
      success: true,
      synced,
      skipped,
      totalCostDeducted: Math.round(totalCostDeducted * 10000) / 10000,
    });
  } catch (error: any) {
    console.error('webhook 处理失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
