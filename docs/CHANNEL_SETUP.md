# new-api 渠道配置参考

下次创建新渠道时直接复制 `Models` / `Model Mapping` 字段即可。
价格倍率请在 new-api **「设置 → 倍率管理 → 分组倍率」** 里配置。

---

## Copilot 池 (`cardvela` 分组)

- **Base URL**：`http://172.17.0.1:414X`（每个 copilot 账号一个端口，4141~4146）
- **Type**：`OpenAI`
- **Auth**：`api-key-cardvela-pool`（pool 内部固定 key）

### Models

```
claude-opus-4.7,claude-sonnet-4.6,claude-haiku-4.5,gpt-5.5,gpt-5.4,gpt-5.2-codex,gpt-5-mini,gpt-4o,gpt-4o-mini,gpt-4o-mini-2024-07-18,gpt-4o-2024-11-20,gpt-4o-2024-08-06,gpt-4o-2024-05-13,gpt-4-o-preview,gpt-4.1,gpt-4.1-2025-04-14,gpt-41-copilot,gpt-4,gpt-4-0613,gpt-4-0125-preview,gpt-3.5-turbo,gpt-3.5-turbo-0613,gemini-3.1-pro-preview,grok-code-fast-1,minimax-m2.5,raptor-mini-tertiary,oswe-vscode-prime,oswe-vscode-secondary,text-embedding-3-small,text-embedding-3-small-inference,text-embedding-3-small-2,text-embedding-ada-002,claude-opus-4-7,claude-sonnet-4-6,claude-haiku-4-5,gpt-5-5,gpt-5-4,gpt-5-2-codex,gpt-4-1,gpt-4-1-2025-04-14,gemini-3-1-pro-preview,claude-3.7-sonnet,claude-3-7-sonnet-20250219,claude-3-7-sonnet-latest,claude-3-5-sonnet-20241022,claude-3-5-sonnet-latest,claude-3.5-sonnet,claude-3-5-haiku-20241022,claude-3-5-haiku-latest,claude-3.5-haiku,claude-3-haiku-20240307,claude-3-opus-20240229,claude-3-opus-latest,claude-3.5-opus
```

### Model Mapping

> 只做命名格式兼容（短横线 ↔ 点号），以及把旧版 Claude 名字映射到 copilot 当前最新版本。

```json
{
  "claude-opus-4-7": "claude-opus-4.7",
  "claude-sonnet-4-6": "claude-sonnet-4.6",
  "claude-haiku-4-5": "claude-haiku-4.5",
  "gemini-3-1-pro-preview": "gemini-3.1-pro-preview",
  "gpt-4-1": "gpt-4.1",
  "gpt-4-1-2025-04-14": "gpt-4.1-2025-04-14",
  "gpt-5-2-codex": "gpt-5.2-codex",
  "gpt-5-4": "gpt-5.4",
  "gpt-5-5": "gpt-5.5",
  "claude-3.7-sonnet": "claude-sonnet-4.6",
  "claude-3-7-sonnet-20250219": "claude-sonnet-4.6",
  "claude-3-7-sonnet-latest": "claude-sonnet-4.6",
  "claude-3-5-sonnet-20241022": "claude-sonnet-4.6",
  "claude-3-5-sonnet-latest": "claude-sonnet-4.6",
  "claude-3.5-sonnet": "claude-sonnet-4.6",
  "claude-3-5-haiku-20241022": "claude-haiku-4.5",
  "claude-3-5-haiku-latest": "claude-haiku-4.5",
  "claude-3.5-haiku": "claude-haiku-4.5",
  "claude-3-haiku-20240307": "claude-haiku-4.5",
  "claude-3-opus-20240229": "claude-opus-4.7",
  "claude-3-opus-latest": "claude-opus-4.7",
  "claude-3.5-opus": "claude-opus-4.7"
}
```

- **分组倍率**：`cardvela = 1.0`

---

## Perplexity 池 (`perplexity-pool` 分组)

