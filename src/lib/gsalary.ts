import crypto from 'crypto';

const API_URL = process.env.GSALARY_API_URL || 'https://api.gsalary.com';
const APP_ID = process.env.GSALARY_APP_ID || '';
const PRIVATE_KEY = process.env.GSALARY_PRIVATE_KEY?.replace(/\\n/g, '\n') || '';
const USE_MOCK = process.env.GSALARY_MOCK === 'true';
// 默认持卡人ID（从你的商户后台获取）
const DEFAULT_CARD_HOLDER_ID = process.env.GSALARY_DEFAULT_CARD_HOLDER_ID || '';

// 计算 Body Hash
function calculateBodyHash(body: string): string {
  const hash = crypto.createHash('sha256').update(body, 'utf8').digest();
  return Buffer.from(hash).toString('base64');
}

// 构建签名字符串
function buildSignString(method: string, path: string, timestamp: string, bodyHash: string): string {
  return `${method} ${path}\n${APP_ID}\n${timestamp}\n${bodyHash}\n`;
}

// RSA SHA256 签名
function signData(data: string): string {
  try {
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(data);
    sign.end();
    const signature = sign.sign(PRIVATE_KEY, 'base64');
    return signature.replace(/\+/g, '-').replace(/\//g, '_');
  } catch (error) {
    console.error('签名失败:', error);
    throw new Error('签名失败，请检查私钥配置');
  }
}

// 模拟响应
function mockResponse(endpoint: string, data: any) {
  const cardNo = `4111${Math.floor(1000000000000 + Math.random() * 9000000000000)}`;
  
  if (endpoint.includes('card_applies')) {
    return {
      request_id: data?.request_id || `REQ_${Date.now()}`,
      status: 'PROCESSING',
      card_id: `MOCK_CARD_${Date.now()}`,
    };
  }
  if (endpoint.includes('card_holders') && data) {
    return {
      card_holder_id: `MOCK_HOLDER_${Date.now()}`,
      status: 'ACTIVE',
    };
  }
  if (endpoint.includes('cards') && endpoint.includes('sensitive')) {
    return {
      card_no: cardNo,
      cvv: '123',
      expiry_date: '12/28',
    };
  }
  if (endpoint.includes('cards')) {
    return { cards: [], page: 1, limit: 20, total_count: 0 };
  }
  if (endpoint.includes('balance')) {
    return { balance: 10000 };
  }
  return {};
}

// 通用请求方法
async function request(endpoint: string, method: string = 'POST', data?: Record<string, any>) {
  if (USE_MOCK) {
    console.log(`[GSalary Mock] ${method} ${endpoint}`, data);
    return mockResponse(endpoint, data);
  }

  const timestamp = Date.now().toString();
  const body = data ? JSON.stringify(data) : '';
  const bodyHash = body ? calculateBodyHash(body) : '';
  
  const signString = buildSignString(method.toUpperCase(), endpoint, timestamp, bodyHash);
  console.log('[GSalary] Sign String:', signString);
  
  const signature = signData(signString);

  const url = `${API_URL}${endpoint}`;
  console.log(`[GSalary] ${method} ${url}`);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Appid': APP_ID,
    'Authorization': `algorithm=RSA2,time=${timestamp},signature=${signature}`,
  };

  const options: RequestInit = { method, headers };
  if (body) options.body = body;

  console.log('[GSalary] Headers:', headers);
  console.log('[GSalary] Body:', body);

  const response = await fetch(url, options);
  const result = await response.json();
  console.log('[GSalary] Response:', JSON.stringify(result, null, 2));

  if (!response.ok) {
    throw new Error(`GSalary HTTP ${response.status}: ${result?.message || result?.error || JSON.stringify(result)}`);
  }

  if (result?.result?.result === 'F' || result?.error || result?.error_code) {
    throw new Error(`GSalary API 错误: ${result?.result?.message || result?.message || JSON.stringify(result)}`);
  }

  return result.data || result;
}

// ==================== 持卡人接口 ====================

// 查询持卡人列表 - GET /v1/card_holders
export async function getCardHolders(params?: {
  page?: number;
  limit?: number;
  email?: string;
  mobile?: string;
}) {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());
  if (params?.email) query.set('email', params.email);
  if (params?.mobile) query.set('mobile', params.mobile);
  const queryStr = query.toString();
  return request(`/v1/card_holders${queryStr ? '?' + queryStr : ''}`, 'GET');
}

// 创建持卡人 - POST /v1/card_holders
export async function createCardHolder(data: {
  first_name: string;
  last_name: string;
  birth: string;
  email: string;
  mobile: { nation_code: string; mobile: string };
  region: string;
  bill_address?: {
    postcode: string;
    address: string;
    city: string;
    state: string;
    country: string;
  };
}) {
  return request('/v1/card_holders', 'POST', data);
}

