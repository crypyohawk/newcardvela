# Cardvela 首页 Hero 升级设计方案

> 把 `app/page.tsx` 当前实用型首屏（虚拟卡示意 + 服务列表）升级为「高级 / 科技 / 先进」的**一站式 AI 出海服务平台**主视觉。
> 一眼传达三大核心：**虚拟卡支付 · AI 订阅教程 · 智能聚合中转（Claude / gpt/ Gemini / Grok / ）**

---

## 1. 设计定位

| 维度 | 旧首页 | 新 Hero |
|------|--------|---------|
| 风格 | Fintech 工具感（亮配色 + 卡片堆叠） | 深空黑 + 霓虹渐变，AI 公司级科幻感 |
| 价值主张 | "一卡解决海外支付" | "AI 出海，一站通全球" |
| 视觉重心 | 单张静态虚拟卡 | 3D 浮动虚拟卡 + AI 模型 logo 环绕 + 神经网络背景 |
| 用户认知 | 卖虚拟卡的 | 解锁全球顶级 AI 的一站式平台 |
| 传播性 | 弱 | 标题截图即可分享，SEO 关键词更聚焦 |

Claude.ai 着陆页、Vercel / Linear 风格。

---

## 2. 配色系统（Tailwind 可直用）

```ts
// tailwind.config.js extend.colors
const palette = {
  bg: {
    deep: '#05060A',      // 主背景（接近纯黑，但带蓝调）
    panel: '#0B0D14',     // 卡片底
    glass: 'rgba(20,22,32,0.6)', // 玻璃拟态
  },
  neon: {
    cyan: '#22D3EE',      // 主强调（青蓝）
    violet: '#8B5CF6',    // 副强调（紫）
    pink: '#EC4899',      // 高光点缀
    lime: '#A3E635',      // 成功 / 数据感
  },
  text: {
    primary: '#F4F5F7',
    secondary: '#9AA3B2',
    muted: '#5F6675',
  },
};
```

**核心渐变**（Hero 大标题 / CTA / 描边）：
```css
/* 主渐变：青→紫→粉 */
background: linear-gradient(135deg, #22D3EE 0%, #8B5CF6 50%, #EC4899 100%);

/* 文字光晕（标题用） */
text-shadow: 0 0 24px rgba(139, 92, 246, 0.45), 0 0 48px rgba(34, 211, 238, 0.25);

/* 玻璃拟态边框 */
border: 1px solid rgba(255,255,255,0.08);
backdrop-filter: blur(16px);
```

---

## 3. Hero 区块结构（首屏 100vh，最低 720px）

### 3.1 整体布局（桌面端）

