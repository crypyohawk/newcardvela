# 多号池支持方案（poolType 字段）

> 目标：在现有 Copilot 号池基础上，新增 Kiro 号池，两类账号共用同一管理页面。
> 业务逻辑（new-api 路由、计费、Key 系统）**完全不变**。
> 后续新增其它号池类型，照同一模式扩展即可。

---

## 一、改动文件清单

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| `prisma/schema.prisma` | ⚠️ 数据库迁移 | 新增 `poolType` 字段 |
| `app/api/admin/copilot-accounts/route.ts` | 后端逻辑 | GET 支持 ?poolType 过滤，POST 接收 poolType |
| `app/admin/copilot-accounts/page.tsx` | 前端 UI | 分组 Tab、表单类型选择、行标签 |
| `src/lib/copilotPool.ts` | 工具函数（可选） | 容量查询支持按类型过滤 |

---

## 二、各文件具体改动

### 1. `prisma/schema.prisma`

在 `CopilotAccount` 模型中，**在 `id` 字段后、`githubId` 字段前** 插入一行：

```prisma
// 改前：
model CopilotAccount {
  id              String   @id @default(cuid())
  githubId        String   // GitHub账号ID
  token           String   // ghu_开头的token
  ...
  @@index([status])
}

// 改后：
model CopilotAccount {
  id              String   @id @default(cuid())
  poolType        String   @default("copilot") // copilot | kiro | (可扩展)
  githubId        String   // 账号标识（copilot 填 GitHub ID，kiro 填邮箱/账号名）
  token           String   // Auth token（copilot: ghu_xxx，kiro: AWS token 等）
  ...
  @@index([status])
  @@index([poolType])
}
```

**数据安全说明**：`@default("copilot")` 保证所有现有行自动赋值 `poolType = 'copilot'`，无需手动迁移。

**执行命令**（在服务器上 /opt/cardvela 目录执行）：
```bash
npx prisma db push
```

---

### 2. `app/api/admin/copilot-accounts/route.ts`

**GET 函数**（约第 14 行的 `try {` 之后）新增过滤逻辑：

```typescript
// 改前：
    // 第一遍：取出账号做一致性修复
    const rawAccounts = await prisma.copilotAccount.findMany({
      orderBy: { githubId: 'asc' },
    });

// 改后（在 try { 后加两行，替换 findMany）：
    // 支持按 poolType 过滤
    const { searchParams } = new URL(request.url);
    const poolTypeFilter = searchParams.get('poolType');
    const whereFilter = poolTypeFilter ? { poolType: poolTypeFilter } : {};

    // 第一遍：取出账号做一致性修复
    const rawAccounts = await prisma.copilotAccount.findMany({
      where: whereFilter,
      orderBy: { githubId: 'asc' },
    });
```

同一 GET 函数中还有一处 `findMany`（修复后重新查询，约第 90 行），也要加 `where: whereFilter`：

```typescript
// 改前：
    const accounts = repaired
      ? await prisma.copilotAccount.findMany({ orderBy: { githubId: 'asc' } })
      : rawAccounts;

// 改后：
    const accounts = repaired
      ? await prisma.copilotAccount.findMany({ where: whereFilter, orderBy: { githubId: 'asc' } })
      : rawAccounts;
```

**POST 函数**（约第 115 行）接收 poolType：

```typescript
// 改前：
    const { githubId, token, quotaLimit = 10 } = body;

    if (!githubId || !token) {
      return NextResponse.json({ error: 'GitHub ID和token必填' }, { status: 400 });
    }

    const account = await prisma.copilotAccount.create({
      data: {
        githubId,
        token,
        quotaLimit: parseFloat(quotaLimit)
      }
    });

// 改后：
    const { githubId, token, quotaLimit = 10, poolType = 'copilot' } = body;

    if (!githubId || !token) {
      return NextResponse.json({ error: '账号 ID 和 token 必填' }, { status: 400 });
    }

    const account = await prisma.copilotAccount.create({
      data: {
        poolType,
        githubId,
        token,
        quotaLimit: parseFloat(quotaLimit)
      }
    });
```

---

### 3. `app/admin/copilot-accounts/page.tsx`

共 5 处改动：

#### 3.1 Interface 新增字段（约第 8 行）

```typescript
// 改前：
interface CopilotAccount {
  id: string;
  githubId: string;

// 改后：
interface CopilotAccount {
  id: string;
  poolType: string;
  githubId: string;
```

