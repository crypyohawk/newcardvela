import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../../../src/lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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
    const { username, email, password, code, referralCode } = await request.json();

    // 清理隐藏字符
    const cleanEmail = email?.replace(/[\u200B-\u200D\uFEFF\u00A0\r\n\t]/g, '').trim();
    const cleanUsername = username?.replace(/[\u200B-\u200D\uFEFF\u00A0\r\n\t]/g, '').trim();

    if (!cleanUsername || !cleanEmail || !password || !code) {
      return NextResponse.json({ error: '请填写所有必填字段' }, { status: 400 });
    }

    const emailLower = cleanEmail.toLowerCase();

    // 验证验证码
    const { verifyCode } = await import('../../../../src/lib/verificationCodes');
    if (!verifyCode(emailLower, code)) {
      return NextResponse.json({ error: '验证码无效或已过期' }, { status: 400 });
    }

    // 检查邮箱是否已存在
    const existingEmail = await prisma.user.findUnique({ where: { email: emailLower } });
    if (existingEmail) {
      return NextResponse.json({ error: '该邮箱已注册' }, { status: 400 });
    }

    // 检查用户名是否已存在
    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      return NextResponse.json({ error: '该用户名已被使用' }, { status: 400 });
    }

    // 验证推荐码并获取推荐人ID
    let referrerId: string | null = null;
    if (referralCode && referralCode.trim()) {
      const referrer = await prisma.user.findFirst({
        where: { referralCode: referralCode.trim().toUpperCase() }
      });
      
      if (!referrer) {
        return NextResponse.json({ error: '推荐码无效' }, { status: 400 });
      }
      
      referrerId = referrer.id;
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 生成推荐码
    const newReferralCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    // 创建用户
    const user = await prisma.user.create({
      data: {
        email: emailLower,
        username,
        password: hashedPassword,
        referralCode: newReferralCode,
        referredBy: referrerId,
      },
    });

    // 生成 token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        balance: user.balance,
      },
    });

  } catch (error: any) {
    console.error('注册失败:', error);
    return NextResponse.json({ error: '注册失败' }, { status: 500 });
  }
}
