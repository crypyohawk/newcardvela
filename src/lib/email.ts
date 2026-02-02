import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY) 
  : null;

export async function sendVerificationCode(userEmail: string, code: string) {
  console.log('[Email] RESEND_API_KEY 存在:', !!process.env.RESEND_API_KEY);
  
  if (!resend) {
    console.log('[Email] resend 实例为 null，打印验证码');
    console.log(`发送至: ${userEmail}, 验证码: ${code}`);
    return { success: true, id: 'no_api_key_' + Date.now() };
  }

  try {
    console.log('[Resend] 开始发送邮件至:', userEmail);

    const { data, error } = await resend.emails.send({
      from: 'CardVela <noreply@cardvela.com>',
      to: userEmail,
      subject: '您的验证码 - CardVela',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">CardVela 验证码</h2>
          <p>您的验证码是：</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #1f2937; letter-spacing: 4px;">${code}</span>
          </div>
          <p style="color: #6b7280;">验证码有效期为 10 分钟。</p>
        </div>
      `,
    });

    if (error) {
      console.error('[Resend] API 返回错误:', error);
      console.error('[Resend] 错误名称:', error.name);
      console.error('[Resend] 错误消息:', error.message);
      throw new Error(error.message);
    }

    console.log('[Resend] 发送成功, ID:', data?.id);
    return { success: true, id: data?.id };
  } catch (error: any) {
    console.error('[Resend] 捕获异常:', error.message || error);
    console.error('[Resend] 异常堆栈:', error.stack);
    throw error;
  }
}