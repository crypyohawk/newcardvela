'use client';

import { useAuth } from '../../../../src/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface AITier {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  pricePerMillionInput: number;
  pricePerMillionOutput: number;
  modelGroup: string;
  channelGroup: string | null;
  isActive: boolean;
  features?: string | null;
}

interface AIKey {
  id: string;
  keyName: string;
  apiKey: string;
  status: string;
  monthlyLimit: number | null;
  monthUsed: number;
  totalUsed: number;
  monthRequestCount: number;
  totalRequestCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  tier: AITier;
}

interface PerplexityPlan {
  id: string;
  code: string;
  displayName: string;
  priceUsd: number;
  durationDays: number;
  monthlyQuotaUsd: number;
  payAsYouGoEquivUsd: number | null;
  intro: string | null;
  features: string | null;
  highlight: boolean;
}

interface PerplexitySubscription {
  id: string;
  pricePaidUsd: number;
  quotaTotalUsd: number;
  quotaUsedUsd: number;
  startAt: string;
  expiresAt: string;
  status: string;
  plan: PerplexityPlan;
}

const MODELS_INFO = [
  { id: 'claude-opus', name: 'Claude Opus 4.7', desc: '旗舰推理 · 复杂代码 · 架构设计', tag: '顶级', tagColor: 'bg-amber-500/20 text-amber-300' },
  { id: 'claude-opus-4.6', name: 'Claude Opus 4.6', desc: '上代顶级型号 · 长文创作 · 深度分析', tag: '顶级', tagColor: 'bg-amber-500/20 text-amber-300' },
  { id: 'claude', name: 'Claude Sonnet 4.6', desc: '代码生成 · 项目重构 · 长文推理', tag: 'Pro', tagColor: 'bg-orange-500/20 text-orange-300' },
  { id: 'gpt-5.5', name: 'GPT-5.5', desc: '顶级通用 · 复杂任务拆解 · Agent 能力', tag: '顶级', tagColor: 'bg-emerald-600/20 text-emerald-300' },
  { id: 'gpt', name: 'GPT-5.4', desc: '通用对话 · 多语言翻译 · 综合任务', tag: 'Pro', tagColor: 'bg-emerald-500/20 text-emerald-300' },
  { id: 'gemini', name: 'Gemini 3.1 Pro', desc: '多模态 · 超长上下文 · 图像理解', tag: 'Pro', tagColor: 'bg-sky-500/20 text-sky-300' },
  { id: 'grok', name: 'Grok 4', desc: 'xAI 旗舰 · 实时信息 · 独立观点', tag: 'Pro', tagColor: 'bg-zinc-500/20 text-zinc-200' },
  { id: 'sonar', name: 'Sonar 实时搜索', desc: '联网搜索 · 实时信息 · 来源引用', tag: '订阅专享', tagColor: 'bg-purple-500/20 text-purple-300' },
  { id: 'auto', name: 'Auto 智能路由', desc: '自动选最佳模型 · 平衡速度成本', tag: '推荐', tagColor: 'bg-fuchsia-500/20 text-fuchsia-300' },
  { id: 'nemotron', name: 'Nemotron Super', desc: 'NVIDIA 大模型 · 数据分析 · 推理', tag: 'Pro', tagColor: 'bg-green-500/20 text-green-300' },
];

const SCENARIOS = [
  { icon: '💻', title: '代码开发', desc: 'VS Code (Cline) · Claude Code · Continue / Cursor · 项目构建', color: 'from-cyan-500/10 to-cyan-700/5 border-cyan-500/30' },
  { icon: '🔍', title: '联网搜索', desc: '实时资讯 · 多源交叉验证 · 可追溯引用', color: 'from-fuchsia-500/10 to-fuchsia-700/5 border-fuchsia-500/30' },
  { icon: '🎓', title: '学术研究', desc: '论文检索 · 文献综述 · 引用规范化', color: 'from-purple-500/10 to-purple-700/5 border-purple-500/30' },
  { icon: '📊', title: '数据分析', desc: '统计推理 · 图表解读 · 趋势预测', color: 'from-indigo-500/10 to-indigo-700/5 border-indigo-500/30' },
  { icon: '📚', title: '教育辅导', desc: '概念讲解 · 习题分步推导 · 多角度释疑', color: 'from-violet-500/10 to-violet-700/5 border-violet-500/30' },
  { icon: '✍️', title: '内容创作', desc: '长文写作 · 多语言翻译 · 风格迁移', color: 'from-rose-500/10 to-rose-700/5 border-rose-500/30' },
];

