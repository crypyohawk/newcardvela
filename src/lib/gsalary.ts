import crypto from 'crypto';
import { db } from './db';

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
  
  // 防护：确保响应是JSON格式
  const contentType = response.headers.get('content-type') || '';
  let result: any;
  try {
    const text = await response.text();
    result = JSON.parse(text);
  } catch (parseErr) {
    console.error(`[GSalary] 响应解析失败 (HTTP ${response.status}), Content-Type: ${contentType}`);
    throw new Error(`GSalary 返回非JSON响应 (HTTP ${response.status})，可能服务端异常`);
  }
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

// 便捷开卡方法（自动选择可用持卡人，失败时自动重试）
export async function quickApplyCard(data: {
  product_code: string;
  init_balance: number;
  card_holder_id?: string;
}) {
  const maxRetries = 3;
  const triedHolderIds: string[] = [];
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const requestId = `REQ_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    
    // 自动获取可用持卡人（排除已失败的）
    let holderId: string;
    try {
      holderId = data.card_holder_id || await getAvailableCardHolderId(triedHolderIds);
    } catch (err: any) {
      console.error(`[开卡] 第${attempt + 1}次获取持卡人失败:`, err.message);
      lastError = err;
      break; // 没有可用持卡人了，不再重试
    }
    
    if (!holderId) {
      lastError = new Error('无可用持卡人，请联系管理员');
      break;
    }

    try {
      const result = await applyCard({
        request_id: requestId,
        product_code: data.product_code,
        currency: 'USD',
        card_holder_id: holderId,
        init_balance: data.init_balance,
      });

      // 开卡成功，更新持卡人的开卡计数
      try {
        await db.cardHolder.update({
          where: { gsalaryHolderId: holderId },
          data: { cardCount: { increment: 1 } },
        });
      } catch (e) {
        console.warn('[持卡人] 更新开卡计数失败:', e);
      }

      // 在结果中附带使用的持卡人ID，供轮询时使用
      result._usedHolderId = holderId;
      return result;
    } catch (err: any) {
      const errMsg = String(err?.message || '');
      console.error(`[开卡] 第${attempt + 1}次尝试失败 (持卡人 ${holderId}):`, errMsg);
      lastError = err;
      triedHolderIds.push(holderId);

      // 如果是持卡人满了或被上游拒绝，标记该持卡人为满并重试
      const isHolderFull = errMsg.includes('card limit') || 
                           errMsg.includes('exceed') ||
                           errMsg.includes('maximum') ||
                           errMsg.includes('card_holder') ||
                           errMsg.includes('cards limit') ||
                           errMsg.includes('capacity');
      
      if (isHolderFull) {
        console.log(`[持卡人] 标记 ${holderId} 为已满（上游拒绝）`);
        try {
          await db.cardHolder.update({
            where: { gsalaryHolderId: holderId },
            data: { cardCount: 20 }, // 强制标记为满
          });
        } catch (updateErr) {
          console.warn('[持卡人] 标记已满失败:', updateErr);
        }
        // 如果指定了固定持卡人ID，不重试
        if (data.card_holder_id) break;
        continue; // 用下一个持卡人重试
      }

      // 其他错误不重试
      break;
    }
  }

  throw lastError || new Error('开卡失败：所有持卡人均不可用');
}

// ==================== 持卡人自动管理 ====================

// 美国常见姓名池
const FIRST_NAMES = [
  'James', 'Robert', 'John', 'Michael', 'David', 'William', 'Richard', 'Joseph', 'Thomas', 'Christopher',
  'Daniel', 'Matthew', 'Anthony', 'Mark', 'Steven', 'Andrew', 'Kevin', 'Brian', 'George', 'Timothy',
  'Jennifer', 'Elizabeth', 'Sarah', 'Jessica', 'Emily', 'Ashley', 'Amanda', 'Michelle', 'Stephanie', 'Nicole',
];
const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White',
];
const US_ADDRESSES = [
  { address: '1209 Orange Street', city: 'Wilmington', state: 'DE', postcode: '19801' },
  { address: '251 Little Falls Drive', city: 'Wilmington', state: 'DE', postcode: '19808' },
  { address: '850 New Burton Road', city: 'Dover', state: 'DE', postcode: '19904' },
  { address: '2711 Centerville Road', city: 'Wilmington', state: 'DE', postcode: '19808' },
  { address: '1013 Centre Road', city: 'Wilmington', state: 'DE', postcode: '19805' },
];

// 获取可用持卡人ID（<20张卡的），可排除指定ID
async function getAvailableCardHolderId(excludeIds: string[] = []): Promise<string> {
  // 1. 先从数据库找一个还有余量的持卡人
  const available = await db.cardHolder.findFirst({
    where: {
      isActive: true,
      cardCount: { lt: 20 },
      ...(excludeIds.length > 0 ? { gsalaryHolderId: { notIn: excludeIds } } : {}),
    },
    orderBy: { cardCount: 'asc' }, // 优先选卡少的
  });

  if (available) {
    console.log(`[持卡人] 使用现有持卡人 ${available.gsalaryHolderId}，已开 ${available.cardCount}/20 张`);
    return available.gsalaryHolderId;
  }

  // 2. 数据库没有可用记录，但有环境变量配置的默认持卡人（兼容未初始化的情况）
  if (DEFAULT_CARD_HOLDER_ID) {
    const holderCount = await db.cardHolder.count();
    if (holderCount === 0) {
      console.log('[持卡人] 数据库无记录，使用环境变量默认持卡人并自动导入');
      try {
        await db.cardHolder.create({
          data: {
            gsalaryHolderId: DEFAULT_CARD_HOLDER_ID,
            firstName: 'Default',
            lastName: 'Holder',
            email: 'default@cardvela.com',
            cardCount: 19, // 假设接近满了，促使后续自动创建新的
            maxCards: 20,
            isActive: true,
          },
        });
        return DEFAULT_CARD_HOLDER_ID;
      } catch (e) {
        console.warn('[持卡人] 自动导入默认持卡人失败:', e);
      }
    }
  }

  // 3. 所有持卡人都满了，自动创建新的
  console.log('[持卡人] 所有持卡人已满，自动创建新持卡人...');
  return await autoCreateCardHolder();
}

// 自动创建新持卡人
async function autoCreateCardHolder(): Promise<string> {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const addr = US_ADDRESSES[Math.floor(Math.random() * US_ADDRESSES.length)];
  const seq = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${seq}${rand}@gmail.com`;
  const mobile = `302${Math.floor(1000000 + Math.random() * 9000000)}`;

  try {
    const result = await createCardHolder({
      first_name: firstName,
      last_name: lastName,
      birth: `19${85 + Math.floor(Math.random() * 10)}-${String(1 + Math.floor(Math.random() * 12)).padStart(2, '0')}-${String(1 + Math.floor(Math.random() * 28)).padStart(2, '0')}`,
      email,
      mobile: { nation_code: '1', mobile },
      region: 'US',
      bill_address: {
        ...addr,
        country: 'US',
      },
    });

    const holderId = result.card_holder_id;
    if (!holderId) {
      throw new Error('上游未返回持卡人ID');
    }

    // 保存到数据库
    await db.cardHolder.create({
      data: {
        gsalaryHolderId: holderId,
        firstName,
        lastName,
        email,
        cardCount: 0,
        maxCards: 20,
        isActive: true,
      },
    });

    console.log(`[持卡人] 新持卡人创建成功: ${holderId} (${firstName} ${lastName})`);
    return holderId;
  } catch (err: any) {
    console.error('[持卡人] 创建失败:', err);
    throw new Error(`创建持卡人失败: ${err.message}`);
  }
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
