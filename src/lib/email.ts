import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY) 
  : null;

export async function sendVerificationCode(userEmail: string, code: string) {
  // 开发模式或没有 API Key 时打印到控制台
  if (!resend || process.env.NODE_ENV === 'development') {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`[验证码邮件] 发送至: ${userEmail}`);
    console.log(`验证码: ${code}`);
    console.log(`${'='.repeat(50)}\n`);
    return { success: true, id: 'dev_' + Date.now() };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'CardVela <noreply@cardvela.com>',
      to: userEmail,
      subject: '您的验证码 - CardVela',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">CardVela 验证码</h2>
          <p>您好，</p>
          <p>您的验证码是：</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #1f2937; letter-spacing: 4px;">${code}</span>
          </div>
          <p style="color: #6b7280;">验证码有效期为 10 分钟，请勿泄露给他人。</p>
          <p style="color: #6b7280; margin-top: 30px;">如果您没有请求此验证码，请忽略此邮件。</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 12px;">此邮件由 CardVela 系统自动发送，请勿回复。</p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend 发送失败:', error);
      throw new Error(error.message);
    }

    console.log('邮件发送成功:', data);
    return { success: true, id: data?.id };
  } catch (error: any) {
    console.error('邮件发送错误:', error);
    throw error;
  }
}
