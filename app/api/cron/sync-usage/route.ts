import { NextRequest, NextResponse } from 'next/server';
import { getNewApiTokenUsage, updateNewApiToken, quotaToUSD, usdToQuota } from '../../../../src/lib/newapi';
import { db } from '../../../../src/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 允许最长 60 秒执行

/**
 * 用量同步定时任务端点
 * 由 crontab 每 5 分钟调用
 * 
 * 计费逻辑：直接读取 new-api 每个 token 的 used_quota（new-api 已有完整计费规则），
 * 计算与上次同步的差值，扣除用户 AI 余额。
 * 不再拉取日志，不再本地建 AIUsageLog，轻量高效。
 * 
 * GET /api/cron/sync-usage?secret=xxx
 */
export async function GET(request: NextRequest) {
  try {
    // 验证 cron secret
    const cronSecret = process.env.CRON_SECRET || process.env.NEW_API_WEBHOOK_SECRET;
    if (!cronSecret) {
      console.error('[cron] CRON_SECRET 未配置');
      return NextResponse.json({ error: '未配置' }, { status: 503 });
    }

    const url = new URL(request.url);
    const secret = url.searchParams.get('secret');
    if (secret !== cronSecret) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    console.log(`[cron] 开始同步 Key 用量...`);

    // 1. 从 new-api 同步所有 Key 的用量
    const syncResult = await syncKeyUsages();

    // 2. 自动解绑空闲号池账号
    const autoUnbindResult = await autoUnbindIdleAccounts();

    console.log(`[cron] 同步完成: checked=${syncResult.checked}, synced=${syncResult.synced}, deducted=$${syncResult.totalDeducted}`);

    return NextResponse.json({
      success: true,
      ...syncResult,
      autoUnbind: autoUnbindResult,
    });
  } catch (error: any) {
    console.error('[cron] 用量同步失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * 从 new-api 同步所有 Key 的用量，按 new-api 的计费规则扣费
 * 
 * 原理：new-api 内部已按模型倍率计算每个 token 的 used_quota，
 * 我们只需读取 used_quota 转换为 USD，与上次记录的 totalUsed 做差值即为新消费。
 */
async function syncKeyUsages() {
  const creditConfig = await db.systemConfig.findUnique({ where: { key: 'ai_credit_limit' } });
  const creditLimit = creditConfig ? parseFloat(creditConfig.value) : 1;

  // 查所有有 new-api token 且未作废的 Key（含 disabled，因为可能还有未结算的消费）
  const keys = await db.aIKey.findMany({
    where: {
      newApiTokenId: { not: null },
      status: { in: ['active', 'disabled'] },
    },
    select: {
      id: true, userId: true, newApiTokenId: true, copilotAccountId: true,
      totalUsed: true, monthUsed: true, monthlyLimit: true,
      status: true, lastSyncAt: true,
    },
  });

  let synced = 0;
  let totalDeducted = 0;
  const errors: string[] = [];

  for (const key of keys) {
    try {
      // 1. 从 new-api 获取 token 用量
      const usage = await getNewApiTokenUsage(key.newApiTokenId!);
      const usedUSD = quotaToUSD(usage.usedQuota);

      // 2. 计算新增消费（与上次同步的差值）
      const delta = Math.round((usedUSD - key.totalUsed) * 10000) / 10000;

      if (delta < 0.0001) {
        // 无新消费，仅刷新 token 可用配额（确保用户充值后能用）
        if (key.status === 'active') {
          const user = await db.user.findUnique({ where: { id: key.userId }, select: { aiBalance: true } });
          if (user) {
            const newQuota = Math.max(0, usdToQuota(user.aiBalance + creditLimit));
            try { await updateNewApiToken(key.newApiTokenId!, { remainQuota: newQuota }); } catch (_) {}
          }
        }
        continue;
      }

      // 3. 跨月自动重置 monthUsed
      const now = new Date();
      let currentMonthUsed = key.monthUsed;
      if (key.lastSyncAt) {
        if (key.lastSyncAt.getMonth() !== now.getMonth() || key.lastSyncAt.getFullYear() !== now.getFullYear()) {
          currentMonthUsed = 0;
        }
      }

      // 4. 事务：更新 Key 用量 + 从 aiBalance 扣费
      await db.$transaction(async (tx) => {
        await tx.aIKey.update({
          where: { id: key.id },
          data: {
            totalUsed: usedUSD,
            monthUsed: currentMonthUsed + delta,
            lastUsedAt: new Date(),
            lastSyncAt: new Date(),
          },
        });
        await tx.user.update({
          where: { id: key.userId },
          data: { aiBalance: { decrement: delta } },
        });
        // 写入交易记录（$0.01 以上才记录，避免微小噪音）
        if (delta >= 0.01) {
          await tx.transaction.create({
            data: {
              userId: key.userId,
              type: 'ai_usage',
              amount: -delta,
              status: 'completed',
            },
          });
        }
      });

      // 5. 追踪号池账号用量（通过 Key 绑定关系）
      if (key.copilotAccountId) {
        try {
          await db.copilotAccount.update({
            where: { id: key.copilotAccountId },
            data: {
              quotaUsed: { increment: delta },
              lastUsed: new Date(),
            },
          });
        } catch (_) {}
      }

      synced++;
      totalDeducted += delta;
      console.log(`[cron] Key ${key.id}: new-api=$${usedUSD.toFixed(4)}, delta=$${delta.toFixed(4)}`);

      // 6. 刷新 token 可用配额 + 检查余额
      const user = await db.user.findUnique({ where: { id: key.userId }, select: { aiBalance: true } });
      if (user) {
        const newQuota = Math.max(0, usdToQuota(user.aiBalance + creditLimit));
        try { await updateNewApiToken(key.newApiTokenId!, { remainQuota: newQuota }); } catch (_) {}

        // 余额耗尽：禁用该用户所有活跃 Key
        if (user.aiBalance <= -creditLimit) {
          const activeKeys = await db.aIKey.findMany({
            where: { userId: key.userId, status: 'active' },
            select: { id: true, newApiTokenId: true },
          });
          for (const k of activeKeys) {
            await db.aIKey.update({ where: { id: k.id }, data: { status: 'disabled' } });
            if (k.newApiTokenId) {
              try { await updateNewApiToken(k.newApiTokenId, { status: 2 }); } catch (_) {}
            }
          }
          console.log(`[cron] 用户 ${key.userId} 超出信用额度 (余额 $${user.aiBalance.toFixed(2)})，已禁用所有 Key`);
        }
      }

      // 7. 月限额检查
      if (key.monthlyLimit && currentMonthUsed + delta > key.monthlyLimit && key.status === 'active') {
        await db.aIKey.update({ where: { id: key.id }, data: { status: 'disabled' } });
        try { await updateNewApiToken(key.newApiTokenId!, { status: 2 }); } catch (_) {}
        console.log(`[cron] Key ${key.id} 超出月限额 $${key.monthlyLimit}，已禁用`);
      }
    } catch (e: any) {
      errors.push(`Key ${key.id}: ${e.message}`);
      console.error(`[cron] 同步 Key ${key.id} 失败:`, e.message);
    }
  }

  return {
    checked: keys.length,
    synced,
    totalDeducted: Math.round(totalDeducted * 10000) / 10000,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * 自动解绑空闲超过 2 小时的号池账号
 * - 条件1：绑定时间超过 2 小时
 * - 条件2：绑定的 Key 最后使用时间超过 2 小时（或从未使用）
 */
async function autoUnbindIdleAccounts() {
  const IDLE_HOURS = 2;
  const cutoff = new Date(Date.now() - IDLE_HOURS * 60 * 60 * 1000);

  try {
    // 查找所有已绑定且绑定超过 2h 的号池账号
    const boundAccounts = await db.copilotAccount.findMany({
      where: {
        boundAiKeyId: { not: null },
        boundAt: { lt: cutoff },
      },
    });

    if (boundAccounts.length === 0) return { checked: 0, unbound: 0 };

    const keyIds = boundAccounts.map(a => a.boundAiKeyId!);
    const keys = await db.aIKey.findMany({
      where: { id: { in: keyIds } },
      select: { id: true, lastUsedAt: true, status: true, newApiTokenId: true },
    });
    const keyMap = Object.fromEntries(keys.map(k => [k.id, k]));

    let unboundCount = 0;
    for (const account of boundAccounts) {
      const key = keyMap[account.boundAiKeyId!];
      // 解绑条件：Key 不存在/已吊销，或最后使用时间超过阈值
      const keyIdle = !key || key.status === 'revoked' ||
        !key.lastUsedAt || key.lastUsedAt < cutoff;

      if (keyIdle) {
        await db.$transaction([
          db.copilotAccount.update({
            where: { id: account.id },
            data: {
              status: 'active',
              boundAiKeyId: null,
              boundUserId: null,
              boundAt: null,
            },
          }),
          // 如果 Key 还存在且未吊销，标记为 disabled（不再有号池资源）
          ...(key && key.status !== 'revoked' ? [
            db.aIKey.update({
              where: { id: account.boundAiKeyId! },
              data: { copilotAccountId: null, status: 'disabled' },
            }),
          ] : []),
        ]);

        // 同步禁用 new-api token，防止本地 disabled 但网关仍可调用
        if (key && key.newApiTokenId && key.status !== 'revoked') {
          try {
            await updateNewApiToken(key.newApiTokenId, { status: 2 });
          } catch (e: any) {
            console.warn(`[auto-unbind] 禁用 new-api token 失败: key=${account.boundAiKeyId}, err=${e.message}`);
          }
        }
        console.log(`[auto-unbind] 解绑空闲号池: account=${account.githubId}, key=${account.boundAiKeyId}, 绑定于 ${account.boundAt?.toISOString()}`);
        unboundCount++;
      }
    }

    if (unboundCount > 0) {
      console.log(`[auto-unbind] 共解绑 ${unboundCount} 个空闲号池账号`);
    }

    return { checked: boundAccounts.length, unbound: unboundCount };
  } catch (error: any) {
    console.error('[auto-unbind] 自动解绑失败:', error);
    return { error: error.message };
  }
}
