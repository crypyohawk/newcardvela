export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../src/lib/db';
import { verifyToken, getTokenFromRequest } from '../../../../../src/lib/auth';

// 获取企业子账户列表
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: '无效的令牌' }, { status: 401 });

    // 验证是企业账户
    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user || !['enterprise', 'ADMIN', 'admin'].includes(user.role)) {
      return NextResponse.json({ error: '仅企业账户/管理员可使用此功能' }, { status: 403 });
    }

    const subAccounts = await db.enterpriseSubAccount.findMany({
      where: { enterpriseId: payload.userId },
      include: {
        subUser: {
          select: {
            id: true,
            username: true,
            email: true,
            balance: true,
            createdAt: true,
            aiKeys: {
              select: { id: true, status: true, monthUsed: true, totalUsed: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = subAccounts.map(sa => ({
      id: sa.id,
      dailyBudget: sa.dailyBudget,
      weeklyBudget: sa.weeklyBudget,
      monthlyBudget: sa.monthlyBudget,
      isActive: sa.isActive,
      createdAt: sa.createdAt,
      user: {
        ...sa.subUser,
        monthUsed: sa.subUser.aiKeys.reduce((sum, k) => sum + k.monthUsed, 0),
        totalUsed: sa.subUser.aiKeys.reduce((sum, k) => sum + k.totalUsed, 0),
        activeKeys: sa.subUser.aiKeys.filter(k => k.status === 'active').length,
      },
    }));

    return NextResponse.json({ subAccounts: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 创建子账户（通过邮箱邀请已注册用户）
export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: '无效的令牌' }, { status: 401 });

    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user || !['enterprise', 'ADMIN', 'admin'].includes(user.role)) {
      return NextResponse.json({ error: '仅企业账户/管理员可使用此功能' }, { status: 403 });
    }

    const body = await request.json();
    const { email, monthlyBudget } = body;

    if (!email?.trim()) {
      return NextResponse.json({ error: '请输入子账户邮箱' }, { status: 400 });
    }

    // 查找已注册用户
    const subUser = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!subUser) {
      return NextResponse.json({ error: '该邮箱尚未注册，请先让对方注册 CardVela 账户' }, { status: 404 });
    }

    if (subUser.id === payload.userId) {
      return NextResponse.json({ error: '不能将自己添加为子账户' }, { status: 400 });
    }

    // 检查是否已存在
    const existing = await db.enterpriseSubAccount.findUnique({
      where: { enterpriseId_subUserId: { enterpriseId: payload.userId, subUserId: subUser.id } },
    });
    if (existing) {
      return NextResponse.json({ error: '该用户已是您的子账户' }, { status: 400 });
    }

    // 限制最多 50 个子账户
    const count = await db.enterpriseSubAccount.count({ where: { enterpriseId: payload.userId } });
    if (count >= 50) {
      return NextResponse.json({ error: '子账户数量已达上限 (50)' }, { status: 400 });
    }

    const subAccount = await db.enterpriseSubAccount.create({
      data: {
        enterpriseId: payload.userId,
        subUserId: subUser.id,
        monthlyBudget: monthlyBudget !== undefined && monthlyBudget !== null ? Number(monthlyBudget) : null,
      },
      include: {
        subUser: { select: { id: true, username: true, email: true } },
      },
    });

    return NextResponse.json({ success: true, subAccount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
