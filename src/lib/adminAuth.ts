import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface JwtPayload {
  userId: string;
}

// 管理员验证错误响应
export const adminError = (message: string, status: number = 401) => {
  return NextResponse.json({ error: message }, { status });
};

// 验证管理员权限
export async function verifyAdmin(request: NextRequest) {
  // 支持从 header 或 cookie 获取 token
  const authHeader = request.headers.get('authorization');
  let token: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else {
    // 尝试从 cookie 获取
    token = request.cookies.get('token')?.value || null;
  }

  if (!token) {
    console.log('No token found');
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    console.log('Decoded token:', decoded);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    console.log('User found:', user?.email, 'Role:', user?.role);

    // 修复：兼容大小写，检查 role 是否为 admin 或 ADMIN
    if (!user || user.role.toUpperCase() !== 'ADMIN') {
      console.log('User is not admin');
      return null;
    }

    return user;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}
