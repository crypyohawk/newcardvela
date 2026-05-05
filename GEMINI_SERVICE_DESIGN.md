# Gemini AI 专线服务设计方案

## 目标

在现有平台上新增 Gemini AI 专线服务，**所有注册用户无需企业认证即可创建 Key 使用**。后期以同样方式扩展 GPT 专线、Grok 专线等。

---

## 架构复用

完全复用现有 AI 服务基础设施，**不新增后端接口**：
- 同样走 `new-api` 网关
- 同样使用 `AIProvider` + `AIServiceTier` + `AIKey` 数据库结构
- 同样使用 `/api/user/ai-service/keys`、`/api/user/ai-service/tiers` 等接口
- 差异仅在 `modelGroup = "gemini"`、`requiredRole = null`（所有用户可用）

---

## 实施步骤

### Step 1：new-api 添加 Google AI Studio channel

- 去 https://aistudio.google.com/app/apikey 获取免费 API Key
- 在 new-api 管理后台添加 channel：
  - 类型：`Google`（type=41）
  - 模型：`gemini-3.1-pro-preview,gemini-2.5-pro-preview,gemini-2.5-flash,gemini-2.0-flash,gemini-1.5-pro,gemini-1.5-flash`
  - 分组：`gemini`（用于后续配额路由）

### Step 2：数据库插入记录

**AIProvider（服务商）**：
```sql
INSERT INTO "AIProvider" (id, name, "displayName", type, "baseUrl", "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES (
  'provider-gemini-aistudio',
  'google-aistudio',
  'Google AI Studio',
  'proxy',
  'https://generativelanguage.googleapis.com',
  true, 2, NOW(), NOW()
);
```

**AIServiceTier（套餐）**：
```sql
-- Gemini 标准套餐（所有用户可用）
INSERT INTO "AIServiceTier" (
  id, name, "displayName", description,
  "pricePerMillionInput", "pricePerMillionOutput",
  features, models,
  "maxKeys", "requiredRole", "minAiBalance",
  "isActive", "sortOrder", "modelGroup",
  "channelGroup", "providerId",
  "createdAt", "updatedAt"
) VALUES (
  'tier-gemini-standard',
  'gemini-standard',
  'Gemini 标准版',
  '支持 Gemini 3.1 Pro / 2.5 Pro / Flash 全系列，所有用户均可使用',
  0.00,   -- input 免费（AI Studio 免费额度）
  0.00,   -- output 免费
  '["支持 Gemini 3.1 Pro Preview","支持 Gemini 2.5 Pro/Flash","无需企业认证","免费使用"]',
  '[{"name":"gemini-3.1-pro-preview","ratio":1},{"name":"gemini-2.5-pro-preview","ratio":1},{"name":"gemini-2.5-flash","ratio":0.1},{"name":"gemini-2.0-flash","ratio":0.1},{"name":"gemini-1.5-pro","ratio":0.5},{"name":"gemini-1.5-flash","ratio":0.1}]',
  3,      -- 每用户最多 3 个 Key
  NULL,   -- 无角色限制，所有用户可用
  0,      -- 无最低余额要求
  true, 10, 'gemini',
  'gemini',
  'provider-gemini-aistudio',
  NOW(), NOW()
);
```

### Step 3：前端改动（最小改动原则）

#### 3.1 dashboard/page.tsx — 新增服务入口卡片

在 Claude AI 服务卡片下方，新增 Gemini AI 服务卡片（绿色主题），点击切换到 `activeTab === 'gemini'`。

#### 3.2 dashboard/page.tsx — 新增 gemini tab 内容区

复用 Claude AI 服务的 tab 内容结构，筛选 `modelGroup === 'gemini'` 的套餐展示。无需重复写 API 调用逻辑，共用 `aiTiers` / `aiKeys` 数据，按 `modelGroup` 过滤。

#### 3.3 `modelGroup` 扩展支持

`AIServiceTier` 的 `modelGroup` 字段现在支持 `"claude" | "gpt" | "mixed"`，需在前端展示逻辑中新增 `"gemini"` 分支（颜色用绿色系）。

---

## 权限设计

| 服务 | requiredRole | 说明 |
|------|-------------|------|
| Claude 系列 | `enterprise` | 需企业认证（现有逻辑不变） |
| Gemini 系列 | `null` | 所有用户可用 |
| 未来 GPT 专线 | 待定 | 同样支持 null 或分级 |

---

## 费率设计（初期免费）

AI Studio 免费额度（每天）：
- Gemini 2.0 Flash：1500 次请求
- Gemini 1.5 Flash：1500 次请求
- Gemini 2.5 Pro：50 次请求（有限制）

**初期免费策略**：`pricePerMillionInput = 0, pricePerMillionOutput = 0`，后期有量了再切换付费 key 并调整价格。

---

## 实施顺序

1. ✅ 获取 Google AI Studio API Key
2. new-api 添加 Gemini channel（分组: gemini）
3. PostgreSQL 插入 AIProvider + AIServiceTier
4. 前端 dashboard 新增 Gemini 入口卡片 + tab 内容
5. 测试创建 Key → 调用 Gemini 模型 → 成功

---

## 后期扩展

同样方式：
- **GPT 专线**：modelGroup = "gpt-direct"，provider = OpenAI 官方
- **Grok 专线**：modelGroup = "grok"，provider = xAI
- 每个专线独立卡片、独立 tab，共用同一套后端接口
