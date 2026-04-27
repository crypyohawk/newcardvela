'use client';

import Link from 'next/link';
import { useState } from 'react';

interface GuideSection {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  color: string;
  steps: GuideStep[];
}

interface GuideStep {
  title: string;
  content: string;
  tips?: string[];
  warning?: string;
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'preparation',
    icon: '🧰',
    title: '订阅前必读',
    subtitle: '避免踩坑，请先了解这些',
    color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30',
    steps: [
      {
        title: '你需要准备什么',
        content: '订阅海外 AI 服务需要三个核心工具：① 能访问海外网站的网络工具（VPN）；② 支持国际支付的虚拟卡；③ 一个干净的海外邮箱（Gmail 优先）。三者缺一不可。',
        tips: [
          '推荐使用 Gmail 注册海外 AI 账号，国内邮箱注册成功率较低',
          '美区 IP 订阅成功率最高，香港次之，台湾可用',
          '每次操作请全程保持同一个 IP，中途切换 IP 容易触发风控',
        ],
      },
      {
        title: '关于虚拟卡的使用限制',
        content: '本平台提供的虚拟卡为预付卡，支持 Visa/Mastercard 渠道。绑卡时需要与注册账号使用同一个 IP，否则可能被拒绝。卡上需有足够余额（建议充值略高于订阅金额）。',
        tips: [
          '首次绑卡时平台会预授权扣除一小笔验证金额（通常 $1），随后退回',
          '不同平台对账单地址有不同要求，建议填写与 IP 匹配的美国地址',
          '订阅后记得关注每月自动续费，避免卡余额不足导致服务中断',
        ],
        warning: '请勿将同一张虚拟卡绑定到多个不同账号，可能触发反欺诈规则导致卡片被冻结。',
      },
      {
        title: '账号安全建议',
        content: '海外 AI 账号一旦被封，绑定的虚拟卡也会受影响（未使用余额无法退款）。保护账号安全至关重要。',
        tips: [
          '保持 IP 固定，不要频繁切换节点或使用公共代理',
          '不要分享账号给他人，共享账号是被封的最常见原因',
          '开启双因素验证（2FA），使用 Authenticator App 而非短信',
          '不要在账号上绑定中国手机号',
        ],
      },
    ],
  },
  {
    id: 'claude',
    icon: '🤖',
    title: 'Claude 订阅教程',
    subtitle: 'Anthropic 出品，最强编程 AI',
    color: 'from-orange-500/20 to-amber-500/10 border-orange-500/30',
    steps: [
      {
        title: '注册 Claude 账号',
        content: '访问 claude.ai，点击 Sign Up，使用 Gmail 邮箱注册。注册时需要验证邮箱，确保全程使用美区或香港 IP。',
        tips: [
          '注册时选择 "Personal" 用途即可',
          '不需要手机号，只需邮箱验证',
          '注册完成后先不要急着绑卡，先确认账号可以正常访问',
        ],
      },
      {
        title: '升级 Claude Pro',
        content: '免费版 Claude 3 有每日消息限制。升级至 Pro（$20/月）可解锁 Claude Opus 模型以及更高的使用上限。进入 Settings → Billing → Upgrade to Pro。',
        tips: [
          '绑卡前确保卡内余额 ≥ $22（预留手续费空间）',
          '账单地址填美国地址（如：123 Main St, New York, NY 10001）',
          '绑卡时 IP 需与注册时一致',
        ],
        warning: '如果绑卡失败，大概率是 IP 被标记为高风险，换一个美区节点重试。',
      },
      {
        title: '配合编程工具使用',
        content: 'Claude 可通过 API 接入 Cursor、Cline、Claude Code 等编程工具。升级 Pro 后进入 Settings → API Keys 生成 Key，然后在工具中填写即可。',
        tips: [
          'API 用量与 Pro 订阅用量分开计费，API 需单独充值',
          '推荐在本平台开通 AI API 中转服务，价格更优惠且无需科学上网',
        ],
      },
    ],
  },
  {
    id: 'chatgpt',
    icon: '💬',
    title: 'ChatGPT 订阅教程',
    subtitle: 'OpenAI 出品，最广为人知的 AI',
    color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30',
    steps: [
      {
        title: '注册 ChatGPT 账号',
        content: '访问 chat.openai.com，使用 Gmail 邮箱注册。OpenAI 在中国大陆、香港等地区已限制访问，需使用美区或其他可用地区的 IP。',
        tips: [
          '注册时选择 "Individual" 类型',
          '邮箱验证后可能需要手机号验证，推荐使用接码平台（如 sms-activate.org）获取海外虚拟号码',
          '成功注册后先测试是否可以正常对话',
        ],
        warning: '切勿使用共享账号或购买来路不明的 ChatGPT 账号，极易被封禁且无法追回损失。',
      },
      {
        title: '升级 ChatGPT Plus',
        content: 'Plus 会员（$20/月）可使用 GPT-4o、o1、o3 等最新模型。进入 ChatGPT → 左下角头像 → Upgrade Plan。',
        tips: [
          '绑卡界面填写美国账单地址，与 IP 所在州保持一致效果更好',
          '卡余额建议 ≥ $22',
          '第一次订阅可能需要等待几分钟才能看到 Plus 功能',
        ],
      },
      {
        title: '使用 ChatGPT Team 或 API',
        content: 'Team 版（$25/人/月）支持多人共用，数据不用于训练。API 需单独在 platform.openai.com 充值后使用。',
        tips: [
          'API 充值最低 $5，按 Token 用量计费',
          'GPT-4o 推荐用于日常对话，o3 系列适合深度推理任务',
        ],
      },
    ],
  },
  {
    id: 'gemini',
    icon: '✨',
    title: 'Gemini 订阅教程',
    subtitle: 'Google 出品，多模态能力突出',
    color: 'from-blue-500/20 to-indigo-500/10 border-blue-500/30',
    steps: [
      {
        title: '访问 Gemini',
        content: '访问 gemini.google.com，直接用 Gmail 账号登录即可。Gemini 是 Google 账号下的服务，无需单独注册。',
        tips: [
          '确保 Google 账号未绑定中国手机号',
          '部分地区需要科学上网才能访问',
          'Gemini 免费版即可使用 Gemini 1.5 Flash，够用于大多数场景',
        ],
      },
      {
        title: '升级 Google One AI Premium',
        content: '订阅 Google One AI Premium（$19.99/月）可解锁 Gemini Advanced（Gemini 1.5 Pro/2.0 Ultra），同时获赠 2TB Google Drive 存储空间。',
        tips: [
          '进入 gemini.google.com → Try Gemini Advanced 开始订阅',
          '支持绑定 Visa/Mastercard 虚拟卡',
          '账单地址填美国地址',
        ],
        warning: '若提示所在地区不支持，需使用美区 IP 并确保 Google 账号地区设置为美国。',
      },
      {
        title: 'Gemini API 使用',
        content: '进入 aistudio.google.com 可免费获取 Gemini API Key，有每分钟和每日用量限制。付费版可大幅提升限额。',
        tips: [
          '免费 API 额度对个人开发者基本够用',
          'Gemini 1.5 Flash 速度快、价格低，适合大量调用',
          'Gemini 2.5 Pro 推理能力强，适合复杂任务',
        ],
      },
    ],
  },
  {
    id: 'grok',
    icon: '🦾',
    title: 'Grok 订阅教程',
    subtitle: 'xAI 出品，实时联网推理 AI',
    color: 'from-purple-500/20 to-violet-500/10 border-purple-500/30',
    steps: [
      {
        title: '注册访问 Grok',
        content: '访问 x.ai 或 grok.com，Grok 与 X（原 Twitter）账号绑定。可直接用 X 账号登录，或在 x.ai 单独注册。',
        tips: [
          'Grok 免费版可以使用，但有对话次数限制',
          '使用时需要美区或部分其他地区的 IP',
        ],
      },
      {
        title: '订阅 SuperGrok',
        content: 'SuperGrok 订阅（$30/月 或 $300/年）可解锁 Grok 3、更多消息配额、图像生成和 Deep Search 功能。',
        tips: [
          '支持 Visa/Mastercard 虚拟卡支付',
          '账单地址需使用美国地址',
          '年付比月付节省约 $60',
        ],
        warning: 'Grok 风控较严，绑卡时 IP 地址必须稳定，不要使用共享 IP 节点。',
      },
      {
        title: 'Grok API 使用',
        content: '访问 console.x.ai 注册 xAI API 账号，新用户有一定免费额度。Grok 3 支持 131K Context Window，适合长文档处理。',
        tips: [
          '目前 API 主要面向开发者，需申请访问权限',
          'Grok 支持实时互联网搜索，可获取最新信息',
        ],
      },
    ],
  },
  {
    id: 'cursor',
    icon: '🖥️',
    title: 'Cursor 订阅教程',
    subtitle: '最受开发者欢迎的 AI 编程 IDE',
    color: 'from-cyan-500/20 to-sky-500/10 border-cyan-500/30',
    steps: [
      {
        title: '下载安装 Cursor',
        content: '访问 cursor.com 下载 Cursor，支持 Windows、macOS、Linux。安装后用邮箱注册账号，免费版可体验 AI 功能，有使用次数限制。',
        tips: [
          '安装后无需挂 VPN 即可使用（Cursor 本身在国内可直接访问）',
          '首次安装会提示你选择 AI 模型，默认即可',
        ],
      },
      {
        title: '升级 Cursor Pro',
        content: 'Pro 版（$20/月）提供无限制 AI 请求（快速通道）。进入 cursor.com → Account → Billing 绑定虚拟卡。',
        tips: [
          '支持 Visa/Mastercard 虚拟卡，账单地址填美国',
          '绑卡时使用美区 IP 成功率更高',
          '卡余额建议 ≥ $22',
        ],
        warning: '如果绑卡时提示"card declined"，通常是 IP 风险或卡余额不足，检查后重试。',
      },
      {
        title: '配置 Cursor 使用本平台 AI API',
        content: '在本平台开通 AI API 服务后，可在 Cursor 的 Settings → Models → API Key 中填写本平台提供的 API Key 和 Base URL，实现更低成本的 AI 调用。',
        tips: [
          '本平台 API 兼容 OpenAI 格式，直接填入 Base URL 即可',
          '使用本平台 API 无需 VPN，稳定且价格优惠',
        ],
      },
    ],
  },
  {
    id: 'card-tips',
    icon: '💳',
    title: '虚拟卡使用技巧',
    subtitle: '最大化发挥虚拟卡的价值',
    color: 'from-rose-500/20 to-pink-500/10 border-rose-500/30',
    steps: [
      {
        title: '充值多少合适',
        content: '根据要订阅的服务决定充值金额。一般建议每个服务单独充值略高于订阅金额（多出 $2～3 作为缓冲）。不建议在一张卡上充入过多金额。',
        tips: [
          'Claude Pro：充值 $22～25',
          'ChatGPT Plus：充值 $22～25',
          'Google One AI：充值 $22～25',
          'Cursor Pro：充值 $22～25',
          '如需同时订阅多个，可充值累加金额',
        ],
      },
      {
        title: '防止自动续费失败',
        content: '海外 AI 订阅均为月度自动续费，扣款时卡余额必须充足，否则服务会中断，有时还会影响账号状态。',
        tips: [
          '在订阅日前 2～3 天确认卡余额是否充足',
          '可在各平台绑定账单提醒，到期前收到通知再充值',
          '如果暂时不需要续订，记得提前在平台取消自动续费',
        ],
        warning: '多次扣款失败可能导致账号被暂停，恢复时需要重新绑卡并补缴欠款。',
      },
      {
        title: '安全用卡习惯',
        content: '虚拟卡与真实银行卡一样需要妥善保护，卡号一旦泄露可能被盗刷。',
        tips: [
          '只在官方正规网站使用虚拟卡，不要在来路不明的网站绑卡',
          '不要截图分享含有卡号的页面',
          '每个服务建议使用独立的虚拟卡，降低一卡多平台的风险',
          '发现异常扣款立刻在本平台申请冻结或注销卡片',
        ],
      },
      {
        title: '常见支付失败原因',
        content: '绑卡或支付失败通常是以下几个原因之一，逐一排查即可解决。',
        tips: [
          '① 卡余额不足（包含首次预授权验证金额）',
          '② IP 与账单地址不匹配（使用美区 IP 配合美国账单地址）',
          '③ 同一 IP 短时间多次尝试被风控（换节点或等待 30 分钟）',
          '④ 虚拟卡类型不被该平台接受（更换卡类型）',
          '⑤ 浏览器缓存问题（清除 Cookie 后重试）',
        ],
      },
    ],
  },
];