export default function PerplexityPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [tiers, setTiers] = useState<AITier[]>([]);
  const [keys, setKeys] = useState<AIKey[]>([]);
  const [plans, setPlans] = useState<PerplexityPlan[]>([]);
  const [activeSub, setActiveSub] = useState<PerplexitySubscription | null>(null);
  const [aiBalance, setAiBalance] = useState<number>(0);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyTier, setNewKeyTier] = useState('');
  const [newKeyLimit, setNewKeyLimit] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [aiConfigTab, setAiConfigTab] = useState<'vscode' | 'cursor' | 'claudecode' | 'continue' | 'openai' | 'curl'>('vscode');
  const [platformApiUrl, setPlatformApiUrl] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  useEffect(() => {
    fetchData();
    fetchConfig();
  }, []);

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [message]);

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/config', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        if (d.aiApiBaseUrl) setPlatformApiUrl(d.aiApiBaseUrl);
      }
    } catch {}
  };

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };
      const [tiersRes, keysRes, plansRes, subRes] = await Promise.all([
        fetch('/api/user/ai-service/tiers', { headers }),
        fetch('/api/user/ai-service/keys', { headers }),
        fetch('/api/user/perplexity/plans', { headers }),
        fetch('/api/user/perplexity/subscription', { headers }),
      ]);
      if (tiersRes.ok) {
        const d = await tiersRes.json();
        setTiers((d.tiers || []).filter((t: AITier) => t.modelGroup === 'perplexity'));
      }
      if (keysRes.ok) {
        const d = await keysRes.json();
        setKeys((d.keys || []).filter((k: AIKey) => k.tier?.modelGroup === 'perplexity'));
      }
      if (plansRes.ok) {
        const d = await plansRes.json();
        setPlans(d.plans || []);
      }
      if (subRes.ok) {
        const d = await subRes.json();
        setActiveSub(d.active || null);
        setAiBalance(d.aiBalance ?? 0);
      }
    } catch (e) {
      console.error('获取数据失败:', e);
    } finally {
      setDataLoading(false);
    }
  };

  const handleSubscribe = async (plan: PerplexityPlan) => {
    if (!confirm(`确认开通《${plan.displayName}》？\n\n将从 AI 余额中扣费 $${plan.priceUsd}\n获得 $${plan.monthlyQuotaUsd} 额度 / ${plan.durationDays} 天`)) return;
    setSubscribing(plan.id);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/user/perplexity/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planId: plan.id }),
      });
      const data = await res.json();
      if (res.status === 402) {
        if (confirm(`AI 余额不足！\n当前余额：$${data.balance?.toFixed(4)}\n需要：$${data.required}\n还差：$${data.shortfall}\n\n是否前往充值？`)) {
          router.push('/dashboard');
        }
        return;
      }
      if (!res.ok) throw new Error(data.error || '开通失败');
      setMessage({ type: 'success', text: data.message });
      fetchData();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setSubscribing(null);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim() || !newKeyTier) {
      setMessage({ type: 'error', text: '请填写 Key 名称并选择套餐' });
      return;
    }
    setCreatingKey(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/user/ai-service/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          keyName: newKeyName.trim(),
          tierId: newKeyTier,
          monthlyLimit: newKeyLimit ? parseFloat(newKeyLimit) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details || '创建失败');
      setMessage({ type: 'success', text: 'API Key 创建成功！' });
      setShowCreateKey(false);
      setNewKeyName(''); setNewKeyTier(''); setNewKeyLimit('');
      fetchData();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setCreatingKey(false);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('确认删除此 Key？')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/user/ai-service/keys/${keyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || '删除失败');
      }
      setMessage({ type: 'success', text: '已删除' });
      fetchData();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">加载中...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#0d0a1f] to-black text-white">
      {/* 顶部导航 */}
      <header className="border-b border-white/5 bg-slate-950/60 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">← 返回</Link>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 via-fuchsia-500 to-indigo-600 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
              </div>
              <span className="font-bold tracking-tight">Cardvela Pro</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300">学术研究专版</span>
            </div>
          </div>
          <div className="text-xs text-gray-400">
            AI 余额：<span className="text-cyan-300 font-mono">${(user.aiBalance ?? 0).toFixed(4)}</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Hero 介绍 */}
        <section className="mb-10">
          <div className="relative overflow-hidden rounded-3xl border border-purple-500/20 bg-gradient-to-br from-[#1a0b35]/80 via-[#0f0626]/60 to-transparent p-8">
            <div className="absolute -top-20 -right-20 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-fuchsia-500/15 rounded-full blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-xs text-purple-200 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                AI 聚合旗舰订阅 · 全场景顶级模型
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-3">
                <span className="bg-gradient-to-r from-purple-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent">Cardvela Pro</span>
              </h1>
              <p className="text-gray-300 max-w-2xl mb-6 leading-relaxed">
                一款订阅，职业级 <span className="text-amber-300">Claude Opus / Sonnet</span> · <span className="text-emerald-300">GPT-5.5</span> · <span className="text-sky-300">Gemini 3.1 Pro</span> · <span className="text-zinc-200">Grok 4</span> 任意切换，
                额外送<span className="text-purple-300">实时联网搜索</span>专享通道（Sonar 搜索模型）。
                覆盖 <span className="text-cyan-300">代码开发、联网搜索、学术研究、数据分析、教育辅导、内容创作</span> 全场景，
                价格<span className="text-purple-300">远低于多个官方订阅叠加</span>。
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setShowCreateKey(true)}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 rounded-xl text-sm font-medium shadow-lg shadow-purple-900/30"
                >
                  + 创建 Cardvela Pro Key
                </button>
                <a href="#models" className="px-5 py-2.5 border border-purple-500/40 hover:border-purple-400 rounded-xl text-sm">查看可用模型</a>
              </div>
            </div>
          </div>
        </section>

        {message && (
          <div className={`mb-6 p-3 rounded-xl text-sm ${message.type === 'success' ? 'bg-green-500/15 border border-green-500/30 text-green-300' : 'bg-red-500/15 border border-red-500/30 text-red-300'}`}>
            {message.text}
          </div>
        )}

        {/* 适用场景 */}
        <section className="mb-10">
          <h2 className="text-lg font-bold mb-4 text-purple-200">适用场景</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {SCENARIOS.map((s) => (
              <div key={s.title} className={`relative overflow-hidden rounded-2xl p-4 border bg-gradient-to-br ${s.color}`}>
                <div className="text-2xl mb-2">{s.icon}</div>
                <div className="font-semibold text-sm text-white mb-1">{s.title}</div>
                <div className="text-xs text-gray-400 leading-relaxed">{s.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 模型矩阵 */}
        <section id="models" className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-purple-200">可用模型</h2>
            <span className="text-xs text-gray-500">通过 OpenAI 兼容接口调用，模型名见下方 ID</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {MODELS_INFO.map((m) => (
              <div key={m.id} className="rounded-2xl p-4 border border-purple-500/20 bg-purple-950/10 hover:border-purple-400/40 transition">
                <div className="flex items-start justify-between mb-1">
                  <div className="font-semibold text-white text-sm">{m.name}</div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${m.tagColor}`}>{m.tag}</span>
                </div>
                <div className="text-xs text-gray-400 mb-2">{m.desc}</div>
                <div className="text-xs">
                  <span className="text-gray-500">model ID:</span>{' '}
                  <code className="px-1.5 py-0.5 rounded bg-slate-800/80 text-purple-300 font-mono">{m.id}</code>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-purple-300/60 bg-purple-500/5 border border-purple-500/15 rounded-xl p-3">
            💡 调用联网搜索专享模型（<code className="text-purple-300">sonar / auto</code>）享有<span className="text-purple-200 font-semibold">订阅优惠价</span>，
            适合大量需要联网搜索 / 实时信息的场景，单次调用成本远低于第三方模型。
          </div>
        </section>

        {/* 当前订阅状态 */}
        {activeSub && (
          <section className="mb-10">
            <div className="rounded-2xl p-5 border border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-purple-950/20 to-transparent">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xs text-emerald-300 mb-1">✓ 已开通</div>
                  <div className="text-lg font-bold text-white">{activeSub.plan.displayName}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">到期时间</div>
                  <div className="text-sm text-emerald-300 font-mono">{new Date(activeSub.expiresAt).toLocaleString('zh-CN')}</div>
                </div>
              </div>
              <div className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">本期额度使用</span>
                  <span className="text-white font-mono">${activeSub.quotaUsedUsd.toFixed(4)} / ${activeSub.quotaTotalUsd}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-emerald-400" style={{ width: `${Math.min(100, (activeSub.quotaUsedUsd / activeSub.quotaTotalUsd) * 100)}%` }} />
                </div>
              </div>
              <div className="text-xs text-gray-500">额度内调用免费消耗，超出后自动转为按 token 实时扣费（从 AI 余额）</div>
            </div>
          </section>
        )}

        {/* Pro 订阅套餐 */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-purple-200">{activeSub ? '续订套餐' : '开通 Pro 套餐'}</h2>
            <span className="text-xs text-gray-500">AI 余额：<span className="text-cyan-300 font-mono">${aiBalance.toFixed(4)}</span></span>
          </div>
          {dataLoading ? (
            <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-8 text-center text-gray-400">加载中...</div>
          ) : plans.length === 0 ? (
            <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-8 text-center">
              <p className="text-gray-300 mb-2">暂无可订阅套餐 🚀</p>
              <p className="text-xs text-gray-500">您仍可通过下方"按 Token 实时计费"模式直接调用</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plans.map((p) => {
                const features: string[] = (() => { try { return p.features ? JSON.parse(p.features) : []; } catch { return []; } })();
                const savings = p.payAsYouGoEquivUsd ? Math.round((1 - p.priceUsd / p.payAsYouGoEquivUsd) * 100) : 0;
                return (
                  <div key={p.id} className={`relative rounded-2xl p-5 border ${p.highlight ? 'border-purple-400/60 bg-gradient-to-br from-purple-900/40 to-fuchsia-900/20 shadow-lg shadow-purple-900/20' : 'border-purple-500/30 bg-gradient-to-br from-purple-950/30 to-fuchsia-950/10'}`}>
                    {p.highlight && <div className="absolute -top-2 right-4 px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 text-[10px] font-bold">推荐</div>}
                    <div className="font-bold text-white mb-1">{p.displayName}</div>
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-3xl font-bold bg-gradient-to-r from-purple-300 to-fuchsia-300 bg-clip-text text-transparent">${p.priceUsd}</span>
                      <span className="text-xs text-gray-500">/ {p.durationDays} 天</span>
                      {savings > 0 && <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">省 {savings}%</span>}
                    </div>
                    <div className="bg-slate-900/40 rounded-lg p-3 mb-3 space-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-gray-500">套餐额度</span><span className="text-cyan-300 font-mono">${p.monthlyQuotaUsd}</span></div>
                      {p.payAsYouGoEquivUsd && (
                        <div className="flex justify-between"><span className="text-gray-500">同等用量按 token 计费</span><span className="text-orange-300 font-mono line-through">${p.payAsYouGoEquivUsd}</span></div>
                      )}
                    </div>
                    {features.length > 0 && (
                      <ul className="space-y-1 mb-3 text-xs text-gray-300">
                        {features.map((f, i) => (<li key={i} className="flex items-start gap-2"><span className="text-purple-400 mt-0.5">✓</span><span>{f}</span></li>))}
                      </ul>
                    )}
                    {p.intro && <div className="text-xs text-gray-400 mb-4 whitespace-pre-line border-l-2 border-purple-500/30 pl-3">{p.intro}</div>}
                    <button
                      onClick={() => handleSubscribe(p)}
                      disabled={subscribing === p.id || (!!activeSub)}
                      className={`w-full py-2.5 rounded-lg text-sm font-medium transition ${p.highlight ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500' : 'bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40'} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {subscribing === p.id ? '开通中...' : activeSub ? '已有进行中订阅' : `立即开通  ·  扣费 $${p.priceUsd}`}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Token 实时计费 (折叠/低优先) */}
        <section className="mb-10">
          <details className="rounded-2xl border border-slate-700 bg-slate-800/30 overflow-hidden">
            <summary className="cursor-pointer p-4 hover:bg-slate-800/60 flex items-center justify-between">
              <div>
                <div className="font-semibold text-white text-sm">按 Token 实时计费（不开套餐也能用）</div>
                <div className="text-xs text-gray-500 mt-0.5">每次调用按 input/output token 从 AI 余额扣费 · 无月费 · 无承诺</div>
              </div>
              <span className="text-xs text-gray-400">展开 ↓</span>
            </summary>
            <div className="p-4 border-t border-slate-700">
              {tiers.length === 0 ? (
                <div className="text-xs text-gray-500">管理员尚未配置 token 计费档位</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {tiers.map((t) => (
                    <div key={t.id} className="rounded-xl p-3 border border-slate-700 bg-slate-900/40">
                      <div className="font-semibold text-sm text-white mb-1">{t.displayName}</div>
                      <div className="text-xs space-y-0.5">
                        <div className="flex justify-between"><span className="text-gray-500">输入</span><span className="text-purple-300 font-mono">${t.pricePerMillionInput}/M</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">输出</span><span className="text-purple-300 font-mono">${t.pricePerMillionOutput}/M</span></div>
                      </div>
                      <button onClick={() => { setNewKeyTier(t.id); setShowCreateKey(true); }} className="mt-2 w-full py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs">用此档位创建 Key</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </details>
        </section>

        {/* 我的 Key */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-purple-200">我的 API Key</h2>
            {tiers.length > 0 && (
              <button
                onClick={() => setShowCreateKey(true)}
                className="px-4 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 rounded-lg text-sm transition"
              >
                + 新建 Key
              </button>
            )}
          </div>

          {keys.length === 0 ? (
            <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-8 text-center text-gray-400 text-sm">
              暂无 Key，点击上方按钮创建
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((k) => (
                <div key={k.id} className="rounded-2xl p-4 border border-slate-700 bg-slate-800/40">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-semibold text-white">{k.keyName}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{k.tier?.displayName}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${k.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>{k.status}</span>
                      <button onClick={() => handleDeleteKey(k.id)} className="text-xs text-red-400 hover:text-red-300">删除</button>
                    </div>
                  </div>
                  <div className="bg-slate-900/60 rounded-lg p-2 flex items-center justify-between gap-2">
                    <code className="text-xs font-mono text-purple-300 truncate">{k.apiKey}</code>
                    <button onClick={() => copyToClipboard(k.apiKey, k.id)} className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded shrink-0">
                      {copiedKey === k.id ? '已复制' : '复制'}
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
                    <div><div className="text-gray-500">本月用量</div><div className="text-cyan-300 font-mono">${k.monthUsed.toFixed(4)}</div></div>
                    <div><div className="text-gray-500">累计用量</div><div className="text-cyan-300 font-mono">${k.totalUsed.toFixed(4)}</div></div>
                    <div><div className="text-gray-500">本月请求</div><div className="text-cyan-300 font-mono">{k.monthRequestCount}</div></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 接入说明 */}
        <section className="mb-10">
          <h2 className="text-lg font-bold mb-4 text-purple-200">如何接入</h2>
          <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
              <div>
                <p className="text-sm text-gray-300">Cardvela Pro 使用 OpenAI 兼容接口，base URL 与 API Key 填入对应工具即可。</p>
                <p className="text-xs text-gray-500 mt-1">推荐模型：<code className="px-1.5 py-0.5 rounded bg-slate-900 text-purple-300">auto</code> 智能路由，或按需指定 <code className="px-1.5 py-0.5 rounded bg-slate-900 text-purple-300">claude / gpt-5.5 / gemini / grok / sonar</code>。</p>
              </div>
              {keys.length === 0 && <button onClick={() => setShowCreateKey(true)} className="px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 rounded-lg text-xs">先创建 Key</button>}
            </div>

            <div className="flex gap-2 mb-4 flex-wrap">
              {(['vscode', 'cursor', 'claudecode', 'continue', 'openai', 'curl'] as const).map(tab => (
                <button key={tab} onClick={() => setAiConfigTab(tab)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${aiConfigTab === tab ? 'bg-purple-600 text-white' : 'bg-slate-700/80 hover:bg-slate-600 text-gray-300'}`}>
                  {tab === 'vscode' ? 'VS Code (Cline)' : tab === 'cursor' ? 'Cursor' : tab === 'claudecode' ? 'Claude Code' : tab === 'continue' ? 'Continue' : tab === 'openai' ? 'OpenAI SDK' : 'curl'}
                </button>
              ))}
            </div>

            {(() => {
              const clean = (platformApiUrl || 'https://api.cardvela.com').replace(/\/+$/, '');
              const apiKey = keys[0]?.apiKey || '<你的 Cardvela Pro Key>';
              const openaiBase = `${clean}/v1`;
              const anthropicBase = clean;
              const snippets: Record<typeof aiConfigTab, string> = {
                vscode: `# VS Code (Cline)\nAPI Provider: OpenAI Compatible\nBase URL: ${openaiBase}\nAPI Key: ${apiKey}\nModel: auto\n\n# 代码开发可选模型\nclaude / gpt-5.5 / gemini / grok`,
                cursor: `# Cursor → Settings → Models → Override OpenAI Base URL\nOpenAI Base URL: ${openaiBase}\nAPI Key: ${apiKey}\nModel: auto\n\n# 搜索任务可用 sonar，代码任务建议 claude 或 auto`,
                claudecode: `# Claude Code（Claude 模型专用）\nexport ANTHROPIC_BASE_URL=${anthropicBase}\nexport ANTHROPIC_API_KEY=${apiKey}\nexport CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK=1\nexport CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1\n\n# 如果工具要求模型名，填写 claude 或 claude-opus`,
                continue: `# Continue config.json\n{\n  "models": [{\n    "title": "Cardvela Pro",\n    "provider": "openai",\n    "model": "auto",\n    "apiBase": "${openaiBase}",\n    "apiKey": "${apiKey}"\n  }]\n}`,
                openai: `import OpenAI from "openai";\n\nconst client = new OpenAI({\n  apiKey: "${apiKey}",\n  baseURL: "${openaiBase}",\n});\n\nconst res = await client.chat.completions.create({\n  model: "auto",\n  messages: [{ role: "user", content: "分析一下这个项目应该怎么重构" }],\n  stream: true,\n});`,
                curl: `curl -X POST ${openaiBase}/chat/completions \\\n+  -H "Authorization: Bearer ${apiKey}" \\\n+  -H "Content-Type: application/json" \\\n+  -d '{\n    "model": "auto",\n    "messages": [{"role":"user","content":"分析一下这篇论文的核心创新点，并用 sonar 搜索补充最新资料"}],\n    "stream": true\n  }'`,
              };
              const text = snippets[aiConfigTab];
              return (
                <>
                  <pre className="bg-slate-900/80 rounded-lg p-4 text-xs font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap">{text}</pre>
                  <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
                    <p className="text-xs text-gray-500">支持流式与非流式调用，可接入 Cline / Cursor / Claude Code / Continue / Open WebUI / 自研客户端。</p>
                    <button onClick={() => { navigator.clipboard.writeText(text); setMessage({ type: 'success', text: '接入配置已复制' }); }} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs">复制当前配置</button>
                  </div>
                </>
              );
            })()}
          </div>
        </section>
      </main>

      {/* 创建 Key Modal */}
      {showCreateKey && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCreateKey(false)}>
          <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">创建 Cardvela Pro Key</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Key 名称 *</label>
                <input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="例如：研究助手" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">套餐 *</label>
                <select value={newKeyTier} onChange={(e) => setNewKeyTier(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">
                  <option value="">请选择</option>
                  {tiers.map((t) => (
                    <option key={t.id} value={t.id}>{t.displayName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">月度限额（美元，可选）</label>
                <input type="number" step="0.01" value={newKeyLimit} onChange={(e) => setNewKeyLimit(e.target.value)} placeholder="留空 = 不限" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setShowCreateKey(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm">取消</button>
              <button onClick={handleCreateKey} disabled={creatingKey} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg text-sm font-medium">
                {creatingKey ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
