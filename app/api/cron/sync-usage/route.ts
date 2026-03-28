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
      return NextResponse.json({ message: '无新日志', synced: 0 });
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

    return NextResponse.json({
      success: true,
      fetched: allLogs.length,
      ...result,
    });
  } catch (error: any) {
    console.error('[cron] 用量同步失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
