'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const audienceCards = [
  {
    title: '中小企业',
    description: '适合需要内容生成、客服提效、数据分析、知识库问答的业务团队，先把可落地的 AI 能力接入起来。',
    accent: 'blue',
    points: ['更关心稳定落地', '需要控制模型成本', '希望减少试错'],
  },
  {
    title: '高质量开发者',
    description: '适合需要代码生成、模型切换、接口稳定和推理能力的开发者，用更高性价比的方式完成开发与交付。',
    accent: 'cyan',
    points: ['代码与自动化场景', '接口调用更灵活', '兼顾质量和成本'],
  },
  {
    title: '个人订阅用户',
    description: '适合明确要使用官方产品体验的个人用户，我们协助处理支付、开卡、教程与订阅流程。',
    accent: 'violet',
    points: ['想订阅官方套餐', '支付问题最棘手', '需要教程减少踩坑'],
  },
];

const solutionScenarios = [
  {
    title: '代码开发与编辑',
    summary: '适合独立开发者、外包团队、技术公司。',
    modelPlan: '推荐路线：平台聚合调用为主，按任务切换代码型与推理型模型。',
    budget: '预算建议：适合按调用量控制成本的团队。',
  },
  {
    title: '数据分析与报表',
    summary: '适合运营、财务、增长、咨询等高频分析岗位。',
    modelPlan: '推荐路线：优先使用稳定模型完成分析、总结、提炼与问答。',
    budget: '预算建议：适合中等频次、多人协作场景。',
  },
  {
    title: '学术研究与搜索增强',
    summary: '适合研究、专业检索、论文辅助与知识整理。',
    modelPlan: '推荐路线：强调长文本理解、检索整合与高质量输出。',
    budget: '预算建议：适合对结果质量要求更高的用户。',
  },
  {
    title: '教育与内容生产',
    summary: '适合培训、课程设计、短内容生产与团队知识沉淀。',
    modelPlan: '推荐路线：用稳定模型完成教案、提纲、脚本和批量内容辅助。',
    budget: '预算建议：适合长期持续使用的团队与个人。',
  },
];

const servicePaths = [
  {
    title: '直接使用我们的平台服务',
    description: '适合大多数团队和开发者。模型接入、稳定性、调用体验和成本控制都在平台内解决。',
    points: ['省心', '接入快', '统一管理'],
  },
  {
    title: '订阅官方服务',
    description: '适合明确要使用官方原生体验的用户。我们解决开卡、支付、绑卡与教程问题，让订阅过程更顺畅。',
    points: ['官方体验', '支付协助', '教程支持'],
  },
  {
    title: '混合使用',
    description: '适合要求更高的团队。核心需求走平台，特定产品走官方订阅，在稳定、灵活和体验之间取得平衡。',
    points: ['灵活组合', '适配复杂团队', '成本更可控'],
  },
];

const capabilityCards = [
  {
    title: 'AI 聚合中转',
    description: '一个入口接入多种主流模型能力，适合企业团队和开发者快速落地。',
  },
  {
    title: '模型与方案建议',
    description: '结合你的业务类型、使用目标和预算方向，给出更合适的模型使用路线。',
  },
  {
    title: '虚拟卡支付支持',
    description: '面向需要官方订阅的用户，解决海外支付和开卡问题，让订阅真正可执行。',
  },
  {
    title: '订阅教程与协助',
    description: '把地区、流程、绑卡与常见问题讲清楚，减少用户在官方订阅上的反复试错。',
  },
];

const faqs = [
  {
    question: '你们的平台更适合哪些用户？',
    answer: '主要面向中小企业、高质量开发者，以及需要官方订阅协助的个人用户。首页先帮助用户识别自己属于哪类需求，再匹配合适路径。',
  },
  {
    question: '我该直接用平台服务，还是自己订阅官方产品？',
    answer: '大多数团队和开发者更适合直接使用平台服务，接入更快、成本更稳。个人用户如果明确偏好官方体验，则更适合订阅官方产品并配合开卡和教程。',
  },
  {
    question: '没有海外银行卡，怎么支付 AI 服务？',
    answer: '这正是虚拟卡服务存在的价值。我们提供开卡和支付支持，帮助用户更顺畅地完成官方订阅流程。',
  },
  {
    question: '如果我不确定该用哪类模型怎么办？',
    answer: '我们会按照代码开发、数据分析、学术研究、教育与内容生产等常见场景提供建议路线，帮助你更快找到合适的使用方式。',
  },
];

