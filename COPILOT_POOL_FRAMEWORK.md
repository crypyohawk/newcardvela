# Copilot账号池 + 智能负载均衡 完整框架设计

## 概述
本方案旨在通过账号池实现每月200-500美元支撑10-30人重度Claude Opus使用。核心是新建独立网关（号池），将Copilot API转化为标准API形式，链接到现有new-api系统，实现透明负载均衡。

**目标**：每月1600-2400次Opus调用，成本低至200美元/月，支持企业级使用。

## 整体架构
```
[客户端工具] → [独立网关 (8080端口)] → [Copilot API实例池] → [格式转换] → [new-api网关] → [cardvela用户端]
↑
[管理后台] → [Prisma DB (账号池)]
```
- **独立网关**：新建`copilot-gateway/`目录，Node.js微服务，监听8080端口，提供隔离链接`http://yourdomain.com:8080/v1/chat/completions`。
- **账号池**：通过管理后台管理，网关动态拉取。
- **转化逻辑**：Copilot原生响应 → OpenAI兼容格式 → new-api处理 → 用户。

## 核心模块
1. **数据库扩展**：Prisma `CopilotAccount`表。
2. **管理后台**：`app/admin/copilot-accounts/page.tsx`，CRUD账号。
3. **自动化脚本**：`scripts/copilot-account-setup.py`，批量注册绑卡。
4. **Copilot实例池**：Docker Compose启动多个容器。
5. **独立网关**：`copilot-gateway/`，核心转化逻辑。
6. **链接new-api**：网关POST转换后数据到new-api。

## 执行步骤（分阶段）
### 阶段1：基础搭建（1-2天）
1. 编辑`prisma/schema.prisma`，添加CopilotAccount模型。
2. 运行`npx prisma db push`。
3. 创建`app/admin/copilot-accounts/page.tsx`和API路由。
4. 测试：手动添加账号，验证列表。

### 阶段2：自动化脚本（2-3天）
1. 创建`scripts/copilot-account-setup.py`。
2. 安装依赖：`pip install playwright requests`。
3. 测试：创建1个账号，验证DB写入。

### 阶段3：实例池部署（1天）
1. 创建`docker-compose.copilot.yml`。
2. 写`scripts/start-copilot-pool.sh`。
3. 运行`bash scripts/start-copilot-pool.sh`。

### 阶段4：网关实现（2-3天）
1. 创建`copilot-gateway/`目录。
2. 实现转化逻辑（见下文）。
3. 部署：`docker-compose up -d`。
4. 测试：Postman调用隔离链接。

### 阶段5：集成测试（1周）
1. 全池测试，验证负载均衡。
2. 监控额度，报警。

## 详细逻辑：号池转化API + 链接new-api
这是核心部分，你没有经验的部分。号池（账号列表）通过网关转化为API形式：网关作为代理，将客户端请求转发到最佳Copilot实例，获取响应，转换格式，然后链接到new-api进行后续处理。

### 1. 号池管理
- **数据源**：账号存储在cardvela DB，通过API `/api/admin/copilot-accounts`拉取。
- **选择逻辑**：网关启动时缓存账号列表，每分钟刷新。选择标准：剩余额度 > 20%，无rate-limit，最近使用时间最旧。

### 2. API转化过程
- **输入**：客户端POST `/v1/chat/completions` (OpenAI格式)。
- **步骤**：
  1. **账号选择**：从池子选最佳账号。
  2. **转发到Copilot**：将请求body转发到`http://copilot-{id}:4141/v1/chat/completions`。Copilot返回Anthropic格式响应，如：
     ```json
     {
       "content": "Hello world",
       "usage": {"input_tokens": 10, "output_tokens": 20}
     }
     ```
  3. **格式转换**：转为OpenAI兼容格式（new-api期望）：
     ```json
     {
       "choices": [{"message": {"content": "Hello world"}}],
       "usage": {"prompt_tokens": 10, "completion_tokens": 20}
     }
     ```
  4. **链接new-api**：POST转换后数据到`http://localhost:3000/api/user/ai-service`，让new-api处理扣费/日志/用户验证。
  5. **返回**：new-api响应返回客户端。
- **代码示例**（网关`src/index.js`）：
  ```javascript
  app.post('/v1/chat/completions', async (req, res) => {
    const accounts = await axios.get('http://localhost:3000/api/admin/copilot-accounts'); // 拉账号
    const best = selectBest(accounts.data); // 选择逻辑
    const copilotRes = await axios.post(`http://copilot-${best.id}:4141/v1/chat/completions`, req.body);
    const converted = convertFormat(copilotRes.data); // 转换
    const newApiRes = await axios.post('http://localhost:3000/api/user/ai-service', converted); // 链接new-api
    res.json(newApiRes.data);
  });
  ```

### 3. 链接new-api细节
- **为什么链接**：复用new-api的扣费、日志、用户管理，避免重复开发。
- **数据传递**：转换后JSON直接POST，确保new-api能解析（假设支持OpenAI格式）。
- **同步**：网关不直接扣费，只传递数据；new-api处理后，网关可选通过API更新池子额度。
- **隔离**：网关和new-api在同一服务器，但独立进程，避免耦合。

## 风险控制
- **风控**：注册间隔3秒，代理池。
- **监控**：日志记录失败，额度报警。
- **备份**：20%冷备账号。

## 成本估算
- 开发：人力1-2周。
- 运营：200美元/月，支持1600次调用。

## 下一步
按阶段执行，从基础搭建开始。需要代码实现时，告诉我具体模块。



服务器上的运行架构：

copilot-api 实例1 (port 4141, 账号A的token)  ──┐
copilot-api 实例2 (port 4142, 账号B的token)  ──┼──→  new-api (port 3001)  ──→  用户 sk-xxx
copilot-api 实例3 (port 4143, 账号C的token)  ──┘        ↑
                                                    每个实例注册为一个"渠道"

                                                    ✅ 添加Copilot账号 (本地测试)
✅ 同步到new-api (创建渠道)
🔄 配置AI服务商 (在CardVela中)
🔄 测试完整调用链
🔄 服务器部署