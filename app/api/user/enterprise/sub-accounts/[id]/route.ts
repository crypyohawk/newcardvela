import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../src/lib/db';
import { verifyToken, getTokenFromRequest } from '../../../../../../src/lib/auth';

// 更新子账户（预算/状态）
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: '无效的令牌' }, { status: 401 });

    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user || !['enterprise', 'ADMIN', 'admin'].includes(user.role)) {
      return NextResponse.json({ error: '仅企业账户/管理员可使用此功能' }, { status: 403 });
    }

    const subAccount = await db.enterpriseSubAccount.findFirst({
      where: { id: params.id, enterpriseId: payload.userId },
    });
    if (!subAccount) {
      return NextResponse.json({ error: '子账户不存在' }, { status: 404 });
    }

    const body = await request.json();
    const updateData: any = {};

    const parseBudget = (val: any): number | null => {
      if (val === '' || val === null || val === undefined) return null;
      const num = Number(val);
      if (isNaN(num) || num < 0) return null;
      return num;
    };

    if (body.dailyBudget !== undefined) updateData.dailyBudget = parseBudget(body.dailyBudget);
    if (body.weeklyBudget !== undefined) updateData.weeklyBudget = parseBudget(body.weeklyBudget);
    if (body.monthlyBudget !== undefined) updateData.monthlyBudget = parseBudget(body.monthlyBudget);
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const updated = await db.enterpriseSubAccount.update({
      where: { id: params.id },
      data: updateData,
      include: {
        subUser: { select: { id: true, username: true, email: true } },
      },
    });

    return NextResponse.json({ success: true, subAccount: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 删除子账户
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: '无效的令牌' }, { status: 401 });

    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user || !['enterprise', 'ADMIN', 'admin'].includes(user.role)) {
      return NextResponse.json({ error: '仅企业账户/管理员可使用此功能' }, { status: 403 });
    }

    const subAccount = await db.enterpriseSubAccount.findFirst({
      where: { id: params.id, enterpriseId: payload.userId },
    });
    if (!subAccount) {
      return NextResponse.json({ error: '子账户不存在' }, { status: 404 });
    }

    await db.enterpriseSubAccount.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