#### 3.2 State 新增（约第 55 行的 useState 区域）

```typescript
// 改前：
  const [showAddForm, setShowAddForm] = useState(false);
  const [bindingAccountId, setBindingAccountId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    githubId: '',
    token: '',
    quotaLimit: 10
  });

// 改后：
  const [showAddForm, setShowAddForm] = useState(false);
  const [activePoolType, setActivePoolType] = useState<string>('all'); // 当前选中的 Tab
  const [bindingAccountId, setBindingAccountId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    poolType: 'copilot',
    githubId: '',
    token: '',
    quotaLimit: 10
  });
```

#### 3.3 重置表单时带上 poolType（约 handleAddAccount 的 setFormData）

```typescript
// 改前：
        setFormData({ githubId: '', token: '', quotaLimit: 10 });

// 改后：
        setFormData({ poolType: 'copilot', githubId: '', token: '', quotaLimit: 10 });
```

#### 3.4 统计计算 + Tab 数据（在 idleCount 等计算的上方）

```typescript
// 改前：
  // 用 boundAiKeyId 判断是否已绑定（比 status 字段更可靠）
  const idleCount = accounts.filter(a => !a.boundAiKeyId && ...

// 改后：
  // 当前 Tab 显示的账号列表
  const filteredAccounts = activePoolType === 'all'
    ? accounts
    : accounts.filter(a => a.poolType === activePoolType);

  // 统计基于当前筛选后的列表
  const idleCount = filteredAccounts.filter(a => !a.boundAiKeyId && a.status !== 'inactive' && a.status !== 'error' && a.status !== 'quota_exhausted').length;
  const boundCount = filteredAccounts.filter(a => a.boundAiKeyId).length;
  const syncedCount = filteredAccounts.filter(a => a.newApiChannelId).length;
  const errorCount = filteredAccounts.filter(a => a.status === 'error').length;
  const exhaustedCount = filteredAccounts.filter(a => a.status === 'quota_exhausted').length;
  const totalQuotaUsed = filteredAccounts.reduce((sum, a) => sum + a.quotaUsed, 0);

  // 各类型账号数（用于 Tab 徽标）
  const poolTypeConfig = [
    { key: 'all',     label: '全部',           badge: 'bg-gray-100 text-gray-700' },
    { key: 'copilot', label: 'GitHub Copilot', badge: 'bg-blue-100 text-blue-700' },
    { key: 'kiro',    label: 'Amazon Kiro',    badge: 'bg-orange-100 text-orange-700' },
  ];
  const countByType: Record<string, number> = { all: accounts.length };
  for (const a of accounts) {
    countByType[a.poolType] = (countByType[a.poolType] ?? 0) + 1;
  }
```

同时修改后面 `boundChannelIds` 和表格循环的 `accounts` → `filteredAccounts`：

```typescript
// 改前：
  const boundChannelIds = accounts.filter(a => a.newApiChannelId).map(a => a.newApiChannelId!);
...
              {accounts.map((account) => (

// 改后：
  const boundChannelIds = filteredAccounts.filter(a => a.newApiChannelId).map(a => a.newApiChannelId!);
...
              {filteredAccounts.map((account) => (
```

#### 3.5 JSX 区域改动

**A. 标题改名**（return 内，约第 310 行）：
```tsx
// 改前：
            <h1 className="text-2xl font-bold">Copilot 账号池管理</h1>

// 改后：
            <h1 className="text-2xl font-bold">AI 账号池管理</h1>
```

**B. 标题下方加 Tab 栏**（在 `</div>` 关闭标题 div 之后、`<div className="flex gap-2">` 按钮区之前，作为独立元素插在标题行下方）：

