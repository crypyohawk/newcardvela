'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminGuard } from '../../../src/components/AdminGuard';
import ClientAuthProvider from '../../../src/components/ClientAuthProvider';

interface CopilotAccount {
  id: string;
  githubId: string;
  token: string;
  quotaUsed: number;
  quotaLimit: number;
  status: string;
  port: number | null;
  newApiChannelId: number | null;
  boundAiKeyId: string | null;
  boundUserId: string | null;
  boundAt: string | null;
  boundUser: { id: string; email: string; name: string | null } | null;
  boundKey: { id: string; keyName: string; lastUsedAt: string | null; status: string } | null;
  lastUsed: string | null;
  createdAt: string;
}

interface NewApiChannel {
  id: number;
  name: string;
  type: number;
  status: number;
  group: string;
  balance: number;
  response_time: number;
}

interface SyncResult {
  success: boolean;
  synced?: number;
  errors?: number;
  action?: string;
  channelId?: number;
  port?: number;
  results?: Array<{
    id: string;
    githubId: string;
    action: string;
    channelId?: number;
    port?: number;
    error?: string;
  }>;
}

export default function CopilotAccountsPage() {
  const [accounts, setAccounts] = useState<CopilotAccount[]>([]);
  const [channels, setChannels] = useState<NewApiChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [bindingAccountId, setBindingAccountId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    githubId: '',
    token: '',
    quotaLimit: 10
  });

  const router = useRouter();

  const getToken = () => localStorage.getItem('token');

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/admin/copilot-accounts', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChannels = async () => {
    try {
      const res = await fetch('/api/admin/copilot-accounts/sync', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        const ch = data.channels;
        setChannels(Array.isArray(ch) ? ch : []);
      }
    } catch (error) {
      console.error('Failed to fetch channels:', error);
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/copilot-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowAddForm(false);
        setFormData({ githubId: '', token: '', quotaLimit: 10 });
        fetchAccounts();
      }
    } catch (error) {
      console.error('Failed to add account:', error);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/copilot-accounts/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchAccounts();
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除这个账号？')) return;
    try {
      const res = await fetch(`/api/admin/copilot-accounts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (res.ok) {
        fetchAccounts();
      }
    } catch (error) {
      console.error('Failed to delete account:', error);
    }
  };

  // 开始绑定渠道流程
  const startBinding = async (accountId: string) => {
    setBindingAccountId(accountId);
    await fetchChannels();
  };

  // 绑定账号到指定渠道
  const handleBind = async (accountId: string, channelId: number) => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/admin/copilot-accounts/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ accountId, channelId })
      });
      const data = await res.json();
      if (res.ok) {
        setSyncResult(data);
        setBindingAccountId(null);
        fetchAccounts();
      } else {
        setSyncResult({ success: false, results: [{ id: '', githubId: '', action: 'error', error: data.error }] });
      }
    } catch (error: any) {
      setSyncResult({ success: false, results: [{ id: '', githubId: '', action: 'error', error: error.message }] });
    } finally {
      setSyncing(false);
    }
  };

  // 解绑渠道
  const handleUnbind = async (accountId: string) => {
    if (!confirm('确认解绑该渠道？')) return;
    try {
      const res = await fetch('/api/admin/copilot-accounts/sync', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ accountId })
      });
      if (res.ok) {
        fetchAccounts();
      }
    } catch (error) {
      console.error('Failed to unbind:', error);
    }
  };

  // 批量更新所有已绑定渠道
  const handleUpdateAll = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/admin/copilot-accounts/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ action: 'update-all' })
      });
      const data = await res.json();
      if (res.ok) {
        setSyncResult(data);
        fetchAccounts();
      } else {
        setSyncResult({ success: false, results: [{ id: '', githubId: '', action: 'error', error: data.error }] });
      }
    } catch (error: any) {
      setSyncResult({ success: false, results: [{ id: '', githubId: '', action: 'error', error: error.message }] });
    } finally {
      setSyncing(false);
    }
  };

  // 用 boundAiKeyId 判断是否已绑定（比 status 字段更可靠）
  const idleCount = accounts.filter(a => !a.boundAiKeyId && a.status !== 'inactive').length;
  const boundCount = accounts.filter(a => a.boundAiKeyId).length;
  const syncedCount = accounts.filter(a => a.newApiChannelId).length;
  const totalQuotaUsed = accounts.reduce((sum, a) => sum + a.quotaUsed, 0);

  // 已被绑定的渠道ID列表
  const boundChannelIds = accounts.filter(a => a.newApiChannelId).map(a => a.newApiChannelId!);

  // 重置单个账号月度用量
  const handleResetQuota = async (id: string) => {
    if (!confirm('确认重置该账号的月度用量？')) return;
    try {
      const res = await fetch(`/api/admin/copilot-accounts/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ action: 'resetQuota' })
      });
      if (res.ok) fetchAccounts();
    } catch (error) {
      console.error('Failed to reset quota:', error);
    }
  };

  // 批量重置所有账号月度用量
  const handleResetAllQuota = async () => {
    if (!confirm('确认重置所有账号的月度用量？（通常每月初执行一次）')) return;
    try {
      const res = await fetch('/api/admin/copilot-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ action: 'resetAllQuota' })
      });
      if (res.ok) fetchAccounts();
    } catch (error) {
      console.error('Failed to reset all quotas:', error);
    }
  };

  if (loading) return <div className="p-6">加载中...</div>;

  return (
    <ClientAuthProvider>
      <AdminGuard>
        <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Copilot 账号池管理</h1>
            <p className="text-gray-500 text-sm mt-1">
              共 {accounts.length} 个账号 · {idleCount} 个空闲 · {boundCount} 个已绑定 · {syncedCount} 个已绑渠道 · 本月总消耗 ${totalQuotaUsed.toFixed(2)}
            </p>
          </div>
          <div className="flex gap-2">
            {accounts.length > 0 && (
              <button
                onClick={handleResetAllQuota}
                className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 text-sm"
              >
                重置月度用量
              </button>
            )}
            {syncedCount > 0 && (
              <button
                onClick={handleUpdateAll}
                disabled={syncing}
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {syncing ? '更新中...' : '批量更新渠道'}
              </button>
            )}
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              添加账号
            </button>
          </div>
        </div>

        {/* 操作结果 */}
        {syncResult && (
          <div className={`p-4 rounded mb-6 ${
            syncResult.success ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">
                {syncResult.action === 'bound' ? `✅ 绑定成功 → 渠道 #${syncResult.channelId} (端口 ${syncResult.port})` :
                 syncResult.results?.some(r => r.action === 'error') ? '⚠️ 操作完成（部分失败）' :
                 '✅ 操作成功'}
              </h3>
              <button onClick={() => setSyncResult(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            {syncResult.results && syncResult.results.length > 0 && (
              <div className="space-y-1">
                {syncResult.results.map((r, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-mono">{r.githubId || '—'}</span>
                    {' → '}
                    <span className={
                      r.action === 'updated' ? 'text-blue-700' :
                      r.action === 'disabled' ? 'text-gray-500' :
                      r.action === 'error' ? 'text-red-600' : 'text-gray-400'
                    }>
                      {r.action === 'updated' && `已更新渠道 #${r.channelId} (端口 ${r.port})`}
                      {r.action === 'disabled' && `已禁用渠道 #${r.channelId}`}
                      {r.action === 'error' && `错误: ${r.error}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 渠道绑定选择器 */}
        {bindingAccountId && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">选择要绑定的 new-api 渠道</h3>
              <button onClick={() => setBindingAccountId(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              请先在 <a href="https://api.cardvela.com/console/channel" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                new-api 渠道管理
              </a> 中创建一个 OpenAI 类型渠道，然后在下面选择绑定。
            </p>
            {channels.length === 0 ? (
              <p className="text-gray-500 text-sm">加载渠道列表中...</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {channels.map(ch => {
                  const isBound = boundChannelIds.includes(ch.id);
                  return (
                    <div key={ch.id} className={`flex items-center justify-between p-2 rounded ${isBound ? 'bg-gray-100' : 'bg-white hover:bg-blue-100'}`}>
                      <div>
                        <span className="font-mono text-sm">#{ch.id}</span>
                        {' '}
                        <span className="font-medium">{ch.name}</span>
                        {' '}
                        <span className="text-xs text-gray-500">({ch.group})</span>
                        {isBound && <span className="text-xs text-orange-600 ml-2">(已被绑定)</span>}
                      </div>
                      <button
                        onClick={() => handleBind(bindingAccountId, ch.id)}
                        disabled={syncing || isBound}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        绑定
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 添加表单 */}
        {showAddForm && (
          <div className="bg-gray-50 p-4 rounded mb-6">
            <h2 className="text-lg font-semibold mb-4">添加新账号</h2>
            <form onSubmit={handleAddAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">GitHub ID</label>
                <input
                  type="text"
                  value={formData.githubId}
                  onChange={(e) => setFormData({...formData, githubId: e.target.value})}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Token</label>
                <input
                  type="text"
                  value={formData.token}
                  onChange={(e) => setFormData({...formData, token: e.target.value})}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">月额度上限</label>
                <input
                  type="number"
                  value={formData.quotaLimit}
                  onChange={(e) => setFormData({...formData, quotaLimit: parseFloat(e.target.value)})}
                  className="w-full p-2 border rounded"
                  min="0"
                  step="0.1"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
                  添加
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 账号列表 */}
        <div className="bg-white shadow rounded overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">GitHub ID</th>
                <th className="px-4 py-3 text-left">状态</th>
                <th className="px-4 py-3 text-left">号池绑定</th>
                <th className="px-4 py-3 text-left">端口</th>
                <th className="px-4 py-3 text-left">渠道</th>
                <th className="px-4 py-3 text-left">已用额度</th>
                <th className="px-4 py-3 text-left">额度上限</th>
                <th className="px-4 py-3 text-left">最后使用</th>
                <th className="px-4 py-3 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id} className="border-t">
                  <td className="px-4 py-3">{account.githubId}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-sm ${
                      account.boundAiKeyId ? 'bg-blue-100 text-blue-800' :
                      account.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                      account.status === 'error' ? 'bg-red-100 text-red-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {account.boundAiKeyId ? '已绑定' :
                       account.status === 'inactive' ? '已禁用' :
                       account.status === 'error' ? '异常' :
                       '空闲'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {account.boundAiKeyId ? (
                      <div>
                        <div className="text-blue-700 font-medium">
                          {account.boundKey?.keyName || account.boundAiKeyId.slice(0, 8)}
                        </div>
                        {account.boundUser && (
                          <div className="text-gray-500 text-xs">{account.boundUser.email}</div>
                        )}
                        {account.boundAt && (
                          <div className="text-gray-400 text-xs">
                            绑定于 {new Date(account.boundAt).toLocaleString()}
                          </div>
                        )}
                        {account.boundKey?.lastUsedAt && (
                          <div className="text-gray-400 text-xs">
                            最后调用 {new Date(account.boundKey.lastUsedAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">
                    {account.port ? `:${account.port}` : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {account.newApiChannelId ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center text-sm text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                          #{account.newApiChannelId}
                        </span>
                        <button
                          onClick={() => handleUnbind(account.id)}
                          className="text-xs text-gray-400 hover:text-red-500"
                          title="解绑"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startBinding(account.id)}
                        className="text-sm text-blue-600 hover:text-blue-800 underline"
                      >
                        绑定渠道
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={account.quotaUsed >= account.quotaLimit ? 'text-red-600 font-bold' : ''}>
                      ${account.quotaUsed.toFixed(2)}
                    </span>
                    <span className="text-gray-400 text-xs ml-1">
                      ({(account.quotaLimit > 0 ? (account.quotaUsed / account.quotaLimit * 100) : 0).toFixed(0)}%)
                    </span>
                  </td>
                  <td className="px-4 py-3">${account.quotaLimit.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm">
                    {account.lastUsed ? new Date(account.lastUsed).toLocaleString() : '从未'}
                  </td>
                  <td className="px-4 py-3 space-x-2">
                    {account.boundAiKeyId ? (
                      <span className="text-gray-400 text-sm" title="已绑定 Key，需用户删除 Key 后才能操作">
                        禁用
                      </span>
                    ) : (
                      <button
                        onClick={() => handleStatusChange(account.id, account.status === 'inactive' ? 'active' : 'inactive')}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {account.status === 'inactive' ? '启用' : '禁用'}
                      </button>
                    )}
                    <button
                      onClick={() => handleResetQuota(account.id)}
                      className="text-yellow-600 hover:text-yellow-800"
                    >
                      重置
                    </button>
                    <button
                      onClick={() => handleDelete(account.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {accounts.length === 0 && (
            <div className="p-6 text-center text-gray-500">
              暂无账号，点击&quot;添加账号&quot;开始
            </div>
          )}
        </div>

        {/* 部署说明 */}
        <div className="mt-6 bg-gray-50 rounded p-4 text-sm text-gray-600">
          <h3 className="font-semibold mb-2">使用步骤</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>添加 Copilot Pro 账号（GitHub ID + Token）</li>
            <li>在 <a href="https://api.cardvela.com/console/channel" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">new-api 渠道管理</a> 创建 OpenAI 类型渠道（地址填 <code className="bg-gray-200 px-1 rounded">http://127.0.0.1:4141</code>）</li>
            <li>回到此页面，点击「绑定渠道」将账号关联到 new-api 渠道</li>
            <li>服务器上运行 <code className="bg-gray-200 px-1 rounded">copilot-pool.sh start</code> 启动所有 copilot-api 实例</li>
            <li>用户通过 new-api 的 sk-xxx 密钥即可调用 Copilot 模型</li>
          </ol>
        </div>
      </div>
    </AdminGuard>
    </ClientAuthProvider>
  );
}