```
┌──────────────────────────────────────────────────────────────┐
│  [顶部导航 透明 + blur]    Logo  | 产品 教程 定价 文档 | 登录 注册 │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ⚡ 已服务 10 万+ 用户        (badge)                         │
│                                                              │
│  AI 出海，一站通全球                  ┌─────────────────┐    │
│  (96px Bold，渐变 + 光晕)              │  3D 浮动虚拟卡   │    │
│                                       │  + AI logo 环绕  │    │
│  虚拟卡支付 · AI 订阅教程 · 聚合中转   │  + 粒子流动      │    │
│  3 分钟开卡 · USDT/支付宝/微信/银行卡   └─────────────────┘    │
│  稳定解锁 ChatGPT · Claude ·          │                       │
│  Perplexity · Grok · Gemini           AI 图标轨道：           │
│                                       OpenAI Anthropic       │
│  [免费注册 · 立即开卡]  [查看教程 →]       │
│   主 CTA（渐变发光）   次 CTA（玻璃）   xAI  Cursor  MJ        │
│                                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                       │
│  │💳 虚拟卡 │  │📚 教程   │  │🔀 聚合中转│                      │
│  │全球订阅  │  │一步到位 │  │一键 Key  │                      │
│  │零障碍    │  │开 Pro/Max│  │稳定运行 │                      │
│  └─────────┘  └─────────┘  └─────────┘                       │
│                                                              │
│  ▼ scroll                                                   │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 移动端

- 单列，标题 → 副标题 → 3D 卡（缩到 70%，居中）→ CTA → 三亮点（横滑或纵向堆叠）
- 标题缩到 56px / 48px 两档断点
- 取消粒子动画（性能 + 流量）

---

## 4. 文案（最终定稿）

### 顶部 Badge
```
⚡ 已服务 10 万+ 用户 · 解锁全球顶级 AI
```

### 主标题
```
AI 出海，一站通全球
```
> 96px (lg:text-8xl) / 64px (md) / 48px (sm)，font-weight 800，渐变填充 + 微光晕。
> 可考虑给"AI"两字单独加发光 + 闪烁光标动画。

### 副标题（两行）
```
虚拟卡支付  ·  AI 订阅教程  ·  智能聚合中转
3 分钟开卡 · USDT / 支付宝 / 微信 / 银行卡 · 稳定解锁 ChatGPT · Claude ·  · Grok · Gemini
```
> 第一行：text-xl，分隔符用 `·`，关键词加 `text-neon-cyan`。
> 第二行：text-base，`text-text-secondary`。

### CTA 按钮（双按钮）

| 按钮 | 文案 | 样式 | 链接 |
|------|------|------|------|
| 主 CTA | `免费注册 · 立即开卡` | 渐变背景（cyan→violet），白字，圆角 9999，hover 时光晕扩散 | `/register` |
| 次 CTA | `查看 AI 出海教程 →` | 玻璃拟态边框，白字，hover 时填充 5% 白 | `/guide` |

### 信任栏（CTA 下方一行小字）
```
支持 ChatGPT · Claude ·  · Midjourney · Cursor · Suno · Runway 等 50+ 顶级 AI 服务
```

### 三大功能亮点卡（CTA 下方）

| 图标 | 标题 | 描述 | 跳转 |
|------|------|------|------|
| 💳 (或 lucide `CreditCard`) | **虚拟卡 · 全球订阅零障碍** | 1 张 BIN 真实卡，覆盖 200+ 国家订阅，3 分钟开卡 | `/dashboard` 开卡 |
| 📚 (或 `BookOpen`) | **AI 订阅教程 · 一步到位** | 手把手教学开通 ChatGPT Plus / Claude Max /  | `/guide` |
| 🔀 (或 `Network`) | **智能聚合中转 · 一键 Key** | 一个 API Key 接入 OpenAI / Claude / Gemini /| `/dashboard/ai` |

每张卡片 hover：边框从 8% 白 → 渐变描边，背景 noise 微显，icon 轻微浮起。

---

## 5. 视觉与动画细节

### 5.1 背景层（z-0）
- **基础**：`bg-bg-deep`（#05060A）
- **径向光斑**：左上 `rgba(34,211,238,0.15)` 1200px 模糊，右下 `rgba(139,92,246,0.18)`
- **网格**：`backgroundImage: linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px); background-size: 56px 56px;` + 径向 mask（中心透明，边缘渐隐）
- **粒子流动**（可选 lite 版）：使用 `tsparticles` 或自写 canvas，30~50 个粒子，缓慢 drift，连线 < 120px 时显示淡青色连线
- **降级**：`prefers-reduced-motion` 或移动端关闭粒子

### 5.2 主视觉层（z-10）
**3D 浮动虚拟卡**：
- 用 CSS `perspective: 1000px` + `transform: rotateY(-18deg) rotateX(8deg)`
- 持续 `@keyframes float` 上下浮动 6px / 6s
- 鼠标 hover（桌面）→ 跟随光标 tilt（max 15°），可用 `vanilla-tilt.js` 或自写 mousemove
- 卡面：玻璃拟态 + 微噪点 + 右上 Visa/Mastercard logo + BIN 号脱敏 + 持卡人「CARDVELA USER」+ 全息渐变条
- 边缘高光：`box-shadow: 0 30px 80px -20px rgba(34,211,238,0.4), inset 0 0 1px rgba(255,255,255,0.5)`

**AI 图标轨道**：
- 卡片周围围绕 6~8 个 AI 服务 logo（OpenAI / Anthropic / Google / Perplexity / xAI / Cursor / Midjourney / Suno）
- 圆形轨道，缓慢公转（80s/圈），各 logo 自身反向自转保持正向
- 每个 logo 用 `bg-glass + border-white/8 + rounded-2xl` 包裹，hover 时高亮
- 中心连线：从卡片向各 logo 发出淡青色脉冲光线（可选 SVG `stroke-dasharray` 动画）

### 5.3 文字层（z-20）
- 主标题用 `bg-clip-text text-transparent` + 上述渐变
- 入场动画：`opacity: 0 → 1` + `translateY(24px → 0)`，错峰 100ms
- 副标题打字机效果（可选，仅桌面）：在 ChatGPT / Claude / Perplexity 等关键词上做"AI 模型轮播"

### 5.4 滚动指引（底部）
- 极简 `↓` + 微弹跳动画 + `text-text-muted`，不喧宾夺主

---

## 6. 推荐技术实现

### 6.1 依赖建议（按需选择）
```json
{
  "framer-motion": "^11.x",         // 入场 + hover 动画
  "lucide-react": "^0.x",           // 图标
  "tsparticles-slim": "^3.x",       // 粒子（可选，包体重则用纯 canvas）
  "@react-three/fiber": "^8.x",     // 如果走真 3D 卡片（可选；CSS 3D 已够用）
  "vanilla-tilt": "^1.x"            // 鼠标 tilt（轻量）
}
```
> 推荐路径：**纯 CSS + Framer Motion + 极简 canvas 粒子**，不引入 three.js，确保首屏 < 200KB JS。

### 6.2 文件结构建议
```
app/
  page.tsx                          # 改为 import 下面组件
  (marketing)/                      # 新建营销组件目录
    _components/
      Hero.tsx                      # 主入口
      HeroBackground.tsx            # 网格 + 光斑 + 粒子
      HeroCard3D.tsx                # 3D 虚拟卡 + 轨道
      HeroAIOrbit.tsx               # AI logo 公转轨道
      HeroFeatureCards.tsx          # 三大亮点卡
      HeroCTA.tsx                   # 双 CTA 按钮
      ScrollHint.tsx                # 底部滚动指引
