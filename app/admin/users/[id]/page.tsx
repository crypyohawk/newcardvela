'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface UserDetail {
  id: string;
  username: string;
  email: string;
  balance: number;
  role: string;
  createdAt: string;
  userCards: Array<{
    id: string;
    cardNumber: string;
    cardNoLast4: string;
    balance: number;
    status: string;
    createdAt: string;
    gsalaryCardId: string | null;
    cardType: {
      id: string;
      name: string;
      cardBin: string;
    };
  }>;
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    status: string;
    paymentMethod: string | null;
    createdAt: string;
  }>;
}

interface UserStats {
  totalCards: number;
  totalTransactions: number;
  totalRecharge: number;
  totalWithdraw: number;
}

interface AIKeyInfo {
  id: string;
  keyName: string;
  tierName: string;
  status: string;
  monthUsed: number;
  totalUsed: number;
  monthlyLimit: number | null;
  lastUsedAt: string | null;
  createdAt: string;
}

interface AIStats {
  totalKeys: number;
  activeKeys: number;
  totalAiCost: number;
  monthAiCost: number;
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'cards' | 'transactions' | 'ai'>('cards');
  const [aiKeys, setAiKeys] = useState<AIKeyInfo[]>([]);
  const [aiStats, setAiStats] = useState<AIStats | null>(null);

  const getToken = () => localStorage.getItem('token') || '';

  useEffect(() => {
    fetchUserDetail();
  }, []);

