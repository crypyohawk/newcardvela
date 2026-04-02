import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin, adminError } from '@/lib/adminAuth';
import {
  updateNewApiChannel,
  getNewApiChannels,
} from '@/lib/newapi';

// copilot-api 支持的主要模型
const COPILOT_MODELS = [
  'claude-sonnet-4',
  'claude-opus-4',
  'gpt-4o',
  'gpt-4',
  'gemini-2.5-pro',
  'o3-mini',
  'o4-mini',
].join(',');

const COPILOT_PORT_BASE = 4141;

/**
 * GET /api/admin/copilot-accounts/sync
 * 获取 new-api 现有渠道列表（供前端选择绑定）
 */
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return adminError('未授权');
  }

  try {
    const channels = await getNewApiChannels();
    return NextResponse.json({ success: true, channels });
  } catch (error: any) {
    return NextResponse.json({ error: '获取渠道失败: ' + error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/copilot-accounts/sync
 * 绑定/更新渠道
 * 
 * body: { accountId: string, channelId: number }  → 手动绑定指定渠道
 * body: { action: 'update-all' }                  → 批量更新所有已绑定渠道的配置
 */
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return adminError('未授权');
  }

  try {
    const body = await request.json();

    // 手动绑定单个账号到指定渠道
    if (body.accountId && body.channelId) {
      const account = await prisma.copilotAccount.findUnique({
        where: { id: body.accountId },
      });
      if (!account) {
        return NextResponse.json({ error: '账号不存在' }, { status: 404 });
      }

      // 分配端口
      const existingAccounts = await prisma.copilotAccount.findMany({
        where: { port: { not: null } },
        orderBy: { port: 'asc' },
      });
      const usedPorts = existingAccounts.map(a => a.port!);
      let port = COPILOT_PORT_BASE;
      while (usedPorts.includes(port)) port++;

      // 更新 new-api 渠道配置
      await updateNewApiChannel(body.channelId, {
        name: `copilot-${account.githubId}`,
        baseUrl: `http://127.0.0.1:${port}`,
        key: 'sk-copilot',
        models: COPILOT_MODELS,
        group: 'copilot',
        status: 1,
      });

      // 保存绑定关系
      await prisma.copilotAccount.update({
        where: { id: body.accountId },
        data: { newApiChannelId: body.channelId, port },
      });

      return NextResponse.json({
        success: true,
        action: 'bound',
        accountId: body.accountId,
        channelId: body.channelId,
        port,
      });
    }

    // 批量更新所有已绑定渠道
    if (body.action === 'update-all') {
      const accounts = await prisma.copilotAccount.findMany({
        where: { newApiChannelId: { not: null } },
        orderBy: { createdAt: 'asc' },
      });

      const results: Array<{
        id: string;
        githubId: string;
        action: string;
        channelId?: number;
        port?: number;
        error?: string;
      }> = [];

      for (const account of accounts) {
        try {
          const port = account.port || COPILOT_PORT_BASE;
          const status = account.status === 'active' ? 1 : 2;

          await updateNewApiChannel(account.newApiChannelId!, {
            name: `copilot-${account.githubId}`,
            baseUrl: `http://127.0.0.1:${port}`,
            key: 'sk-copilot',
            models: COPILOT_MODELS,
            group: 'copilot',
            status,
          });

          results.push({
            id: account.id,
            githubId: account.githubId,
            action: status === 1 ? 'updated' : 'disabled',
            channelId: account.newApiChannelId!,
            port,
          });
        } catch (err: any) {
          results.push({
            id: account.id,
            githubId: account.githubId,
            action: 'error',
            error: err.message,
          });
        }
      }

      return NextResponse.json({
        success: true,
        synced: results.filter(r => r.action !== 'error').length,
        errors: results.filter(r => r.action === 'error').length,
        results,
      });
    }

    return NextResponse.json({ error: '无效的请求参数' }, { status: 400 });
  } catch (error: any) {
    console.error('Failed to sync copilot accounts:', error);
    return NextResponse.json({ error: '同步失败: ' + error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/copilot-accounts/sync
 * 解绑渠道（不删除 new-api 渠道，只清除本地关联）
 * 
 * body: { accountId: string } → 解绑指定账号
 * 无body 或 body: { all: true } → 解绑所有
 */
export async function DELETE(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return adminError('未授权');
  }

  try {
    let body: any = {};
    try { body = await request.json(); } catch {}

    if (body.accountId) {
      await prisma.copilotAccount.update({
        where: { id: body.accountId },
        data: { newApiChannelId: null, port: null },
      });
      return NextResponse.json({ success: true, unbound: 1 });
    }

    // 解绑所有
    const result = await prisma.copilotAccount.updateMany({
      where: { newApiChannelId: { not: null } },
      data: { newApiChannelId: null, port: null },
    });

    return NextResponse.json({ success: true, unbound: result.count });
  } catch (error: any) {
    console.error('Failed to unbind copilot channels:', error);
    return NextResponse.json({ error: '解绑失败: ' + error.message }, { status: 500 });
  }
}
