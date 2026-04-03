/**
 * new-api Gateway 集成模块
 * 负责与 new-api 管理 API 通信：创建/管理 token、查询用量、管理渠道
 */

const NEW_API_BASE = process.env.NEW_API_BASE_URL || 'http://127.0.0.1:3001';
const NEW_API_TOKEN = process.env.NEW_API_ADMIN_TOKEN || '';
const NEW_API_COOKIE = process.env.NEW_API_ADMIN_COOKIE || '';
const NEW_API_USER = process.env.NEW_API_ADMIN_USER || '1';
const NEW_API_SQLITE_PATH = process.env.NEW_API_SQLITE_PATH || '/home/ubuntu/new-api/data/one-api.db';
const NEW_API_DB_URL = process.env.NEW_API_DB_URL || '';  // MySQL/PostgreSQL 连接串
const NEW_API_DISABLE_SQLITE_FALLBACK = process.env.NEW_API_DISABLE_SQLITE_FALLBACK === '1';

interface NewApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

function isMaskedTokenKey(key: string | undefined | null): boolean {
  return !!key && key.includes('*');
}

function getNewApiAuthHeaders(): Record<string, string> {
  const cookie = NEW_API_COOKIE.trim();
  const token = NEW_API_TOKEN.trim();

  // Token 优先：Token 比 Cookie 更稳定，不会过期
  if (token) {
    return { 'Authorization': `Bearer ${token}`, 'New-Api-User': NEW_API_USER };
  }

  if (cookie) {
    return {
      'Cookie': cookie.startsWith('session=') ? cookie : `session=${cookie}`,
      'New-Api-User': NEW_API_USER,
    };
  }

  throw new Error('未配置 new-api 管理认证，请设置 NEW_API_ADMIN_TOKEN 或 NEW_API_ADMIN_COOKIE');
}

async function newApiRequest(path: string, options: RequestInit = {}): Promise<any> {
  const url = `${NEW_API_BASE}${path}`;
  // 15 秒超时，避免 new-api 无响应导致 nginx 502
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
  const res = await fetch(url, {
    ...options,
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      ...getNewApiAuthHeaders(),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`new-api 请求失败 [${res.status}]: ${text.slice(0, 200)}`);
  }

  // 安全解析 JSON，防止 new-api 返回非 JSON 内容（如 HTML 页面）导致未捕获异常
  let json: any;
  try {
    json = await res.json();
  } catch (parseErr) {
    throw new Error(`new-api 返回非 JSON 响应 (${res.status} ${res.statusText})`);
  }

  // new-api 返回 HTTP 200 但 success=false 时表示业务层错误（如 token 无效）
  if (json.success === false) {
    throw new Error(`new-api 业务错误: ${json.message || JSON.stringify(json)}`);
  }

  return json;
  } finally {
    clearTimeout(timeout);
  }
}

// ==================== Token 管理 ====================

/**
 * 获取 SQLite 数据库连接（只读模式）
 */
function getSqliteDb() {
  // 动态加载避免 Next.js webpack 打包报错
  // 先检查模块是否可加载（避免 native module 崩溃整个进程）
  let BetterSqlite3: any;
  try {
    BetterSqlite3 = require('better-sqlite3');
  } catch (e: any) {
    throw new Error(`better-sqlite3 模块不可用: ${e.message}`);
  }
  return new BetterSqlite3(NEW_API_SQLITE_PATH, { readonly: true, fileMustExist: true });
}

/**
 * 从 new-api 的 MySQL/PostgreSQL 数据库读取 token 信息。
 * 用于远程部署场景（本地开发连接远程 new-api 数据库）。
 * NEW_API_DB_URL 格式:
 *   mysql://user:pass@host:3306/dbname
 *   postgresql://user:pass@host:5432/dbname
 */