  const fetchUserDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/users/${params.id}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.user) setUser(data.user);
      if (data.stats) setStats(data.stats);
      if (data.aiKeys) setAiKeys(data.aiKeys);
      if (data.aiStats) setAiStats(data.aiStats);
    } catch (error) {
      console.error('获取用户详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      recharge: '充值',
      withdraw: '提现',
      card_recharge: '卡充值',
      card_withdraw: '卡提现',
      open_card: '开卡',
      refund: '退款',
      referral_bonus: '推荐奖励',
      first_recharge_bonus: '首充奖励',
      ai_usage: 'AI消费',
      ai_transfer: 'AI钱包转账',
      deposit: '入账',
    };
    return map[type] || type;
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, { text: string; color: string }> = {
      pending: { text: '待支付', color: 'bg-yellow-600' },
      processing: { text: '待审核', color: 'bg-blue-600' },
      completed: { text: '已完成', color: 'bg-green-600' },
      failed: { text: '已拒绝', color: 'bg-red-600' },
    };
    const s = map[status] || { text: status, color: 'bg-gray-600' };
    return <span className={`${s.color} px-2 py-0.5 rounded text-xs`}>{s.text}</span>;
  };

  const getCardStatusLabel = (status: string) => {
    const map: Record<string, { text: string; color: string }> = {
      active: { text: '正常', color: 'bg-green-600' },
      inactive: { text: '未激活', color: 'bg-gray-600' },
      frozen: { text: '已冻结', color: 'bg-blue-600' },
      cancelled: { text: '已注销', color: 'bg-red-600' },
    };
    const s = map[status] || { text: status, color: 'bg-gray-600' };
    return <span className={`${s.color} px-2 py-0.5 rounded text-xs`}>{s.text}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-xl">加载中...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">用户不存在</p>
          <Link href="/admin" className="text-blue-400 hover:underline">返回管理后台</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* 顶部导航 */}
      <nav className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link href="/admin" className="text-gray-400 hover:text-white">
            ← 返回用户管理
          </Link>
          <span className="text-gray-600">|</span>
          <span className="text-lg font-bold">用户详情</span>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* 用户基本信息 */}
        <div className="bg-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">{user.username}</h2>
            <span className={`px-3 py-1 rounded text-sm ${
              user.role === 'admin' ? 'bg-purple-600' :
              user.role === 'agent' ? 'bg-orange-600' :
              'bg-gray-600'
            }`}>
              {user.role === 'admin' ? '管理员' : user.role === 'agent' ? '代理商' : '普通用户'}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-400">邮箱：</span>
              <span>{user.email}</span>
            </div>
            <div>
              <span className="text-gray-400">账户余额：</span>
              <span className="text-green-400 font-bold">${user.balance.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-400">注册时间：</span>
              <span>{new Date(user.createdAt).toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}</span>
            </div>
            <div>
              <span className="text-gray-400">用户ID：</span>
              <span className="font-mono text-xs">{user.id}</span>
            </div>
          </div>
        </div>

        {/* 统计卡片 */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-slate-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400">{stats.totalCards}</div>
              <div className="text-sm text-gray-400 mt-1">开卡数量</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{stats.totalTransactions}</div>
              <div className="text-sm text-gray-400 mt-1">交易笔数</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-400">${stats.totalRecharge.toFixed(2)}</div>
              <div className="text-sm text-gray-400 mt-1">累计充值</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-400">${stats.totalWithdraw.toFixed(2)}</div>
              <div className="text-sm text-gray-400 mt-1">累计提现</div>
            </div>
            {aiStats && (
              <>
                <div className="bg-slate-800 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-400">${aiStats.monthAiCost.toFixed(4)}</div>
                  <div className="text-sm text-gray-400 mt-1">本月AI消费</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-orange-400">${aiStats.totalAiCost.toFixed(4)}</div>
                  <div className="text-sm text-gray-400 mt-1">累计AI消费</div>
                </div>
              </>
            )}
          </div>
        )}

        {/* 切换标签 */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSection('cards')}
            className={`px-4 py-2 rounded-lg text-sm ${
              activeSection === 'cards' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'
            }`}
          >
            卡片列表 ({user.userCards.length})
          </button>
          <button
            onClick={() => setActiveSection('transactions')}
            className={`px-4 py-2 rounded-lg text-sm ${
              activeSection === 'transactions' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'
            }`}
          >
            交易记录 ({user.transactions.length})
          </button>
          <button
            onClick={() => setActiveSection('ai')}
            className={`px-4 py-2 rounded-lg text-sm ${
              activeSection === 'ai' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'
            }`}
          >
            AI服务 ({aiKeys.length})
          </button>
        </div>

        {/* 卡片列表 */}
        {activeSection === 'cards' && (
          <div className="bg-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-bold mb-4">卡片列表</h3>
            {user.userCards.length === 0 ? (
              <p className="text-gray-400 text-center py-8">该用户暂无卡片</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-slate-700">
                    <th className="pb-3">卡类型</th>
                    <th className="pb-3">卡号</th>
                    <th className="pb-3">余额</th>
                    <th className="pb-3">状态</th>
                    <th className="pb-3">开卡时间</th>
                  </tr>
                </thead>
                <tbody>
                  {user.userCards.map(card => (
                    <tr key={card.id} className="border-b border-slate-700">
                      <td className="py-3">{card.cardType?.name || '-'}</td>
                      <td className="py-3 font-mono text-sm">
                        {card.cardNoLast4 ? `**** **** **** ${card.cardNoLast4}` : '-'}
                      </td>
                      <td className="py-3 text-green-400">${card.balance.toFixed(2)}</td>
                      <td className="py-3">{getCardStatusLabel(card.status)}</td>
                      <td className="py-3 text-gray-400">
                        {new Date(card.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* 交易记录 */}
        {activeSection === 'transactions' && (
          <div className="bg-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-bold mb-4">交易记录（最近50条）</h3>
            {user.transactions.length === 0 ? (
              <p className="text-gray-400 text-center py-8">该用户暂无交易记录</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-slate-700">
                    <th className="pb-3">类型</th>
                    <th className="pb-3">金额</th>
                    <th className="pb-3">支付方式</th>
                    <th className="pb-3">状态</th>
                    <th className="pb-3">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {user.transactions.map(tx => (
                    <tr key={tx.id} className="border-b border-slate-700">
                      <td className="py-3">{getTypeLabel(tx.type)}</td>
                      <td className={`py-3 font-bold ${tx.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.amount >= 0 ? '+' : ''}{tx.amount.toFixed(2)}
                      </td>
                      <td className="py-3 text-gray-400">{tx.paymentMethod || '-'}</td>
                      <td className="py-3">{getStatusLabel(tx.status)}</td>
                      <td className="py-3 text-gray-400">
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* AI 服务 */}
        {activeSection === 'ai' && (
          <div className="bg-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-bold mb-4">AI 服务 Key</h3>
            {aiKeys.length === 0 ? (
              <p className="text-gray-400 text-center py-8">该用户暂无 AI Key</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-slate-700">
                    <th className="pb-3">名称</th>
                    <th className="pb-3">套餐</th>
                    <th className="pb-3">状态</th>
                    <th className="pb-3">本月消费</th>
                    <th className="pb-3">累计消费</th>
                    <th className="pb-3">月限额</th>
                    <th className="pb-3">最后使用</th>
                  </tr>
                </thead>
                <tbody>
                  {aiKeys.map(key => (
                    <tr key={key.id} className="border-b border-slate-700">
                      <td className="py-3 font-medium">{key.keyName}</td>
                      <td className="py-3 text-gray-300">{key.tierName}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          key.status === 'active' ? 'bg-green-600' : 'bg-red-600'
                        }`}>
                          {key.status === 'active' ? '启用' : '禁用'}
                        </span>
                      </td>
                      <td className="py-3 text-purple-400">${key.monthUsed.toFixed(4)}</td>
                      <td className="py-3 text-orange-400">${key.totalUsed.toFixed(4)}</td>
                      <td className="py-3 text-gray-400">
                        {key.monthlyLimit != null ? `$${key.monthlyLimit.toFixed(2)}` : '无限制'}
                      </td>
                      <td className="py-3 text-gray-400 text-sm">
                        {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString('zh-CN') : '从未使用'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}