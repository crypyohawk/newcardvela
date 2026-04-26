export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

import { getTokenFromRequest, verifyToken } from '@/lib/auth';
import { getUserVpnState, getVpnSummaryFromState, VpnApiError } from '@/lib/vpn';

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: '无效的令牌' }, { status: 401 });
    }

    const state = await getUserVpnState(payload.userId);
    return NextResponse.json(getVpnSummaryFromState(state));
  } catch (error: any) {
    if (error instanceof VpnApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('获取 VPN 摘要失败:', error);
    return NextResponse.json({ error: '获取 VPN 摘要失败' }, { status: 500 });
  }
}