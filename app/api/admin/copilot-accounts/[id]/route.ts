import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin, adminError } from '@/lib/adminAuth';
import { updateNewApiChannel } from '@/lib/newapi';

interface Params {
  params: { id: string };
}

// PATCH /api/admin/copilot-accounts/[id] - 更新账号
export async function PATCH(request: NextRequest, { params }: Params) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return adminError('未授权');
  }

  try {
    const { id } = params;
    const { status, quotaLimit, action } = await request.json();

    // 重置月度用量
    if (action === 'resetQuota') {
      const account = await prisma.copilotAccount.update({
        where: { id },
        data: { quotaUsed: 0 },
      });
      return NextResponse.json(account);
    }

    const updateData: any = {};
    if (status) {
      // 如果账号已绑定 Key，不允许直接改 status（需要用户先删除 Key 释放绑定）
      const existing = await prisma.copilotAccount.findUnique({ where: { id } });
      if (existing?.boundAiKeyId && status !== existing.status) {
        return NextResponse.json({ error: '该账号已绑定 Key，无法手动更改状态。用户删除 Key 后会自动释放' }, { status: 400 });
      }
      updateData.status = status;

      // 从 quota_exhausted / error 恢复为 active 时，同步重新启用 new-api 渠道
      if (status === 'active' && existing?.newApiChannelId &&
          (existing.status === 'quota_exhausted' || existing.status === 'error')) {
        try {
          await updateNewApiChannel(existing.newApiChannelId, { status: 1 });
          console.log(`[admin] 已重新启用 new-api 渠道 #${existing.newApiChannelId} (${existing.githubId})`);
        } catch (e: any) {
          console.error(`[admin] 重新启用渠道 #${existing.newApiChannelId} 失败:`, e.message);
        }
      }
    }
    if (quotaLimit !== undefined) updateData.quotaLimit = parseFloat(quotaLimit);

    const account = await prisma.copilotAccount.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(account);
  } catch (error) {
    console.error('Failed to update copilot account:', error);
    return NextResponse.json({ error: '更新账号失败' }, { status: 500 });
  }
}

// DELETE /api/admin/copilot-accounts/[id] - 删除账号
export async function DELETE(request: NextRequest, { params }: Params) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return adminError('未授权');
  }

  try {
    const { id } = params;

    await prisma.copilotAccount.delete({
      where: { id }
    });

    return NextResponse.json({ message: '删除成功' });
  } catch (error) {
    console.error('Failed to delete copilot account:', error);
    return NextResponse.json({ error: '删除账号失败' }, { status: 500 });
  }
}