export default function GuidePage() {
  const [activeSection, setActiveSection] = useState<string>('preparation');
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const currentSection = GUIDE_SECTIONS.find((s) => s.id === activeSection)!;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* 导航栏 */}
      <nav className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white transition">
              返回工作台
            </Link>
            <span className="text-lg font-semibold">📖 海外 AI 订阅教程</span>
          </div>
          <span className="text-xs text-slate-500 hidden sm:block">保姆级图文指南 · 持续更新</span>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* 左侧目录 */}
          <aside className="lg:w-56 shrink-0">
            <div className="lg:sticky lg:top-24 space-y-1">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 px-2">教程目录</p>
              {GUIDE_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition flex items-center gap-2.5 ${
                    activeSection === section.id
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <span className="text-lg">{section.icon}</span>
                  <div>
                    <div className="text-sm font-medium leading-tight">{section.title}</div>
                    <div className="text-xs text-slate-500 leading-tight mt-0.5 hidden lg:block">{section.subtitle}</div>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          {/* 右侧内容 */}
          <main className="flex-1 min-w-0">
            {/* 章节标题 */}
            <div className={`rounded-2xl border bg-gradient-to-br p-6 mb-6 ${currentSection.color}`}>
              <div className="flex items-center gap-3">
                <span className="text-4xl">{currentSection.icon}</span>
                <div>
                  <h1 className="text-2xl font-bold">{currentSection.title}</h1>
                  <p className="text-slate-400 mt-1">{currentSection.subtitle}</p>
                </div>
              </div>
            </div>

            {/* 步骤列表 */}
            <div className="space-y-4">
              {currentSection.steps.map((step, index) => {
                const stepKey = `${activeSection}-${index}`;
                const isExpanded = expandedStep === stepKey || currentSection.steps.length <= 2;

                return (
                  <div key={stepKey} className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
                    <button
                      className="w-full text-left px-6 py-4 flex items-center gap-4 hover:bg-slate-800/40 transition"
                      onClick={() => setExpandedStep(isExpanded && expandedStep === stepKey ? null : stepKey)}
                    >
                      <span className="shrink-0 w-8 h-8 rounded-full bg-slate-700 text-slate-300 text-sm font-bold flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="font-semibold text-white">{step.title}</span>
                      <span className={`ml-auto text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
                    </button>

                    {isExpanded && (
                      <div className="px-6 pb-6 border-t border-slate-800">
                        <p className="text-slate-300 leading-7 mt-4">{step.content}</p>

                        {step.warning && (
                          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 flex gap-2">
                            <span className="text-red-400 shrink-0">⚠️</span>
                            <p className="text-sm text-red-300">{step.warning}</p>
                          </div>
                        )}

                        {step.tips && step.tips.length > 0 && (
                          <div className="mt-4 space-y-2">
                            <p className="text-xs text-slate-500 uppercase tracking-wider">注意事项 / 小技巧</p>
                            <ul className="space-y-2">
                              {step.tips.map((tip, tipIndex) => (
                                <li key={tipIndex} className="flex items-start gap-2 text-sm text-slate-300">
                                  <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                                  <span>{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 底部导航 */}
            <div className="mt-8 flex justify-between items-center">
              {GUIDE_SECTIONS.findIndex((s) => s.id === activeSection) > 0 ? (
                <button
                  onClick={() => {
                    const idx = GUIDE_SECTIONS.findIndex((s) => s.id === activeSection);
                    setActiveSection(GUIDE_SECTIONS[idx - 1].id);
                    setExpandedStep(null);
                  }}
                  className="text-sm text-slate-400 hover:text-white flex items-center gap-1"
                >
                  ← 上一章
                </button>
              ) : <div />}
              {GUIDE_SECTIONS.findIndex((s) => s.id === activeSection) < GUIDE_SECTIONS.length - 1 ? (
                <button
                  onClick={() => {
                    const idx = GUIDE_SECTIONS.findIndex((s) => s.id === activeSection);
                    setActiveSection(GUIDE_SECTIONS[idx + 1].id);
                    setExpandedStep(null);
                  }}
                  className="rounded-xl bg-slate-800 hover:bg-slate-700 px-5 py-2.5 text-sm font-medium transition flex items-center gap-1"
                >
                  下一章 →
                </button>
              ) : (
                <Link href="/dashboard" className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-sm font-medium transition">
                  去开卡订阅 →
                </Link>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
