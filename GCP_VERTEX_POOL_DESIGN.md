# GCP Vertex AI 号池方案

> 目标：把一个（或多个）谷歌云账号的 $300 免费额度接入现有号池体系，
> 支持 Claude Opus/Sonnet/Haiku + Gemini 2.x/2.5 系列模型。

---

## 一、可行性评估

### 1.1 有哪些模型可用

GCP Vertex AI 上可调用（via Anthropic 合作伙伴模型 + Google 自家 Gemini）：

| 模型系列 | 代表型号 | 输入价 $/M | 输出价 $/M |
|----------|----------|------------|------------|
| Claude Opus 4.x | claude-opus-4.7, 4.6, 4.5 | $5.00 | $25.00 |
| Claude Opus 4.1 | claude-opus-4.1 | $15.00 | $75.00 |
| Claude Sonnet 4.x | claude-sonnet-4.6, 4.5, 4 | $3.00 | $15.00 |
| Claude Haiku 4.5 | claude-haiku-4.5 | $1.00 | $5.00 |
| Gemini 2.5 Pro | gemini-2.5-pro | $1.25 | $10.00 |
| Gemini 2.5 Flash | gemini-2.5-flash | $0.30 | $2.50 |
| Gemini 2.0 Flash | gemini-2.0-flash | $0.15 | $0.60 |
| Gemini 2.5 Flash Lite | gemini-2.5-flash-lite | $0.10 | $0.40 |

> 价格与 Anthropic/Google 官方直连完全相同，没有额外溢价。

### 1.2 $300 能用多久

**场景一：主要用 Claude Sonnet（最常用档位）**
- 平均每次调用 2000 input + 800 output tokens
- 成本/次：$0.006 + $0.012 = **$0.018/次**
- $290（扣已消耗）÷ $0.018 ≈ **16,000 次**
- 5000 次重度使用 = 消耗约 $90，绰绰有余

**场景二：主要用 Gemini 2.5 Flash**
- 成本/次约 $0.001～0.002，$290 能跑 **14 万次以上**

**场景三：主要用 Claude Opus**
- 成本/次约 $0.03，5000 次 = $150，仍在 $300 内

**结论：3000～5000 次调用完全够用，$300 余额可支撑 1～2 个月重度使用。**

### 1.3 关键限制

| 限制 | 说明 |
|------|------|
| ⚠️ 免费额度 90 天到期 | 从激活日起 90 天内必须用完，否则清零 |
| ⚠️ 一次性 | $300 用完后需要绑卡付费（截图显示已绑 Mastercard） |
| ✅ 多账号可叠加 | 可以用多个谷歌账号各注册一个 GCP 项目，每个 $300 |
| ✅ 认证稳定 | Service Account 密钥不像 GitHub/Kiro token 那样频繁失效 |

---

## 二、技术方案

### 2.1 认证方式（关键）

Vertex AI 有两套认证入口：

**方案 A：Vertex AI Service Account（推荐用于 Claude）**
```
GCP Project → IAM → 创建 Service Account → 下载 JSON 密钥
→ 用 google-auth 库换取短期 OAuth2 Bearer Token（每小时刷新）
→ 调用 https://{region}-aiplatform.googleapis.com/v1/projects/{id}/...
```

**方案 B：Gemini API Key（推荐用于 Gemini 模型）**
```
GCP Console → APIs & Services → 启用 Generative Language API
→ 创建 API Key → 直接当 key 用
→ 调用 https://generativelanguage.googleapis.com/v1beta/models/...
注意：此方式使用 GCP 计费，$300 额度有效
```

> Gemini API Key 方式与 new-api 的 "Google Gemini" 渠道原生兼容，
> 可直接在 new-api 添加渠道，**无需写任何代码**。

### 2.2 架构选型

```
方案 A（无代码，仅支持 Gemini）：
  CardVela → new-api → Google Gemini 渠道 (API Key) → Vertex AI Gemini

方案 B（需建 gcp-vertex-gateway，支持全部模型）：
  CardVela → new-api → 自定义渠道 → gcp-vertex-gateway(:4149)
                                    ↓
                           Vertex AI (Claude + Gemini)
```

**推荐：先用方案 A 把 Gemini 跑通（30 分钟，零代码），
      再用方案 B 把 Claude on Vertex 打通（1～2 天）。**

---

## 三、方案 A：Gemini via API Key（立即可用）

### 步骤

