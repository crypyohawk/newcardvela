export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

import { getTokenFromRequest, verifyToken } from '@/lib/auth';
import { getUserVpnState, startVpnSession, VpnApiError } from '@/lib/vpn';

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

    const session = await startVpnSession(payload.userId);
    const state = await getUserVpnState(payload.userId);

    return NextResponse.json({
      success: true,
      message: session?.isFree ? '已领取免费 1 小时会话，请连接成功后再开始计时' : '已扣费 1 美元，请连接成功后再开始计时',
      session,
      state,
    });
  } catch (error: any) {
    if (error instanceof VpnApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('创建 VPN 会话失败:', error);
    return NextResponse.json({ error: '创建 VPN 会话失败' }, { status: 500 });
  }
}