async function readTokenFromRemoteDb(name: string): Promise<{ id: number; key: string } | null> {
  if (!NEW_API_DB_URL) return null;
  
  try {
    const url = new URL(NEW_API_DB_URL);
    const protocol = url.protocol.replace(':', '');
    
    if (protocol === 'mysql' || protocol === 'mariadb') {
      const mysql2 = require('mysql2/promise');
      const conn = await mysql2.createConnection(NEW_API_DB_URL);
      try {
        const [rows] = await conn.execute(
          'SELECT id, `key` FROM tokens WHERE name = ? ORDER BY id DESC LIMIT 1',
          [name]
        );
        const row = (rows as any[])[0];
        if (row && row.id && row.key) {
          return { id: row.id, key: `sk-${row.key}` };
        }
        return null;
      } finally {
        await conn.end();
      }
    } else if (protocol === 'postgresql' || protocol === 'postgres') {
      const { Client } = require('pg');
      const client = new Client({ connectionString: NEW_API_DB_URL });
      await client.connect();
      try {
        const result = await client.query(
          'SELECT id, key FROM tokens WHERE name = $1 ORDER BY id DESC LIMIT 1',
          [name]
        );
        const row = result.rows[0];
        if (row && row.id && row.key) {
          return { id: row.id, key: `sk-${row.key}` };
        }
        return null;
      } finally {
        await client.end();
      }
    }
    
    console.error('[newapi] 不支持的数据库协议:', protocol);
    return null;
  } catch (e: any) {
    console.error('[newapi] 远程数据库读取失败:', e.message);
    return null;
  }
}

/**
 * 从 new-api 的 SQLite 数据库直接读取 token 信息。
 * new-api 的创建 API 不返回 key，只能从数据库读。
 * 使用 better-sqlite3 参数化查询，避免 SQL 注入。
 */
function readTokenFromSqlite(name: string): { id: number; key: string } | null {
  let sqliteDb: any = null;
  try {
    sqliteDb = getSqliteDb();
    const row = sqliteDb.prepare('SELECT id, key FROM tokens WHERE name = ? ORDER BY id DESC LIMIT 1').get(name) as { id: number; key: string } | undefined;
    if (row && row.id && row.key) {
      return { id: row.id, key: `sk-${row.key}` };
    }
    return null;
  } catch (e: any) {
    console.error('[newapi] SQLite 读取失败:', e.message);
    return null;
  } finally {
    sqliteDb?.close();
  }
}

/**
 * 从 new-api 数据库读取完整 token key。
 * 优先级：1. 远程 MySQL/PostgreSQL  2. 本地 SQLite
 */
async function readTokenFromDb(name: string): Promise<{ id: number; key: string } | null> {
  // 优先使用远程数据库（如果配置了）
  if (NEW_API_DB_URL) {
    const result = await readTokenFromRemoteDb(name);
    if (result) return result;
  }

  if (!NEW_API_DISABLE_SQLITE_FALLBACK) {
    const result = readTokenFromSqlite(name);
    if (result) return result;
  }

  return null;
}

export async function getNewApiTokenPlaintextKeyByName(name: string): Promise<string | null> {
  const result = await readTokenFromDb(name);
  return result?.key || null;
}

/**
 * 在 new-api 中创建 token（对应用户的 API Key）。
 * 
 * 获取 key 的策略（按优先级）：
 * 1. 远程 MySQL/PostgreSQL 数据库读取（NEW_API_DB_URL）
 * 2. 本地 SQLite 数据库读取（同机部署）
 * 3. 都失败则报错（不生成假 key，避免不一致）
 */
