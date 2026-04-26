export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

import { getTokenFromRequest, verifyToken } from '@/lib/auth';
import { activateVpnSession, getUserVpnState, VpnApiError } from '@/lib/vpn';

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

    const body = await request.json();
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';
    if (!sessionId) {
      return NextResponse.json({ error: '缺少会话 ID' }, { status: 400 });
    }

    const session = await activateVpnSession(payload.userId, sessionId);
    const state = await getUserVpnState(payload.userId);

    return NextResponse.json({
      success: true,
      message: 'VPN 会话已开始计时',
      session,
      state,
    });
  } catch (error: any) {
    if (error instanceof VpnApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('激活 VPN 会话失败:', error);
    return NextResponse.json({ error: '激活 VPN 会话失败' }, { status: 500 });
  }
}