1. GCP Console → APIs & Services → 启用 **Generative Language API**
2. APIs & Services → Credentials → 创建 API Key，限制用于 Generative Language API
3. new-api 管理后台 → 渠道 → 新增 → 类型选 **Google Gemini**
   - Key：填第 2 步生成的 API Key
   - 模型：gemini-2.5-flash, gemini-2.5-pro, gemini-2.0-flash 等
4. 验证可用性后，在 CardVela 的 AIServiceTier.models 里添加 Gemini 模型

### 难度：⭐ 极低，30 分钟搞定

---

## 四、方案 B：gcp-vertex-gateway（支持 Claude + Gemini 完整版）

### 4.1 文件结构

```
/opt/gcp-vertex-gateway/
├── .env
├── requirements.txt
├── main.py          ← FastAPI 主程序
└── credentials/
    └── service-account.json   ← GCP Service Account 密钥
```

### 4.2 .env 配置

```env
PROXY_API_KEY=gcp-internal-proxy-key
GCP_SERVICE_ACCOUNT_FILE=/opt/gcp-vertex-gateway/credentials/service-account.json
GCP_PROJECT_ID=project-e6251591-d5a8-47e4-9ea   # 从截图 URL 可读取
GCP_REGION_CLAUDE=us-east5       # Claude 模型可用区
GCP_REGION_GEMINI=us-central1    # Gemini 模型可用区
PORT=4149
```

### 4.3 requirements.txt

```
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
google-auth>=2.23.0
google-auth-httplib2>=0.1.1
httpx>=0.25.0
pydantic>=2.0.0
```

### 4.4 main.py 核心逻辑

```python
import os, json, time
import fastapi
import httpx
from google.oauth2 import service_account
from google.auth.transport.requests import Request

app = fastapi.FastAPI()

# ── 模型路由表 ──────────────────────────────────────────────────
CLAUDE_MODELS = {
    # OpenAI 风格名称 → Vertex AI 模型 ID
    "claude-opus-4.7":    "claude-opus-4@20250514",
    "claude-opus-4.6":    "claude-opus-4@20250514",  # 同一基座
    "claude-sonnet-4.6":  "claude-sonnet-4-20250514",
    "claude-sonnet-4.5":  "claude-sonnet-4-5@20250603",
    "claude-haiku-4.5":   "claude-haiku-4-5@20250714",
}
GEMINI_MODELS = {
    # 2026-04 起统一使用当前稳定别名，避免落到已停用或预览版 ID。
    "gemini-2.5-pro":     "gemini-2.5-pro",
    "gemini-2.5-flash":   "gemini-2.5-flash",
    "gemini-2.0-flash":   "gemini-2.5-flash",
}

# ── Google OAuth2 token 管理 ────────────────────────────────────
_token_cache = {"token": None, "expires_at": 0}

def get_access_token():
    now = time.time()
    if _token_cache["token"] and _token_cache["expires_at"] - now > 60:
        return _token_cache["token"]
    creds = service_account.Credentials.from_service_account_file(
        os.environ["GCP_SERVICE_ACCOUNT_FILE"],
        scopes=["https://www.googleapis.com/auth/cloud-platform"]
    )
    creds.refresh(Request())
    _token_cache["token"] = creds.token
    _token_cache["expires_at"] = creds.expiry.timestamp()
    return creds.token

# ── 主接口：接受 OpenAI 格式，转发给 Vertex AI ──────────────────
@app.post("/v1/chat/completions")
async def chat(request: fastapi.Request):
    # 1. 鉴权
    auth = request.headers.get("Authorization", "")
    if auth != f"Bearer {os.environ['PROXY_API_KEY']}":
        raise fastapi.HTTPException(401, "Unauthorized")

    body = await request.json()
    model = body.get("model", "")
    project = os.environ["GCP_PROJECT_ID"]

    if model in CLAUDE_MODELS:
        # 转发给 Vertex AI Claude
        vertex_model = CLAUDE_MODELS[model]
        region = os.environ["GCP_REGION_CLAUDE"]
        url = (f"https://{region}-aiplatform.googleapis.com/v1/projects/{project}"
               f"/locations/{region}/publishers/anthropic/models/{vertex_model}:streamRawPredict")
        # Vertex AI Claude 接受标准 Anthropic Messages API 格式
        vertex_body = {
            "anthropic_version": "vertex-2023-10-16",
            "messages": body["messages"],
            "max_tokens": body.get("max_tokens", 8192),
            "stream": body.get("stream", False),
        }
        if "system" in body:
            vertex_body["system"] = body["system"]
        headers = {
            "Authorization": f"Bearer {get_access_token()}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(url, json=vertex_body, headers=headers)
        # 将 Anthropic 格式响应转换回 OpenAI 格式（略，实际约 40 行）
        return convert_anthropic_to_openai(resp.json(), model)

    elif model in GEMINI_MODELS:
        # 转发给 Vertex AI Gemini（接受 OpenAI 兼容格式，new-api 已处理）
        # 或直接用 Google AI API Key 方式走 new-api 原生渠道
        pass

    else:
        raise fastapi.HTTPException(400, f"Unknown model: {model}")
```

