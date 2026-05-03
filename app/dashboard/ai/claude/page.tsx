'use client';

import { useAuth } from '../../../../src/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ClaudeAIPage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();

  const [aiTiers, setAiTiers] = useState<any[]>([]);
  const [aiKeys, setAiKeys] = useState<any[]>([]);
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [aiUsage, setAiUsage] = useState<any>(null);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyTier, setNewKeyTier] = useState('');
  const [newKeyLimit, setNewKeyLimit] = useState('');
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [aiConfigTab, setAiConfigTab] = useState<'cline' | 'cursor' | 'claudecode' | 'openai'>('cline');
  const [showAiTransfer, setShowAiTransfer] = useState(false);
  const [aiTransferAmount, setAiTransferAmount] = useState('');
  const [aiTransferDirection, setAiTransferDirection] = useState<'main_to_ai' | 'ai_to_main'>('main_to_ai');
  const [aiTransfering, setAiTransfering] = useState(false);
  const [aiTransferMultiplier, setAiTransferMultiplier] = useState(1);
  const [enterpriseUsage, setEnterpriseUsage] = useState<any>(null);
  const [enterpriseApps, setEnterpriseApps] = useState<any[]>([]);
  const [showEnterpriseApply, setShowEnterpriseApply] = useState(false);
  const [enterpriseForm, setEnterpriseForm] = useState({ companyName: '', contactName: '', contactPhone: '', useCase: '', estimatedUsage: '' });
  const [applyingEnterprise, setApplyingEnterprise] = useState(false);
  const [platformApiUrl, setPlatformApiUrl] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  useEffect(() => {
    fetchAIData();
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
        if (d.aiTransferMultiplier) setAiTransferMultiplier(Number(d.aiTransferMultiplier) || 1);
      }
    } catch {}
  };

  const fetchAIData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };
      const [tiersRes, keysRes, summaryRes, usageRes] = await Promise.all([
        fetch('/api/user/ai-service/tiers', { headers }),
        fetch('/api/user/ai-service/keys', { headers }),
        fetch('/api/user/ai-service/usage/summary', { headers }),
        fetch('/api/user/ai-service/usage?period=30d', { headers }),
      ]);
      if (tiersRes.ok) { const d = await tiersRes.json(); setAiTiers((d.tiers || []).filter((t: any) => t.modelGroup !== 'gemini')); }
      if (keysRes.ok) { const d = await keysRes.json(); setAiKeys((d.keys || []).filter((k: any) => k.tier?.modelGroup !== 'gemini')); }
      if (summaryRes.ok) { const d = await summaryRes.json(); setAiSummary(d); }
      if (usageRes.ok) { const d = await usageRes.json(); setAiUsage(d); }
      const entUsageRes = await fetch('/api/user/enterprise/usage', { headers });
      if (entUsageRes.ok) { const d = await entUsageRes.json(); setEnterpriseUsage(d); }
      const appRes = await fetch('/api/user/enterprise/apply', { headers });
      if (appRes.ok) { const d = await appRes.json(); setEnterpriseApps(d.applications || []); }
    } catch (error) {
      console.error('获取 AI 服务数据失败:', error);
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
        body: JSON.stringify({ keyName: newKeyName.trim(), tierId: newKeyTier, monthlyLimit: newKeyLimit ? parseFloat(newKeyLimit) : null, label: newKeyLabel.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details || '创建失败');
      setMessage({ type: 'success', text: 'API Key 创建成功！请妥善保管。' });
      setShowCreateKey(false);
      setNewKeyName(''); setNewKeyTier(''); setNewKeyLimit(''); setNewKeyLabel('');
      fetchAIData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setCreatingKey(false);
    }
  };

  const handleAiTransfer = async () => {
    const amount = parseFloat(aiTransferAmount);
    if (!amount || amount <= 0) { setMessage({ type: 'error', text: '请输入有效金额' }); return; }
    setAiTransfering(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/user/ai-service/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount, direction: aiTransferDirection }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage({ type: 'success', text: aiTransferDirection === 'main_to_ai' ? `转账成功，AI 钱包到账 $${Number(data.creditedAmount || 0).toFixed(2)}` : `转账成功，账户余额已增加 $${amount.toFixed(2)}` });
      setShowAiTransfer(false); setAiTransferAmount(''); setAiTransferDirection('main_to_ai');
      refreshUser(); fetchAIData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setAiTransfering(false);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('确定要删除此 Key 吗？删除后无法恢复。')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/user/ai-service/keys/${keyId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setMessage({ type: 'success', text: 'Key 已删除' });
      fetchAIData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleToggleKey = async (keyId: string, currentStatus: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/user/ai-service/keys/${keyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: currentStatus === 'active' ? 'disabled' : 'active' }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      fetchAIData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleEnterpriseApply = async () => {
    if (!enterpriseForm.companyName.trim() || !enterpriseForm.contactName.trim() || !enterpriseForm.contactPhone.trim()) {
      setMessage({ type: 'error', text: '请填写公司名称、联系人和联系电话' }); return;
    }
    setApplyingEnterprise(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/user/enterprise/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(enterpriseForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage({ type: 'success', text: '企业账户申请已提交，我们将在 1-3 个工作日内审核' });
      setShowEnterpriseApply(false);
      setEnterpriseForm({ companyName: '', contactName: '', contactPhone: '', useCase: '', estimatedUsage: '' });
      fetchAIData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setApplyingEnterprise(false);
    }
  };

  const copyToClipboard = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">加载中...</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* 顶部导航 */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm flex items-center gap-1">
            ← 返回主页
          </Link>
          <span className="text-gray-600">/</span>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 1L13.5 9L19 4L15 10.5L23 12L15 13.5L19 20L13.5 15L12 23L10.5 15L5 20L9 13.5L1 12L9 10.5L5 4L10.5 9Z"/></svg>
            </div>
            <span className="font-semibold text-white">Claude AI 服务</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* 消息提示 */}
        {message && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-lg ${message.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {message.text}
          </div>
        )}

        {/* 概览卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800 rounded-xl p-4 border border-orange-500/30">
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
              <span className="text-orange-400">🤖</span> AI 钱包余额
            </div>
            <div className="text-2xl font-bold text-orange-400">${aiSummary?.aiBalance?.toFixed(2) || (user?.aiBalance ?? 0).toFixed(2)}</div>
            <button onClick={() => setShowAiTransfer(true)} className="text-xs text-orange-400 hover:text-orange-300 mt-1 underline">转入/转出</button>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-1"><span className="text-red-400">📊</span> 本月消费</div>
            <div className="text-2xl font-bold text-red-400">${aiSummary?.monthCost?.toFixed(2) || '0.00'}</div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-1"><span className="text-purple-400">⚡</span> 本月请求</div>
            <div className="text-2xl font-bold">{aiSummary?.monthRequests || 0}</div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-1"><span className="text-amber-400">🔑</span> 活跃 Key</div>
            <div className="text-2xl font-bold">{aiSummary?.activeKeys || 0} / {aiSummary?.totalKeys || 0}</div>
          </div>
        </div>

        {/* 可选套餐 */}
        {aiTiers.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">📦 可选套餐</h2>
            {aiTiers.map((tier: any) => (
              <div key={tier.id} className={`rounded-xl p-6 border transition-all ${
                tier.modelGroup === 'gpt' ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-emerald-900/10' :
                tier.modelGroup === 'mixed' ? 'border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-purple-900/10' :
                'border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-amber-900/10'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-lg">{tier.displayName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      tier.modelGroup === 'gpt' ? 'bg-emerald-500/20 text-emerald-400' :
                      tier.modelGroup === 'mixed' ? 'bg-purple-500/20 text-purple-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>{tier.modelGroup === 'gpt' ? 'GPT' : tier.modelGroup === 'mixed' ? '混合' : 'Claude'}</span>
                  </div>
                  <button
                    onClick={() => { setNewKeyTier(tier.id); setShowCreateKey(true); }}
                    disabled={tier.canUse === false}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${tier.canUse === false ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                  >
                    {tier.canUse === false ? '🔒 需企业认证' : '+ 创建 Key'}
                  </button>
                </div>
                {tier.description && <p className="text-sm text-gray-400 mb-4">{tier.description}</p>}
                {tier.features && tier.features.length > 0 && (
                  <div className="mb-4 rounded-lg bg-slate-800/80 p-3">
                    <div className="text-xs text-gray-400 mb-1">核心特性</div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {tier.features.map((f: string, i: number) => (
                        <span key={i} className="text-sm text-gray-300 flex items-center gap-1"><span className="text-green-400">✓</span> {f}</span>
                      ))}
                    </div>
                  </div>
                )}
                {tier.models && tier.models.length > 0 && (
                  <div className="border-t border-slate-700 pt-4">
                    <p className="text-sm font-medium text-gray-300 mb-3">可用模型官方定价 <span className="text-xs text-gray-500">(按实际 token 计费 / 百万 tokens)</span></p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-gray-400 border-b border-slate-700">
                            <th className="pb-2 text-left font-medium">模型名称</th>
                            <th className="pb-2 text-right font-medium">Input</th>
                            <th className="pb-2 text-right font-medium">Output</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tier.models.map((m: any, i: number) => {
                            const isLegacyOpus = /^claude-opus-4\.(5|6)(-|$)/.test(m.name || '');
                            const inR = (typeof m.inputRatio === 'number' && m.inputRatio > 0) ? m.inputRatio
                                      : (typeof m.ratio === 'number' && m.ratio > 0) ? m.ratio
                                      : (typeof m.inputPrice === 'number' && tier.pricePerMillionInput > 0) ? m.inputPrice / tier.pricePerMillionInput
                                      : 1;
                            const outR = (typeof m.outputRatio === 'number' && m.outputRatio > 0) ? m.outputRatio
                                       : (typeof m.ratio === 'number' && m.ratio > 0) ? m.ratio
                                       : (typeof m.outputPrice === 'number' && tier.pricePerMillionOutput > 0) ? m.outputPrice / tier.pricePerMillionOutput
                                       : inR;
                            const fmtR = (n: number) => Number.isInteger(n) ? `${n}x` : `${n.toFixed(2)}x`;
                            const ratioLabel = (Math.abs(inR - outR) < 0.001) ? fmtR(inR) : `${fmtR(inR)} / ${fmtR(outR)}`;
                            const ratioColorBase = Math.max(inR, outR);
                            const inputPriceShown = typeof m.inputPrice === 'number' ? m.inputPrice : tier.pricePerMillionInput * inR;
                            const outputPriceShown = typeof m.outputPrice === 'number' ? m.outputPrice : tier.pricePerMillionOutput * outR;
                            return (
                            <tr key={i} className={`border-b border-slate-700/30 hover:bg-slate-800/40 ${isLegacyOpus ? 'opacity-60' : ''}`}>
                              <td className="py-2 text-gray-200 font-mono text-xs">
                                {m.name}
                                {isLegacyOpus && (
                                  <span className="ml-2 inline-block text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-sans" title="GitHub Copilot 已下线 Opus 4.5/4.6，请改用 claude-opus-4.7">
                                    已下线 · 请用 opus-4.7
                                  </span>
                                )}
                              </td>
                              <td className="py-2 text-right text-cyan-300 font-mono text-xs">${inputPriceShown.toFixed(2)}</td>
                              <td className="py-2 text-right text-orange-300 font-mono text-xs">${outputPriceShown.toFixed(2)}</td>
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 我的 Key */}
        <div className="bg-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">🔑 我的 API Key</h2>
            <button onClick={() => setShowCreateKey(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium">+ 创建 Key</button>
          </div>
          {/* 防滥用警示 */}
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
            <div className="flex items-start gap-2">
              <span className="text-red-400 text-sm leading-none mt-0.5">⚠️</span>
              <div className="space-y-1 leading-relaxed">
                <p className="font-semibold text-red-300">使用须知（请仔细阅读）</p>
                <p>· 每个 API Key 仅供本人单端使用，<span className="text-red-300 font-medium">严禁多人共享或同时在多个平台/设备调用同一 Key</span>。</p>
                <p>· 一经核实违规共享，将<span className="text-red-300 font-medium">立即禁用账户全部 AI 功能、冻结 AI 钱包余额且不予退款</span>。</p>
                <p>· 普通用户最多创建 2 个 Key；如需更多，请申请企业认证。</p>
              </div>
            </div>
          </div>
          {aiKeys.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-4">🔑</div>
              <p>您还没有任何 API Key</p>
              <p className="text-sm mt-1">创建 Key 后即可在 Cline / Cursor / Claude Code 等工具中使用</p>
            </div>
          ) : (
            <div className="space-y-3">
              {aiKeys.map((key: any) => (
                <div key={key.id} className="bg-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-semibold">{key.keyName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${key.tier?.modelGroup === 'gpt' ? 'bg-emerald-600/20 text-emerald-400' : key.tier?.modelGroup === 'mixed' ? 'bg-purple-600/20 text-purple-400' : 'bg-amber-600/20 text-amber-400'}`}>
                        {key.tier?.modelGroup === 'gpt' ? 'GPT' : key.tier?.modelGroup === 'mixed' ? '混合' : 'Claude'}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-600/20 text-blue-400">{key.tier?.displayName || key.tier?.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${key.status === 'active' ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}>{key.status === 'active' ? '活跃' : '已禁用'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleToggleKey(key.id, key.status)} className={`text-xs px-3 py-1 rounded ${key.status === 'active' ? 'bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30' : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'}`}>{key.status === 'active' ? '禁用' : '启用'}</button>
                      <button onClick={() => handleDeleteKey(key.id)} className="text-xs px-3 py-1 rounded bg-red-600/20 text-red-400 hover:bg-red-600/30">删除</button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-800 px-3 py-2 rounded-lg text-sm font-mono">
                    <span className="flex-1 truncate text-gray-300">{key.apiKey}</span>
                    <button onClick={() => copyToClipboard(key.apiKey, key.id)} className="text-blue-400 hover:text-blue-300 text-xs whitespace-nowrap">{copiedKey === key.id ? '✓ 已复制' : '复制'}</button>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 flex-wrap">
                    <span>Base URL: {platformApiUrl || 'https://api.cardvela.com'}</span>
                    <span>本月: ${key.monthUsed?.toFixed(2) || '0.00'}</span>
                    <span>累计: ${key.totalUsed?.toFixed(2) || '0.00'}</span>
                    {key.monthlyLimit && <span>月限: ${key.monthlyLimit}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 快速配置 */}
        {aiKeys.length > 0 && (
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">⚡ 快速配置</h2>
            <div className="flex gap-2 mb-4 flex-wrap">
              {(['cline', 'cursor', 'claudecode', 'openai'] as const).map(tab => (
                <button key={tab} onClick={() => setAiConfigTab(tab)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${aiConfigTab === tab ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}>
                  {tab === 'cline' ? 'Cline' : tab === 'cursor' ? 'Cursor' : tab === 'claudecode' ? 'Claude Code' : 'OpenAI 兼容'}
                </button>
              ))}
            </div>
            {(() => {
              const firstKey = aiKeys[0];
              const baseUrl = platformApiUrl || 'https://api.cardvela.com';
              const apiKey = firstKey?.apiKey || '';
              const urlForTool = (tool: string) => {
                const clean = baseUrl.replace(/\/+$/, '');
                switch (tool) {
                  case 'cline': return `${clean}/`;
                  case 'cursor': return `${clean}/v1`;
                  case 'claudecode': return clean;
                  case 'openai': return `${clean}/v1`;
                  default: return clean;
                }
              };
              return (
                <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm text-green-400">
                  {aiConfigTab === 'cline' && (<div><p className="text-gray-500 mb-1"># Cline 配置 → Settings → API Provider → Anthropic</p><p>Base URL: {urlForTool('cline')}</p><p>API Key: {apiKey}</p></div>)}
                  {aiConfigTab === 'cursor' && (<div><p className="text-gray-500 mb-1"># Cursor 配置 → Settings → Models → Override OpenAI Base URL</p><p>Base URL: {urlForTool('cursor')}</p><p>API Key: {apiKey}</p></div>)}
                  {aiConfigTab === 'claudecode' && (<div><p className="text-gray-500 mb-1"># Claude Code 环境变量</p><p>export ANTHROPIC_BASE_URL={urlForTool('claudecode')}</p><p>export ANTHROPIC_API_KEY={apiKey}</p><p>export CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK=1</p><p>export CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1</p></div>)}
                  {aiConfigTab === 'openai' && (<div><p className="text-gray-500 mb-1"># OpenAI 兼容客户端</p><p>Base URL: {urlForTool('openai')}</p><p>API Key: {apiKey}</p></div>)}
                </div>
              );
            })()}
            <button onClick={() => {
              const firstKey = aiKeys[0];
              const clean = (platformApiUrl || 'https://api.cardvela.com').replace(/\/+$/, '');
              const key = firstKey?.apiKey || '';
              let text = '';
              if (aiConfigTab === 'cline') text = `Base URL: ${clean}/\nAPI Key: ${key}`;
              else if (aiConfigTab === 'cursor') text = `Base URL: ${clean}/v1\nAPI Key: ${key}`;
              else if (aiConfigTab === 'claudecode') text = `export ANTHROPIC_BASE_URL=${clean}\nexport ANTHROPIC_API_KEY=${key}\nexport CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK=1\nexport CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1`;
              else text = `Base URL: ${clean}/v1\nAPI Key: ${key}`;
              navigator.clipboard.writeText(text);
              setMessage({ type: 'success', text: '配置信息已复制！' });
            }} className="mt-3 bg-slate-700 px-4 py-2 rounded-lg hover:bg-slate-600 text-sm">📋 一键复制配置</button>
          </div>
        )}

        {/* 用量趋势 */}
        {aiUsage && aiUsage.daily && aiUsage.daily.length > 0 && (
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">📊 用量趋势（最近 30 天）</h2>
            <div className="space-y-2">
              {aiUsage.daily.map((day: any) => {
                const maxCost = Math.max(...aiUsage.daily.map((d: any) => d.cost), 1);
                return (
                  <div key={day.date} className="flex items-center gap-3 text-sm">
                    <span className="text-gray-400 w-24">{day.date.slice(5)}</span>
                    <div className="flex-1 bg-slate-700 rounded-full h-5 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full flex items-center px-2" style={{ width: `${Math.max((day.cost / maxCost) * 100, 2)}%` }}>
                        {day.cost > 0 && <span className="text-xs text-white font-medium">${day.cost.toFixed(2)}</span>}
                      </div>
                    </div>
                    <span className="text-gray-400 w-16 text-right">{day.count} 次</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 企业账户升级 */}
        {user?.role !== 'enterprise' && user?.role?.toUpperCase() !== 'ADMIN' && (
          <div className="bg-gradient-to-r from-slate-800 to-slate-800/80 rounded-xl p-6 border border-purple-500/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">🏢 企业账户</h2>
                <p className="text-sm text-gray-400 mt-1">升级为企业账户，解锁员工 Key 管理、用量分析等高级功能</p>
              </div>
              {(() => {
                const latestApp = enterpriseApps[0];
                if (!latestApp || latestApp.status === 'rejected') {
                  return <button onClick={() => setShowEnterpriseApply(true)} className="bg-purple-600 px-4 py-2 rounded-lg hover:bg-purple-700 text-sm font-medium">申请企业账户</button>;
                }
                return null;
              })()}
            </div>
            {(() => {
              const latestApp = enterpriseApps[0];
              if (latestApp?.status === 'pending') return (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-yellow-400 font-medium"><span>⏳</span> 申请审核中</div>
                  <p className="text-sm text-gray-400 mt-1">您的企业账户申请（{latestApp.companyName}）正在审核中，预计 1-3 个工作日内完成</p>
                </div>
              );
              if (latestApp?.status === 'rejected') return (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-400 font-medium"><span>✕</span> 申请未通过</div>
                  <p className="text-sm text-gray-400 mt-1">原因：{latestApp.rejectReason}</p>
                </div>
              );
              return (
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-slate-700/50 rounded-lg p-3"><div className="text-purple-400 text-lg mb-1">👥</div><div className="text-sm font-medium">员工 Key 管理</div></div>
                  <div className="bg-slate-700/50 rounded-lg p-3"><div className="text-purple-400 text-lg mb-1">📊</div><div className="text-sm font-medium">用量分析</div></div>
                  <div className="bg-slate-700/50 rounded-lg p-3"><div className="text-purple-400 text-lg mb-1">💰</div><div className="text-sm font-medium">预算管控</div></div>
                </div>
              );
            })()}
          </div>
        )}

        {/* 企业管理 */}
        {(user?.role === 'enterprise' || user?.role?.toUpperCase() === 'ADMIN') && enterpriseUsage && (
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">📊 企业用量总览</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30"><div className="text-sm text-gray-400">本月总消费</div><div className="text-2xl font-bold text-blue-400">${enterpriseUsage.month?.cost?.toFixed(2) || '0.00'}</div></div>
              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30"><div className="text-sm text-gray-400">本月总请求</div><div className="text-2xl font-bold">{enterpriseUsage.month?.requests || 0}</div></div>
              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30"><div className="text-sm text-gray-400">本月 Tokens</div><div className="text-2xl font-bold text-purple-400">{((enterpriseUsage.month?.tokens || 0) / 1000).toFixed(1)}K</div></div>
              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30"><div className="text-sm text-gray-400">员工 Key 数</div><div className="text-2xl font-bold text-cyan-400">{enterpriseUsage.keyCount || 0}</div></div>
            </div>
          </div>
        )}
      </div>

      {/* 创建 Key 弹窗 */}
      {showCreateKey && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-slate-800 p-4 sm:p-6 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">🔑 创建 API Key</h3>
            {(user?.aiBalance ?? 0) <= 0 && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4">
                <p className="text-red-400 text-sm font-medium">AI 钱包余额不足，无法创建 Key</p>
                <p className="text-red-400/70 text-xs mt-1">请先从账户余额转入 AI 钱包。</p>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Key 名称 *</label>
                <input type="text" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="例如：生产环境、测试用" className="w-full bg-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">选择套餐 *</label>
                <div className="grid gap-3">
                  {aiTiers.map((tier: any) => (
                    <div key={tier.id} onClick={() => tier.canUse !== false && setNewKeyTier(tier.id)}
                      className={`p-4 rounded-lg border-2 transition-all ${tier.canUse === false ? 'border-slate-700 bg-slate-800 opacity-50 cursor-not-allowed' : newKeyTier === tier.id ? 'border-blue-500 bg-blue-500/10 cursor-pointer' : 'border-slate-600 bg-slate-700 hover:border-slate-500 cursor-pointer'}`}>
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{tier.displayName}</span>
                          {tier.canUse === false && <span className="text-xs text-orange-400">🔒 需企业认证</span>}
                        </div>
                        <span className="text-sm text-green-400">输入 ${tier.pricePerMillionInput}/M · 输出 ${tier.pricePerMillionOutput}/M</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {tier.features?.map((f: string, i: number) => <span key={i} className="text-xs bg-slate-600 px-2 py-0.5 rounded">{f}</span>)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">月度限额 (USD，留空不限)</label>
                <input type="number" value={newKeyLimit} onChange={(e) => setNewKeyLimit(e.target.value)} placeholder="例如：100" min="0" step="1" className="w-full bg-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {(user?.role === 'enterprise' || user?.role === 'admin' || user?.role === 'ADMIN') && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">员工/部门标签</label>
                  <input type="text" value={newKeyLabel} onChange={(e) => setNewKeyLabel(e.target.value)} placeholder="例如：张三、设计部" className="w-full bg-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleCreateKey} disabled={creatingKey || !newKeyName.trim() || !newKeyTier || (user?.aiBalance ?? 0) <= 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-2 rounded-lg font-medium transition">
                {creatingKey ? '创建中...' : (user?.aiBalance ?? 0) <= 0 ? 'AI余额不足' : '创建 Key'}
              </button>
              <button onClick={() => { setShowCreateKey(false); setNewKeyName(''); setNewKeyTier(''); setNewKeyLimit(''); setNewKeyLabel(''); }} className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg font-medium">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* AI 转账弹窗 */}
      {showAiTransfer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-slate-800 p-6 rounded-xl w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">💸 AI 钱包转账</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setAiTransferDirection('main_to_ai')} className={`py-2 rounded-lg text-sm font-medium ${aiTransferDirection === 'main_to_ai' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}>账户 → AI 钱包</button>
                <button onClick={() => setAiTransferDirection('ai_to_main')} className={`py-2 rounded-lg text-sm font-medium ${aiTransferDirection === 'ai_to_main' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}>AI 钱包 → 账户</button>
              </div>
              {aiTransferDirection === 'main_to_ai' && aiTransferMultiplier !== 1 && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm text-blue-300">充值赠送：转入 $1 实际到账 ${aiTransferMultiplier}</div>
              )}
              {aiTransferDirection === 'main_to_ai' && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
                  ⚠️ AI 钱包充值<span className="font-semibold text-amber-300">最低 $10 起</span>，单次不足 $10 将无法提交。
                  {aiTransferMultiplier > 1 && ` 当前赠送倍率 ${aiTransferMultiplier}x。`}
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-400 mb-1">金额 (USD)</label>
                <input type="number" value={aiTransferAmount} onChange={(e) => setAiTransferAmount(e.target.value)} placeholder={aiTransferDirection === 'main_to_ai' ? '最低 $10' : '最低 $1'} min={aiTransferDirection === 'main_to_ai' ? '10' : '1'} step="0.01" className="w-full bg-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="text-sm text-gray-400">
                <p>账户余额：${user?.balance?.toFixed(2) || '0.00'}</p>
                <p>AI 钱包：${aiSummary?.aiBalance?.toFixed(2) || (user?.aiBalance ?? 0).toFixed(2)}</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleAiTransfer} disabled={aiTransfering || !aiTransferAmount} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 py-2 rounded-lg font-medium">{aiTransfering ? '处理中...' : '确认转账'}</button>
              <button onClick={() => { setShowAiTransfer(false); setAiTransferAmount(''); }} className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg font-medium">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* 企业申请弹窗 */}
      {showEnterpriseApply && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-slate-800 p-6 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">🏢 申请企业账户</h3>
            <div className="space-y-4">
              <div><label className="block text-sm text-gray-400 mb-1">公司名称 *</label><input type="text" value={enterpriseForm.companyName} onChange={(e) => setEnterpriseForm({...enterpriseForm, companyName: e.target.value})} className="w-full bg-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">联系人 *</label><input type="text" value={enterpriseForm.contactName} onChange={(e) => setEnterpriseForm({...enterpriseForm, contactName: e.target.value})} className="w-full bg-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">联系电话 *</label><input type="text" value={enterpriseForm.contactPhone} onChange={(e) => setEnterpriseForm({...enterpriseForm, contactPhone: e.target.value})} className="w-full bg-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
              <div><label className="block text-sm text-gray-400 mb-1">使用场景</label><textarea value={enterpriseForm.useCase} onChange={(e) => setEnterpriseForm({...enterpriseForm, useCase: e.target.value})} rows={3} className="w-full bg-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleEnterpriseApply} disabled={applyingEnterprise} className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 py-2 rounded-lg font-medium">{applyingEnterprise ? '提交中...' : '提交申请'}</button>
              <button onClick={() => setShowEnterpriseApply(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg font-medium">取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
