/**
 * new-api Gateway 集成模块
 * 负责与 new-api 管理 API 通信：创建/管理 token、查询用量、管理渠道
 */

const NEW_API_BASE = process.env.NEW_API_BASE_URL || 'http://127.0.0.1:3001';
const NEW_API_TOKEN = process.env.NEW_API_ADMIN_TOKEN || '';
const NEW_API_COOKIE = process.env.NEW_API_ADMIN_COOKIE || '';
const NEW_API_USER = process.env.NEW_API_ADMIN_USER || '1';

interface NewApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

function getNewApiAuthHeaders(): Record<string, string> {
  const cookie = NEW_API_COOKIE.trim();
  const token = NEW_API_TOKEN.trim();

  if (cookie) {
    return {
      'Cookie': cookie.startsWith('session=') ? cookie : `session=${cookie}`,
      'New-Api-User': NEW_API_USER,
    };
  }

  if (token) {
    if (/^(session|token|jwt)=/i.test(token)) {
      return { 'Cookie': token };
    }
    return { 'Authorization': `Bearer ${token}`, 'New-Api-User': NEW_API_USER };
  }

  throw new Error('未配置 new-api 管理认证，请设置 NEW_API_ADMIN_COOKIE 或 NEW_API_ADMIN_TOKEN');
}

async function newApiRequest(path: string, options: RequestInit = {}): Promise<any> {
  const url = `${NEW_API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getNewApiAuthHeaders(),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`new-api 请求失败 [${res.status}]: ${text}`);
  }

  return res.json();
}

// ==================== Token 管理 ====================

/**
 * 在 new-api 中创建 token（对应用户的 API Key）
 */
export async function createNewApiToken(params: {
  name: string;
  key: string;           // sk-cardvela-xxxx
  remainQuota: number;   // 配额（new-api 单位：$额度 × 500000）
  modelLimits?: string;  // 限制可用模型，逗号分隔
  group?: string;        // 渠道分组，对应 Tier
}): Promise<{ id: number; key: string }> {
  const data = await newApiRequest('/api/token/', {
    method: 'POST',
    body: JSON.stringify({
      name: params.name,
      key: params.key,
      remain_quota: params.remainQuota,
      unlimited_quota: params.remainQuota <= 0,
      model_limits_enabled: !!params.modelLimits,
      model_limits: params.modelLimits || '',
      group: params.group || '',
    }),
  });

  return { id: data.data?.id, key: data.data?.key || params.key };
}

/**
 * 查询 new-api token 详情。
 */
export async function getNewApiTokenDetail(tokenId: number): Promise<{ id: number; key: string }> {
  const data = await newApiRequest(`/api/token/${tokenId}`);
  return {
    id: data.data?.id || tokenId,
    key: data.data?.key || '',
  };
}

/**
 * 更新 new-api token 状态
 */
export async function updateNewApiToken(tokenId: number, params: {
  status?: number;        // 1=启用, 2=禁用
  remainQuota?: number;
  name?: string;
}): Promise<void> {
  const body: any = { id: tokenId };
  if (params.status !== undefined) body.status = params.status;
  if (params.remainQuota !== undefined) body.remain_quota = params.remainQuota;
  if (params.name !== undefined) body.name = params.name;
  await newApiRequest(`/api/token/`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/**
 * 删除 new-api token
 */
export async function deleteNewApiToken(tokenId: number): Promise<void> {
  await newApiRequest(`/api/token/${tokenId}`, {
    method: 'DELETE',
  });
}

/**
 * 查询 new-api token 用量
 */
export async function getNewApiTokenUsage(tokenId: number): Promise<{
  usedQuota: number;
  remainQuota: number;
  requestCount: number;
}> {
  const data = await newApiRequest(`/api/token/${tokenId}`);
  return {
    usedQuota: data.data?.used_quota || 0,
    remainQuota: data.data?.remain_quota || 0,
    requestCount: data.data?.request_count || 0,
  };
}

// ==================== 用量日志 ====================

/**
 * 查询 new-api 日志（用于同步用量到 CardVela）
 */
export async function getNewApiLogs(params: {
  tokenName?: string;
  startTimestamp?: number;
  endTimestamp?: number;
  page?: number;
  pageSize?: number;
}): Promise<{
  logs: Array<{
    id: number;
    token_name: string;
    model_name: string;
    prompt_tokens: number;
    completion_tokens: number;
    quota: number;
    created_at: number;
    channel: number;
  }>;
  total: number;
}> {
  const query = new URLSearchParams();
  if (params.tokenName) query.set('token_name', params.tokenName);
  if (params.startTimestamp) query.set('start_timestamp', String(params.startTimestamp));
  if (params.endTimestamp) query.set('end_timestamp', String(params.endTimestamp));
  query.set('p', String(params.page || 0));
  query.set('page_size', String(params.pageSize || 100));

  const data = await newApiRequest(`/api/log/self/?${query.toString()}`);
  return {
    logs: data.data?.logs || [],
    total: data.data?.total || 0,
  };
}

// ==================== 渠道管理 ====================

/**
 * 获取所有渠道
 */
export async function getNewApiChannels(): Promise<Array<{
  id: number;
  name: string;
  type: number;
  status: number;
  group: string;
  balance: number;
  response_time: number;
}>> {
  const data = await newApiRequest('/api/channel/?p=0&page_size=100');
  return data.data || [];
}

// ==================== 工具函数 ====================

/**
 * new-api 配额转美元（new-api 内部 1 USD ≈ 500000 quota）
 */
export function quotaToUSD(quota: number): number {
  return quota / 500000;
}

/**
 * 美元转 new-api 配额
 */
export function usdToQuota(usd: number): number {
  return Math.round(usd * 500000);
}

/**
 * 生成与 new-api 兼容的 API Key。
 */
export function generateApiKey(): string {
  const prefix = process.env.AI_KEY_PREFIX || 'sk';
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = '';
  const crypto = require('crypto');
  const bytes = crypto.randomBytes(48);
  for (let i = 0; i < 48; i++) {
    key += chars[bytes[i] % chars.length];
  }
  return `${prefix}-${key}`;
}
