import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin, adminError } from '@/lib/adminAuth';

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
    if (status) updateData.status = status;
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