export async function createNewApiToken(params: {
  name: string;
  remainQuota: number;
  modelLimits?: string;
  group?: string;
}): Promise<{ id: number; key: string }> {
  const data = await newApiRequest('/api/token/', {
    method: 'POST',
    body: JSON.stringify({
      name: params.name,
      remain_quota: params.remainQuota,
      unlimited_quota: params.remainQuota <= 0,
      expired_time: -1,  // -1 = 永不过期
      model_limits_enabled: !!params.modelLimits,
      model_limits: params.modelLimits || '',
      group: params.group || '',
    }),
  });

  console.log('[newapi] createToken API response:', JSON.stringify(data));

  if (!data.success) {
    throw new Error(`new-api 创建 token 失败: ${data.message}`);
  }

  // 策略 1：从 POST 响应直接获取 key（部分 new-api 版本返回完整对象）
  if (data.data && typeof data.data === 'object' && data.data.key && !isMaskedTokenKey(data.data.key)) {
    const key = data.data.key.startsWith('sk-') ? data.data.key : `sk-${data.data.key}`;
    console.log(`[newapi] createToken from response: id=${data.data.id}, key=${key.slice(0,8)}...`);
    return { id: data.data.id, key };
  }

  // 获取 token ID（POST 可能只返回 ID）
  const tokenId = typeof data.data === 'number' ? data.data
    : typeof data.data === 'object' ? data.data?.id
    : null;

  // 策略 2：通过 GET API 获取完整 key（无需数据库依赖）
  if (tokenId) {
    try {
      const detail = await getNewApiTokenDetail(tokenId);
      if (detail.key && !isMaskedTokenKey(detail.key)) {
        const key = detail.key.startsWith('sk-') ? detail.key : `sk-${detail.key}`;
        console.log(`[newapi] createToken from GET API: id=${detail.id}, key=${key.slice(0,8)}...`);
        return { id: detail.id, key };
      }
    } catch (e: any) {
      console.warn('[newapi] GET token detail failed, trying search API:', e.message);
    }
  }

  // 策略 3：通过搜索 API 先按名称找到 token，再查详情。
  await new Promise(r => setTimeout(r, 300));
  const searchedTokenId = await findNewApiTokenIdByName(params.name);
  if (searchedTokenId) {
    const detail = await getNewApiTokenDetail(searchedTokenId);
    if (detail.key && !isMaskedTokenKey(detail.key)) {
      const key = detail.key.startsWith('sk-') ? detail.key : `sk-${detail.key}`;
      console.log(`[newapi] createToken from search API: id=${detail.id}, key=${key.slice(0,8)}...`);
      return { id: detail.id, key };
    }
  }

  // 策略 4：远程数据库读取（仅限显式配置了 NEW_API_DB_URL 的场景）
  const fromDb = await readTokenFromDb(params.name);
  if (fromDb) {
    console.log(`[newapi] createToken from remote DB: id=${fromDb.id}, key=${fromDb.key.slice(0, 8)}...${fromDb.key.slice(-4)}`);
    return fromDb;
  }

  // 所有策略都失败
  throw new Error(
    'new-api 创建 token 成功但无法获取完整 key。' +
    `token ID=${tokenId || searchedTokenId || '未知'}。` +
    '请检查 GET /api/token/:id、/api/token/search 是否是否返回脱敏 key，或配置 NEW_API_DB_URL / NEW_API_SQLITE_PATH'
  );
}

/**
 * 从 new-api 通过 token name 查找 token ID（用于 webhook 兼容旧数据）
 * 先尝试数据库，再尝试 API
 */
export async function findNewApiTokenIdByName(name: string): Promise<number | null> {
  // 优先走 API 搜索，避免本地 SQLite 原生模块导致进程崩溃。
  try {
    const data = await newApiRequest(`/api/token/search?keyword=${encodeURIComponent(name)}`);
    const items = data.data?.items || data.data || [];
    const arr = Array.isArray(items) ? items : [];
    const token = arr.find((t: any) => t.name === name);
    return token ? token.id : null;
  } catch (e: any) {
    console.error('[newapi] 查找 token ID 失败:', e.message);
  }

  // 最后回退到远程数据库，不再走 SQLite。
  const fromDb = await readTokenFromDb(name);
  return fromDb ? fromDb.id : null;
}

/**
 * 查询 new-api token 详情。
 */