- **Base URL**：`http://172.17.0.1:4150`（pplx-proxy 服务）
- **Type**：`OpenAI`
- **Auth**：`pplx-pool-internal-4150`

### pplx-proxy 实际支持的模型

> ⚠️ **以 `/v1/models` 端点返回为准**。下表基于当前 **Perplexity Pro** 订阅。
> 升级到 **Max** 套餐后会新增 `opus`、`gpt5_5` 等模型，到时候在下面 Models / Mapping 里追加即可。

| 原始名 | 实际后端 | mode | pref |
|--------|----------|------|------|
| `auto` | 智能路由 | auto | pplx_pro |
| `sonar` | Sonar (实验) | auto | experimental |
| `gpt` | GPT-5.4 | pro | gpt54 |
| `gemini` | Gemini 3.1 Pro High | pro | gemini31pro_high |
| `sonnet` | Claude 4.6 Sonnet | pro | claude46sonnet |
| `nemotron` | NV Nemotron 3 Super | pro | nv_nemotron_3_super |

> 验证命令：
> ```bash
> curl -s -H 'Authorization: Bearer pplx-pool-internal-4150' http://172.17.0.1:4150/v1/models
> ```

### Models

```
auto,sonar,gpt,gemini,sonnet,nemotron,pplx-auto,pplx-sonar,pplx-gpt,pplx-gemini,pplx-sonnet,pplx-nemotron
```

### Model Mapping

> 只做 `pplx-` 前缀别名（让用户看出是 perplexity 渠道）。
> **不做跨模型掺假映射**——pplx 不支持的模型让它直接报错，避免计费混乱和用户体验欺骗。

```json
{
  "pplx-auto": "auto",
  "pplx-sonar": "sonar",
  "pplx-gpt": "gpt",
  "pplx-gemini": "gemini",
  "pplx-sonnet": "sonnet",
  "pplx-nemotron": "nemotron"
}
```

- **分组倍率**：`perplexity-pool = 1.0`

### 升级到 Max 套餐后追加新模型

1. `curl /v1/models` 确认新增哪些模型 id（如 `opus`、`gpt5_5`）
2. 编辑 [scripts/channel-15-patch.json](../scripts/channel-15-patch.json)，在 `models` 末尾追加新名字
3. 如果存在命名格式差异（`claude-opus-4.7` ↔ `claude-opus-4-7`），追加到 `model_mapping`
4. 执行：
   ```bash
   scp scripts/channel-15-patch.json root@23.106.142.166:/tmp/
   ssh root@23.106.142.166 'bash /tmp/update-channel-15.sh'
   ```

---

## 横向扩容（添加新的 Perplexity 账号）

1. pplx-proxy 配置里新增账号（端口往后排：4151、4152…）
2. PM2 启动新 worker：`pm2 start pplx-proxy --name pplx-4151 -- --port 4151`
3. new-api 后台「渠道管理 → 添加渠道」：
   - Name：`pplx-<账号名>`
   - Base URL：`http://172.17.0.1:4151`
   - Group：`perplexity-pool`（与现有渠道同分组，自动负载均衡）
   - Models / Model Mapping：复制本文件 Perplexity 部分
4. 测试通过后启用，new-api 会按权重在所有 perplexity-pool 渠道间轮询

> ✅ 用户侧无需任何改动：同一个 key、同一个分组、自动负载均衡。
> ✅ 是的，后期只需要不断添加 Perplexity Max 账号即可，无需改代码。

---

## 倍率说明

- **模型倍率**（按模型）：`设置 → 模型倍率`，按官方 token 价配置
- **分组倍率**（按分组）：用户最终扣费 = `模型倍率 × 分组倍率`
- 当前 cardvela / perplexity-pool 都设 `1.0`：
  - cardvela：用户按 token 实时扣 aiBalance
  - perplexity-pool：已支付月费订阅，扣费仅记账（从订阅 quota 扣减）
