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
  aiBalance: number;
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
  const [activeTab, setActiveTab] = useState<'cards' | 'notices' | 'users' | 'recharges' | 'withdraws' | 'refunds' | 'referral' | 'monthlyFee' | 'ai' | 'enterprise' | 'copilot'>('cards');
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
  const [welfareGuide, setWelfareGuide] = useState('');
  const [welfareGuideSaving, setWelfareGuideSaving] = useState(false);
  const [welfareQrcode, setWelfareQrcode] = useState('');
  const [welfareQrcodeSaving, setWelfareQrcodeSaving] = useState(false);
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

  // 企业审核状态
  const [enterpriseApps, setEnterpriseApps] = useState<any[]>([]);
  const [rejectingApp, setRejectingApp] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // AI 管理状态
  const [aiTiers, setAiTiers] = useState<any[]>([]);
  const [aiUsageStats, setAiUsageStats] = useState<any>(null);
  const [aiKeys, setAiKeys] = useState<any[]>([]);
  const [aiKeySearch, setAiKeySearch] = useState('');
  const [showAddTier, setShowAddTier] = useState(false);
  const [editingTier, setEditingTier] = useState<any>(null);
  const [tierForm, setTierForm] = useState({ displayName: '', description: '', pricePerMillionInput: '', pricePerMillionOutput: '', features: '', isActive: true, providerId: '', modelGroup: 'claude', channelGroup: '', maxKeys: '0', requiredRole: '', minAiBalance: '0' });

  // Provider 管理状态
  const [aiProviders, setAiProviders] = useState<any[]>([]);
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [editingProvider, setEditingProvider] = useState<any>(null);
  const [providerForm, setProviderForm] = useState({ displayName: '', type: 'proxy', baseUrl: '', masterKey: '', isActive: true });

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
        case 'enterprise':
          await fetchEnterpriseApps();
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
  const [aiTransferMultiplier, setAiTransferMultiplier] = useState('1');
  const [aiTransferMultiplierSaving, setAiTransferMultiplierSaving] = useState(false);

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

  // 企业申请数据获取
  const fetchEnterpriseApps = async () => {
    try {
      const res = await fetch('/api/admin/enterprise', {
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      if (res.ok) { const d = await res.json(); setEnterpriseApps(d.applications || []); }
    } catch (error) {
      console.error('获取企业申请数据失败:', error);
    }
  };

  const handleEnterpriseReview = async (applicationId: string, action: 'approve' | 'reject') => {
    if (action === 'reject' && !rejectReason.trim()) {
      setMessage({ type: 'error', text: '请填写拒绝原因' });
      return;
    }
    try {
      const res = await fetch('/api/admin/enterprise', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ applicationId, action, rejectReason: rejectReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage({ type: 'success', text: action === 'approve' ? '已批准，用户已升级为企业账户' : '已拒绝' });
      setRejectingApp(null);
      setRejectReason('');
      fetchEnterpriseApps();
      fetchUsers();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  // AI 管理数据获取
  const fetchAIManagement = async () => {
    try {
      const [tiersRes, usageRes, keysRes, providersRes] = await Promise.all([
        fetch('/api/admin/ai-tiers', { headers: { 'Authorization': `Bearer ${getToken()}` } }),
        fetch('/api/admin/ai-usage', { headers: { 'Authorization': `Bearer ${getToken()}` } }),
        fetch('/api/admin/ai-keys', { headers: { 'Authorization': `Bearer ${getToken()}` } }),
        fetch('/api/admin/ai-providers', { headers: { 'Authorization': `Bearer ${getToken()}` } }),
      ]);
      if (tiersRes.ok) { const d = await tiersRes.json(); setAiTiers(d.tiers || []); }
      if (usageRes.ok) { const d = await usageRes.json(); setAiUsageStats(d); }
      if (keysRes.ok) { const d = await keysRes.json(); setAiKeys(d.keys || []); }
      if (providersRes.ok) { const d = await providersRes.json(); setAiProviders(d.providers || []); }
    } catch (error) {
      console.error('获取 AI 管理数据失败:', error);
    }
  };

  const handleSaveTier = async () => {
    if (!tierForm.displayName.trim()) {
      setMessage({ type: 'error', text: '请填写套餐名称' });
      return;
    }
    try {
      // 自动从名称生成slug
      const autoName = tierForm.displayName.trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || `tier-${Date.now()}`;
      const payload = {
        name: editingTier ? editingTier.name : autoName,
        displayName: tierForm.displayName.trim(),
        description: tierForm.description.trim() || null,
        pricePerMillionInput: parseFloat(tierForm.pricePerMillionInput) || 0,
        pricePerMillionOutput: parseFloat(tierForm.pricePerMillionOutput) || 0,
        features: tierForm.features.split(',').map((f: string) => f.trim()).filter(Boolean),
        isActive: tierForm.isActive,
        providerId: tierForm.providerId || null,
        modelGroup: tierForm.modelGroup || 'claude',
        channelGroup: tierForm.channelGroup || null,
        maxKeys: parseInt(tierForm.maxKeys) || 0,
        requiredRole: tierForm.requiredRole || null,
        minAiBalance: parseFloat(tierForm.minAiBalance) || 0,
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
      setTierForm({ displayName: '', description: '', pricePerMillionInput: '', pricePerMillionOutput: '', features: '', isActive: true, providerId: '', modelGroup: 'claude', channelGroup: '', maxKeys: '0', requiredRole: '', minAiBalance: '0' });
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

  const handleDeleteAIKey = async (keyId: string, keyName: string) => {
    if (!confirm(`确定要删除 Key "${keyName}" 吗？此操作不可撤销，同时会删除 new-api 侧的令牌。`)) return;
    try {
      const res = await fetch(`/api/admin/ai-keys?id=${keyId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setMessage({ type: 'success', text: 'Key 已删除' });
      fetchAIManagement();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  // Provider 管理
  const handleSaveProvider = async () => {
    try {
      if (!providerForm.displayName.trim()) {
        setMessage({ type: 'error', text: '请填写服务商名称' });
        return;
      }
      const autoName = providerForm.displayName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || `provider-${Date.now()}`;
      const payload = {
        name: editingProvider ? editingProvider.name : autoName,
        displayName: providerForm.displayName.trim(),
        type: providerForm.type,
        baseUrl: providerForm.baseUrl || null,
        masterKey: providerForm.masterKey || null,
        isActive: providerForm.isActive,
      };
      const url = editingProvider ? `/api/admin/ai-providers/${editingProvider.id}` : '/api/admin/ai-providers';
      const res = await fetch(url, {
        method: editingProvider ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setMessage({ type: 'success', text: editingProvider ? '服务商已更新' : '服务商已创建' });
      setShowAddProvider(false);
      setEditingProvider(null);
      setProviderForm({ displayName: '', type: 'proxy', baseUrl: '', masterKey: '', isActive: true });
      fetchAIManagement();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleDeleteProvider = async (providerId: string) => {
    if (!confirm('确定要删除此服务商吗？')) return;
    try {
      const res = await fetch(`/api/admin/ai-providers/${providerId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setMessage({ type: 'success', text: '服务商已删除' });
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
        if (data.configs?.welfare_guide) setWelfareGuide(data.configs.welfare_guide);
        if (data.configs?.welfare_qrcode) setWelfareQrcode(data.configs.welfare_qrcode);
        setAiTransferMultiplier(data.configs?.ai_balance_recharge_multiplier || '1');
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

  const handleRefundAction = async (refundId: string, action: 'confirm' | 'reject', deductFee?: number) => {
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

      setMessage({ type: 'success', text: newRole === 'agent' ? '已设为代理商' : newRole === 'enterprise' ? '已设为企业用户' : '已设为普通用户' });
      fetchUsers();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleAdjustBalance = async () => {
    if (!adjustBalanceUser) {
      setMessage({ type: 'error', text: '未选择用户' });
      return;
    }

    const hasBalanceAmount = adjustAmount.trim() !== '';
    const hasAiBalanceAmount = adjustAiAmount.trim() !== '';
    if (!hasBalanceAmount && !hasAiBalanceAmount) {
      setMessage({ type: 'error', text: '请输入至少一个调整金额' });
      return;
    }

    const amount = hasBalanceAmount ? parseFloat(adjustAmount) : 0;
    const aiAmount = hasAiBalanceAmount ? parseFloat(adjustAiAmount) : 0;
    if ((hasBalanceAmount && isNaN(amount)) || (hasAiBalanceAmount && isNaN(aiAmount))) {
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
          amount,
          aiAmount,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage({ 
        type: 'success', 
        text: `余额调整成功！${[
          hasBalanceAmount ? `账户${amount > 0 ? '增加' : '扣除'} $${Math.abs(amount).toFixed(2)}` : null,
          hasAiBalanceAmount ? `AI钱包${aiAmount > 0 ? '增加' : '扣除'} $${Math.abs(aiAmount).toFixed(2)}` : null,
        ].filter(Boolean).join('，')}` 
      });
      setAdjustBalanceUser(null);
      setAdjustAmount('');
      setAdjustAiAmount('');
      fetchUsers();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const [adjustBalanceUser, setAdjustBalanceUser] = useState<User | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustAiAmount, setAdjustAiAmount] = useState('');

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
            { key: 'enterprise', label: '🏢 企业审核' },
            { key: 'ai', label: '✦ AI 管理' },
            { key: 'copilot', label: '🤖 Copilot池' },
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

            {/* 福利指南配置 */}
            <div className="bg-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">🎁 福利指南</h2>
              <p className="text-sm text-gray-400 mb-4">编辑福利指南内容，将显示在用户前台卡片页面顶部（与订阅公告并排显示）。可以填写优惠活动、充值福利、新手引导等。</p>
              <textarea
                value={welfareGuide}
                onChange={(e) => setWelfareGuide(e.target.value)}
                rows={8}
                placeholder="例如：&#10;1. 新用户首次充值满$50送$5&#10;2. 邀请好友注册开卡，双方各得$3奖励&#10;3. 每月消费满$100返现2%..."
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-sm leading-relaxed resize-y min-h-[120px]"
              />
              <div className="flex justify-end mt-4">
                <button
                  onClick={async () => {
                    setWelfareGuideSaving(true);
                    try {
                      const res = await fetch('/api/admin/config', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${getToken()}`,
                        },
                        body: JSON.stringify({ key: 'welfare_guide', value: welfareGuide }),
                      });
                      if (res.ok) {
                        setMessage({ type: 'success', text: '福利指南已保存' });
                      } else {
                        setMessage({ type: 'error', text: '保存失败' });
                      }
                    } catch {
                      setMessage({ type: 'error', text: '保存失败' });
                    } finally {
                      setWelfareGuideSaving(false);
                    }
                  }}
                  disabled={welfareGuideSaving}
                  className="bg-green-600 px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {welfareGuideSaving ? '保存中...' : '保存指南'}
                </button>
              </div>

              {/* 二维码配置 */}
              <div className="mt-6 pt-6 border-t border-slate-700">
                <h3 className="text-sm font-semibold text-gray-300 mb-2">📱 群二维码（显示在福利指南底部）</h3>
                <p className="text-xs text-gray-500 mb-3">上传微信群二维码图片，用户展开福利指南后可看到。删除图片则不显示。</p>
                <div className="flex gap-3 items-start">
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 500 * 1024) {
                          setMessage({ type: 'error', text: '图片大小不能超过 500KB' });
                          return;
                        }
                        setWelfareQrcodeSaving(true);
                        try {
                          const formData = new FormData();
                          formData.append('file', file);
                          const uploadRes = await fetch('/api/admin/upload', {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${getToken()}` },
                            body: formData,
                          });
                          if (!uploadRes.ok) throw new Error('上传失败');
                          const { url } = await uploadRes.json();
                          // 保存到配置
                          const res = await fetch('/api/admin/config', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${getToken()}`,
                            },
                            body: JSON.stringify({ key: 'welfare_qrcode', value: url }),
                          });
                          if (res.ok) {
                            setWelfareQrcode(url);
                            setMessage({ type: 'success', text: '二维码已上传保存' });
                          } else {
                            setMessage({ type: 'error', text: '保存失败' });
                          }
                        } catch {
                          setMessage({ type: 'error', text: '上传失败' });
                        } finally {
                          setWelfareQrcodeSaving(false);
                          e.target.value = '';
                        }
                      }}
                      className="text-sm text-gray-400 file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-green-600 file:text-white file:cursor-pointer hover:file:bg-green-700"
                    />
                    {welfareQrcodeSaving && <p className="text-xs text-yellow-400 mt-2">上传中...</p>}
                    {welfareQrcode && (
                      <button
                        onClick={async () => {
                          setWelfareQrcodeSaving(true);
                          try {
                            const res = await fetch('/api/admin/config', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${getToken()}`,
                              },
                              body: JSON.stringify({ key: 'welfare_qrcode', value: '' }),
                            });
                            if (res.ok) {
                              setWelfareQrcode('');
                              setMessage({ type: 'success', text: '二维码已删除' });
                            }
                          } catch {
                            setMessage({ type: 'error', text: '删除失败' });
                          } finally {
                            setWelfareQrcodeSaving(false);
                          }
                        }}
                        className="mt-2 text-xs text-red-400 hover:text-red-300"
                      >
                        删除当前二维码
                      </button>
                    )}
                  </div>
                  {welfareQrcode && (
                    <div className="flex-shrink-0">
                      <img src={welfareQrcode} alt="预览" className="w-24 h-24 rounded-lg bg-white p-1 object-contain" />
                    </div>
                  )}
                </div>
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
                          user.role === 'enterprise' ? 'bg-cyan-600' : 
                          'bg-gray-600'
                        }`}>
                          {user.role === 'admin' ? '管理员' : 
                           user.role === 'agent' ? '代理商' : 
                           user.role === 'enterprise' ? '企业用户' : 
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
              💡 说明：退款金额已由上游自动回收到商户账户，用户发邮件申请退款后，请在GSalary商户后台手动调额退回用户卡，然后在此确认退款记录
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
                      <th className="pb-3">建议手续费</th>
                      <th className="pb-3">建议退回</th>
                      <th className="pb-3">商户/卡片</th>
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
                          {refund.cardInfo?.merchantName && (
                            <div className="text-gray-300 mb-1">{refund.cardInfo.merchantName}</div>
                          )}
                          {refund.cardInfo?.gsalaryCardId ? (
                            <span className="text-gray-400">
                              卡ID: {refund.cardInfo.gsalaryCardId.slice(0, 8)}...
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
                            {refund.status === 'completed' ? '已退款' :
                             refund.status === 'pending' ? '待退款' : '已拒绝'}
                          </span>
                        </td>
                        <td className="py-4 text-gray-400 text-sm">
                          {new Date(refund.createdAt).toLocaleString()}
                        </td>
                        <td className="py-4">
                          {refund.status === 'pending' && (
                            <div className="flex flex-col gap-2">
                              <div className="flex gap-2 items-center">
                                <span className="text-xs text-gray-400">手续费:</span>
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
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleRefundAction(refund.id, 'confirm', parseFloat(deductFees[refund.id] || refund.calculatedFee || '0'))}
                                  className="bg-blue-600 px-2 py-1 rounded text-xs hover:bg-blue-700"
                                  title="已在商户后台手动退款，确认此记录"
                                >
                                  确认已退
                                </button>
                                <button
                                  onClick={() => handleRefundAction(refund.id, 'reject')}
                                  className="bg-red-600 px-2 py-1 rounded text-xs hover:bg-red-700"
                                  title="拒绝退款"
                                >
                                  拒绝
                                </button>
                              </div>
                            </div>
                          )}
                          {refund.status === 'completed' && refund.paymentProof && (
                            <div className="text-xs text-gray-400">
                              {(() => {
                                try {
                                  const proof = JSON.parse(refund.paymentProof);
                                  if (proof.ourFee) {
                                    return `手续费 $${proof.ourFee}，退回 $${proof.refundedToUser?.toFixed(2)}`;
                                  }
                                  return '已退款';
                                } catch {
                                  return '已退款';
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

        {/* 企业审核 */}
        {!tabLoading && activeTab === 'enterprise' && (
          <div className="space-y-6">
            <div className="bg-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">🏢 企业账户申请审核</h2>
              {enterpriseApps.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p>暂无企业申请</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {enterpriseApps.map((app: any) => (
                    <div key={app.id} className={`bg-slate-700 rounded-lg p-5 border ${
                      app.status === 'pending' ? 'border-yellow-500/30' :
                      app.status === 'approved' ? 'border-green-500/30' : 'border-red-500/30'
                    }`}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-bold text-lg">{app.companyName}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              app.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                              app.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {app.status === 'pending' ? '待审核' : app.status === 'approved' ? '已批准' : '已拒绝'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-400">
                            申请人：{app.user?.username} ({app.user?.email})
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(app.createdAt).toLocaleString('zh-CN')}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                        <div>
                          <span className="text-gray-500">联系人：</span>
                          <span>{app.contactName}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">联系电话：</span>
                          <span>{app.contactPhone}</span>
                        </div>
                        {app.estimatedUsage && (
                          <div>
                            <span className="text-gray-500">预估用量：</span>
                            <span>{app.estimatedUsage}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-500">账户余额：</span>
                          <span className="text-green-400">${app.user?.balance?.toFixed(2)}</span>
                        </div>
                      </div>
                      {app.useCase && (
                        <div className="text-sm mb-3">
                          <span className="text-gray-500">使用场景：</span>
                          <span className="text-gray-300">{app.useCase}</span>
                        </div>
                      )}
                      {app.status === 'rejected' && app.rejectReason && (
                        <div className="text-sm text-red-400 bg-red-500/10 rounded p-2 mb-3">
                          拒绝原因：{app.rejectReason}
                        </div>
                      )}
                      {app.status === 'pending' && (
                        <div className="flex gap-2 mt-3">
                          {rejectingApp === app.id ? (
                            <div className="flex-1 flex gap-2">
                              <input
                                type="text"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="请输入拒绝原因"
                                className="flex-1 bg-slate-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                              />
                              <button
                                onClick={() => handleEnterpriseReview(app.id, 'reject')}
                                className="px-3 py-1.5 rounded-lg text-xs bg-red-600 hover:bg-red-700"
                              >
                                确认拒绝
                              </button>
                              <button
                                onClick={() => { setRejectingApp(null); setRejectReason(''); }}
                                className="px-3 py-1.5 rounded-lg text-xs bg-slate-600 hover:bg-slate-500"
                              >
                                取消
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEnterpriseReview(app.id, 'approve')}
                                className="px-4 py-1.5 rounded-lg text-sm bg-green-600 hover:bg-green-700"
                              >
                                ✓ 批准
                              </button>
                              <button
                                onClick={() => setRejectingApp(app.id)}
                                className="px-4 py-1.5 rounded-lg text-sm bg-red-600 hover:bg-red-700"
                              >
                                ✕ 拒绝
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
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

            <div className="bg-slate-800 p-6 rounded-xl">
              <h3 className="text-lg font-bold mb-3">💸 AI 钱包充值倍率</h3>
              <p className="text-sm text-gray-400 mb-4">用户从账户余额转入 AI 钱包时，按倍率放大到账金额。例如倍率 5 时，转入 $50，AI 钱包到账 $250。为避免套利，只要倍率大于 1，AI 钱包将禁止转回账户余额。</p>
              <div className="flex flex-col md:flex-row gap-3 md:items-end">
                <div className="flex-1">
                  <label className="block text-sm text-gray-400 mb-1">到账倍率</label>
                  <input
                    type="number"
                    min="1"
                    step="0.1"
                    value={aiTransferMultiplier}
                    onChange={(e) => setAiTransferMultiplier(e.target.value)}
                    className="w-full bg-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={async () => {
                    const parsed = parseFloat(aiTransferMultiplier);
                    if (!Number.isFinite(parsed) || parsed < 1) {
                      setMessage({ type: 'error', text: '倍率必须大于等于 1' });
                      return;
                    }

                    setAiTransferMultiplierSaving(true);
                    try {
                      const res = await fetch('/api/admin/config', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${getToken()}`,
                        },
                        body: JSON.stringify({ key: 'ai_balance_recharge_multiplier', value: String(parsed) }),
                      });

                      if (res.ok) {
                        setAiTransferMultiplier(String(parsed));
                        setMessage({ type: 'success', text: 'AI 钱包倍率已保存' });
                      } else {
                        setMessage({ type: 'error', text: '保存失败' });
                      }
                    } catch {
                      setMessage({ type: 'error', text: '保存失败' });
                    } finally {
                      setAiTransferMultiplierSaving(false);
                    }
                  }}
                  disabled={aiTransferMultiplierSaving}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-2 rounded-lg text-sm"
                >
                  {aiTransferMultiplierSaving ? '保存中...' : '保存倍率'}
                </button>
              </div>
            </div>

            {/* 上游服务商管理 */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold">🔗 上游服务商</h3>
                <button
                  onClick={() => {
                    setEditingProvider(null);
                    setProviderForm({ displayName: '', type: 'proxy', baseUrl: '', masterKey: '', isActive: true });
                    setShowAddProvider(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm"
                >
                  + 添加服务商
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {aiProviders.map((p: any) => (
                  <div key={p.id} className="bg-slate-800 p-4 rounded-xl">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-medium">{p.displayName}</span>
                        <span className="text-xs text-gray-500 ml-2">({p.name})</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded ${p.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {p.isActive ? '启用' : '停用'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${p.type === 'proxy' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        代理模式
                      </span>
                      <span className="text-xs text-gray-500">{p._count?.tiers || 0} 个套餐</span>
                    </div>
                    {p.baseUrl && <p className="text-xs text-gray-500 truncate">API: {p.baseUrl}</p>}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => {
                          setEditingProvider(p);
                          setProviderForm({
                            displayName: p.displayName,
                            type: p.type,
                            baseUrl: p.baseUrl || '',
                            masterKey: p.masterKey || '',
                            isActive: p.isActive,
                          });
                          setShowAddProvider(true);
                        }}
                        className="text-blue-400 hover:text-blue-300 text-xs"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDeleteProvider(p.id)}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
                {aiProviders.length === 0 && (
                  <p className="text-gray-500 text-sm col-span-full text-center py-4">暂无服务商，请先添加上游服务商（如 PoloAPI、CloseAI）</p>
                )}
              </div>
            </div>

            {/* 套餐管理 */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold">📦 套餐管理</h3>
                <button
                  onClick={() => {
                    setEditingTier(null);
                    setTierForm({ displayName: '', description: '', pricePerMillionInput: '', pricePerMillionOutput: '', features: '', isActive: true, providerId: '', modelGroup: 'claude', channelGroup: '', maxKeys: '0', requiredRole: '', minAiBalance: '0' });
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{tier.displayName}</span>
                        <span className="text-xs text-gray-500">({tier.name})</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${tier.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {tier.isActive ? '启用' : '停用'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          tier.modelGroup === 'claude' ? 'bg-amber-500/20 text-amber-400' :
                          tier.modelGroup === 'gpt' ? 'bg-emerald-500/20 text-emerald-400' :
                          'bg-purple-500/20 text-purple-400'
                        }`}>
                          {tier.modelGroup === 'claude' ? 'Claude' : tier.modelGroup === 'gpt' ? 'GPT' : '混合'}
                        </span>
                        {tier.provider && (
                          <span className={`text-xs px-2 py-0.5 rounded ${tier.provider.type === 'proxy' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>
                            {tier.provider.displayName}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        输入 ${tier.pricePerMillionInput}/M · 输出 ${tier.pricePerMillionOutput}/M
                        {tier.channelGroup && <span className="ml-2 text-cyan-400">分组: {tier.channelGroup}</span>}
                        {tier.maxKeys > 0 && <span className="ml-2 text-purple-400">限{tier.maxKeys}个Key</span>}
                        {tier.requiredRole && <span className="ml-2 text-orange-400">需{tier.requiredRole === 'enterprise' ? '企业' : '管理员'}</span>}
                        {tier.minAiBalance > 0 && <span className="ml-2 text-yellow-400">最低AI余额${tier.minAiBalance}</span>}
                        {tier._count?.aiKeys > 0 && <span className="ml-2 text-blue-400">({tier._count.aiKeys} 个 Key)</span>}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingTier(tier);
                          setTierForm({
                            displayName: tier.displayName,
                            description: tier.description || '',
                            pricePerMillionInput: String(tier.pricePerMillionInput),
                            pricePerMillionOutput: String(tier.pricePerMillionOutput),
                            features: Array.isArray(tier.features) ? tier.features.join(', ') : (typeof tier.features === 'string' ? tier.features : ''),
                            isActive: tier.isActive,
                            providerId: tier.providerId || '',
                            modelGroup: tier.modelGroup || 'claude',
                            channelGroup: tier.channelGroup || '',
                            maxKeys: String(tier.maxKeys || 0),
                            requiredRole: tier.requiredRole || '',
                            minAiBalance: String(tier.minAiBalance || 0),
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
                  <p className="text-center text-gray-500 py-4">暂无套餐，请先添加服务商后创建套餐</p>
                )}
              </div>
            </div>

            {/* Key 管理 */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold">🔑 Key 管理</h3>
              </div>
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
                      <th className="pb-3">模型</th>
                      <th className="pb-3">模式</th>
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
                        <td className="py-2 text-center">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            key.tier?.modelGroup === 'gpt' ? 'bg-emerald-500/20 text-emerald-400' :
                            key.tier?.modelGroup === 'mixed' ? 'bg-purple-500/20 text-purple-400' :
                            'bg-amber-500/20 text-amber-400'
                          }`}>
                            {key.tier?.modelGroup === 'gpt' ? 'GPT' : key.tier?.modelGroup === 'mixed' ? '混合' : 'Claude'}
                          </span>
                        </td>
                        <td className="py-2 text-center">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                            代理
                          </span>
                        </td>
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
                          <button
                            onClick={() => handleDeleteAIKey(key.id, key.keyName)}
                            className="text-xs text-red-400 ml-2"
                          >
                            删除
                          </button>
                        </td>
                      </tr>
                    ))}
                    {aiKeys.length === 0 && (
                      <tr><td colSpan={8} className="py-4 text-center text-gray-500">暂无 Key</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Copilot 池管理 */}
        {!tabLoading && activeTab === 'copilot' && (
          <div className="space-y-6">
            <div className="bg-slate-800 p-6 rounded-xl">
              <h3 className="text-lg font-bold mb-4">🤖 Copilot 账号池管理</h3>
              <p className="text-gray-400 mb-4">
                管理 GitHub Copilot 账号池，实现智能负载均衡。支持多账号轮询，确保高可用性。
              </p>
              <div className="flex gap-4">
                <Link
                  href="/admin/copilot-accounts"
                  className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-sm font-medium transition"
                >
                  进入账号池管理 →
                </Link>
                <div className="text-sm text-gray-500">
                  <p>• 账号数量：动态</p>
                  <p>• 总额度：动态计算</p>
                  <p>• 活跃账号：动态</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 新建/编辑套餐弹窗 */}
        {showAddTier && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 p-6 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4">{editingTier ? '编辑套餐' : '新建套餐'}</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">上游服务商</label>
                  <select
                    value={tierForm.providerId}
                    onChange={(e) => setTierForm({ ...tierForm, providerId: e.target.value })}
                    className="w-full bg-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">未指定</option>
                    {aiProviders.filter((p: any) => p.isActive).map((p: any) => (
                      <option key={p.id} value={p.id}>{p.displayName}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">模型分组</label>
                    <select
                      value={tierForm.modelGroup}
                      onChange={(e) => setTierForm({ ...tierForm, modelGroup: e.target.value })}
                      className="w-full bg-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="claude">Claude</option>
                      <option value="gpt">GPT</option>
                      <option value="mixed">混合</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">上游分组名</label>
                    <input
                      type="text"
                      value={tierForm.channelGroup}
                      onChange={(e) => setTierForm({ ...tierForm, channelGroup: e.target.value })}
                      placeholder="如: code稳定, gpt-4o"
                      className="w-full bg-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">套餐名称</label>
                  <input
                    type="text"
                    value={tierForm.displayName}
                    onChange={(e) => setTierForm({ ...tierForm, displayName: e.target.value })}
                    placeholder="例如：Claude 经济版、GPT-4o 稳定版"
                    className="w-full bg-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">套餐说明（用户可见）</label>
                  <textarea
                    value={tierForm.description}
                    onChange={(e) => setTierForm({ ...tierForm, description: e.target.value })}
                    placeholder="例如：稳定高速的 Claude 官转 API 代理，支持 vscode / Cursor / Claude Code 等全系列工具"
                    rows={2}
                    className="w-full bg-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
                <div className="grid grid-cols-2 gap-3">
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
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">套餐总 Key 上限 (0=不限)</label>
                    <input
                      type="number"
                      value={tierForm.maxKeys}
                      onChange={(e) => setTierForm({ ...tierForm, maxKeys: e.target.value })}
                      placeholder="0"
                      min="0"
                      className="w-full bg-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">所需角色</label>
                    <select
                      value={tierForm.requiredRole}
                      onChange={(e) => setTierForm({ ...tierForm, requiredRole: e.target.value })}
                      className="w-full bg-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">不限</option>
                      <option value="enterprise">企业用户</option>
                      <option value="admin">管理员</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">最低 AI 余额 ($)</label>
                    <input
                      type="number"
                      value={tierForm.minAiBalance}
                      onChange={(e) => setTierForm({ ...tierForm, minAiBalance: e.target.value })}
                      placeholder="0"
                      min="0"
                      step="1"
                      className="w-full bg-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
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

        {/* 新建/编辑服务商弹窗 */}
        {showAddProvider && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 p-6 rounded-xl w-full max-w-md">
              <h3 className="text-lg font-bold mb-4">{editingProvider ? '编辑服务商' : '添加服务商'}</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">服务商名称</label>
                  <input
                    type="text"
                    value={providerForm.displayName}
                    onChange={(e) => setProviderForm({ ...providerForm, displayName: e.target.value })}
                    placeholder="例如：PoloAPI, CloseAI"
                    className="w-full bg-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">上游 API 地址（内部代理转发用，用户不可见）</label>
                  <input
                    type="text"
                    value={providerForm.baseUrl}
                    onChange={(e) => setProviderForm({ ...providerForm, baseUrl: e.target.value })}
                    placeholder="https://api.poloapi.com"
                    className="w-full bg-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">此地址仅用于后端代理转发，用户看到的是「系统设置」中配置的平台 API 域名</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Master Key（你的上游主密钥）</label>
                  <input
                    type="password"
                    value={providerForm.masterKey}
                    onChange={(e) => setProviderForm({ ...providerForm, masterKey: e.target.value })}
                    placeholder="sk-xxx..."
                    className="w-full bg-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={providerForm.isActive}
                    onChange={(e) => setProviderForm({ ...providerForm, isActive: e.target.checked })}
                    className="rounded"
                  />
                  <label className="text-sm text-gray-400">启用</label>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSaveProvider}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-medium text-sm"
                >
                  {editingProvider ? '保存修改' : '添加服务商'}
                </button>
                <button
                  onClick={() => { setShowAddProvider(false); setEditingProvider(null); }}
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => {
            setAdjustBalanceUser(null);
            setAdjustAmount('');
            setAdjustAiAmount('');
          }}>
            <div className="bg-slate-800 p-6 rounded-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">调整用户余额</h3>
                <button
                  onClick={() => {
                    setAdjustBalanceUser(null);
                    setAdjustAmount('');
                    setAdjustAiAmount('');
                  }}
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
                    <div className="text-sm text-gray-400 mt-1">
                      AI钱包: <span className="text-blue-400 font-bold">${(adjustBalanceUser.aiBalance ?? 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">账户余额调整 (USD)</label>
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

                <div>
                  <label className="block text-sm text-gray-400 mb-2">AI 钱包余额调整 (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="正数=增加 负数=扣除"
                    value={adjustAiAmount}
                    onChange={(e) => setAdjustAiAmount(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleAdjustBalance()}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {adjustAiAmount ? (
                      parseFloat(adjustAiAmount) > 0
                        ? `✓ 增加 $${Math.abs(parseFloat(adjustAiAmount)).toFixed(2)}，新AI钱包: $${((adjustBalanceUser.aiBalance ?? 0) + parseFloat(adjustAiAmount)).toFixed(2)}`
                        : `✓ 扣除 $${Math.abs(parseFloat(adjustAiAmount)).toFixed(2)}，新AI钱包: $${((adjustBalanceUser.aiBalance ?? 0) + parseFloat(adjustAiAmount)).toFixed(2)}`
                    ) : '例如: -8.5 可直接把 AI 钱包扣到接近 0 便于测试'}
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
                    onClick={() => {
                      setAdjustBalanceUser(null);
                      setAdjustAmount('');
                      setAdjustAiAmount('');
                    }}
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




