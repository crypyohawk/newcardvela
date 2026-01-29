import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '../../../../src/lib/db';
import { generateToken } from '../../../../src/lib/auth';

// 简单的内存限流
const registerAttempts = new Map<string, { count: number; lastAttempt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = registerAttempts.get(ip);
  
  if (!record) {
    registerAttempts.set(ip, { count: 1, lastAttempt: now });
    return false;
  }
  
  // 1小时内最多注册5次
  if (now - record.lastAttempt > 3600000) {
    registerAttempts.set(ip, { count: 1, lastAttempt: now });
    return false;
  }
  
  if (record.count >= 5) {
    return true;
  }
  
  record.count++;
  record.lastAttempt = now;
  return false;
}

export async function POST(request: NextRequest) {
  try {
    // 获取客户端 IP
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    // 限流检查
    if (isRateLimited(ip)) {
      return NextResponse.json({ 
        error: '注册请求过于频繁，请1小时后再试' 
      }, { status: 429 });
    }

    const body = await request.json();
    const { username, email, password } = body;

    // 输入验证
    if (!username || !email || !password) {
      return NextResponse.json({ error: '请填写所有字段' }, { status: 400 });
    }

    // 用户名格式验证
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json({ 
        error: '用户名只能包含字母、数字、下划线，长度3-20' 
      }, { status: 400 });
    }

    // 邮箱格式验证
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 });
    }

    // 密码强度验证
    if (password.length < 8) {
      return NextResponse.json({ error: '密码至少8位' }, { status: 400 });
    }

    const emailLower = email.toLowerCase();

    // 检查用户是否已存在
    const existingUser = await db.user.findFirst({
      where: {
        OR: [{ email: emailLower }, { username }],
      },
    });

    if (existingUser) {
      return NextResponse.json({ 
        error: existingUser.email === emailLower ? '邮箱已注册' : '用户名已存在' 
      }, { status: 400 });
    }

    // 创建用户
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await db.user.create({
      data: {
        username,
        email: emailLower,
        password: hashedPassword,
      },
    });

    const token = generateToken({ userId: user.id, email: user.email });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        balance: user.balance,
      },
    });

  } catch (error: any) {
    console.error('注册失败:', error);
    return NextResponse.json({ error: '注册失败，请稍后再试' }, { status: 500 });
  }
}
