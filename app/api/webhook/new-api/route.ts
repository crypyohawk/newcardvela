import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * new-api 用量 webhook（已退役）
 * 
 * 计费已统一到 /api/cron/sync-usage（直接读取 token used_quota 差值扣费），
 * 不再依赖逐条日志推送。保留此端点避免 404，但不做任何处理。
 */
export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: '此 webhook 已退役，计费由 cron sync-usage 处理',
  });
}
