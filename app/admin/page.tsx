'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface CardType {
  id: string;
  name: string;
  cardBin: string;
  issuer: string;
  openFee: number;
  monthlyFee: number;
  rechargeFee: number;
  transactionFee: number;
  isActive: boolean;
}

interface User {
  id: string;
  username: string;
  email: string;
  balance: number;
  role: string;
  createdAt: string;
}

interface Order {
  id: string;
  userId: string;
  type: string;
  amount: number;
  status: string;
  paymentMethod?: string | null;
  txHash?: string | null;
  paymentProof?: string | null;
  createdAt: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
}

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'cards' | 'notices' | 'users' | 'recharges' | 'withdraws' | 'refunds'>('cards');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 数据状态
  const [cardTypes, setCardTypes] = useState<CardType[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [withdrawOrders, setWithdrawOrders] = useState<Order[]>([]);
  const [refunds, setRefunds] = useState<Order[]>([]);

  // 添加/编辑卡片类型表单
  const [showAddCard, setShowAddCard] = useState(false);
  const [editingCard, setEditingCard] = useState<CardType | null>(null);
  const [newCard, setNewCard] = useState({
    name: '',
    cardBin: '',
    issuer: '美国',
    openFee: 2,
    monthlyFee: 0.1,
    rechargeFee: 2,
    transactionFee: 0,
  });

  // 查看凭证弹窗状态
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const getToken = () => localStorage.getItem('token');

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchCardTypes(), fetchUsers(), fetchOrders(), fetchWithdrawOrders(), fetchRefunds()]);
    setLoading(false);
  };

  const fetchCardTypes = async () => {
    try {
      const res = await fetch('/api/admin/card-types', {
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.cardTypes) setCardTypes(data.cardTypes);
    } catch (error) {
      console.error('获取卡片类型失败:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch (error) {
      console.error('获取用户列表失败:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/admin/orders', {
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.orders) setOrders(data.orders);
    } catch (error) {
      console.error('获取订单列表失败:', error);
    }
  };

  const fetchWithdrawOrders = async () => {
    try {
      const res = await fetch('/api/admin/withdraws', {
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.orders) setWithdrawOrders(data.orders);
    } catch (error) {
      console.error('获取提现订单失败:', error);
    }
  };

  const fetchRefunds = async () => {
    try {
      const res = await fetch('/api/admin/refunds', {
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.refunds) setRefunds(data.refunds);
    } catch (error) {
      console.error('获取退款记录失败:', error);
    }
  };

  // 打开编辑弹窗
  const handleEditCard = (card: CardType) => {
    setEditingCard(card);
    setNewCard({
      name: card.name,
      cardBin: card.cardBin,
      issuer: card.issuer,
      openFee: card.openFee,
      monthlyFee: card.monthlyFee,
      rechargeFee: card.rechargeFee,
      transactionFee: card.transactionFee,
    });
    setShowAddCard(true);
  };

  // 添加/更新卡片类型
  const handleAddCardType = async () => {
    try {
      const url = editingCard 
        ? `/api/admin/card-types/${editingCard.id}` 
        : '/api/admin/card-types';
      const method = editingCard ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify(newCard),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage({ type: 'success', text: editingCard ? '修改成功' : '添加成功' });
      setShowAddCard(false);
      setEditingCard(null);
      setNewCard({ name: '', cardBin: '', issuer: '美国', openFee: 2, monthlyFee: 0.1, rechargeFee: 2, transactionFee: 0 });
      fetchCardTypes();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  // 关闭卡片弹窗
  const handleCloseCardModal = () => {
    setShowAddCard(false);
    setEditingCard(null);
    setNewCard({ name: '', cardBin: '', issuer: '美国', openFee: 2, monthlyFee: 0.1, rechargeFee: 2, transactionFee: 0 });
  };

  // 删除卡片类型
  const handleDeleteCardType = async (id: string) => {
    if (!confirm('确定删除此卡片类型？')) return;
    try {
      const res = await fetch(`/api/admin/card-types/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('删除失败');
      setMessage({ type: 'success', text: '删除成功' });
      fetchCardTypes();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  // 订单操作
  const handleOrderAction = async (orderId: string, action: 'confirm' | 'reject') => {
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ orderId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage({ type: 'success', text: data.message || '操作成功' });
      fetchOrders();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleWithdrawAction = async (orderId: string, action: 'confirm' | 'reject') => {
    try {
      const res = await fetch('/api/admin/withdraws', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ orderId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage({ type: 'success', text: data.message || '操作成功' });
      fetchWithdrawOrders();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleRefundAction = async (refundId: string, action: 'return' | 'reject') => {
    try {
      const res = await fetch('/api/admin/refunds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ 
          refundId, 
          action,
          returnAmount: returnAmount ? parseFloat(returnAmount) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage({ type: 'success', text: data.message || '操作成功' });
      setReturnAmount('');
      fetchRefunds();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const [returnAmount, setReturnAmount] = useState<string>('');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        加载中...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <nav className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <h1 className="text-2xl font-bold">CardVela 管理后台</h1>
          <div className="flex gap-4">
            <Link href="/admin/settings" className="text-gray-400 hover:text-white">系统设置</Link>
            <Link href="/dashboard" className="text-gray-400 hover:text-white">返回前台</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {message.text}
          </div>
        )}

        {/* Tab 切换 */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setActiveTab('cards')}
            className={`px-4 py-2 rounded-lg ${activeTab === 'cards' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}
          >
            卡片类型
          </button>
          <button
            onClick={() => setActiveTab('notices')}
            className={`px-4 py-2 rounded-lg ${activeTab === 'notices' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}
          >
            开卡须知
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg ${activeTab === 'users' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}
          >
            用户管理
          </button>
          <button
            onClick={() => setActiveTab('recharges')}
            className={`px-4 py-2 rounded-lg ${activeTab === 'recharges' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}
          >
            充值管理
          </button>
          <button
            onClick={() => setActiveTab('withdraws')}
            className={`px-4 py-2 rounded-lg ${activeTab === 'withdraws' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}
          >
            提现管理
          </button>
          <button
            onClick={() => setActiveTab('refunds')}
            className={`px-4 py-2 rounded-lg ${activeTab === 'refunds' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}
          >
            退款管理
          </button>
        </div>

        {/* 卡片类型管理 - 改为跳转链接 */}
        {activeTab === 'cards' && (
          <div className="bg-slate-800 rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">卡片类型</h2>
              <Link
                href="/admin/card-types"
                className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                管理卡片类型 →
              </Link>
            </div>

            {cardTypes.length === 0 ? (
              <p className="text-gray-400 text-center py-8">暂无数据</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-slate-700">
                    <th className="pb-3">名称</th>
                    <th className="pb-3">卡BIN</th>
                    <th className="pb-3">发行地</th>
                    <th className="pb-3">开卡费</th>
                    <th className="pb-3">月费</th>
                    <th className="pb-3">状态</th>
                    <th className="pb-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {cardTypes.map(card => (
                    <tr key={card.id} className="border-b border-slate-700">
                      <td className="py-4">{card.name}</td>
                      <td className="py-4">{card.cardBin}</td>
                      <td className="py-4">{card.issuer}</td>
                      <td className="py-4">${card.openFee}</td>
                      <td className="py-4">${card.monthlyFee}</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded text-xs ${card.isActive ? 'bg-green-600' : 'bg-gray-600'}`}>
                          {card.isActive ? '启用' : '禁用'}
                        </span>
                      </td>
                      <td className="py-4">
                        <Link
                          href="/admin/card-types"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          编辑
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* 开卡须知 */}
        {activeTab === 'notices' && (
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-6">开卡须知</h2>
            <p className="text-gray-400">功能开发中...</p>
          </div>
        )}

        {/* 用户管理 */}
        {activeTab === 'users' && (
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-6">用户管理</h2>
            {users.length === 0 ? (
              <p className="text-gray-400 text-center py-8">暂无用户</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-slate-700">
                    <th className="pb-3">用户名</th>
                    <th className="pb-3">邮箱</th>
                    <th className="pb-3">余额</th>
                    <th className="pb-3">角色</th>
                    <th className="pb-3">注册时间</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="border-b border-slate-700">
                      <td className="py-4">{user.username}</td>
                      <td className="py-4">{user.email}</td>
                      <td className="py-4 text-green-400">${user.balance.toFixed(2)}</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded text-xs ${user.role === 'admin' ? 'bg-purple-600' : 'bg-gray-600'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-4 text-gray-400">{new Date(user.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* 充值管理（原订单管理） */}
        {activeTab === 'recharges' && (
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-6">充值订单管理</h2>
            {orders.length === 0 ? (
              <p className="text-gray-400 text-center py-8">暂无订单</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-slate-700">
                    <th className="pb-3">用户</th>
                    <th className="pb-3">金额</th>
                    <th className="pb-3">支付方式</th>
                    <th className="pb-3">凭证</th>
                    <th className="pb-3">状态</th>
                    <th className="pb-3">时间</th>
                    <th className="pb-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id} className="border-b border-slate-700">
                      <td className="py-4">
                        <div>{order.user?.username || '未知'}</div>
                        <div className="text-sm text-gray-400">{order.user?.email}</div>
                      </td>
                      <td className="py-4 text-green-400 font-bold">${order.amount}</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          order.paymentMethod === 'usdt' ? 'bg-yellow-600' :
                          order.paymentMethod === 'wechat' ? 'bg-green-600' :
                          order.paymentMethod === 'alipay' ? 'bg-blue-600' :
                          'bg-gray-600'
                        }`}>
                          {order.paymentMethod?.toUpperCase() || '未知'}
                        </span>
                      </td>
                      <td className="py-4">
                        {(order.txHash || order.paymentProof) ? (
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="text-blue-400 hover:text-blue-300 text-sm"
                          >
                            查看凭证
                          </button>
                        ) : (
                          <span className="text-gray-500 text-sm">无</span>
                        )}
                      </td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          order.status === 'completed' ? 'bg-green-600' :
                          order.status === 'processing' ? 'bg-yellow-600' :
                          order.status === 'pending' ? 'bg-blue-600' :
                          'bg-red-600'
                        }`}>
                          {order.status === 'completed' ? '已完成' :
                           order.status === 'processing' ? '待审核' :
                           order.status === 'pending' ? '待支付' :
                           '已拒绝'}
                        </span>
                      </td>
                      <td className="py-4 text-gray-400 text-sm">
                        {new Date(order.createdAt).toLocaleString()}
                      </td>
                      <td className="py-4">
                        {(order.status === 'processing' || order.status === 'pending') && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleOrderAction(order.id, 'confirm')}
                              className="bg-green-600 px-3 py-1 rounded text-sm hover:bg-green-700"
                            >
                              确认
                            </button>
                            <button
                              onClick={() => handleOrderAction(order.id, 'reject')}
                              className="bg-red-600 px-3 py-1 rounded text-sm hover:bg-red-700"
                            >
                              拒绝
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* 提现管理 */}
        {activeTab === 'withdraws' && (
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-6">提现订单管理</h2>
            {withdrawOrders.length === 0 ? (
              <p className="text-gray-400 text-center py-8">暂无订单</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-slate-700">
                    <th className="pb-3">用户</th>
                    <th className="pb-3">提现金额</th>
                    <th className="pb-3">手续费</th>
                    <th className="pb-3">实际到账</th>
                    <th className="pb-3">提现方式</th>
                    <th className="pb-3">收款信息</th>
                    <th className="pb-3">状态</th>
                    <th className="pb-3">时间</th>
                    <th className="pb-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawOrders.map(order => {
                    // 计算手续费
                    const calculateFee = (amt: number): number => {
                      if (amt <= 10) return 1;
                      if (amt <= 20) return 1;
                      if (amt <= 50) return 2;
                      if (amt <= 100) return 4;
                      if (amt <= 200) return 6;
                      if (amt <= 300) return 8;
                      return 10;
                    };
                    const fee = calculateFee(order.amount);
                    const actualAmount = order.amount - fee;

                    return (
                      <tr key={order.id} className="border-b border-slate-700">
                        <td className="py-4">
                          <div>{order.user?.username || '未知'}</div>
                          <div className="text-sm text-gray-400">{order.user?.email}</div>
                        </td>
                        <td className="py-4 text-orange-400 font-bold">${order.amount}</td>
                        <td className="py-4 text-red-400">-${fee}</td>
                        <td className="py-4 text-green-400 font-bold">${actualAmount}</td>
                        <td className="py-4">
                          <span className="px-2 py-1 rounded text-xs bg-purple-600">
                            {order.paymentMethod?.toUpperCase() || '未知'}
                          </span>
                        </td>
                        <td className="py-4">
                          {order.txHash?.startsWith('data:image') ? (
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="text-blue-400 hover:text-blue-300 text-sm"
                            >
                              查看收款码
                            </button>
                          ) : order.txHash ? (
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="text-blue-400 hover:text-blue-300 text-sm"
                            >
                              查看地址
                            </button>
                          ) : (
                            <span className="text-gray-500 text-sm">无</span>
                          )}
                        </td>
                        <td className="py-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            order.status === 'completed' ? 'bg-green-600' :
                            order.status === 'pending' ? 'bg-yellow-600' :
                            'bg-red-600'
                          }`}>
                            {order.status === 'completed' ? '已完成' :
                             order.status === 'pending' ? '待审核' :
                             '已拒绝'}
                          </span>
                        </td>
                        <td className="py-4 text-gray-400 text-sm">
                          {new Date(order.createdAt).toLocaleString()}
                        </td>
                        <td className="py-4">
                          {order.status === 'pending' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleWithdrawAction(order.id, 'confirm')}
                                className="bg-green-600 px-3 py-1 rounded text-sm hover:bg-green-700"
                              >
                                确认
                              </button>
                              <button
                                onClick={() => handleWithdrawAction(order.id, 'reject')}
                                className="bg-red-600 px-3 py-1 rounded text-sm hover:bg-red-700"
                              >
                                拒绝
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* 退款管理 */}
        {activeTab === 'refunds' && (
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-6">退款管理（卡消费退款）</h2>
            <p className="text-gray-400 text-sm mb-4">
              当用户卡片收到退款 ≥ $20 时，系统自动从卡上扣除并冻结。用户发邮件申请后，可手动返还。
            </p>
            {refunds.length === 0 ? (
              <p className="text-gray-400 text-center py-8">暂无退款记录</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-slate-700">
                    <th className="pb-3">用户</th>
                    <th className="pb-3">退款金额</th>
                    <th className="pb-3">交易ID</th>
                    <th className="pb-3">状态</th>
                    <th className="pb-3">时间</th>
                    <th className="pb-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {refunds.map(refund => (
                    <tr key={refund.id} className="border-b border-slate-700">
                      <td className="py-4">
                        <div>{refund.user?.username || '未知'}</div>
                        <div className="text-sm text-gray-400">{refund.user?.email}</div>
                      </td>
                      <td className="py-4 text-yellow-400 font-bold">${refund.amount}</td>
                      <td className="py-4 text-xs font-mono text-gray-400">
                        {refund.txHash?.slice(0, 20)}...
                      </td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          refund.status === 'completed' ? 'bg-green-600' :
                          refund.status === 'pending' ? 'bg-yellow-600' :
                          'bg-red-600'
                        }`}>
                          {refund.status === 'completed' ? '已返还' :
                           refund.status === 'pending' ? '待处理' :
                           '已拒绝'}
                        </span>
                      </td>
                      <td className="py-4 text-gray-400 text-sm">
                        {new Date(refund.createdAt).toLocaleString()}
                      </td>
                      <td className="py-4">
                        {refund.status === 'pending' && (
                          <div className="flex gap-2 items-center">
                            <input
                              type="number"
                              placeholder="返还金额"
                              className="w-24 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm"
                              onChange={(e) => setReturnAmount(e.target.value)}
                            />
                            <button
                              onClick={() => handleRefundAction(refund.id, 'return')}
                              className="bg-green-600 px-3 py-1 rounded text-sm hover:bg-green-700"
                            >
                              返还
                            </button>
                            <button
                              onClick={() => handleRefundAction(refund.id, 'reject')}
                              className="bg-red-600 px-3 py-1 rounded text-sm hover:bg-red-700"
                            >
                              拒绝
                            </button>
                          </div>
                        )}
                        {refund.status === 'completed' && refund.paymentProof && (
                          <span className="text-green-400 text-sm">{refund.paymentProof}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* 凭证查看弹窗 */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 p-6 rounded-xl w-full max-w-lg">
              <h3 className="text-lg font-bold mb-4">
                {selectedOrder.type === 'withdraw' ? '收款信息' : '支付凭证'}
              </h3>
              
              {selectedOrder.txHash && !selectedOrder.txHash.startsWith('data:image') && (
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">
                    {selectedOrder.type === 'withdraw' ? '收款地址' : '交易哈希 (TxHash)'}
                  </label>
                  <div className="bg-slate-700 p-3 rounded-lg break-all font-mono text-sm select-all">
                    {selectedOrder.txHash}
                  </div>
                </div>
              )}

              {selectedOrder.txHash?.startsWith('data:image') && (
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">收款码</label>
                  <img 
                    src={selectedOrder.txHash} 
                    alt="收款码" 
                    className="max-w-full max-h-80 mx-auto rounded-lg"
                  />
                </div>
              )}
              
              {selectedOrder.paymentProof && (
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">支付截图</label>
                  <img 
                    src={selectedOrder.paymentProof} 
                    alt="支付截图" 
                    className="max-w-full rounded-lg"
                  />
                </div>
              )}

              {!selectedOrder.txHash && !selectedOrder.paymentProof && (
                <p className="text-gray-400">暂无凭证</p>
              )}

              <button
                onClick={() => setSelectedOrder(null)}
                className="w-full bg-slate-600 py-2 rounded-lg mt-4 hover:bg-slate-500"
              >
                关闭
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