export async function getNewApiTokenDetail(tokenId: number): Promise<{ id: number; key: string }> {
  const data = await newApiRequest(`/api/token/${tokenId}`);
  console.log(`[newapi] GET /api/token/${tokenId} response:`, JSON.stringify(data));
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
  group?: string;
  expiredTime?: number;   // -1=永不过期
}): Promise<void> {
  const body: any = { id: tokenId };
  if (params.status !== undefined) body.status = params.status;
  if (params.remainQuota !== undefined) body.remain_quota = params.remainQuota;
  if (params.name !== undefined) body.name = params.name;
  if (params.group !== undefined) body.group = params.group;
  if (params.expiredTime !== undefined) body.expired_time = params.expiredTime;
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

  // 使用管理员端点 /api/log/ 获取所有用户日志（/api/log/self/ 只返回当前认证用户自己的）
  const data = await newApiRequest(`/api/log/?${query.toString()}`);
  // 兼容不同 new-api 版本的响应格式：
  // 有的返回 { data: { logs: [...], total: N } }，有的返回 { data: [...] }
  const rawData = data.data;
  const logs = Array.isArray(rawData) ? rawData : (rawData?.logs || rawData?.data || []);
  const total = Array.isArray(rawData) ? rawData.length : (rawData?.total || logs.length);
  return { logs, total };
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
  // 兼容不同版本的响应格式：
  // v0.11.9+: { data: { items: [...], page, total } }
  // 旧版本:   { data: [...] } 或 { data: { data: [...] } }
  const rawData = data.data;
  if (Array.isArray(rawData)) return rawData;
  return rawData?.items || rawData?.data || rawData?.list || [];
}

/**
 * 在 new-api 中创建渠道（上游通道）
 * type=1 表示 OpenAI 兼容格式
 */
export async function createNewApiChannel(params: {
  name: string;
  baseUrl: string;
  key: string;
  models: string;
  group: string;
  modelMapping?: string;
}): Promise<{ id: number }> {
  const data = await newApiRequest('/api/channel/', {
    method: 'POST',
    body: JSON.stringify({
      name: params.name,
      type: 1,  // OpenAI 兼容
      key: params.key,
      base_url: params.baseUrl,
      models: params.models,
      model_mapping: params.modelMapping || '',
      group: params.group,
      groups: [params.group],
      status: 1,
      weight: 1,
    }),
  });
  if (!data.success) {
    throw new Error(`new-api 创建渠道失败: ${data.message}`);
  }
  return { id: data.data?.id || 0 };
}

/**
 * 更新 new-api 渠道
 */
export async function updateNewApiChannel(channelId: number, params: {
  name?: string;
  status?: number;
  baseUrl?: string;
  key?: string;
  models?: string;
  modelMapping?: string;
  group?: string;
  weight?: number;
}): Promise<void> {
  const body: any = { id: channelId };
  if (params.name !== undefined) body.name = params.name;
  if (params.status !== undefined) body.status = params.status;
  if (params.baseUrl !== undefined) body.base_url = params.baseUrl;
  if (params.key !== undefined) body.key = params.key;
  if (params.models !== undefined) body.models = params.models;
  if (params.modelMapping !== undefined) body.model_mapping = params.modelMapping;
  if (params.group !== undefined) { body.group = params.group; body.groups = [params.group]; }
  if (params.weight !== undefined) body.weight = params.weight;
  await newApiRequest('/api/channel/', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/**
 * 删除 new-api 渠道
 */
export async function deleteNewApiChannel(channelId: number): Promise<void> {
  await newApiRequest(`/api/channel/${channelId}`, {
    method: 'DELETE',
  });
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
  // 必须用 sk- 前缀，new-api 只认这个格式，不读环境变量避免配成 sk-cardvela 导致不兼容
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = '';
  const crypto = require('crypto');
  const bytes = crypto.randomBytes(48);
  for (let i = 0; i < 48; i++) {
    key += chars[bytes[i] % chars.length];
  }
  return `sk-${key}`;
}