public/
  brand/
    openai.svg
    anthropic.svg
    google.svg
    perplexity.svg
    xai.svg
    cursor.svg
    midjourney.svg
    suno.svg
```

### 6.3 关键代码骨架
```tsx
// app/(marketing)/_components/Hero.tsx
'use client';
import { motion } from 'framer-motion';
import HeroBackground from './HeroBackground';
import HeroCard3D from './HeroCard3D';
import HeroFeatureCards from './HeroFeatureCards';
import HeroCTA from './HeroCTA';

export default function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-[#05060A] text-white">
      <HeroBackground />
      <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center px-6 pt-32 pb-16 lg:flex-row lg:gap-12 lg:pt-40">
        {/* 左：文案 + CTA */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex-1"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-cyan-300 backdrop-blur">
            ⚡ 已服务 10 万+ 用户 · 解锁全球顶级 AI
          </span>
          <h1 className="mt-6 bg-gradient-to-br from-cyan-300 via-violet-400 to-pink-400 bg-clip-text text-5xl font-extrabold leading-[1.05] text-transparent md:text-7xl lg:text-8xl">
            AI 出海，<br />一站通全球
          </h1>
          <p className="mt-6 text-lg text-slate-300 md:text-xl">
            <span className="text-cyan-300">虚拟卡支付</span> · <span className="text-violet-300">AI 订阅教程</span> · <span className="text-pink-300">智能聚合中转</span>
          </p>
          <p className="mt-3 text-sm text-slate-400 md:text-base">
            3 分钟开卡 · USDT / 支付宝 / 微信 / 银行卡 · 稳定解锁 ChatGPT · Claude · Perplexity · Grok · Gemini
          </p>
          <HeroCTA />
        </motion.div>
        {/* 右：3D 卡 + AI 轨道 */}
        <div className="flex-1">
          <HeroCard3D />
        </div>
      </div>
      {/* 三大亮点 */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <HeroFeatureCards />
      </div>
    </section>
  );
}
```

---

## 7. SEO / 元数据建议

```tsx
// app/page.tsx
export const metadata = {
  title: 'Cardvela | AI 出海一站通 · 虚拟卡 · ChatGPT/Claude/Perplexity 订阅',
  description: '一站式 AI 出海服务平台：虚拟卡支付、AI 订阅教程、聚合中转 API。3 分钟开卡，稳定解锁 ChatGPT、Claude、Perplexity、Grok、Gemini 等顶级 AI 服务。',
  keywords: ['AI 出海', '虚拟卡', 'ChatGPT 订阅', 'Claude Pro', 'Perplexity Pro', 'AI API 中转', 'GPT 订阅教程'],
  openGraph: {
    title: 'AI 出海，一站通全球 — Cardvela',
    description: '虚拟卡支付 · AI 订阅教程 · 智能聚合中转',
    images: ['/og-hero.png'], // 需要新做一张 1200×630 的 OG 图
  },
};
```

---

## 8. 验收标准（开发完成后逐项过）

- [ ] 桌面 1920 / 1440 / 1280 三档下，标题不换行错位，3D 卡不被裁切
- [ ] 移动端 iPhone SE (375) / iPhone 14 Pro / iPad 三档，无横向滚动条
- [ ] Lighthouse Performance ≥ 85（移动端 ≥ 75）
- [ ] LCP < 2.5s，CLS < 0.05，TBT < 200ms
- [ ] `prefers-reduced-motion: reduce` 时关闭粒子 + 浮动动画
- [ ] 所有图标走 SVG（无 PNG），单个 logo < 4KB
- [ ] 主 CTA hover 有视觉反馈（光晕 + 上移 2px）
- [ ] 三大亮点卡可点击跳转对应路由
- [ ] OG 分享卡截图清晰可读，标题居中
- [ ] 现有路由 `/login` `/register` `/dashboard` `/guide` `/dashboard/ai` 链接全部正常
- [ ] 不破坏既有 `Header`（透明态适配深色 Hero）

---

## 9. 落地步骤（建议按顺序）

1. **新分支** `git checkout -b feat/hero-redesign`
2. **拉品牌资源**：把 OpenAI / Anthropic / Google / Perplexity / xAI / Cursor / Midjourney / Suno 的官方 SVG 放到 `public/brand/`
3. **扩展 Tailwind 主题**（颜色 palette + 字体 + 渐变工具类）
4. **搭骨架**：先把 `Hero.tsx` 静态版本（无动画）跑通布局
5. **加 3D 卡 + AI 轨道**：CSS 3D + framer-motion，先桌面再移动端断点
6. **加背景层**：网格 + 径向光斑 → 最后加粒子（可后置上线）
7. **加入场动画 + 滚动指引**
8. **替换 `app/page.tsx`** 引用新 Hero（旧内容保留为 `<HomeLegacySections />` 放到 Hero 下方做 fallback / 保留信息）
9. **本地 lighthouse** 跑分 → 优化图片懒加载、字体 swap
10. **commit + push**，等用户确认后部署

---

## 10. 待用户确认 / 决策项

1. **3D 卡片**：CSS 3D（轻量） vs three.js（更炫但 +200KB）— 默认 CSS 3D
2. **粒子动画**：tsparticles vs 自写 canvas vs 完全去掉 — 默认轻量自写
3. **是否保留旧首页内容**：作为 Hero 下方区块（功能详情、定价、FAQ）继续展示？建议保留并美化
4. **品牌图标使用**：是否已获取所有 AI 公司 logo 的合理使用权限？（一般产品宣传可用，但部分品牌有明确指引）
5. **「10 万+ 用户」**：实际数据多少？需要替换为真实数字或改为「服务全球用户」更稳妥
6. **新增页面 `/guide`**：当前已有？若无需先建占位
7. **Logo / 品牌字体**：Cardvela 自身 logo 是否需要同步升级（现在的 logo 与新风格是否协调）

---

## 11. 后续可扩展板块（Hero 下滚后）

按从上到下：
1. **核心能力三大模块详解**（虚拟卡 / 教程 / 中转，每个一屏，含动效演示）
2. **支持的 AI 服务矩阵**（grid 展示 50+ 服务 logo + 状态指示）
3. **使用流程 4 步**（注册 → 充值 → 开卡 / 取 Key → 解锁全球 AI）
4. **真实用户案例 / 评价**（截图 + 引用）
5. **定价对比**（虚拟卡套餐 vs 中转套餐）
6. **FAQ**
7. **Footer**（备案 + 客服 + 社群）

---

> **下一个聊天框开始执行**：建议先从 §9 步骤 1-4 开始（建分支、拉资源、扩 Tailwind、搭骨架），有问题逐项推进。