```tsx
        {/* 类型 Tab */}
        <div className="flex gap-1 mt-4 border-b border-gray-200">
          {poolTypeConfig.map(({ key, label, badge }) => (
            <button
              key={key}
              onClick={() => setActivePoolType(key)}
              className={`px-4 py-2 text-sm rounded-t transition-colors ${
                activePoolType === key
                  ? 'border border-b-white border-gray-200 bg-white font-semibold -mb-px'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
              {countByType[key] !== undefined && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${badge}`}>
                  {countByType[key] ?? 0}
                </span>
              )}
            </button>
          ))}
        </div>
```

**C. 表格表头加"类型"列**（在 `<th>GitHub ID</th>` 之后）：

```tsx
// 改前：
                <th className="px-4 py-3 text-left">GitHub ID</th>
                <th className="px-4 py-3 text-left">状态</th>

// 改后：
                <th className="px-4 py-3 text-left">账号 ID</th>
                <th className="px-4 py-3 text-left">类型</th>
                <th className="px-4 py-3 text-left">状态</th>
```

**D. 表格行加类型徽标列**（在显示 `account.githubId` 的 `<td>` 之后）：

```tsx
// 改前：
                  <td className="px-4 py-3">{account.githubId}</td>
                  <td className="px-4 py-3">

// 改后：
                  <td className="px-4 py-3 font-mono text-sm">{account.githubId}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      account.poolType === 'kiro'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {account.poolType === 'kiro' ? 'Kiro' : 'Copilot'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
```

**E. 添加表单加类型选择器**（在 GitHub ID 输入框之前）：

```tsx
// 在 <h2>添加新账号</h2> 之后、GitHub ID div 之前，插入：
              <div>
                <label className="block text-sm font-medium mb-1">号池类型</label>
                <select
                  value={formData.poolType}
                  onChange={(e) => setFormData({...formData, poolType: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  <option value="copilot">GitHub Copilot</option>
                  <option value="kiro">Amazon Kiro</option>
                </select>
              </div>
```

同时，GitHub ID 输入框的 label 文字改为：
```tsx
// 改前：
                <label className="block text-sm font-medium mb-1">GitHub ID</label>

// 改后：
                <label className="block text-sm font-medium mb-1">账号 ID（Copilot 填 GitHub 用户名，Kiro 填邮箱）</label>
```

---

### 4. `src/lib/copilotPool.ts`（可选增强，不影响功能）

给 `getCopilotPoolCapacity` 加可选 `poolType` 参数，管理员统计页可以按类型查容量：

```typescript
// 改前：
export async function getCopilotPoolCapacity(): Promise<{...}> {
  const [totalAccounts, healthyAccounts, ...] = await Promise.all([
    db.copilotAccount.count(),
    db.copilotAccount.count({ where: { status: { in: ['active', 'bound'] } } }),

// 改后：
export async function getCopilotPoolCapacity(poolType?: string): Promise<{...}> {
  const typeFilter = poolType ? { poolType } : {};
  const [totalAccounts, healthyAccounts, ...] = await Promise.all([
    db.copilotAccount.count({ where: typeFilter }),
    db.copilotAccount.count({ where: { ...typeFilter, status: { in: ['active', 'bound'] } } }),
```

---

## 三、执行顺序

```
1. 本地修改 prisma/schema.prisma
2. 本地修改三个代码文件
3. SCP 上传所有改动到服务器
4. 服务器执行：
   cd /opt/cardvela
   npx prisma db push      ← 加字段（幂等，安全）
   npm run build
   pm2 restart cardvela
5. 验证：管理后台 → AI 账号池管理 → 能看到 Tab 和类型列
```

---

## 四、风险与影响评估

| 项目 | 风险等级 | 说明 |
|------|----------|------|
| 数据库 `db push` | 🟢 低 | 纯加字段，有 default，零停机 |
| 现有 Copilot 账号 | 🟢 无影响 | 全部自动赋值 `poolType='copilot'` |
| new-api 路由 | 🟢 无影响 | 路由逻辑完全没变 |
| 用户侧 Key 系统 | 🟢 无影响 | 计费/绑定逻辑完全没变 |
| 前端 UI | 🟡 中 | 页面有改动，需测试 Tab 切换、添加流程 |

---

## 五、未来扩展方式

后续要加第三种类型（如 `cursor`）：
1. 在 `poolTypeConfig` 数组里追加一项 `{ key: 'cursor', label: 'Cursor', badge: '...' }`
2. 在添加表单的 `<select>` 里追加一个 `<option value="cursor">Cursor</option>`
3. 数据库不用动（poolType 是自由字符串，无枚举约束）

---

## 六、暂不需要改的文件

- `app/api/admin/copilot-accounts/[id]/route.ts` — PATCH/DELETE 不需要感知 poolType
- `app/api/admin/copilot-accounts/sync/route.ts` — 同步逻辑不受影响
- `src/lib/cardOpening.ts` — Key 分配逻辑不受影响
- 所有用户端 API — 完全无影响
