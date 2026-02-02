import { Resend } from 'resend';

// 生产环境下强制要求配置 RESEND_API_KEY，未配置则抛出错误
if (!process.env.RESEND_API_KEY) {
  throw new Error('生产环境必须配置 RESEND_API_KEY 环境变量');
}

// 生产环境直接初始化 Resend 实例（不再为 null）
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * 发送验证码邮件（生产环境版本）
 * @param userEmail 收件人邮箱
 * @param code 验证码
 * @returns 发送结果
 */
export async function sendVerificationCode(userEmail: string, code: string) {
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
      console.error('[生产环境] Resend 发送失败:', error);
      throw new Error(`邮件发送失败: ${error.message}`);
    }

    console.log('[生产环境] 邮件发送成功:', data);
    return { success: true, id: data?.id };
  } catch (error: any) {
    console.error('[生产环境] 邮件发送错误:', error);
    // 生产环境可根据业务需求调整错误返回逻辑（比如统一返回格式）
    return { success: false, error: error.message };
  }
}