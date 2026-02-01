import { NextRequest, NextResponse } from 'next/server';
import { getBalance } from '../../../../src/lib/gsalary';
import { verifyToken, getTokenFromRequest } from '../../../../src/lib/auth';

export const dynamic = 'force-dynamic';

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

    const result = await getBalance();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('获取余额失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
