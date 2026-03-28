import { NextRequest, NextResponse } from 'next/server';
import { processUsageLogs } from '../../../../src/lib/usageSync';

export const dynamic = 'force-dynamic';

/**
 * new-api 用量同步 webhook（被动接收推送）
 * 主动拉取请使用 /api/cron/sync-usage
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

    const result = await processUsageLogs(logs);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('webhook 处理失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