> 完整实现约 300 行，包含：格式转换、SSE 流式、错误处理、token 刷新。

### 4.5 PM2 部署

```bash
cd /opt/gcp-vertex-gateway
pip3 install -r requirements.txt
pm2 start "uvicorn main:app --host 0.0.0.0 --port 4149" --name gcp-4149
pm2 save
```

### 4.6 new-api 添加渠道

```bash
# 在服务器的 new-api SQLite 里插入渠道
INSERT INTO channels (type, name, key, base_url, models, status)
VALUES (
  1,                              -- 自定义渠道类型
  'GCP-Vertex-Claude',
  'gcp-internal-proxy-key',
  'http://172.17.0.1:4149',       -- Docker bridge
  'claude-opus-4.7,claude-sonnet-4.6,claude-haiku-4.5',
  1
);
```

---

## 五、数据库改动（CopilotAccount 表）

按照 MULTI_POOL_DESIGN.md 方案，追加 `poolType = 'gcp-vertex'`：

```typescript
// poolTypeConfig 新增一项（app/admin/copilot-accounts/page.tsx）
{ key: 'gcp-vertex', label: 'GCP Vertex AI', badge: 'bg-green-100 text-green-700' },

// 添加表单 select 新增选项
<option value="gcp-vertex">Google Cloud Vertex AI</option>
```

字段存储约定：
| 字段 | 内容 |
|------|------|
| `poolType` | `gcp-vertex` |
| `githubId` | GCP Project ID（如 `my-project-123`）|
| `token` | Service Account JSON（base64 编码存储）|

---

## 六、整体难度与工作量

| 步骤 | 难度 | 预估时间 |
|------|------|----------|
| 方案 A：Gemini API Key 接入 new-api | ⭐ 极低 | 30 分钟 |
| 方案 B：gcp-vertex-gateway 开发 | ⭐⭐⭐ 中等 | 1～2 天 |
| 数据库 poolType 字段扩展 | ⭐ 低 | 已在 MULTI_POOL_DESIGN.md 设计好 |
| SSE 流式输出适配（Claude on Vertex） | ⭐⭐⭐ 中等 | 包含在 gateway 开发内 |
| 多账号轮询（多个 GCP Project） | ⭐⭐ 低 | 复用 Copilot 的 round-robin 逻辑 |

**整体评估：可实现，方案 A 今天就能跑，方案 B 1～2 天完成。**

---

## 七、建议执行顺序

```
第一步（今天，30 分钟）：
  GCP Console 开启 Gemini API → 生成 API Key
  → new-api 添加 Google Gemini 渠道
  → 验证 gemini-2.5-flash 可调用
  → 消耗 $300 额度里的 Gemini 部分

第二步（可选，1～2 天）：
  GCP 创建 Service Account → 下载 JSON
  → 开发 gcp-vertex-gateway（Python FastAPI）
  → new-api 添加自定义渠道
  → 验证 Claude on Vertex 可调用

第三步（可选）：
  CardVela 管理后台追加 GCP 号池 Tab（按 MULTI_POOL_DESIGN.md 扩展）
```

---

## 八、与现有架构对比

| 项目 | Copilot 池 | Kiro 池 | GCP Vertex 池 |
|------|-----------|---------|--------------|
| 认证类型 | GitHub OAuth (ghu_xxx) | AWS Cognito Token | GCP Service Account JSON |
| Token 有效期 | 数小时，需刷新 | 数小时，需刷新 | 1 小时，自动刷新 |
| 费用模型 | 固定月费（账号订阅）| 固定月费 | 按量计费（消耗 $300） |
| 额度耗尽后 | 继续有效（下月重置）| 继续有效 | ⚠️ 变成实时扣费 |
| 自建 Gateway | copilot-api x6 | kiro-gateway | gcp-vertex-gateway（新建）|
| new-api 渠道 | ch2/4/5/6/8/9 | ch10 | ch11（建议）|
| 适合模型 | claude + gpt | claude + gpt | claude + gemini |
