import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../src/lib/db';
import { setCode } from '../../../../src/lib/verificationCodes';
import { sendVerificationCode } from '../../../../src/lib/email';

// 发送限流
const sendAttempts = new Map<string, { count: number; lastSend: number }>();

function canSendCode(email: string): { allowed: boolean; waitSeconds?: number } {
  const now = Date.now();
  const record = sendAttempts.get(email);
  
  if (!record) return { allowed: true };
  
  const timePassed = now - record.lastSend;
  if (timePassed < 60000) {
    return { allowed: false, waitSeconds: Math.ceil((60000 - timePassed) / 1000) };
  }
  
  if (now - record.lastSend > 3600000) {
    sendAttempts.set(email, { count: 1, lastSend: now });
    return { allowed: true };
  }
  
  if (record.count >= 5) {
    return { allowed: false, waitSeconds: 3600 };
  }
  
  return { allowed: true };
}

function recordSend(email: string) {
  const now = Date.now();
  const record = sendAttempts.get(email) || { count: 0, lastSend: 0 };
  record.count++;
  record.lastSend = now;
  sendAttempts.set(email, record);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, type } = body;

    // 清理隐藏字符
    const cleanEmail = email?.replace(/[\u200B-\u200D\uFEFF\u00A0\r\n\t]/g, '').trim();

    if (!cleanEmail) {
      return NextResponse.json({ error: '请输入邮箱' }, { status: 400 });
    }

    const emailLower = cleanEmail.toLowerCase();

    const sendCheck = canSendCode(emailLower);
    if (!sendCheck.allowed) {
      return NextResponse.json({ 
        error: `请${sendCheck.waitSeconds}秒后再试` 
      }, { status: 429 });
    }

    if (type === 'register') {
      const existingUser = await db.user.findUnique({
        where: { email: emailLower },
      });
      if (existingUser) {
        return NextResponse.json({ error: '该邮箱已注册' }, { status: 400 });
      }
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 使用共享存储
    setCode(emailLower, code);
    recordSend(emailLower);

    // 使用统一的邮件发送函数
    console.log('[send-code] 准备发送验证码至:', emailLower);
    const result = await sendVerificationCode(emailLower, code);
    console.log('[send-code] 发送结果:', result);

    return NextResponse.json({ success: true, message: '验证码已发送' });

  } catch (error: any) {
    console.error('[send-code] 发送验证码失败:', error.message);
    console.error('[send-code] 错误详情:', error);
    return NextResponse.json({ error: '发送失败，请稍后再试' }, { status: 500 });
  }
}