export default function HomePage() {
  const [referralPrompt, setReferralPrompt] = useState<{ enabled: boolean; promptText: string } | null>(null);
  const [supportEmail, setSupportEmail] = useState('');

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data.referral) setReferralPrompt(data.referral);
        if (data.supportEmail) setSupportEmail(data.supportEmail);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white font-latin overflow-hidden">
      <nav className="sticky top-0 z-50 bg-[#0a0e1a]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex justify-between items-center">
          <Link href="/" className="flex items-center">
            <Image
              src="/brand/cardvela-wordmark.svg"
              alt="CardVela"
              width={188}
              height={46}
              className="h-9 w-auto md:h-10"
              priority
            />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-400 hover:text-white transition px-4 py-2">
              登录
            </Link>
            <Link href="/register" className="text-sm bg-white text-black font-semibold px-5 py-2 rounded-full hover:bg-gray-100 transition">
              免费注册
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO — 全屏 */}
      <section className="relative min-h-[calc(100vh-64px)] flex items-center border-b border-white/5 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1100px] h-[700px] bg-gradient-to-b from-blue-600/20 via-cyan-500/5 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-[30%] left-[8%] w-[280px] h-[280px] bg-blue-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-[10%] right-[6%] w-[360px] h-[360px] bg-cyan-500/10 rounded-full blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
              backgroundSize: '64px 64px',
            }}
          />
        </div>

        <div className="relative w-full max-w-5xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-8 text-xs sm:text-sm text-gray-300">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
            AI 出海一站式服务平台 · 中小企业 / 开发者 / 个人订阅
          </div>

          <h1 className="font-extrabold tracking-tight leading-[1.02] text-5xl sm:text-6xl md:text-7xl lg:text-[88px]">
            <span className="block bg-gradient-to-r from-white via-white to-slate-300 bg-clip-text text-transparent">
              让全球 AI
            </span>
            <span className="mt-2 block bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500 bg-clip-text text-transparent">
              触手可及
            </span>
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-base sm:text-lg text-gray-400 leading-relaxed">
            聚合中转、虚拟卡支付、官方订阅协助 —— 一个平台打通模型、支付与教程，让 AI 接入真正可落地。
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="group bg-gradient-to-r from-blue-500 to-cyan-400 text-black font-semibold px-8 py-3.5 rounded-full hover:shadow-lg hover:shadow-blue-500/30 transition-all text-sm"
            >
              免费注册
              <span className="inline-block ml-1.5 group-hover:translate-x-1 transition-transform">→</span>
            </Link>
            <Link
              href="/guide"
              className="bg-white/5 border border-white/10 text-white font-medium px-8 py-3.5 rounded-full hover:bg-white/10 transition text-sm"
            >
              查看订阅教程
            </Link>
          </div>

          <div className="mt-14 grid grid-cols-3 max-w-2xl mx-auto gap-px rounded-2xl overflow-hidden border border-white/8 bg-white/[0.03]">
            {[
              { label: '聚合中转', value: '主流模型统一接入' },
              { label: '虚拟卡', value: 'Visa / Master 全球支付' },
              { label: '订阅协助', value: '开卡 · 绑定 · 教程' },
            ].map(item => (
              <div key={item.label} className="bg-[#0a0e1a] px-4 py-5">
                <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                <p className="text-sm font-semibold text-gray-100">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 flex flex-col items-center gap-2 text-xs text-gray-500">
            <span>向下了解服务方案</span>
            <span className="block h-8 w-px bg-gradient-to-b from-white/30 to-transparent" />
          </div>
        </div>
      </section>

      {/* SOLUTION CONSOLE — 独立一屏 */}
      <section className="relative border-b border-white/5 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gradient-to-r from-blue-500/10 to-cyan-400/10 blur-3xl rounded-full" />
        </div>
        <div className="relative max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs text-gray-400 mb-5">
              SOLUTION CONSOLE
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">为你匹配 AI 出海路径</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-sm sm:text-base">
              根据用户类型、核心需求与使用方式，自动给出推荐路径与支付/订阅补齐方案。
            </p>
          </div>

          <div className="relative rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 md:p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-xs uppercase tracking-[0.25em] text-gray-400">Console Online</span>
              </div>
              <span className="text-xs text-cyan-300 bg-cyan-400/10 border border-cyan-400/20 rounded-full px-3 py-1">自动匹配</span>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 mb-6">
              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
                <p className="text-xs text-blue-300 mb-2">用户类型</p>
                <p className="font-medium">企业团队</p>
              </div>
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
                <p className="text-xs text-cyan-300 mb-2">核心需求</p>
                <p className="font-medium">稳定与成本</p>
              </div>
              <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4">
                <p className="text-xs text-violet-300 mb-2">使用方式</p>
                <p className="font-medium">平台优先</p>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-cyan-300/20 bg-[#0d1424] p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/60">Route Builder</p>
                    <h3 className="mt-1 text-lg font-semibold text-white">方案路线图</h3>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { step: '01', title: '企业团队', desc: '业务场景 → 模型组合 → 平台调用', color: 'from-blue-400 to-cyan-300' },
                    { step: '02', title: '开发者', desc: 'API Key → 模型切换 → 成本控制', color: 'from-cyan-300 to-sky-500' },
                    { step: '03', title: '个人订阅', desc: '虚拟卡 → 支付绑定 → 教程协助', color: 'from-violet-300 to-blue-400' },
                  ].map(item => (
                    <div key={item.step} className="group rounded-2xl border border-white/8 bg-white/[0.035] p-4 transition-colors hover:border-cyan-300/30 hover:bg-cyan-300/[0.05]">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${item.color} text-xs font-black text-[#06111f]`}>
                          {item.step}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-white">{item.title}</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-gray-400">{item.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                  <p className="text-xs text-gray-500 mb-1">输出结果</p>
                  <p className="text-sm font-semibold text-gray-100">推荐使用路径 + 支付 / 订阅补齐方案</p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-gradient-to-br from-[#171d31] to-[#0e1322] p-6 flex flex-col">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <span className="text-xs text-gray-500 tracking-widest uppercase">Virtual Card</span>
                    <p className="text-lg font-bold tracking-wider mt-1">CardVela</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg viewBox="0 0 48 32" className="w-10 h-7">
                      <circle cx="16" cy="16" r="10" fill="#EB001B" opacity="0.9" />
                      <circle cx="32" cy="16" r="10" fill="#F79E1B" opacity="0.9" />
                      <path d="M24 8.8a10 10 0 010 14.4 10 10 0 000-14.4z" fill="#FF5F00" opacity="0.9" />
                    </svg>
                    <svg viewBox="0 0 48 32" className="w-10 h-7">
                      <rect fill="#1A1F71" width="48" height="32" rx="4" opacity="0.9" />
                      <text x="24" y="20" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="bold" fontStyle="italic">VISA</text>
                    </svg>
                  </div>
                </div>
                <div className="text-base tracking-[0.25em] text-gray-300 font-mono mb-4">
                  •••• •••• •••• 4285
                </div>
                <div className="flex justify-between items-end text-xs text-gray-500 mb-5">
                  <span>VALID THRU 12/28</span>
                  <span className="text-green-400 font-medium">● Active</span>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed mt-auto">
                  需要订阅官方服务时，虚拟卡与支付协助就是最后一公里。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/5 py-6 overflow-hidden">
        <div className="flex items-center gap-10 animate-marquee whitespace-nowrap">
          {[
            'ChatGPT', 'Claude', 'Gemini', 'Midjourney', 'GitHub Copilot', 'Cursor', 'Suno',
            'AWS', 'Google Cloud', 'Vercel', 'Cloudflare', 'Notion', 'Shopify',
            'ChatGPT', 'Claude', 'Gemini', 'Midjourney', 'GitHub Copilot', 'Cursor', 'Suno',
            'AWS', 'Google Cloud', 'Vercel', 'Cloudflare', 'Notion', 'Shopify',
          ].map((name, index) => (
            <span key={`${name}-${index}`} className="text-sm text-gray-500 font-medium tracking-wide">{name}</span>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3">你是哪类用户，我们就按哪类路径来设计</h2>
          <p className="text-gray-500 text-sm sm:text-base max-w-3xl mx-auto">企业、开发者、个人订阅用户面对的问题不同，对应的服务组合、使用重点和支持方式也不同。</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {audienceCards.map(card => (
            <div key={card.title} className="rounded-3xl border border-white/5 bg-white/[0.02] p-7 hover:border-white/10 transition-colors duration-300">
              <div className={`w-11 h-11 rounded-2xl mb-5 flex items-center justify-center ${
                card.accent === 'blue'
                  ? 'bg-blue-500/15 text-blue-300 border border-blue-500/20'
                  : card.accent === 'cyan'
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/20'
                    : 'bg-violet-500/15 text-violet-300 border border-violet-500/20'
              }`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.742-.479c.483-.149.803-.608.738-1.11A6 6 0 0018 12.75V18.72zm-6-1.5c.369 0 .73.028 1.082.084A6 6 0 0118 12.75V12a6 6 0 00-12 0v.75a6 6 0 014.918 4.554c.352-.056.713-.084 1.082-.084zM12 18.75a9.094 9.094 0 01-3.742-.479c-.483-.149-.803-.608-.738-1.11A6 6 0 0112 12.75a6 6 0 014.48 2.411c.065.502-.255.961-.738 1.11A9.094 9.094 0 0112 18.75zm-6-6a6 6 0 00-3.742 2.411c-.065.502.255.961.738 1.11A9.094 9.094 0 006 18.75v-6zM12 6a3 3 0 110 6 3 3 0 010-6z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">{card.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-5">{card.description}</p>
              <div className="space-y-2">
                {card.points.map(point => (
                  <div key={point} className="flex items-center gap-2 text-sm text-gray-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                    {point}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-14">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold mb-3">按实际场景来选模型路线，而不是盲目堆模型</h2>
              <p className="text-gray-500">你做什么事情，决定你该怎么用 AI。不同场景需要的不是同一套模型，也不是同一种预算方式。</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-gray-400">
              重点不是“模型越多越好”，而是“你的业务用得是否稳定、清晰、可持续”。
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {solutionScenarios.map(item => (
              <div key={item.title} className="rounded-3xl border border-white/5 bg-white/[0.02] p-7">
                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-sm text-gray-400 mb-4 leading-relaxed">{item.summary}</p>
                <div className="space-y-3 text-sm text-gray-300">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">{item.modelPlan}</div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-gray-400">{item.budget}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">不是只有一种买法，而是三种使用路径</h2>
            <p className="text-gray-500 max-w-3xl mx-auto">我们不强行把所有用户塞进同一个方案，而是根据目标决定用平台服务、官方订阅，还是两者混合。</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {servicePaths.map((path, index) => (
              <div key={path.title} className={`rounded-3xl p-7 border ${index === 0 ? 'border-blue-500/20 bg-blue-500/[0.05]' : 'border-white/5 bg-white/[0.02]'}`}>
                <div className="text-xs uppercase tracking-[0.25em] text-gray-500 mb-4">Path 0{index + 1}</div>
                <h3 className="text-xl font-semibold mb-3">{path.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed mb-5">{path.description}</p>
                <div className="flex flex-wrap gap-2">
                  {path.points.map(point => (
                    <span key={point} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300">
                      {point}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-10 items-start">
            <div>
              <h2 className="text-3xl font-bold mb-3">平台能力不止一个功能，而是一整条链路</h2>
              <p className="text-gray-500 leading-relaxed">
                真正影响 AI 出海体验的，不只是某个模型本身，而是接入方式、支付、教程、稳定性和后续使用成本能不能配合起来。
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              {capabilityCards.map(card => (
                <div key={card.title} className="rounded-3xl border border-white/5 bg-white/[0.02] p-6">
                  <h3 className="text-lg font-semibold mb-3">{card.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{card.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">用户最常问的几件事</h2>
            <p className="text-gray-500">这部分不仅给用户看，也让搜索和推荐系统更容易理解你的网站到底解决什么问题。</p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {faqs.map(item => (
              <div key={item.question} className="rounded-3xl border border-white/5 bg-white/[0.02] p-6">
                <h3 className="text-lg font-semibold mb-3">{item.question}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="relative bg-gradient-to-br from-blue-600/10 via-[#0a0e1a] to-cyan-500/10 rounded-3xl border border-white/5 p-12 text-center overflow-hidden">
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <h2 className="text-3xl font-bold mb-3">先明确路径，再开始用 AI</h2>
              <p className="text-gray-500 mb-8 max-w-2xl mx-auto">注册后可直接使用平台服务；如果你需要官方订阅，我们也提供开卡、支付与教程支持，把使用链路补齐。</p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link href="/register" className="inline-block bg-white text-black font-semibold px-10 py-3.5 rounded-full hover:bg-gray-100 transition text-sm">
                  免费注册 →
                </Link>
                <Link href="/guide" className="inline-block bg-white/5 border border-white/10 text-white font-semibold px-10 py-3.5 rounded-full hover:bg-white/10 transition text-sm">
                  先看教程
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-white/5 bg-[#0a0e1a]">
        <div className="max-w-6xl mx-auto px-6 py-4 text-center">
          <p className="text-xs text-gray-500 leading-relaxed">
            <span className="text-gray-400 font-medium">CardVela 义务告知：</span>本平台由国际授权机构发行，仅面向海外用户提供服务，用户需遵守所在地法律法规。
          </p>
        </div>
      </div>

      <footer className="border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <Image
                src="/brand/cardvela-wordmark.svg"
                alt="CardVela"
                width={188}
                height={46}
                className="h-9 w-auto opacity-90"
              />
              <span className="text-gray-600 text-sm">© 2020</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <Link href="/terms" className="hover:text-gray-300 transition">服务条款</Link>
              <Link href="/privacy" className="hover:text-gray-300 transition">隐私政策</Link>
              {supportEmail && <span className="text-gray-600">{supportEmail}</span>}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
