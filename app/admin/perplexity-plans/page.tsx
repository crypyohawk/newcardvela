'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ClientAuthProvider from '../../../src/components/ClientAuthProvider';
import { AdminGuard } from '../../../src/components/AdminGuard';

interface Plan {
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
  sortOrder: number;
  isActive: boolean;
}

const EMPTY: Partial<Plan> = {
  code: '', displayName: '', priceUsd: 22, durationDays: 30,
  monthlyQuotaUsd: 50, payAsYouGoEquivUsd: 80,
  intro: '## 为什么选择 Cardvela Pro?\n\n- 22 美元享 50 美元等价用量\n- 接入 Claude / GPT / Gemini / Sonar 全模型\n- 适合学术写作 / 研究助手 / 数据分析',
  features: '["6 大模型不限切换","Sonar 联网搜索","学术引用"]',
  highlight: false, sortOrder: 0, isActive: true,
};

function PerplexityPlansInner() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Plan> | null>(null);
  const [msg, setMsg] = useState<{ t: 'ok' | 'err'; m: string } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => { load(); }, []);
  useEffect(() => { if (msg) { const t = setTimeout(() => setMsg(null), 4000); return () => clearTimeout(t); } }, [msg]);

  const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

  const load = async () => {
    try {
      const res = await fetch('/api/admin/perplexity-plans', { headers: auth() });
      const d = await res.json();
      if (res.ok) setPlans(d.plans || []);
    } finally { setLoading(false); }
  };

  const save = async () => {
    if (!editing) return;
    setModalError(null);
    const isNew = !editing.id;
    try {
      const res = await fetch(isNew ? '/api/admin/perplexity-plans' : `/api/admin/perplexity-plans/${editing.id}`, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json', ...auth() },
        body: JSON.stringify(editing),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || '保存失败');
      setMsg({ t: 'ok', m: isNew ? '已创建' : '已更新' });
      setEditing(null);
      load();
    } catch (e: any) { setModalError(e.message); }
  };

  const remove = async (id: string) => {
    if (!confirm('确认删除？')) return;
    try {
      const res = await fetch(`/api/admin/perplexity-plans/${id}`, { method: 'DELETE', headers: auth() });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || '删除失败');
      setMsg({ t: 'ok', m: '已删除' });
      load();
    } catch (e: any) { setMsg({ t: 'err', m: e.message }); }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-900/60 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-gray-400 hover:text-white text-sm">← 返回</Link>
            <span className="text-white/20">|</span>
            <h1 className="font-bold">🔮 Cardvela Pro 套餐管理</h1>
          </div>
          <button onClick={() => setEditing({ ...EMPTY })} className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm">+ 新建套餐</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        {msg && <div className={`mb-4 p-3 rounded-lg text-sm ${msg.t === 'ok' ? 'bg-green-500/15 border border-green-500/30 text-green-300' : 'bg-red-500/15 border border-red-500/30 text-red-300'}`}>{msg.m}</div>}

        <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4 mb-6 text-xs text-purple-200/80 leading-relaxed">
          <div className="font-semibold text-purple-200 mb-1">💡 套餐设计指南</div>
          <ul className="list-disc list-inside space-y-1">
            <li><span className="text-purple-300">priceUsd</span>：用户开通时一次性扣费金额（从 aiBalance 扣）</li>
            <li><span className="text-purple-300">monthlyQuotaUsd</span>：本期可用额度（按 token 实际消耗扣减）</li>
            <li><span className="text-purple-300">payAsYouGoEquivUsd</span>：同等用量按 token 实时计费的等价价格，用于在用户端展示「省 X%」</li>
            <li><span className="text-purple-300">intro</span>：Markdown，支持换行 / 列表，将在用户端套餐卡片下方展示</li>
            <li><span className="text-purple-300">features</span>：JSON 数组字符串，例如 <code className="px-1 bg-slate-800 rounded">{`["6 大模型不限切换","Sonar 联网搜索","学术引用"]`}</code></li>
            <li>不开通的用户走 token 实时计费（从 aiBalance 直接扣每次调用费用）</li>
          </ul>
        </div>

        {loading ? (
          <div className="text-gray-400 text-sm">加载中...</div>
        ) : plans.length === 0 ? (
          <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-10 text-center text-gray-400">
            暂无套餐，点击右上角创建
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map((p) => (
              <div key={p.id} className={`rounded-2xl p-5 border ${p.highlight ? 'border-purple-400/60 bg-gradient-to-br from-purple-900/30 to-fuchsia-900/10' : 'border-slate-700 bg-slate-800/40'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-bold text-white">{p.displayName}</div>
                    <div className="text-xs text-gray-500 font-mono">{p.code}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.highlight && <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200">推荐</span>}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.isActive ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-400'}`}>{p.isActive ? '启用' : '停用'}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs my-3">
                  <div><span className="text-gray-500">价格</span><span className="ml-1 text-cyan-300 font-mono">${p.priceUsd}</span><span className="text-gray-500"> / {p.durationDays}天</span></div>
                  <div><span className="text-gray-500">额度</span><span className="ml-1 text-cyan-300 font-mono">${p.monthlyQuotaUsd}</span></div>
                  {p.payAsYouGoEquivUsd != null && <div className="col-span-2"><span className="text-gray-500">等价 token 计费</span><span className="ml-1 text-orange-300 font-mono">${p.payAsYouGoEquivUsd}</span><span className="text-emerald-300 ml-2">省 {Math.round((1 - p.priceUsd / p.payAsYouGoEquivUsd) * 100)}%</span></div>}
                </div>
                {p.intro && <div className="text-xs text-gray-400 mb-3 whitespace-pre-line line-clamp-3">{p.intro}</div>}
                <div className="flex gap-2">
                  <button onClick={() => setEditing(p)} className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs">编辑</button>
                  <button onClick={() => remove(p.id)} className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded text-xs">删除</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {editing && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => { setEditing(null); setModalError(null); }}>
          <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-6 max-w-2xl w-full my-8" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{editing.id ? '编辑套餐' : '新建套餐'}</h3>
            {modalError && <div className="mb-4 p-3 rounded-lg text-sm bg-red-500/15 border border-red-500/30 text-red-300">{modalError}</div>}
            <div className="grid grid-cols-2 gap-3">
              <Field label="code (内部代码)" v={editing.code} onChange={(v) => setEditing({ ...editing, code: v })} placeholder="pro-monthly" />
              <Field label="显示名" v={editing.displayName} onChange={(v) => setEditing({ ...editing, displayName: v })} placeholder="Cardvela Pro 月度" />
              <Field label="价格 USD *" v={editing.priceUsd} onChange={(v) => setEditing({ ...editing, priceUsd: v as any })} type="number" />
              <Field label="时长（天）" v={editing.durationDays} onChange={(v) => setEditing({ ...editing, durationDays: v as any })} type="number" />
              <Field label="本期额度 USD *" v={editing.monthlyQuotaUsd} onChange={(v) => setEditing({ ...editing, monthlyQuotaUsd: v as any })} type="number" />
              <Field label="等价 token 计费 USD" v={editing.payAsYouGoEquivUsd ?? ''} onChange={(v) => setEditing({ ...editing, payAsYouGoEquivUsd: v as any })} type="number" placeholder="用于展示省 X%" />
              <Field label="排序" v={editing.sortOrder} onChange={(v) => setEditing({ ...editing, sortOrder: v as any })} type="number" />
              <div className="flex items-end gap-3">
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!editing.highlight} onChange={(e) => setEditing({ ...editing, highlight: e.target.checked })} />推荐</label>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={editing.isActive !== false} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} />启用</label>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-400 block mb-1">亮点功能 features (JSON 数组字符串)</label>
                <input value={editing.features ?? ''} onChange={(e) => setEditing({ ...editing, features: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm font-mono" placeholder='["6 大模型不限切换","Sonar 联网搜索","学术引用"]' />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-400 block mb-1">套餐介绍 intro (Markdown 支持换行)</label>
                <textarea value={editing.intro ?? ''} onChange={(e) => setEditing({ ...editing, intro: e.target.value })} rows={6} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder={`## 为什么选择 Cardvela Pro?\n\n- 22 美元享 50 美元等价用量\n- 接入 Claude / GPT / Gemini / Sonar 全模型\n- 适合学术写作 / 研究助手 / 数据分析`} />
              </div>
            </div>
            <div className="flex gap-2 mt-6 justify-end">
              <button onClick={() => { setEditing(null); setModalError(null); }} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm">取消</button>
              <button onClick={save} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, v, onChange, type = 'text', placeholder }: { label: string; v: any; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs text-gray-400 block mb-1">{label}</label>
      <input type={type} value={v ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" />
    </div>
  );
}

export default function Page() {
  return (
    <ClientAuthProvider>
      <AdminGuard>
        <PerplexityPlansInner />
      </AdminGuard>
    </ClientAuthProvider>
  );
}
