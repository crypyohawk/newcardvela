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
  rechargeFeePercent: number;
  rechargeFeeMin: number;
  transactionFeePercent: number;
  refundFee: number;
  authFee: number;
  displayOpenFee: number | null;
  displayMonthlyFee: number | null;
  displayRechargeFee: string | null;
  displayTransactionFee: string | null;
  displayRefundFee: string | null;
  displayAuthFee: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
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

interface Notice {
  id: string;
  content: string;
  sortOrder: number;
  isActive: boolean;
}

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'cards' | 'notices' | 'users' | 'recharges' | 'withdraws' | 'refunds' | 'referral'>('cards');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 数据状态
  const [cardTypes, setCardTypes] = useState<CardType[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [withdrawOrders, setWithdrawOrders] = useState<Order[]>([]);
  const [refunds, setRefunds] = useState<Order[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [newNotice, setNewNotice] = useState('');
  const [billingAddress, setBillingAddress] = useState({
    name: 'Michael Johnson',
    address: '1209 Orange Street',
    city: 'Wilmington',
    state: 'DE (Delaware)',
    zip: '19801',
    country: 'United States',
    billingAddress: '1209 Orange Street, Wilmington, DE 19801, USA'
  });
  const [billingExamples, setBillingExamples] = useState<Array<{
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    billingAddress: string;
}>>([]);
  const [newBillingExample, setNewBillingExample] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'United States',
    billingAddress: ''
  });

  // 添加/编辑卡片类型表单
  const [showAddCard, setShowAddCard] = useState(false);
  const [editingCard, setEditingCard] = useState<CardType | null>(null);
  const [newCardType, setNewCardType] = useState({
    name: '', 
    cardBin: '', 
    issuer: '美国', 
    openFee: 0, 
    monthlyFee: 0, 
    rechargeFeePercent: 0,
    rechargeFeeMin: 0,
    transactionFeePercent: 0,
    refundFee: 0,
    authFee: 0,
    displayOpenFee: '',
    displayMonthlyFee: '',
    displayRechargeFee: '',
    displayTransactionFee: '',
    displayRefundFee: '',
    displayAuthFee: '',
    description: '',
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
    fetchSystemConfig();
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchCardTypes(), fetchUsers(), fetchOrders(), fetchWithdrawOrders(), fetchRefunds(), fetchNotices()]);
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

  const fetchNotices = async () => {
    try {
      const res = await fetch('/api/admin/notices', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotices(data.notices || []);
        if (data.billingExamples) {
          setBillingExamples(data.billingExamples);
        }
      }
    } catch (error) {
      console.error('获取开卡须知失败:', error);
    }
  };

  const saveNotice = async () => {
    if (!newNotice.trim()) return;
    try {
      const res = await fetch('/api/admin/notices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ content: newNotice })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: '添加成功' });
        setNewNotice('');
        fetchNotices();
      }
    } catch (error) {
      setMessage({ type: 'error', text: '添加失败' });
    }
  };

  const deleteNotice = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/notices/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (res.ok) {
        setMessage({ type: 'success', text: '删除成功' });
        fetchNotices();
      }
    } catch (error) {
      setMessage({ type: 'error', text: '删除失败' });
    }
  };

  const saveBillingAddress = async () => {
    try {
      const res = await fetch('/api/admin/billing-address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(billingAddress)
      });
      if (res.ok) {
        setMessage({ type: 'success', text: '账单地址保存成功' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '保存失败' });
    }
  };

  const addBillingExample = async () => {
    if (!newBillingExample.name.trim() || !newBillingExample.billingAddress.trim()) {
      setMessage({ type: 'error', text: '姓名和账单地址不能为空' });
      return;
    }
    try {
      const res = await fetch('/api/admin/billing-examples', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(newBillingExample)
      });
      if (res.ok) {
        setMessage({ type: 'success', text: '添加成功' });
        setNewBillingExample({
          name: '',
          address: '',
          city: '',
          state: '',
          zip: '',
          country: 'United States',
          billingAddress: ''
        });
        fetchNotices();
      }
    } catch (error) {
      setMessage({ type: 'error', text: '添加失败' });
    }
  };

  const deleteBillingExample = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/billing-examples/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (res.ok) {
        setMessage({ type: 'success', text: '删除成功' });
        fetchNotices();
      }
    } catch (error) {
      setMessage({ type: 'error', text: '删除失败' });
    }
  };

  // 推广设置状态
  const [referralSettings, setReferralSettings] = useState({
    enabled: false,
    rewardAmount: '5',
    promptText: '推荐好友注册开卡，即可获得 $5 奖励！'
  });

  // 添加客服邮箱状态
  const [supportEmail, setSupportEmail] = useState('');

  // 获取推荐设置
  const fetchReferralSettings = async () => {
    try {
      const res = await fetch('/api/admin/referral-settings', {
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setReferralSettings({
            enabled: data.settings.enabled ?? false,
            rewardAmount: String(data.settings.rewardAmount ?? 5),
            promptText: data.settings.promptText || '推荐好友注册开卡，即可获得 $5 奖励！'
          });
        }
      }
    } catch (error) {
      console.error('获取推荐设置失败:', error);
    }
  };

  // 保存推荐设置
  const saveReferralSettings = async () => {
    try {
      const res = await fetch('/api/admin/referral-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          enabled: referralSettings.enabled,
          rewardAmount: parseFloat(referralSettings.rewardAmount) || 5,
          promptText: referralSettings.promptText,
        }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: '推荐设置已保存' });
      } else {
        setMessage({ type: 'error', text: '保存失败' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '保存失败' });
    }
  };

  // 获取系统配置（包括客服邮箱）
  const fetchSystemConfig = async () => {
    try {
      const res = await fetch('/api/admin/config', {
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.support_email) setSupportEmail(data.support_email);
      }
    } catch (error) {
      console.error('获取系统配置失败:', error);
    }
  };

  useEffect(() => {
    fetchNotices();
    fetchReferralSettings();
    fetchSystemConfig();
  }, []);

  // 打开编辑弹窗
  const handleEditCard = (card: CardType) => {
    setEditingCard(card);
    setNewCardType({
      name: card.name,
      cardBin: card.cardBin,
      issuer: card.issuer,
      openFee: card.openFee,
      monthlyFee: card.monthlyFee,
      rechargeFeePercent: card.rechargeFeePercent,
      rechargeFeeMin: card.rechargeFeeMin,
      transactionFeePercent: card.transactionFeePercent,
      refundFee: card.refundFee,
      authFee: card.authFee,
      displayOpenFee: card.displayOpenFee?.toString() || '',
      displayMonthlyFee: card.displayMonthlyFee?.toString() || '',
      displayRechargeFee: card.displayRechargeFee || '',
      displayTransactionFee: card.displayTransactionFee || '',
      displayRefundFee: card.displayRefundFee || '',
      displayAuthFee: card.displayAuthFee || '',
      description: card.description || '',
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
        body: JSON.stringify(newCardType),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage({ type: 'success', text: editingCard ? '修改成功' : '添加成功' });
      setShowAddCard(false);
      setEditingCard(null);
      setNewCardType({ 
        name: '', 
        cardBin: '', 
        issuer: '美国', 
        openFee: 0, 
        monthlyFee: 0, 
        rechargeFeePercent: 0,
        rechargeFeeMin: 0,
        transactionFeePercent: 0,
        refundFee: 0,
        authFee: 0,
        displayOpenFee: '',
        displayMonthlyFee: '',
        displayRechargeFee: '',
        displayTransactionFee: '',
        displayRefundFee: '',
        displayAuthFee: '',
        description: '',
      });
      fetchCardTypes();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  // 关闭卡片弹窗
  const handleCloseCardModal = () => {
    setShowAddCard(false);
    setEditingCard(null);
    setNewCardType({ 
      name: '', 
      cardBin: '', 
      issuer: '美国', 
      openFee: 0, 
      monthlyFee: 0, 
      rechargeFeePercent: 0,
      rechargeFeeMin: 0,
      transactionFeePercent: 0,
      refundFee: 0,
      authFee: 0,
      displayOpenFee: '',
      displayMonthlyFee: '',
      displayRechargeFee: '',
      displayTransactionFee: '',
      displayRefundFee: '',
      displayAuthFee: '',
      description: '',
    });
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

  const handleRefundAction = async (refundId: string, action: 'deduct' | 'approve' | 'reject', deductFee?: number) => {
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
          deductFee: deductFee,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage({ type: 'success', text: data.message || '操作成功' });
      
      // 清除该记录的输入
      setDeductFees(prev => {
        const newFees = { ...prev };
        delete newFees[refundId];
        return newFees;
      });
      
      fetchRefunds();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  // 设置用户角色（添加在这里，组件内部）
  const handleSetUserRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage({ type: 'success', text: newRole === 'agent' ? '已设为代理商' : '已取消代理商' });
      fetchUsers();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const [returnAmount, setReturnAmount] = useState<string>('');
  // 添加退款手续费输入状态
  const [deductFees, setDeductFees] = useState<Record<string, string>>({});

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
          <button
            onClick={() => setActiveTab('referral')}
            className={`px-4 py-2 rounded-lg ${activeTab === 'referral' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}
          >
            推广设置
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
          <div className="space-y-6">
            {/* 开卡须知管理 */}
            <div className="bg-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-6">📋 开卡须知</h2>
              
              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2">添加新的开卡须知条款</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newNotice}
                    onChange={(e) => setNewNotice(e.target.value)}
                    placeholder="例如：开卡后请在24小时内完成首次充值..."
                    className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                    onKeyDown={(e) => e.key === 'Enter' && saveNotice()}
                  />
                  <button
                    onClick={saveNotice}
                    disabled={!newNotice.trim()}
                    className="bg-blue-600 px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    添加
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="text-sm text-gray-400 mb-2">当前须知列表（用户开卡时会看到以下内容）</h3>
              </div>

              {notices.length === 0 ? (
                <div className="text-center py-8 bg-slate-700/50 rounded-lg">
                  <p className="text-gray-400">暂无开卡须知，请添加</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notices.map((notice, index) => (
                    <div key={notice.id} className="flex items-center justify-between bg-slate-700 rounded-lg px-4 py-3 group">
                      <div className="flex items-start gap-3">
                        <span className="text-blue-400 font-mono text-sm mt-0.5">{index + 1}.</span>
                        <span className="text-gray-200">{notice.content}</span>
                      </div>
                      <button
                        onClick={() => deleteNotice(notice.id)}
                        className="text-red-400 hover:text-red-300 text-sm px-3 py-1 rounded hover:bg-red-600/20 transition"
                      >
                        删除
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 订阅服务持卡人信息配置 - 替换原来的账单地址配置部分 */}
            <div className="bg-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-6">📋 订阅服务时的持卡人信息填写推荐</h2>
              
              {/* 添加新示例表单 */}
              <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-gray-300 mb-4">添加新的信息示例</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">姓名 *</label>
                    <input
                      type="text"
                      value={newBillingExample.name}
                      onChange={(e) => setNewBillingExample({ ...newBillingExample, name: e.target.value })}
                      placeholder="例如：Michael Johnson"
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">街道地址</label>
                    <input
                      type="text"
                      value={newBillingExample.address}
                      onChange={(e) => setNewBillingExample({ ...newBillingExample, address: e.target.value })}
                      placeholder="例如：1209 Orange Street"
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">城市</label>
                    <input
                      type="text"
                      value={newBillingExample.city}
                      onChange={(e) => setNewBillingExample({ ...newBillingExample, city: e.target.value })}
                      placeholder="例如：Wilmington"
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">州</label>
                    <input
                      type="text"
                      value={newBillingExample.state}
                      onChange={(e) => setNewBillingExample({ ...newBillingExample, state: e.target.value })}
                      placeholder="例如：DE (Delaware)"
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">邮编</label>
                    <input
                      type="text"
                      value={newBillingExample.zip}
                      onChange={(e) => setNewBillingExample({ ...newBillingExample, zip: e.target.value })}
                      placeholder="例如：19801"
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">国家</label>
                    <input
                      type="text"
                      value={newBillingExample.country}
                      onChange={(e) => setNewBillingExample({ ...newBillingExample, country: e.target.value })}
                      placeholder="例如：United States"
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-400 mb-1">账单地址 (Billing Address) *</label>
                    <input
                      type="text"
                      value={newBillingExample.billingAddress}
                      onChange={(e) => setNewBillingExample({ ...newBillingExample, billingAddress: e.target.value })}
                      placeholder="例如：1209 Orange Street, Wilmington, DE 19801, USA"
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                    />
                  </div>
                </div>
                <button
                  onClick={addBillingExample}
                  className="mt-4 bg-blue-600 px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  添加示例
                </button>
              </div>

              {/* 已添加的示例列表 */}
              <div>
                <h3 className="text-sm text-gray-400 mb-3">已添加的信息示例（用户开卡时会看到以下内容）</h3>
                {billingExamples.length === 0 ? (
                  <div className="text-center py-8 bg-slate-700/50 rounded-lg">
                    <p className="text-gray-400">暂无信息示例，请添加</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {billingExamples.map((example, index) => (
                      <div key={example.id} className="bg-slate-700 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-blue-400 font-semibold">示例 {index + 1}</span>
                          <button
                            onClick={() => deleteBillingExample(example.id)}
                            className="text-red-400 hover:text-red-300 text-sm px-3 py-1 rounded hover:bg-red-600/20 transition"
                          >
                            删除
                          </button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-300">
                          <div><span className="text-gray-500">姓名:</span> {example.name}</div>
                          {example.address && <div><span className="text-gray-500">街道:</span> {example.address}</div>}
                          {example.city && <div><span className="text-gray-500">城市:</span> {example.city}</div>}
                          {example.state && <div><span className="text-gray-500">州:</span> {example.state}</div>}
                          {example.zip && <div><span className="text-gray-500">邮编:</span> {example.zip}</div>}
                          {example.country && <div><span className="text-gray-500">国家:</span> {example.country}</div>}
                        </div>
                        {example.billingAddress && (
                          <div className="mt-2 pt-2 border-t border-slate-600">
                            <span className="text-gray-500 text-sm">账单地址:</span>
                            <p className="text-blue-200">{example.billingAddress}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
                    <th className="pb-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="border-b border-slate-700">
                      <td className="py-4">{user.username}</td>
                      <td className="py-4">{user.email}</td>
                      <td className="py-4 text-green-400">${user.balance.toFixed(2)}</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          user.role === 'admin' ? 'bg-purple-600' : 
                          user.role === 'agent' ? 'bg-orange-600' : 
                          'bg-gray-600'
                        }`}>
                          {user.role === 'admin' ? '管理员' : 
                           user.role === 'agent' ? '代理商' : 
                           '普通用户'}
                        </span>
                      </td>
                      <td className="py-4 text-gray-400">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="py-4">
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => handleSetUserRole(user.id, user.role === 'agent' ? 'user' : 'agent')}
                            className={`px-3 py-1 rounded text-xs ${
                              user.role === 'agent' 
                                ? 'bg-gray-600 hover:bg-gray-500' 
                                : 'bg-orange-600 hover:bg-orange-700'
                            }`}
                          >
                            {user.role === 'agent' ? '取消代理' : '设为代理'}
                          </button>
                        )}
                      </td>
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
                    // 从订单的 txHash 中解析保存的手续费和实际到账金额
                    let fee = 0;
                    let actualAmount = order.amount;
                    
                    try {
                      if (order.txHash) {
                        const txData = JSON.parse(order.txHash);
                        if (txData.fee !== undefined && txData.actualAmount !== undefined) {
                          fee = txData.fee;
                          actualAmount = txData.actualAmount;
                        } else {
                          // 兼容旧数据：使用 5% 最低 $2 的规则计算
                          const percentFee = order.amount * 0.05;
                          fee = Math.max(percentFee, 2);
                          actualAmount = order.amount - fee;
                        }
                      } else {
                        // 没有 txHash 的情况，使用默认计算
                        const percentFee = order.amount * 0.05;
                        fee = Math.max(percentFee, 2);
                        actualAmount = order.amount - fee;
                      }
                    } catch (e) {
                      // JSON 解析失败，说明 txHash 是旧格式（直接是地址字符串）
                      const percentFee = order.amount * 0.05;
                      fee = Math.max(percentFee, 2);
                      actualAmount = order.amount - fee;
                    }

                    // 解析收款地址
                    let withdrawAddress = '';
                    try {
                      if (order.txHash) {
                        const txData = JSON.parse(order.txHash);
                        withdrawAddress = txData.address || order.txHash;
                      }
                    } catch (e) {
                      withdrawAddress = order.txHash || '';
                    }

                    return (
                      <tr key={order.id} className="border-b border-slate-700">
                        <td className="py-4">
                          <div>{order.user?.username || '未知'}</div>
                          <div className="text-sm text-gray-400">{order.user?.email}</div>
                        </td>
                        <td className="py-4 text-orange-400 font-bold">${order.amount}</td>
                        <td className="py-4 text-red-400">-${fee.toFixed(2)}</td>
                        <td className="py-4 text-green-400 font-bold">${actualAmount.toFixed(2)}</td>
                        <td className="py-4">
                          <span className="px-2 py-1 rounded text-xs bg-purple-600">
                            {order.paymentMethod?.toUpperCase() || '未知'}
                          </span>
                        </td>
                        <td className="py-4">
                          {withdrawAddress?.startsWith('data:image') ? (
                            <button
                              onClick={() => setSelectedOrder({...order, txHash: withdrawAddress})}
                              className="text-blue-400 hover:text-blue-300 text-sm"
                            >
                              查看收款码
                            </button>
                          ) : withdrawAddress ? (
                            <button
                              onClick={() => setSelectedOrder({...order, txHash: withdrawAddress})}
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
                             order.status === 'pending' ? '待审核' : '已拒绝'}
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
            <h2 className="text-xl font-bold mb-6">退款管理</h2>
            <p className="text-gray-400 text-sm mb-4">
              💡 说明：退款金额已由上游直接退到用户卡内，这里处理我们的手续费扣除
            </p>
            {refunds.length === 0 ? (
              <p className="text-gray-400 text-center py-8">暂无退款记录</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-slate-700">
                      <th className="pb-3">用户</th>
                      <th className="pb-3">退款金额</th>
                      <th className="pb-3">应扣手续费</th>
                      <th className="pb-3">用户实得</th>
                      <th className="pb-3">卡片信息</th>
                      <th className="pb-3">状态</th>
                      <th className="pb-3">时间</th>
                      <th className="pb-3">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refunds.map((refund: any) => (
                      <tr key={refund.id} className="border-b border-slate-700">
                        <td className="py-4">
                          <div>{refund.user?.username || '未知'}</div>
                          <div className="text-sm text-gray-400">{refund.user?.email}</div>
                        </td>
                        <td className="py-4 text-green-400 font-bold">
                          ${refund.amount}
                        </td>
                        <td className="py-4 text-red-400">
                          -${refund.calculatedFee?.toFixed(2) || '0.00'}
                          <div className="text-xs text-gray-500">
                            {refund.amount >= (refund.feeConfig?.largeRefundThreshold || 20) 
                              ? `(${refund.feeConfig?.refundFeePercent || 5}% 最低$${refund.feeConfig?.refundFeeMin || 3})`
                              : `(小额固定$${refund.feeConfig?.smallRefundFee || 3})`
                            }
                          </div>
                        </td>
                        <td className="py-4 text-blue-400 font-bold">
                          ${refund.netAmount?.toFixed(2) || refund.amount}
                        </td>
                        <td className="py-4 text-xs">
                          {refund.cardInfo?.gsalaryCardId ? (
                            <span className="text-gray-400">
                              {refund.cardInfo.gsalaryCardId.slice(0, 8)}...
                            </span>
                          ) : (
                            <span className="text-yellow-400">无卡片信息</span>
                          )}
                        </td>
                        <td className="py-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            refund.status === 'completed' ? 'bg-green-600' :
                            refund.status === 'pending' ? 'bg-yellow-600' :
                            'bg-red-600'
                          }`}>
                            {refund.status === 'completed' ? '已处理' :
                             refund.status === 'pending' ? '待处理' : '异常'}
                          </span>
                        </td>
                        <td className="py-4 text-gray-400 text-sm">
                          {new Date(refund.createdAt).toLocaleString()}
                        </td>
                        <td className="py-4">
                          {refund.status === 'pending' && (
                            <div className="flex flex-col gap-2">
                              <div className="flex gap-2 items-center">
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder={`${refund.calculatedFee?.toFixed(2) || '0'}`}
                                  value={deductFees[refund.id] || ''}
                                  className="w-20 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm"
                                  onChange={(e) => setDeductFees(prev => ({ 
                                    ...prev, 
                                    [refund.id]: e.target.value 
                                  }))}
                                />
                                <button
                                  onClick={() => handleRefundAction(refund.id, 'deduct', parseFloat(deductFees[refund.id] || refund.calculatedFee || '0'))}
                                  className="bg-orange-600 px-2 py-1 rounded text-xs hover:bg-orange-700"
                                  title="从卡片扣除手续费"
                                >
                                  扣费
                                </button>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleRefundAction(refund.id, 'approve')}
                                  className="bg-green-600 px-2 py-1 rounded text-xs hover:bg-green-700"
                                  title="不扣费直接通过"
                                >
                                  通过
                                </button>
                                <button
                                  onClick={() => handleRefundAction(refund.id, 'reject')}
                                  className="bg-red-600 px-2 py-1 rounded text-xs hover:bg-red-700"
                                  title="标记为异常"
                                >
                                  异常
                                </button>
                              </div>
                            </div>
                          )}
                          {refund.status === 'completed' && refund.paymentProof && (
                            <div className="text-xs text-gray-400">
                              {(() => {
                                try {
                                  const proof = JSON.parse(refund.paymentProof);
                                  if (proof.deductedFee) {
                                    return `已扣 $${proof.deductedFee}`;
                                  }
                                  return '已处理';
                                } catch {
                                  return '已处理';
                                }
                              })()}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 推广设置 */}
        {activeTab === 'referral' && (
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-6">🎁 推广引流设置</h2>
            
            <div className="space-y-6 max-w-lg">
              <div className="flex items-center justify-between bg-slate-700/50 p-4 rounded-lg">
                <div>
                  <label className="font-medium">启用推荐功能</label>
                  <p className="text-sm text-gray-400">开启后用户可通过推荐码邀请新用户</p>
                </div>
                <button
                  onClick={() => setReferralSettings({ ...referralSettings, enabled: !referralSettings.enabled })}
                  className={`w-14 h-8 rounded-full transition relative ${referralSettings.enabled ? 'bg-green-600' : 'bg-gray-600'}`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${referralSettings.enabled ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">奖励金额 (USD)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={referralSettings.rewardAmount}
                  onChange={(e) => setReferralSettings({ ...referralSettings, rewardAmount: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3"
                />
                <p className="text-xs text-gray-500 mt-1">被推荐用户首次开卡成功后，推荐人获得的奖励金额</p>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">推广提示文案</label>
                <textarea
                  value={referralSettings.promptText}
                  onChange={(e) => setReferralSettings({ ...referralSettings, promptText: e.target.value })}
                  rows={3}
                  placeholder="例如：推荐好友注册开卡，即可获得 $5 奖励！"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3"
                />
              </div>

              <button
                onClick={saveReferralSettings}
                className="w-full bg-blue-600 py-3 rounded-lg hover:bg-blue-700 font-semibold"
              >
                保存设置
              </button>

              {referralSettings.enabled && referralSettings.promptText && (
                <div className="mt-6 pt-6 border-t border-slate-700">
                  <p className="text-sm text-gray-400 mb-3">预览效果：</p>
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-4">
                    <p className="font-bold">🎁 {referralSettings.promptText}</p>
                  </div>
                </div>
              )}
            </div>

            {/* 客服邮箱设置 */}
            <div className="bg-slate-800 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-bold mb-4">📧 客服设置</h3>
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">客服邮箱</label>
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  placeholder="support@example.com"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3"
                />
                <p className="text-gray-500 text-xs mt-1">用户可通过此邮箱联系客服</p>
              </div>
              <button
                onClick={async () => {
                  const token = localStorage.getItem('token');
                  const res = await fetch('/api/admin/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ support_email: supportEmail }),
                  });
                  if (res.ok) {
                    setMessage({ type: 'success', text: '客服邮箱已保存' });
                  } else {
                    setMessage({ type: 'error', text: '保存失败' });
                  }
                }}
                className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                保存客服邮箱
              </button>
            </div>
          </div>
        )}

        {/* 凭证查看弹窗 */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedOrder(null)}>
            <div className="bg-slate-800 p-6 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">
                  {selectedOrder.type === 'withdraw' ? '收款信息' : '支付凭证'}
                </h3>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-white text-2xl leading-none px-2"
                >
                  ✕
                </button>
              </div>
              
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
                    className="max-w-full max-h-96 mx-auto rounded-lg"
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




