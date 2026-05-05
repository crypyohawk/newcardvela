'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminGuard } from '../../../src/components/AdminGuard';
import ClientAuthProvider from '../../../src/components/ClientAuthProvider';

interface PerplexityAccount {
  id: string;
  email: string;
  password: string | null;
  port: number;
  newApiChannelId: number | null;
  apiKey: string | null;
  accountType: string;
  status: string;
  expiresAt: string | null;
  lastCheckAt: string | null;
  lastError: string | null;
  notes: string | null;
  cookieLength: number;
  cookiePreview: string;
  createdAt: string;
  updatedAt: string;
}

function PerplexityAccountsPageInner() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<PerplexityAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCookie, setEditingCookie] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    cookie: '',
    port: 4150,
    newApiChannelId: '',
    apiKey: '',
    accountType: 'pro',
    expiresAt: '',
    notes: '',
  });

  const getToken = () => localStorage.getItem('token');

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [message]);

  const fetchAccounts = async () => {
    try {
      setLoadError(null);
      const res = await fetch('/api/admin/perplexity-accounts', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
      } else {
        const data = await res.json().catch(() => ({}));
        setLoadError(data.error || `加载失败 (${res.status})`);
      }
    } catch (e: any) {
      setLoadError('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/perplexity-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          ...formData,
          port: Number(formData.port),
          newApiChannelId: formData.newApiChannelId ? Number(formData.newApiChannelId) : null,
          expiresAt: formData.expiresAt || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '创建失败');
      setMessage({ type: 'success', text: '账号创建成功' });
      setShowAddForm(false);
      setFormData({ email: '', password: '', cookie: '', port: 4150, newApiChannelId: '', apiKey: '', accountType: 'pro', expiresAt: '', notes: '' });
      fetchAccounts();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    }
  };

  const handleUpdate = async (id: string, patch: any) => {
    try {
      const res = await fetch(`/api/admin/perplexity-accounts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '更新失败');
      setMessage({ type: 'success', text: '更新成功' });
      fetchAccounts();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    }
  };

  const handleUpdateCookie = async (id: string) => {
    if (!editingCookie.trim()) {
      setMessage({ type: 'error', text: 'Cookie 不能为空' });
      return;
    }
    await handleUpdate(id, { cookie: editingCookie.trim(), status: 'active', lastError: null });
    setEditingId(null);
    setEditingCookie('');
  };

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`确认删除账号 ${email}？此操作不可恢复。`)) return;
    try {
      const res = await fetch(`/api/admin/perplexity-accounts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '删除失败');
      }
      setMessage({ type: 'success', text: '已删除' });
      fetchAccounts();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    }
  };

  const statusColor = (s: string) => {
    if (s === 'active') return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (s === 'expired') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    if (s === 'disabled') return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={() => router.push('/admin')} className="text-sm text-gray-400 hover:text-white mb-2">← 返回管理后台</button>
            <h1 className="text-2xl font-bold">🔮 Perplexity 账号池管理</h1>
            <p className="text-gray-400 text-sm mt-1">管理 Perplexity Pro 订阅账号 + new-api 渠道映射</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-purple-600 hover:bg-purple-700 px-5 py-2.5 rounded-lg text-sm font-medium transition"
          >
            + 添加账号
          </button>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/15 border border-green-500/30 text-green-400' : 'bg-red-500/15 border border-red-500/30 text-red-400'}`}>
            {message.text}
          </div>
        )}

        {loadError && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-sm">{loadError}</div>
        )}

        {showAddForm && (
          <div className="mb-6 bg-slate-800 border border-purple-500/30 rounded-xl p-5">
            <h3 className="text-lg font-bold mb-4">添加 Perplexity 账号</h3>
            <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">邮箱 *</label>
                <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm" placeholder="user@gmail.com" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">密码（可选，便于运维）</label>
                <input type="text" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">端口 * (从 4150 起)</label>
                <input type="number" required value={formData.port} onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">new-api 渠道 ID</label>
                <input type="number" value={formData.newApiChannelId} onChange={(e) => setFormData({ ...formData, newApiChannelId: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm" placeholder="如 15" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">内部 API Key</label>
                <input type="text" value={formData.apiKey} onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm" placeholder="pplx-pool-internal-4150" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">账号类型</label>
                <select value={formData.accountType} onChange={(e) => setFormData({ ...formData, accountType: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm">
                  <option value="pro">Pro</option>
                  <option value="free">Free</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">订阅到期时间</label>
                <input type="date" value={formData.expiresAt} onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-400 block mb-1">Cookie *（完整 Cookie 字符串）</label>
                <textarea required value={formData.cookie} onChange={(e) => setFormData({ ...formData, cookie: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-xs font-mono h-24" placeholder="__Secure-next-auth.session-token=...; ..." />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-400 block mb-1">备注</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm h-16" />
              </div>
              <div className="md:col-span-2 flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-5 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm">取消</button>
                <button type="submit" className="px-5 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium">创建</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400">加载中...</div>
        ) : accounts.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center text-gray-400">
            <p className="mb-2">暂无 Perplexity 账号</p>
            <p className="text-xs">点击右上角「添加账号」开始配置</p>
          </div>
        ) : (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-800 text-xs text-gray-400">
                <tr>
                  <th className="px-4 py-3 text-left">邮箱</th>
                  <th className="px-4 py-3 text-left">端口</th>
                  <th className="px-4 py-3 text-left">渠道</th>
                  <th className="px-4 py-3 text-left">类型</th>
                  <th className="px-4 py-3 text-left">状态</th>
                  <th className="px-4 py-3 text-left">到期</th>
                  <th className="px-4 py-3 text-left">Cookie</th>
                  <th className="px-4 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id} className="border-t border-slate-700/50 hover:bg-slate-800/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{a.email}</div>
                      {a.password && <div className="text-xs text-gray-500 font-mono">{a.password}</div>}
                    </td>
                    <td className="px-4 py-3 font-mono text-purple-400">{a.port}</td>
                    <td className="px-4 py-3 font-mono text-cyan-400">{a.newApiChannelId ?? '-'}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">{a.accountType}</span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={a.status}
                        onChange={(e) => handleUpdate(a.id, { status: e.target.value })}
                        className={`text-xs px-2 py-1 rounded-full border bg-transparent ${statusColor(a.status)}`}
                      >
                        <option value="active">active</option>
                        <option value="expired">expired</option>
                        <option value="disabled">disabled</option>
                        <option value="error">error</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {a.expiresAt ? new Date(a.expiresAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === a.id ? (
                        <div className="flex flex-col gap-1">
                          <textarea value={editingCookie} onChange={(e) => setEditingCookie(e.target.value)} className="bg-slate-700 border border-slate-600 rounded p-1 text-xs font-mono w-64 h-16" placeholder="新 Cookie..." />
                          <div className="flex gap-1">
                            <button onClick={() => handleUpdateCookie(a.id)} className="text-xs bg-green-600 hover:bg-green-700 px-2 py-0.5 rounded">保存</button>
                            <button onClick={() => { setEditingId(null); setEditingCookie(''); }} className="text-xs bg-slate-600 hover:bg-slate-500 px-2 py-0.5 rounded">取消</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 font-mono">{a.cookieLength}b</span>
                          <button onClick={() => { setEditingId(a.id); setEditingCookie(''); }} className="text-xs text-purple-400 hover:text-purple-300">换 Cookie</button>
                        </div>
                      )}
                      {a.lastError && (
                        <div className="text-xs text-red-400 mt-1 max-w-[200px] truncate" title={a.lastError}>{a.lastError}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDelete(a.id, a.email)} className="text-xs text-red-400 hover:text-red-300">删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 text-xs text-gray-500 bg-slate-800/30 border border-slate-700/50 rounded-lg p-4">
          <p className="font-semibold text-gray-400 mb-2">📖 运维说明</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>添加账号后，在服务器上按「<span className="text-purple-300">账号测试流程.md</span>」操作 B 部署 pplx-proxy</li>
            <li>SQLite 直插 new-api 渠道，记下 channel ID 回填到「new-api 渠道 ID」字段</li>
            <li>Cookie 失效时点「换 Cookie」更新，并在服务器同步执行操作 A</li>
            <li>用户端展示名为「Cardvela Pro」（仅后台显示 Perplexity 字样）</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function PerplexityAccountsPage() {
  return (
    <ClientAuthProvider>
      <AdminGuard>
        <PerplexityAccountsPageInner />
      </AdminGuard>
    </ClientAuthProvider>
  );
}
