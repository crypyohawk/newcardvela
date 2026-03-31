export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../src/lib/db';
import { verifyToken, getTokenFromRequest } from '../../../../../src/lib/auth';

// 获取可用套餐列表（根据用户角色过滤）
export async function GET(request: NextRequest) {
  try {
    // 尝试获取用户身份，未登录也允许查看公开套餐
    let userRole: string | null = null;
    const token = getTokenFromRequest(request);
    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        const user = await db.user.findUnique({
          where: { id: payload.userId },
          select: { role: true },
        });
        userRole = user?.role?.toLowerCase() || null;
      }
    }

    const tiers = await db.aIServiceTier.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        pricePerMillionInput: true,
        pricePerMillionOutput: true,
        features: true,
        models: true,
        maxKeys: true,
        requiredRole: true,
        minAiBalance: true,
        sortOrder: true,
        modelGroup: true,
        provider: { select: { id: true, name: true, displayName: true, type: true } },
      },
    });

    // 根据用户角色过滤：需要特定角色的套餐只对有权限的用户展示
    const filteredTiers = tiers.filter(t => {
      if (!t.requiredRole) return true; // 无角色要求，所有人可见
      const required = t.requiredRole.toLowerCase();
      if (required === 'enterprise') {
        return userRole === 'enterprise' || userRole === 'admin';
      }
      if (required === 'admin') {
        return userRole === 'admin';
      }
      return userRole === required;
    });

    const result = filteredTiers.map(t => ({
      ...t,
      features: t.features ? JSON.parse(t.features) : [],
      models: t.models ? JSON.parse(t.models) : [],
    }));

    return NextResponse.json({ tiers: result });
  } catch (error: any) {
    console.error('获取套餐失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
