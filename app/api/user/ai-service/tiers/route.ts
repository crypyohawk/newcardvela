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

    // 所有启用的套餐对所有用户可见（权限仅在创建 Key 时检查）
    // 标记当前用户是否有权限使用该套餐
    const result = tiers.map(t => {
      let canUse = true;
      if (t.requiredRole) {
        const required = t.requiredRole.toLowerCase();
        if (required === 'enterprise') {
          canUse = userRole === 'enterprise' || userRole === 'admin';
        } else if (required === 'admin') {
          canUse = userRole === 'admin';
        } else {
          canUse = userRole === required;
        }
      }
      return {
        ...t,
        features: t.features ? JSON.parse(t.features) : [],
        models: t.models ? JSON.parse(t.models) : [],
        canUse,
      };
    });

    return NextResponse.json({ tiers: result });
  } catch (error: any) {
    console.error('获取套餐失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
