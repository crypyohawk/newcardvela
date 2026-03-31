import { NextRequest, NextResponse } from 'next/server';
import { getNewApiLogs } from '../../../../src/lib/newapi';
import { processUsageLogs } from '../../../../src/lib/usageSync';
import { db } from '../../../../src/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 允许最长 60 秒执行

/**
 * 用量同步定时任务端点
 * 由 crontab 每 5 分钟调用，主动从 new-api 拉取日志并扣费
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

    // 获取上次同步时间戳
    let lastSyncConfig = await db.systemConfig.findUnique({
      where: { key: 'usage_sync_last_timestamp' },
    });

    // 默认从 10 分钟前开始拉（首次运行或配置丢失时的安全回退）
    const tenMinutesAgo = Math.floor(Date.now() / 1000) - 600;
    let startTimestamp = lastSyncConfig
      ? parseInt(lastSyncConfig.value, 10)
      : tenMinutesAgo;

    // 安全限制：最多回溯 24 小时，防止首次运行拉太多数据
    const maxLookback = Math.floor(Date.now() / 1000) - 86400;
    if (startTimestamp < maxLookback) {
      startTimestamp = maxLookback;
    }

    const nowTimestamp = Math.floor(Date.now() / 1000);

    console.log(`[cron] 开始同步用量, 时间范围: ${new Date(startTimestamp * 1000).toISOString()} ~ ${new Date(nowTimestamp * 1000).toISOString()}`);

    // 分页拉取所有日志
    let allLogs: any[] = [];
    let page = 0;
    const pageSize = 100;
    let hasMore = true;

    while (hasMore) {
      const result = await getNewApiLogs({
        startTimestamp,
        endTimestamp: nowTimestamp,
        page,
        pageSize,
      });

      if (result.logs && result.logs.length > 0) {
        allLogs = allLogs.concat(result.logs);
        page++;
        // 安全上限：最多拉 5000 条（50 页），防止无限循环
        if (result.logs.length < pageSize || allLogs.length >= 5000) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    console.log(`[cron] 从 new-api 拉取到 ${allLogs.length} 条日志`);

    if (allLogs.length === 0) {
      // 即使没有日志也更新同步时间戳
      await db.systemConfig.upsert({
        where: { key: 'usage_sync_last_timestamp' },
        update: { value: String(nowTimestamp) },
        create: { key: 'usage_sync_last_timestamp', value: String(nowTimestamp) },
      });

      // 即使没有日志也执行自动解绑检查
      const autoUnbindResult = await autoUnbindIdleAccounts();

      return NextResponse.json({ message: '无新日志', synced: 0, autoUnbind: autoUnbindResult, debug: {
        lastSyncAt: new Date(startTimestamp * 1000).toISOString(),
        queriedUntil: new Date(nowTimestamp * 1000).toISOString(),
      }});
    }

    // 转换日志格式并处理
    const formattedLogs = allLogs.map(log => ({
      id: log.id,
      token_name: log.token_name,
      model_name: log.model_name,
      prompt_tokens: log.prompt_tokens,
      completion_tokens: log.completion_tokens,
      channel: log.channel,
    }));

    const result = await processUsageLogs(formattedLogs);

    // 更新同步时间戳
    await db.systemConfig.upsert({
      where: { key: 'usage_sync_last_timestamp' },
      update: { value: String(nowTimestamp) },
      create: { key: 'usage_sync_last_timestamp', value: String(nowTimestamp) },
    });

    console.log(`[cron] 同步完成: synced=${result.synced}, skipped=${result.skipped}, duplicated=${result.duplicated}, cost=$${result.totalCostDeducted}`);

    // === 自动解绑空闲号池账号 ===
    const autoUnbindResult = await autoUnbindIdleAccounts();

    return NextResponse.json({
      success: true,
      fetched: allLogs.length,
      ...result,
      autoUnbind: autoUnbindResult,
    });
  } catch (error: any) {
    console.error('[cron] 用量同步失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
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
      select: { id: true, lastUsedAt: true, status: true },
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
