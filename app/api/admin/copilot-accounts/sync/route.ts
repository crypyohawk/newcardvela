import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../src/lib/prisma';
import { verifyAdmin, adminError } from '../../../../../src/lib/adminAuth';
import {
  updateNewApiChannel,
  getNewApiChannels,
} from '../../../../../src/lib/newapi';

// copilot-api 原生支持的模型名（GitHub Copilot 格式，含点号版本）
const BASE_COPILOT_MODELS = [
  'claude-sonnet-4',
  'claude-sonnet-4.5',
  'claude-sonnet-4.6',
  'claude-opus-4.5',
  'claude-opus-4.6',
  'claude-opus-4.6-fast',
  'claude-opus-4.7',
  'claude-haiku-4.5',
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4',
  'gpt-4.1',
  'gpt-5.1',
  'gpt-5.2',
  'gpt-5.4',
  'gpt-5.4-mini',
  'gpt-5-mini',
  'gemini-2.5-pro',
  'gemini-3-flash-preview',
  'gemini-3.1-pro-preview',
  'grok-code-fast-1',
];

// 标准 Anthropic 模型名 → copilot-api 模型名 的映射
// 客户端（Cline / Claude Code 等）通常发送标准 Anthropic 名称，需要映射到 copilot-api 支持的名称
const LEGACY_ANTHROPIC_MAP: Record<string, string> = {
  // Claude 3.x 系列 → 对应 copilot-api 版本
  'claude-3-5-sonnet-20241022':    'claude-sonnet-4.5',
  'claude-3-5-sonnet-latest':      'claude-sonnet-4.5',
  'claude-3-7-sonnet-20250219':    'claude-sonnet-4.6',
  'claude-3-7-sonnet-latest':      'claude-sonnet-4.6',
  'claude-3-5-haiku-20241022':     'claude-haiku-4.5',
  'claude-3-5-haiku-latest':       'claude-haiku-4.5',
  'claude-3-haiku-20240307':       'claude-haiku-4.5',
  'claude-3-opus-20240229':        'claude-opus-4.5',
  'claude-3-opus-latest':          'claude-opus-4.5',
  // claude-3.5-sonnet（中间加点，某些客户端格式）
  'claude-3.5-sonnet':             'claude-sonnet-4.5',
  'claude-3.7-sonnet':             'claude-sonnet-4.6',
  'claude-3.5-haiku':              'claude-haiku-4.5',
  'claude-3.5-opus':               'claude-opus-4.5',
};

// 完整模型列表 = copilot 原生名 + 连字符替换版 + 标准 Anthropic 名
const COPILOT_MODELS = Array.from(new Set([
  ...BASE_COPILOT_MODELS,
  ...BASE_COPILOT_MODELS.filter(m => m.includes('.')).map(m => m.replace(/\./g, '-')),
  ...Object.keys(LEGACY_ANTHROPIC_MAP),
])).join(',');

// 模型映射：连字符版→点号版 + 标准 Anthropic 名→ copilot-api 名
const COPILOT_MODEL_MAPPING = JSON.stringify({
  ...Object.fromEntries(
    BASE_COPILOT_MODELS
      .filter(m => m.includes('.'))
      .map(m => [m.replace(/\./g, '-'), m])
  ),
  ...LEGACY_ANTHROPIC_MAP,
});

const COPILOT_PORT_BASE = 4141;

// Docker 容器内需要用宿主机 IP（docker0 网桥），不能用 127.0.0.1
const COPILOT_API_HOST = process.env.COPILOT_API_HOST || '172.17.0.1';

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
      const usedPorts = existingAccounts.map((account) => account.port!);
      let port = COPILOT_PORT_BASE;
      while (usedPorts.includes(port)) port++;

      // 更新 new-api 渠道配置
      await updateNewApiChannel(body.channelId, {
        name: `copilot-${account.githubId}`,
        baseUrl: `http://${COPILOT_API_HOST}:${port}`,
        key: 'sk-copilot',
        models: COPILOT_MODELS,
        modelMapping: COPILOT_MODEL_MAPPING,
        group: 'cardvela',
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
        orderBy: { githubId: 'asc' },
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
          const status = account.status === 'inactive' || account.status === 'error' ? 2 : 1;

          await updateNewApiChannel(account.newApiChannelId!, {
            name: `copilot-${account.githubId}`,
            baseUrl: `http://${COPILOT_API_HOST}:${port}`,
            key: 'sk-copilot',
            models: COPILOT_MODELS,
            modelMapping: COPILOT_MODEL_MAPPING,
            group: 'cardvela',
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
