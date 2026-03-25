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
  _count?: {
    userCards: number;
  };
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
  cnyAmount?: number;       // 新增
  exchangeRate?: number;    // 新增
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
  const [activeTab, setActiveTab] = useState<'cards' | 'notices' | 'users' | 'recharges' | 'withdraws' | 'refunds' | 'referral' | 'monthlyFee' | 'ai'>('cards');
  const [monthlyFeePreview, setMonthlyFeePreview] = useState<any>(null);
  const [monthlyFeeLoading, setMonthlyFeeLoading] = useState(false);
  const [monthlyFeeExecuting, setMonthlyFeeExecuting] = useState(false);
  const [monthlyFeeResult, setMonthlyFeeResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);  // 新增
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 数据状态
  const [cardTypes, setCardTypes] = useState<CardType[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userStats, setUserStats] = useState({ totalUsers: 0, totalBalance: 0, totalCards: 0 });
  const [orders, setOrders] = useState<Order[]>([]);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [withdrawOrders, setWithdrawOrders] = useState<Order[]>([]);
  const [refunds, setRefunds] = useState<Order[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [newNotice, setNewNotice] = useState('');
  const [subscriptionGuide, setSubscriptionGuide] = useState('');
  const [subscriptionGuideSaving, setSubscriptionGuideSaving] = useState(false);
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

  // AI 管理状态
  const [aiTiers, setAiTiers] = useState<any[]>([]);
  const [aiUsageStats, setAiUsageStats] = useState<any>(null);
  const [aiKeys, setAiKeys] = useState<any[]>([]);
  const [aiKeySearch, setAiKeySearch] = useState('');
  const [showAddTier, setShowAddTier] = useState(false);
  const [editingTier, setEditingTier] = useState<any>(null);
  const [tierForm, setTierForm] = useState({ name: '', displayName: '', pricePerMillionInput: '', pricePerMillionOutput: '', features: '', isActive: true });

  // 查看凭证弹窗状态
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [returnAmount, setReturnAmount] = useState<string>('');
  const [deductFees, setDeductFees] = useState<Record<string, string>>({});
  const [userSearch, setUserSearch] = useState('');
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set());

  const getToken = () => localStorage.getItem('token');

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }
    fetchTabData(activeTab, true);
    fetchSystemConfig();
  }, [router]);

  // 切换标签时加载对应数据
  useEffect(() => {
    if (!loadedTabs.has(activeTab)) {
      fetchTabData(activeTab, false);
    }
  }, [activeTab]);

  const fetchTabData = async (tab: string, isInitial: boolean) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setTabLoading(true);
    }
    try {
      switch (tab) {
        case 'cards':
          await fetchCardTypes();
          break;
        case 'notices':
          await fetchNotices();
          break;
        case 'users':
          await fetchUsers();
          break;
        case 'recharges':
          await fetchOrders();
          break;
        case 'withdraws':
          await fetchWithdrawOrders();
          break;
        case 'refunds':
          await fetchRefunds();
          break;
        case 'referral':
          await fetchReferralSettings();
          break;
        case 'ai':
          await fetchAIManagement();
          break;
      }
      setLoadedTabs(prev => new Set(prev).add(tab));
    } catch (error) {
      console.error('加载数据失败:', error);
    }
    if (isInitial) {
      setLoading(false);
    } else {
      setTabLoading(false);
    }
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
      if (data.stats) setUserStats(data.stats);
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
        if (data.referralSettings) {
          setReferralSettings({
            enabled: data.referralSettings.enabled ?? false,
            rewardAmount: String(data.referralSettings.rewardAmount ?? 5),
            promptText: data.referralSettings.promptText || '推荐好友注册开卡，即可获得 $5 奖励！'
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
        fetchReferralSettings();  // ✅ 加这一行，保存后立即刷新
      } else {
        setMessage({ type: 'error', text: '保存失败' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '保存失败' });
    }
  };

  // AI 管理数据获取
  const fetchAIManagement = async () => {
    try {
      const [tiersRes, usageRes, keysRes] = await Promise.all([
        fetch('/api/admin/ai-tiers', { headers: { 'Authorization': `Bearer ${getToken()}` } }),
        fetch('/api/admin/ai-usage', { headers: { 'Authorization': `Bearer ${getToken()}` } }),
        fetch('/api/admin/ai-keys', { headers: { 'Authorization': `Bearer ${getToken()}` } }),
      ]);
      if (tiersRes.ok) { const d = await tiersRes.json(); setAiTiers(d.tiers || []); }
      if (usageRes.ok) { const d = await usageRes.json(); setAiUsageStats(d); }
      if (keysRes.ok) { const d = await keysRes.json(); setAiKeys(d.keys || []); }
    } catch (error) {
      console.error('获取 AI 管理数据失败:', error);
    }
  };

  const handleSaveTier = async () => {
    try {
      const payload = {
        name: tierForm.name,
        displayName: tierForm.displayName,
        pricePerMillionInput: parseFloat(tierForm.pricePerMillionInput) || 0,
        pricePerMillionOutput: parseFloat(tierForm.pricePerMillionOutput) || 0,
        features: tierForm.features.split(',').map((f: string) => f.trim()).filter(Boolean),
        isActive: tierForm.isActive,
      };
      const url = editingTier ? `/api/admin/ai-tiers/${editingTier.id}` : '/api/admin/ai-tiers';
      const res = await fetch(url, {
        method: editingTier ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setMessage({ type: 'success', text: editingTier ? '套餐已更新' : '套餐已创建' });
      setShowAddTier(false);
      setEditingTier(null);
      setTierForm({ name: '', displayName: '', pricePerMillionInput: '', pricePerMillionOutput: '', features: '', isActive: true });
      fetchAIManagement();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleDeleteTier = async (tierId: string) => {
    if (!confirm('确定要删除此套餐吗？')) return;
    try {
      const res = await fetch(`/api/admin/ai-tiers/${tierId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setMessage({ type: 'success', text: '套餐已删除' });
      fetchAIManagement();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleToggleAIKey = async (keyId: string, currentStatus: string) => {
    try {
      const res = await fetch('/api/admin/ai-keys', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ keyId, status: currentStatus === 'active' ? 'disabled' : 'active' }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      fetchAIManagement();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
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
        if (data.configs?.subscription_guide) setSubscriptionGuide(data.configs.subscription_guide);
      }
    } catch (error) {
      console.error('获取系统配置失败:', error);
    }
  };

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
    if (processingOrderId) return;
    setProcessingOrderId(orderId);
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
    } finally {
      setProcessingOrderId(null);
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

  // 设置用户角色
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

  const handleAdjustBalance = async () => {
    if (!adjustBalanceUser || !adjustAmount) {
      setMessage({ type: 'error', text: '请输入调整金额' });
      return;
    }

    const amount = parseFloat(adjustAmount);
    if (isNaN(amount)) {
      setMessage({ type: 'error', text: '金额必须是数字' });
      return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          action: 'adjustBalance',
          userId: adjustBalanceUser.id,
          amount: amount,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage({ 
        type: 'success', 
        text: `余额调整成功！${amount > 0 ? '增加' : '扣除'} $${Math.abs(amount).toFixed(2)}` 
      });
      setAdjustBalanceUser(null);
      setAdjustAmount('');
      fetchUsers();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const [adjustBalanceUser, setAdjustBalanceUser] = useState<User | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');

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
          {[
            { key: 'cards', label: '💳 卡片管理' },
            { key: 'notices', label: '📋 开卡须知' },
            { key: 'users', label: '👥 用户管理' },
            { key: 'recharges', label: '💰 充值管理' },
            { key: 'withdraws', label: '📤 提现管理' },
            { key: 'refunds', label: '↩️ 退款管理' },
            { key: 'referral', label: '🎁 推广设置' },
            { key: 'monthlyFee', label: '📅 月费管理' },
            { key: 'ai', label: '🤖 AI 管理' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-gray-400 hover:bg-slate-600 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {tabLoading && (
          <div className="text-center py-12 text-gray-400">加载中...</div>
        )}

        {/* 卡片类型管理 */}
        {!tabLoading && activeTab === 'cards' && (
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
        {!tabLoading && activeTab === 'notices' && (
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

            {/* 订阅公告配置 */}
            <div className="bg-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">📌 订阅公告</h2>
              <p className="text-sm text-gray-400 mb-4">编辑订阅指南公告，内容将显示在用户前台卡片页面顶部。可以填写订阅AI服务的注意事项、IP填写方法等。</p>
              <textarea
                value={subscriptionGuide}
                onChange={(e) => setSubscriptionGuide(e.target.value)}
                rows={8}
                placeholder="例如：&#10;1. 订阅ChatGPT Plus时，请使用美国IP（推荐节点：洛杉矶/西雅图）&#10;2. 账单地址请参考下方推荐信息填写&#10;3. 如遇到支付失败，请更换IP后重试..."
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-sm leading-relaxed resize-y min-h-[120px]"
              />
              <div className="flex justify-end mt-4">
                <button
                  onClick={async () => {
                    setSubscriptionGuideSaving(true);
                    try {
                      const res = await fetch('/api/admin/config', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${getToken()}`,
                        },
                        body: JSON.stringify({ key: 'subscription_guide', value: subscriptionGuide }),
                      });
                      if (res.ok) {
                        setMessage({ type: 'success', text: '订阅公告已保存' });
                      } else {
                        setMessage({ type: 'error', text: '保存失败' });
                      }
                    } catch {
                      setMessage({ type: 'error', text: '保存失败' });
                    } finally {
                      setSubscriptionGuideSaving(false);
                    }
                  }}
                  disabled={subscriptionGuideSaving}
                  className="bg-blue-600 px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {subscriptionGuideSaving ? '保存中...' : '保存公告'}
                </button>
              </div>
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
        {!tabLoading && activeTab === 'users' && (
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-6">用户管理</h2>

            {/* 统计栏 */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-700 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-blue-400">{userStats.totalUsers}</div>
                <div className="text-sm text-gray-400 mt-1">👥 总用户数</div>
              </div>
              <div className="bg-slate-700 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-green-400">${userStats.totalBalance.toFixed(2)}</div>
                <div className="text-sm text-gray-400 mt-1">💰 总账户余额</div>
              </div>
              <div className="bg-slate-700 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-yellow-400">{userStats.totalCards}</div>
                <div className="text-sm text-gray-400 mt-1">💳 总开卡数量</div>
              </div>
            </div>

            {/* 搜索栏 */}
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="搜索用户名、邮箱、卡号后4位..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 pl-10 focus:outline-none focus:border-blue-500 transition"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {userSearch && (
                  <button
                    onClick={() => setUserSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>
              {userSearch && (
                <p className="text-sm text-gray-400 mt-2">
                  找到 {users.filter(u => {
                    const kw = userSearch.toLowerCase();
                    return u.username.toLowerCase().includes(kw) || u.email.toLowerCase().includes(kw) || (u.userCards && u.userCards.some((c: any) => c.cardNoLast4 && c.cardNoLast4.includes(kw)));
                  }).length} 个匹配用户
                </p>
              )}
            </div>

            {users.length === 0 ? (
              <p className="text-gray-400 text-center py-8">暂无用户</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-slate-700">
                    <th className="pb-3">用户名</th>
                    <th className="pb-3">邮箱</th>
                    <th className="pb-3">余额</th>
                    <th className="pb-3">开卡数</th>
                    <th className="pb-3">角色</th>
                    <th className="pb-3">注册时间</th>
                    <th className="pb-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users
                    .filter(user => {
                      if (!userSearch) return true;
                      const keyword = userSearch.toLowerCase();
                      return user.username.toLowerCase().includes(keyword) || user.email.toLowerCase().includes(keyword) || (user.userCards && user.userCards.some((c: any) => c.cardNoLast4 && c.cardNoLast4.includes(keyword)));
                    })
                    .map(user => (
                    <tr key={user.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                      <td className="py-4">
                        <Link 
                          href={`/admin/users/${user.id}`}
                          className="text-blue-400 hover:text-blue-300 hover:underline font-medium"
                        >
                          {user.username}
                        </Link>
                      </td>
                      <td className="py-4">{user.email}</td>
                      <td className="py-4 text-green-400">${user.balance.toFixed(2)}</td>
                      <td className="py-4">
                        {(user._count?.userCards || 0) > 0 ? (
                          <span className="bg-green-600/20 text-green-400 border border-green-600/30 px-2 py-1 rounded text-sm font-medium">
                            {user._count?.userCards} 张
                          </span>
                        ) : (
                          <span className="bg-slate-600/50 text-gray-500 px-2 py-1 rounded text-sm">
                            0 张
                          </span>
                        )}
                      </td>
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
                      <td className="py-4 text-gray-400 text-sm">
                        {new Date(user.createdAt).toLocaleString('zh-CN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-4">
                        {user.role !== 'admin' && (
                          <div className="flex gap-2 flex-wrap">
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
                            <button
                              onClick={() => {
                                setAdjustBalanceUser(user);
                                setAdjustAmount('');
                              }}
                              className="px-3 py-1 rounded text-xs bg-green-600 hover:bg-green-700"
                            >
                              调整余额
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

        {/* 充值管理（原订单管理） */}
        {!tabLoading && activeTab === 'recharges' && (
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-6">充值订单管理</h2>
            {orders.length === 0 ? (
              <p className="text-gray-400 text-center py-8">暂无订单</p>
            ) : (
              <>
                {/* 移动端卡片式布局 */}
                <div className="md:hidden space-y-4">
                  {orders.map(order => (
                    <div key={order.id} className="bg-slate-700 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-white">{order.user?.username || '未知'}</div>
                          <div className="text-xs text-gray-400">{order.user?.email}</div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs whitespace-nowrap ${
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
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-slate-600/50 rounded p-2">
                          <div className="text-gray-400 text-xs mb-1">充值金额</div>
                          <div className="text-green-400 font-bold">${order.amount}</div>
                          {order.paymentMethod === 'usdt' ? (
                            <div className="text-yellow-400 text-xs mt-0.5">{order.amount} USDT</div>
                          ) : order.cnyAmount ? (
                            <div className="text-yellow-400 text-xs mt-0.5">≈ ¥{order.cnyAmount}</div>
                          ) : null}
                        </div>
                        <div className="bg-slate-600/50 rounded p-2">
                          <div className="text-gray-400 text-xs mb-1">支付方式</div>
                          <span className={`px-2 py-1 rounded text-xs ${
                            order.paymentMethod === 'usdt' ? 'bg-yellow-600' :
                            order.paymentMethod === 'wechat' ? 'bg-green-600' :
                            order.paymentMethod === 'alipay' ? 'bg-blue-600' :
                            'bg-gray-600'
                          }`}>
                            {order.paymentMethod?.toUpperCase() || '未知'}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-gray-400 border-t border-slate-600 pt-2">
                        {new Date(order.createdAt).toLocaleString('zh-CN', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {(order.txHash || order.paymentProof) && (
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="flex-1 text-blue-400 hover:text-blue-300 text-xs p-2 bg-slate-600/50 rounded hover:bg-slate-600"
                          >
                            查看凭证
                          </button>
                        )}
                        {(order.status === 'processing' || order.status === 'pending') && (
                          <>
                            <button
                              onClick={() => handleOrderAction(order.id, 'confirm')}
                              disabled={processingOrderId === order.id}
                              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white text-xs p-2 rounded"
                            >
                              {processingOrderId === order.id ? '处理中...' : '确认'}
                            </button>
                            <button
                              onClick={() => handleOrderAction(order.id, 'reject')}
                              disabled={processingOrderId === order.id}
                              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white text-xs p-2 rounded"
                            >
                              拒绝
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* PC端表格 */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-gray-400 border-b border-slate-700">
                        <th className="pb-3">用户</th>
                        <th className="pb-3">金额 (USD)</th>
                        <th className="pb-3">实付金额</th>
                        <th className="pb-3">支付方式</th>
                        <th className="pb-3">凭证</th>
                        <th className="pb-3">状态</th>
                        <th className="pb-3">时间</th>
                        <th className="pb-3">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(order => (
                        <tr key={order.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                          <td className="py-4">
                            <div>{order.user?.username || '未知'}</div>
                            <div className="text-sm text-gray-400">{order.user?.email}</div>
                          </td>
                          <td className="py-4 text-green-400 font-bold">${order.amount}</td>
                          <td className="py-4 text-yellow-400 font-bold">
                            {order.paymentMethod === 'usdt' 
                              ? `${order.amount} USDT`
                              : `¥${order.cnyAmount || Math.ceil(order.amount * 7.2)}`
                            }
                          </td>
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
                                  disabled={processingOrderId === order.id}
                                  className="bg-green-600 px-3 py-1 rounded text-sm hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
                                >
                                  {processingOrderId === order.id ? '处理中...' : '确认'}
                                </button>
                                <button
                                  onClick={() => handleOrderAction(order.id, 'reject')}
                                  disabled={processingOrderId === order.id}
                                  className="bg-red-600 px-3 py-1 rounded text-sm hover:bg-red-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
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
                </div>
              </>
            )}
          </div>
        )}

        {/* 提现管理 */}
        {!tabLoading && activeTab === 'withdraws' && (
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
        {!tabLoading && activeTab === 'refunds' && (
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
        {!tabLoading && activeTab === 'referral' && (
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
            <div className="mt-6">
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

        {/* 月费管理 */}
        {!tabLoading && activeTab === 'monthlyFee' && (
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-6">📅 月费收取管理</h2>
            <p className="text-sm text-gray-400 mb-6">扣除逻辑：每张卡扣除平台利润月费（显示月费 - 上游月费）。优先从卡余额扣，不足则从账户余额扣。</p>

            {/* 预览按钮 */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={async () => {
                  setMonthlyFeeLoading(true);
                  setMonthlyFeeResult(null);
                  try {
                    const token = localStorage.getItem('token');
                    const res = await fetch('/api/admin/monthly-fee', {
                      headers: { 'Authorization': `Bearer ${token}` },
                    });
                    const data = await res.json();
                    if (res.ok) setMonthlyFeePreview(data);
                    else setMessage({ type: 'error', text: data.error });
                  } catch { setMessage({ type: 'error', text: '加载失败' }); }
                  setMonthlyFeeLoading(false);
                }}
                disabled={monthlyFeeLoading}
                className="bg-slate-700 px-6 py-3 rounded-lg hover:bg-slate-600 font-medium disabled:opacity-50"
              >
                {monthlyFeeLoading ? '加载中...' : '🔍 预览本月扣款'}
              </button>
              <button
                onClick={async () => {
                  if (!confirm('确定执行本月月费扣除？\n\n此操作将从卡余额/账户余额中扣除月费，请确认本月未执行过。')) return;
                  setMonthlyFeeExecuting(true);
                  setMonthlyFeeResult(null);
                  try {
                    const token = localStorage.getItem('token');
                    const res = await fetch('/api/admin/monthly-fee', {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${token}` },
                    });
                    const data = await res.json();
                    if (res.ok) {
                      setMonthlyFeeResult(data);
                      setMessage({ type: 'success', text: `月费扣除完成！成功 ${data.summary?.successCount} 张，失败 ${data.summary?.failCount} 张，共收取 $${data.summary?.totalCollected}` });
                    } else {
                      setMessage({ type: 'error', text: data.error });
                    }
                  } catch { setMessage({ type: 'error', text: '执行失败' }); }
                  setMonthlyFeeExecuting(false);
                }}
                disabled={monthlyFeeExecuting || monthlyFeePreview?.alreadyExecutedThisMonth}
                className="bg-blue-600 px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50"
              >
                {monthlyFeeExecuting ? '执行中...' : monthlyFeePreview?.alreadyExecutedThisMonth ? '⛔ 本月已执行' : '✅ 执行本月扣款'}
              </button>
            </div>

            {/* 执行结果 */}
            {monthlyFeeResult && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6">
                <h3 className="font-bold text-green-400 mb-2">执行结果</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">总卡片数</span>
                    <p className="text-lg font-bold">{monthlyFeeResult.summary?.totalCards}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">成功扣除</span>
                    <p className="text-lg font-bold text-green-400">{monthlyFeeResult.summary?.successCount}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">扣除失败</span>
                    <p className="text-lg font-bold text-red-400">{monthlyFeeResult.summary?.failCount}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">共收取</span>
                    <p className="text-lg font-bold text-blue-400">${monthlyFeeResult.summary?.totalCollected}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 预览数据 */}
            {monthlyFeePreview && (
              <div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <span className="text-sm text-gray-400">活跃卡片总数</span>
                    <p className="text-2xl font-bold">{monthlyFeePreview.totalCards}</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <span className="text-sm text-gray-400">预计收入</span>
                    <p className="text-2xl font-bold text-green-400">${monthlyFeePreview.totalEstimatedRevenue}</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <span className="text-sm text-gray-400">上次执行</span>
                    <p className="text-sm font-medium mt-1">{monthlyFeePreview.lastExecutionTime ? new Date(monthlyFeePreview.lastExecutionTime).toLocaleString('zh-CN') : '从未执行'}</p>
                    {monthlyFeePreview.alreadyExecutedThisMonth && (
                      <p className="text-xs text-yellow-400 mt-1">⚠️ 本月已执行过</p>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 border-b border-slate-700">
                        <th className="pb-3 text-left">用户</th>
                        <th className="pb-3">卡类型</th>
                        <th className="pb-3">月费</th>
                        <th className="pb-3">账户余额</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyFeePreview.cards?.filter((c: any) => c.fee > 0).map((card: any, i: number) => (
                        <tr key={i} className="border-b border-slate-700/50">
                          <td className="py-2">{card.username || '-'}</td>
                          <td className="py-2 text-center">{card.cardType}</td>
                          <td className="py-2 text-center text-green-400">${card.fee}</td>
                          <td className="py-2 text-center">${card.userBalance?.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI 管理 */}
        {!tabLoading && activeTab === 'ai' && (
          <div className="space-y-6">
            {/* 用量统计 */}
            {aiUsageStats && (
              <div>
                <h3 className="text-lg font-bold mb-3">📊 用量统计</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-slate-800 p-4 rounded-xl text-center">
                    <p className="text-gray-400 text-sm">今日费用</p>
                    <p className="text-xl font-bold text-green-400">${aiUsageStats.todayCost?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div className="bg-slate-800 p-4 rounded-xl text-center">
                    <p className="text-gray-400 text-sm">本月费用</p>
                    <p className="text-xl font-bold text-blue-400">${aiUsageStats.monthCost?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div className="bg-slate-800 p-4 rounded-xl text-center">
                    <p className="text-gray-400 text-sm">总 Key 数</p>
                    <p className="text-xl font-bold">{aiUsageStats.totalKeys || 0}</p>
                  </div>
                  <div className="bg-slate-800 p-4 rounded-xl text-center">
                    <p className="text-gray-400 text-sm">活跃 Key</p>
                    <p className="text-xl font-bold text-purple-400">{aiUsageStats.activeKeys || 0}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 套餐管理 */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold">📦 套餐管理</h3>
                <button
                  onClick={() => {
                    setEditingTier(null);
                    setTierForm({ name: '', displayName: '', pricePerMillionInput: '', pricePerMillionOutput: '', features: '', isActive: true });
                    setShowAddTier(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm"
                >
                  + 新建套餐
                </button>
              </div>

              <div className="space-y-3">
                {aiTiers.map((tier: any) => (
                  <div key={tier.id} className="bg-slate-800 p-4 rounded-xl flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{tier.displayName}</span>
                        <span className="text-xs text-gray-500">({tier.name})</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${tier.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {tier.isActive ? '启用' : '停用'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        输入 ${tier.pricePerMillionInput}/M tokens · 输出 ${tier.pricePerMillionOutput}/M tokens
                        {tier._count?.aiKeys > 0 && <span className="ml-2 text-blue-400">({tier._count.aiKeys} 个 Key)</span>}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingTier(tier);
                          setTierForm({
                            name: tier.name,
                            displayName: tier.displayName,
                            pricePerMillionInput: String(tier.pricePerMillionInput),
                            pricePerMillionOutput: String(tier.pricePerMillionOutput),
                            features: Array.isArray(tier.features) ? tier.features.join(', ') : (typeof tier.features === 'string' ? tier.features : ''),
                            isActive: tier.isActive,
                          });
                          setShowAddTier(true);
                        }}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDeleteTier(tier.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
                {aiTiers.length === 0 && (
                  <p className="text-center text-gray-500 py-4">暂无套餐，请点击"新建套餐"创建</p>
                )}
              </div>
            </div>

            {/* Key 管理 */}
            <div>
              <h3 className="text-lg font-bold mb-3">🔑 Key 管理</h3>
              <div className="mb-3">
                <input
                  type="text"
                  value={aiKeySearch}
                  onChange={(e) => setAiKeySearch(e.target.value)}
                  placeholder="搜索用户名或邮箱..."
                  className="w-full bg-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-slate-700">
                      <th className="pb-3 text-left">用户</th>
                      <th className="pb-3 text-left">Key 名称</th>
                      <th className="pb-3">套餐</th>
                      <th className="pb-3">本月用量</th>
                      <th className="pb-3">状态</th>
                      <th className="pb-3">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aiKeys
                      .filter((k: any) => {
                        if (!aiKeySearch) return true;
                        const s = aiKeySearch.toLowerCase();
                        return k.user?.username?.toLowerCase().includes(s) || k.user?.email?.toLowerCase().includes(s);
                      })
                      .map((key: any) => (
                      <tr key={key.id} className="border-b border-slate-700/50">
                        <td className="py-2">{key.user?.email || '-'}</td>
                        <td className="py-2">{key.keyName}</td>
                        <td className="py-2 text-center">{key.tier?.displayName || '-'}</td>
                        <td className="py-2 text-center">${key.monthUsed?.toFixed(4) || '0'}</td>
                        <td className="py-2 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            key.status === 'active' ? 'bg-green-500/20 text-green-400' :
                            key.status === 'disabled' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {key.status === 'active' ? '正常' : key.status === 'disabled' ? '已停用' : '已暂停'}
                          </span>
                        </td>
                        <td className="py-2 text-center">
                          <button
                            onClick={() => handleToggleAIKey(key.id, key.status)}
                            className={`text-xs ${key.status === 'active' ? 'text-yellow-400' : 'text-green-400'}`}
                          >
                            {key.status === 'active' ? '停用' : '启用'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {aiKeys.length === 0 && (
                      <tr><td colSpan={6} className="py-4 text-center text-gray-500">暂无 Key</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 新建/编辑套餐弹窗 */}
        {showAddTier && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 p-6 rounded-xl w-full max-w-md">
              <h3 className="text-lg font-bold mb-4">{editingTier ? '编辑套餐' : '新建套餐'}</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">套餐标识 (英文)</label>
                  <input
                    type="text"
                    value={tierForm.name}
                    onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })}
                    placeholder="例如：economy, stable, official"
                    className="w-full bg-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">显示名称</label>
                  <input
                    type="text"
                    value={tierForm.displayName}
                    onChange={(e) => setTierForm({ ...tierForm, displayName: e.target.value })}
                    placeholder="例如：经济版、稳定版、官方直连"
                    className="w-full bg-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">输入价格 ($/M tokens)</label>
                    <input
                      type="number"
                      value={tierForm.pricePerMillionInput}
                      onChange={(e) => setTierForm({ ...tierForm, pricePerMillionInput: e.target.value })}
                      placeholder="3.00"
                      step="0.01"
                      className="w-full bg-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">输出价格 ($/M tokens)</label>
                    <input
                      type="number"
                      value={tierForm.pricePerMillionOutput}
                      onChange={(e) => setTierForm({ ...tierForm, pricePerMillionOutput: e.target.value })}
                      placeholder="15.00"
                      step="0.01"
                      className="w-full bg-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">特性 (逗号分隔)</label>
                  <input
                    type="text"
                    value={tierForm.features}
                    onChange={(e) => setTierForm({ ...tierForm, features: e.target.value })}
                    placeholder="多通道聚合, 自动切换, 低延迟"
                    className="w-full bg-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={tierForm.isActive}
                    onChange={(e) => setTierForm({ ...tierForm, isActive: e.target.checked })}
                    className="rounded"
                  />
                  <label className="text-sm text-gray-400">启用</label>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSaveTier}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-medium text-sm"
                >
                  {editingTier ? '保存修改' : '创建套餐'}
                </button>
                <button
                  onClick={() => { setShowAddTier(false); setEditingTier(null); }}
                  className="flex-1 bg-slate-600 hover:bg-slate-500 py-2 rounded-lg font-medium text-sm"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 凭证查看弹窗 */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedOrder(null)}>
            <div className="bg-slate-800 p-6 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
                  <a href={selectedOrder.txHash} target="_blank" rel="noopener noreferrer" title="点击新窗口查看原图">
                    <img 
                      src={selectedOrder.txHash} 
                      alt="收款码" 
                      className="w-full rounded-lg cursor-zoom-in hover:opacity-90"
                    />
                  </a>
                  <p className="text-center text-gray-500 text-xs mt-1">点击图片可在新窗口查看原图</p>
                </div>
              )}
              
              {selectedOrder.paymentProof && (
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">支付截图</label>
                  <a href={selectedOrder.paymentProof} target="_blank" rel="noopener noreferrer" title="点击新窗口查看原图">
                    <img 
                      src={selectedOrder.paymentProof} 
                      alt="支付截图" 
                      className="w-full rounded-lg cursor-zoom-in hover:opacity-90"
                    />
                  </a>
                  <p className="text-center text-gray-500 text-xs mt-1">点击图片可在新窗口查看原图</p>
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

        {/* 调整余额弹窗 */}
        {adjustBalanceUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setAdjustBalanceUser(null)}>
            <div className="bg-slate-800 p-6 rounded-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">调整用户余额</h3>
                <button
                  onClick={() => setAdjustBalanceUser(null)}
                  className="text-gray-400 hover:text-white text-2xl leading-none"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400 mb-2">用户信息</p>
                  <div className="bg-slate-700 rounded-lg p-3">
                    <div className="font-medium">{adjustBalanceUser.username}</div>
                    <div className="text-sm text-gray-400">{adjustBalanceUser.email}</div>
                    <div className="text-sm text-gray-400 mt-1">
                      当前余额: <span className="text-green-400 font-bold">${adjustBalanceUser.balance.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">调整金额 (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="正数=增加 负数=扣除"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleAdjustBalance()}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {adjustAmount ? (
                      parseFloat(adjustAmount) > 0 
                        ? `✓ 增加 $${Math.abs(parseFloat(adjustAmount)).toFixed(2)}，新余额: $${(adjustBalanceUser.balance + parseFloat(adjustAmount)).toFixed(2)}`
                        : `✓ 扣除 $${Math.abs(parseFloat(adjustAmount)).toFixed(2)}，新余额: $${(adjustBalanceUser.balance + parseFloat(adjustAmount)).toFixed(2)}`
                    ) : '例如: 10 (增加) 或 -5 (扣除)'}
                  </p>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleAdjustBalance}
                    className="flex-1 bg-blue-600 py-2 rounded-lg hover:bg-blue-700 font-medium"
                  >
                    确认调整
                  </button>
                  <button
                    onClick={() => setAdjustBalanceUser(null)}
                    className="flex-1 bg-slate-600 py-2 rounded-lg hover:bg-slate-500"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}