// 查看持卡人信息 - GET /v1/card_holders/{card_holder_id}
export async function getCardHolder(cardHolderId: string) {
  return request(`/v1/card_holders/${cardHolderId}`, 'GET');
}

// ==================== 开卡接口 ====================

// 申请开卡 - POST /v1/card_applies
export async function applyCard(data: {
  request_id: string;
  product_code: string;
  currency: string;
  card_holder_id: string;
  init_balance: number;
  limit_per_day?: number;
  limit_per_month?: number;
  limit_per_transaction?: number;
}) {
  return request('/v1/card_applies', 'POST', data);
}

// 查询开卡结果 - GET /v1/card_applies/{request_id}
export async function getCardApplyResult(requestId: string) {
  return request(`/v1/card_applies/${requestId}`, 'GET');
}

// 便捷开卡方法（使用默认持卡人）
export async function quickApplyCard(data: {
  product_code: string;
  init_balance: number;
  card_holder_id?: string;
}) {
  const requestId = `REQ_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const holderId = data.card_holder_id || DEFAULT_CARD_HOLDER_ID;
  
  if (!holderId) {
    throw new Error('未配置默认持卡人ID');
  }

  return applyCard({
    request_id: requestId,
    product_code: data.product_code,
    currency: 'USD',
    card_holder_id: holderId,
    init_balance: data.init_balance,
    // 移除或降低限额参数，让上游使用默认值
  });
}

// ==================== 卡片管理接口 ====================

// 查询卡列表 - GET /v1/cards
export async function getCards(params?: { 
  page?: number; 
  limit?: number;
  product_code?: string;
  card_holder_id?: string;
  status?: string;
}) {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());
  if (params?.product_code) query.set('product_code', params.product_code);
  if (params?.card_holder_id) query.set('card_holder_id', params.card_holder_id);
  if (params?.status) query.set('status', params.status);
  const queryStr = query.toString();
  return request(`/v1/cards${queryStr ? '?' + queryStr : ''}`, 'GET');
}

// 查看卡信息 - GET /v1/cards/{card_id}
export async function getCardDetail(cardId: string) {
  return request(`/v1/cards/${cardId}`, 'GET');
}

// 获取卡敏感信息 - GET /v1/cards/{card_id}/secure_info（注意路径需要 /v1）
export async function getCardSensitiveInfo(cardId: string) {
  return request(`/v1/cards/${cardId}/secure_info`, 'GET');
}

// 查询卡可用配额 - GET /v1/cards/available_quotas
export async function getAvailableQuotas(currency: string = 'USD', accountingCardType?: 'SHARE' | 'RECHARGE') {
  const params = new URLSearchParams();
  params.set('currency', currency);
  if (accountingCardType) {
    params.set('accounting_card_type', accountingCardType);
  }
  return request(`/v1/cards/available_quotas?${params.toString()}`, 'GET');
}

// 卡片调额 - POST /v1/cards/balance_modifies
export async function modifyCardBalance(data: {
  card_id: string;
  amount: number;  // 单位：元（USD），不是分！
  type: 'INCREASE' | 'DECREASE';
  request_id: string;
}) {
  console.log('[GSalary] 卡片调额请求:', JSON.stringify(data));
  return request('/v1/cards/balance_modifies', 'POST', data);
}

// 卡充值（金额单位：元）
export async function rechargeCard(cardId: string, amount: number) {
  const requestId = `RCH${Date.now()}`;
  return modifyCardBalance({
    card_id: cardId,
    amount: amount,  // 直接用元，不转换
    type: 'INCREASE',
    request_id: requestId,
  });
}

// 卡提现（金额单位：元，正数，type 为 DECREASE 表示减少）
export async function withdrawFromCard(cardId: string, amount: number) {
  const requestId = `WDR${Date.now()}`;
  console.log('[GSalary] 卡提现:', { cardId, amount });
  return modifyCardBalance({
    card_id: cardId,
    amount: amount,  // 正数，API 会根据 type 判断增减
    type: 'DECREASE',
    request_id: requestId,
  });
}

// 查询商户余额 - GET /v1/merchant/balance
export async function getBalance() {
  return request('/v1/merchant/balance', 'GET');
}

// 测试连通性
export async function testConnection() {
  try {
    const result = await getCardHolders({ page: 1, limit: 1 });
    console.log('[GSalary] 连通性测试成功:', result);
    return { success: true, result };
  } catch (err: any) {
    console.error('[GSalary] 连通性测试失败:', err.message);
    return { success: false, error: err.message };
  }
}

export function generateKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { publicKey, privateKey };
}
