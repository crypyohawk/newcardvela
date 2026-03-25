'use client';

import { useAuth } from '../../src/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface CardType {
  id: string;
  name: string;
  cardBin: string;
  issuer: string;
  displayOpenFee: number;
  displayMonthlyFee: number | null;
  displayRechargeFee: string | null;
  displayTransactionFee: string | null;
  displayRefundFee: string | null;
  displayAuthFee: string | null;
  openFee: number;
  monthlyFee: number;
  rechargeFeePercent: number;
  rechargeFeeMin: number;
  description: string | null;  // 确保有这行
}

interface UserCard {
  id: string;
  cardNoLast4: string;
  status: string;
  balance: number;
  cardType: CardType;
  createdAt: string;
  gsalaryCardId?: string;
}

interface CardDetail {
  cardNo: string;
  cvv: string;
  expiry: string;
}

interface ReferralInfo {
  referralCode: string;
  referralLink: string;
  settings: { enabled: boolean; promptText: string; rewardAmount: number };
  referrals: any[];
}

interface WithdrawConfig {
  accountMinAmount: number;
  accountMaxAmount: number;
  accountFeePercent: number;
  accountFeeMin: number;
  cardFeePercent: number;
  cardFeeMin: number;
}

export default function DashboardPage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const [cardTypes, setCardTypes] = useState<CardType[]>([]);
  const [userCards, setUserCards] = useState<UserCard[]>([]);
  const [notices, setNotices] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'cards' | 'open' | 'recharge' | 'referral' | 'ai'>('cards');
  const [openingCard, setOpeningCard] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // 卡片详情相关
  const [selectedCard, setSelectedCard] = useState<UserCard | null>(null);
  const [cardDetail, setCardDetail] = useState<CardDetail | null>(null);
  const [showCardDetail, setShowCardDetail] = useState(false);
  const [verifyingCard, setVerifyingCard] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [needFirstRecharge, setNeedFirstRecharge] = useState(false);

  // 充值相关
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'usdt' | 'wechat' | 'alipay' | null>(null);
  const [rechargeStep, setRechargeStep] = useState<'input' | 'pay'>('input');
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [txHash, setTxHash] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [usdtNetwork, setUsdtNetwork] = useState<'trc20' | 'erc20' | 'bep20'>('trc20');

  // 卡充值相关
  const [selectedCardForRecharge, setSelectedCardForRecharge] = useState<UserCard | null>(null);
  const [cardRechargeAmount, setCardRechargeAmount] = useState('');

  // 新增：卡片提现和账户提现状态
  const [cardAction, setCardAction] = useState<'recharge' | 'withdraw'>('recharge');
  const [showAccountWithdraw, setShowAccountWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState<'usdt_trc20' | 'usdt_erc20' | 'usdt_bep20' | 'bank' | 'wechat' | 'alipay' | null>(null);
  const [withdrawAddress, setWithdrawAddress] = useState('');

  // 充值相关 - 添加状态
  const [paymentProof, setPaymentProof] = useState<string>('');
  const [isFirstRecharge, setIsFirstRecharge] = useState(true);

  // 添加推荐相关状态
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null);

  const [openCardNotices, setOpenCardNotices] = useState<string[]>([]);
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
  const [agreedToNotices, setAgreedToNotices] = useState(false);
  const [noticeExpanded, setNoticeExpanded] = useState(false);

  // AI 服务相关状态
  const [aiTiers, setAiTiers] = useState<any[]>([]);
  const [aiKeys, setAiKeys] = useState<any[]>([]);
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [aiUsage, setAiUsage] = useState<any>(null);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyTier, setNewKeyTier] = useState('');
  const [newKeyLimit, setNewKeyLimit] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [aiConfigTab, setAiConfigTab] = useState<'cline' | 'cursor' | 'claudecode' | 'openai'>('cline');
  // 企业管理
  const [enterpriseSubAccounts, setEnterpriseSubAccounts] = useState<any[]>([]);
  const [showAddSubAccount, setShowAddSubAccount] = useState(false);
  const [subAccountEmail, setSubAccountEmail] = useState('');
  const [subAccountBudget, setSubAccountBudget] = useState('');
  // 子账户编辑
  const [editingSubAccount, setEditingSubAccount] = useState<any>(null);
  const [editBudgetForm, setEditBudgetForm] = useState({ dailyBudget: '', weeklyBudget: '', monthlyBudget: '' });
  // 子账户用量详情
  const [selectedSubAccount, setSelectedSubAccount] = useState<any>(null);
  const [subAccountUsage, setSubAccountUsage] = useState<any>(null);
  const [usageRange, setUsageRange] = useState('7d');
  // 企业用量
  const [enterpriseUsage, setEnterpriseUsage] = useState<any>(null);
  // 企业申请
  const [enterpriseApps, setEnterpriseApps] = useState<any[]>([]);
  const [showEnterpriseApply, setShowEnterpriseApply] = useState(false);
  const [enterpriseForm, setEnterpriseForm] = useState({ companyName: '', contactName: '', contactPhone: '', useCase: '', estimatedUsage: '' });
  const [applyingEnterprise, setApplyingEnterprise] = useState(false);

  // 固定提现配置（不从后台读取）
    const [withdrawConfig, setWithdrawConfig] = useState<WithdrawConfig>({
      accountMinAmount: 2,
      accountMaxAmount: 500,
      accountFeePercent: 5,
      accountFeeMin: 2,
      cardFeePercent: 1,
      cardFeeMin: 1,
    });

  // 添加客服邮箱状态
  const [supportEmail, setSupportEmail] = useState('');
  const [subscriptionGuide, setSubscriptionGuide] = useState('');
  const [platformApiUrl, setPlatformApiUrl] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    fetchData();
    fetchReferralInfo();
    fetchAIData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [configRes, cardsRes] = await Promise.all([
        fetch('/api/config', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/user/cards', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      
      const configData = await configRes.json();
      const cardsData = await cardsRes.json();
      
      setCardTypes(configData.cardTypes || []);
      setNotices(configData.notices || []);
      setOpenCardNotices(configData.notices || []);
      setBillingExamples(configData.billingExamples || []);
      setUserCards(cardsData.cards || []);
      
      // 获取推荐设置
      if (configData.referral) {
        setReferralInfo(prev => prev ? { ...prev, settings: configData.referral } : null);
      }
      
      // 获取提现配置
      if (configData.withdrawConfig) {
        setWithdrawConfig(configData.withdrawConfig);
      }

      // 获取客服邮箱
      if (configData.supportEmail) {
        setSupportEmail(configData.supportEmail);
      }

      // 获取平台 API 域名
      if (configData.aiApiBaseUrl) {
        setPlatformApiUrl(configData.aiApiBaseUrl);
      }

      // 获取订阅公告
      if (configData.subscriptionGuide) {
        setSubscriptionGuide(configData.subscriptionGuide);
      }
      
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  };

  const fetchReferralInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch('/api/referral', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReferralInfo(data);
      }
    } catch (error) {
      console.error('获取推荐信息失败:', error);
    }
  };

  // AI 服务数据
  const fetchAIData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const headers = { 'Authorization': `Bearer ${token}` };

      const [tiersRes, keysRes, summaryRes, usageRes] = await Promise.all([
        fetch('/api/user/ai-service/tiers', { headers }),
        fetch('/api/user/ai-service/keys', { headers }),
        fetch('/api/user/ai-service/usage/summary', { headers }),
        fetch('/api/user/ai-service/usage?period=30d', { headers }),
      ]);

      if (tiersRes.ok) { const d = await tiersRes.json(); setAiTiers(d.tiers || []); }
      if (keysRes.ok) { const d = await keysRes.json(); setAiKeys(d.keys || []); }
      if (summaryRes.ok) { const d = await summaryRes.json(); setAiSummary(d); }
      if (usageRes.ok) { const d = await usageRes.json(); setAiUsage(d); }

      // 企业子账户
      const subRes = await fetch('/api/user/enterprise/sub-accounts', { headers });
      if (subRes.ok) { const d = await subRes.json(); setEnterpriseSubAccounts(d.subAccounts || []); }

      // 企业用量（企业/管理员才拉）
      const entUsageRes = await fetch('/api/user/enterprise/usage', { headers });
      if (entUsageRes.ok) { const d = await entUsageRes.json(); setEnterpriseUsage(d); }

      // 企业申请状态
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          keyName: newKeyName.trim(),
          tierId: newKeyTier,
          monthlyLimit: newKeyLimit ? parseFloat(newKeyLimit) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage({ type: 'success', text: 'API Key 创建成功！请妥善保管。' });
      setShowCreateKey(false);
      setNewKeyName('');
      setNewKeyTier('');
      setNewKeyLimit('');
      fetchAIData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setCreatingKey(false);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('确定要删除此 Key 吗？删除后无法恢复。')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/user/ai-service/keys/${keyId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: currentStatus === 'active' ? 'disabled' : 'active' }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      fetchAIData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleAddSubAccount = async () => {
    if (!subAccountEmail.trim()) {
      setMessage({ type: 'error', text: '请输入子账户邮箱' });
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/user/enterprise/sub-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          email: subAccountEmail.trim(),
          monthlyBudget: subAccountBudget ? parseFloat(subAccountBudget) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage({ type: 'success', text: '子账户添加成功' });
      setShowAddSubAccount(false);
      setSubAccountEmail('');
      setSubAccountBudget('');
      fetchAIData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  // 编辑子账户限额
  const handleEditSubAccount = async () => {
    if (!editingSubAccount) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/user/enterprise/sub-accounts/${editingSubAccount.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          dailyBudget: editBudgetForm.dailyBudget || null,
          weeklyBudget: editBudgetForm.weeklyBudget || null,
          monthlyBudget: editBudgetForm.monthlyBudget || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage({ type: 'success', text: '限额设置已更新' });
      setEditingSubAccount(null);
      fetchAIData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  // 切换子账户启用/停用
  const handleToggleSubAccount = async (sa: any) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/user/enterprise/sub-accounts/${sa.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ isActive: !sa.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage({ type: 'success', text: sa.isActive ? '已停用' : '已启用' });
      fetchAIData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  // 获取子账户用量详情
  const fetchSubAccountUsage = async (saId: string, range: string = '7d') => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/user/enterprise/sub-accounts/${saId}/usage?range=${range}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSubAccountUsage(data);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  // 删除子账户
  const handleRemoveSubAccount = async (saId: string) => {
    if (!confirm('确定要移除该子账户吗？')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/user/enterprise/sub-accounts/${saId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage({ type: 'success', text: '子账户已移除' });
      if (selectedSubAccount?.id === saId) {
        setSelectedSubAccount(null);
        setSubAccountUsage(null);
      }
      fetchAIData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleEnterpriseApply = async () => {
    if (!enterpriseForm.companyName.trim() || !enterpriseForm.contactName.trim() || !enterpriseForm.contactPhone.trim()) {
      setMessage({ type: 'error', text: '请填写公司名称、联系人和联系电话' });
      return;
    }
    setApplyingEnterprise(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/user/enterprise/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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

  // 开卡
  const handleOpenCard = async (cardType: CardType) => {
    if (!user) return;

    if (user.balance < cardType.openFee) {
      setMessage({ type: 'error', text: `余额不足，开卡需要 $${cardType.openFee}，请先充值` });
      return;
    }

    // 显示确认弹窗
    setSelectedCardType(cardType);
    setShowOpenCardConfirm(true);
  };

  // 确认开卡
  const confirmOpenCard = async () => {
    if (!selectedCardType || !user) return;

    setShowOpenCardConfirm(false);
    setOpeningCard(selectedCardType.id);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/user/cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          cardTypeId: selectedCardType.id,
          initialAmount: 0,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '开卡失败');
      }

      setMessage({ type: 'success', text: '开卡成功！' });
      await refreshUser();
      fetchData();
      setActiveTab('cards');

    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setOpeningCard(null);
      setSelectedCardType(null);
    }
  };

  // 发送验证码
  const handleSendVerifyCode = async () => {
    if (!selectedCard) return;
    
    setVerifyingCard(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/user/cards/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ cardId: selectedCard.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'NEED_FIRST_RECHARGE') {
          setNeedFirstRecharge(true);
          return;
        }
        throw new Error(data.error);
      }

      setCodeSent(true);
      setMessage({ type: 'success', text: '验证码已发送到您的邮箱' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setVerifyingCard(false);
    }
  };

  // 验证并获取卡片详情
  const handleVerifyAndGetDetail = async () => {
    if (!selectedCard || !verifyCode) return;

    setVerifyingCard(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/user/cards/detail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          cardId: selectedCard.id,
          verifyCode 
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCardDetail(data.detail);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setVerifyingCard(false);
    }
  };

  // 充值
  const handleRecharge = async () => {
    const amount = parseFloat(rechargeAmount);
    if (!amount || amount <= 0) {
      setMessage({ type: 'error', text: '请输入有效的充值金额' });
      return;
    }
    if (!paymentMethod) {
      setMessage({ type: 'error', text: '请选择支付方式' });
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/user/recharge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          amount, 
          paymentMethod,
          network: paymentMethod === 'usdt' ? usdtNetwork : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCurrentOrder(data.order);
      setPaymentInfo(data.paymentInfo);
      setIsFirstRecharge(data.isFirstRecharge);
      setRechargeStep('pay');
      setMessage(null);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  // 处理截图上传
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPaymentProof(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 修改 handleSubmitPayment 函数
  const handleSubmitPayment = async () => {
    if (!currentOrder) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/user/recharge/${currentOrder.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          txHash: txHash || undefined,
          paymentProof: paymentProof || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage({ type: 'success', text: '提交成功，请等待管理员审核' });
      setRechargeStep('input');
      setRechargeAmount('');
      setPaymentMethod(null);
      setCurrentOrder(null);
      setPaymentInfo(null);
      setTxHash('');
      setPaymentProof('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  // 卡充值处理
  const handleCardRecharge = async () => {
    const amount = parseFloat(cardRechargeAmount);
    if (!amount || amount <= 0) {
      setMessage({ type: 'error', text: '请输入有效的充值金额' });
      return;
    }
    if (!selectedCardForRecharge) {
      setMessage({ type: 'error', text: '请选择卡片' });
      return;
    }
    if (user && user.balance < amount) {
      setMessage({ type: 'error', text: `账户余额不足，需要 $${amount.toFixed(2)}` });
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/user/cards/${selectedCardForRecharge.id}/recharge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage({ type: 'success', text: '充值成功！' });
      setCardRechargeAmount('');
      setSelectedCardForRecharge(null);
      
      // 刷新卡片列表和用户余额
      await refreshUser();
      fetchData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  // 卡片提现处理
  const handleCardWithdraw = async () => {
    const amount = parseFloat(cardRechargeAmount);
    if (!amount || amount <= 0) {
      setMessage({ type: 'error', text: '请输入有效的提现金额' });
      return;
    }
    if (!selectedCardForRecharge) return;
    if (selectedCardForRecharge.balance < amount) {
      setMessage({ type: 'error', text: '卡片余额不足' });
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/user/cards/${selectedCardForRecharge.id}/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage({ type: 'success', text: '提现成功！' });
      setCardRechargeAmount('');
      setSelectedCardForRecharge(null);
      await refreshUser();
      fetchData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  // 账户提现处理 - 添加余额验证
  const handleAccountWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      setMessage({ type: 'error', text: '请输入有效的提现金额' });
      return;
    }
    if (!user || amount > user.balance) {
      setMessage({ type: 'error', text: '提现金额不能超过账户余额' });
      return;
    }
    if (!withdrawMethod) {
      setMessage({ type: 'error', text: '请选择提现方式' });
      return;
    }
    if (!withdrawAddress) {
      setMessage({ type: 'error', text: '请填写收款地址' });
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/user/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ amount, method: withdrawMethod, address: withdrawAddress }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage({ type: 'success', text: '提现申请已提交，请等待审核' });
      setWithdrawAmount('');
      setWithdrawMethod(null);
      setWithdrawAddress('');
      setShowAccountWithdraw(false);
      await refreshUser();
      fetchData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  // 新增：开卡确认弹窗状态
  const [showOpenCardConfirm, setShowOpenCardConfirm] = useState(false);
  const [selectedCardType, setSelectedCardType] = useState<CardType | null>(null);

  // 计算账户提现手续费（从配置读取）
  const calculateAccountWithdrawFee = (amount: number): number => {
    const feePercent = withdrawConfig.accountFeePercent / 100;  // 5% -> 0.05
    const percentFee = amount * feePercent;
    return Math.max(percentFee, withdrawConfig.accountFeeMin);
  };

  // 计算卡片提现手续费（固定手续费，从配置读取）
  const calculateCardWithdrawFee = (amount: number): number => {
    return withdrawConfig.cardFeeMin;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <p className="text-white">加载中...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* 导航栏 */}
      <nav className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-bold">CardVela卡维拉</Link>
            {supportEmail && (
              <span className="text-gray-400 text-sm">
                客服邮箱：<a href={`mailto:${supportEmail}`} className="text-blue-400 hover:text-blue-300">{supportEmail}</a>
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-300">欢迎, {user.username}</span>
            {(user.role === 'admin' || user.role === 'ADMIN') && (
              <Link href="/admin" className="text-purple-400 hover:text-purple-300 font-semibold">
                管理后台
              </Link>
            )}
            <div className="flex items-center gap-2">
              <div className="bg-green-600 px-4 py-2 rounded-l-lg">
                <span className="text-sm text-green-200">账户余额</span>
                <span className="font-bold text-lg ml-2">${user.balance.toFixed(2)}</span>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem('token');
                  router.push('/login');
                }}
                className="text-gray-400 hover:text-white"
              >
                退出
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 消息弹窗 */}
        {message && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
            <div className={`mx-4 p-6 rounded-xl shadow-2xl max-w-sm w-full ${message.type === 'success' ? 'bg-green-600' : 'bg-slate-800 border border-red-500'}`}>
              <div className="text-center">
                {/* 图标 */}
                <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${message.type === 'success' ? 'bg-green-500' : 'bg-red-500/20'}`}>
                  {message.type === 'success' ? (
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  )}
                </div>
                
                {/* 标题 */}
                <h3 className={`text-xl font-bold mb-2 ${message.type === 'success' ? 'text-white' : 'text-red-400'}`}>
                  {message.type === 'success' ? '操作成功' : '操作失败'}
                </h3>
                
                {/* 消息内容 */}
                <p className="text-gray-300 mb-6">{message.text}</p>
                
                {/* 确认按钮 */}
                <button 
                  onClick={() => setMessage(null)}
                  className={`w-full py-3 rounded-lg font-semibold transition ${
                    message.type === 'success' 
                      ? 'bg-white text-green-600 hover:bg-gray-100' 
                      : 'bg-red-500 text-white hover:bg-red-600'
                  }`}
                >
                  我知道了
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 快捷操作 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          <button
            onClick={() => setActiveTab('cards')}
            className={`p-4 rounded-xl text-left transition ${activeTab === 'cards' ? 'bg-blue-600' : 'bg-slate-800 hover:bg-slate-700'}`}
          >
            <div className="text-2xl mb-2">💳</div>
            <div className="font-semibold">我的卡片</div>
            <div className="text-sm text-gray-400">{userCards.length} 张卡片</div>
          </button>
          <button
            onClick={() => setActiveTab('open')}
            className={`p-4 rounded-xl text-left transition ${activeTab === 'open' ? 'bg-blue-600' : 'bg-slate-800 hover:bg-slate-700'}`}
          >
            <div className="text-2xl mb-2">➕</div>
            <div className="font-semibold">开通新卡</div>
            <div className="text-sm text-gray-400">申请虚拟信用卡</div>
          </button>
          <button
            onClick={() => setActiveTab('recharge')}
            className={`p-4 rounded-xl text-left transition ${activeTab === 'recharge' ? 'bg-blue-600' : 'bg-slate-800 hover:bg-slate-700'}`}
          >
            <div className="text-2xl mb-2">💰</div>
            <div className="font-semibold">充值</div>
            <div className="text-sm text-gray-400">账户余额充值</div>
          </button>
          <button
            onClick={() => setShowAccountWithdraw(true)}
            className="p-4 rounded-xl text-left transition bg-slate-800 hover:bg-slate-700"
          >
            <div className="text-2xl mb-2">💸</div>
            <div className="font-semibold">提现</div>
            <div className="text-sm text-gray-400">账户余额提现</div>
          </button>
          <button
            onClick={() => setActiveTab('referral')}
            className={`p-4 rounded-xl text-left transition ${activeTab === 'referral' ? 'bg-blue-600' : 'bg-slate-800 hover:bg-slate-700'}`}
          >
            <div className="text-2xl mb-2">🎁</div>
            <div className="font-semibold">推荐奖励</div>
            <div className="text-sm text-gray-400">邀请好友得奖励</div>
          </button>
        </div>

        {/* Claude AI 常驻横幅 */}
        <button
          onClick={() => { setActiveTab('ai'); fetchAIData(); }}
          className={`w-full mb-8 relative overflow-hidden rounded-2xl p-4 md:p-5 text-left transition-all group ${
            activeTab === 'ai'
              ? 'bg-gradient-to-r from-[#2a1a0a] via-[#3a2010] to-[#2a1a0a] border-2 border-orange-500/50 shadow-lg shadow-orange-900/20'
              : 'bg-gradient-to-r from-[#1a1207] via-[#241810] to-[#1a1207] border border-orange-900/30 hover:border-orange-700/50 hover:shadow-lg hover:shadow-orange-900/10'
          }`}
        >
          <div className="absolute top-0 right-0 w-48 h-48 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-orange-300"><path d="M12 1L13.5 9L19 4L15 10.5L23 12L15 13.5L19 20L13.5 15L12 23L10.5 15L5 20L9 13.5L1 12L9 10.5L5 4L10.5 9Z"/></svg>
          </div>
          <div className="relative flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-900/40 flex-shrink-0">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M12 1L13.5 9L19 4L15 10.5L23 12L15 13.5L19 20L13.5 15L12 23L10.5 15L5 20L9 13.5L1 12L9 10.5L5 4L10.5 9Z"/></svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-white text-lg">Claude AI 服务</h3>
                {aiKeys.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300">{aiKeys.length} 个 Key 运行中</span>
                )}
              </div>
              <p className="text-sm text-gray-400 mt-0.5">稳定高速的 Claude 官转 API 代理 · 支持 vscode / Cursor / Claude Code 等全系列工具</p>
            </div>
            <div className="flex-shrink-0 hidden md:flex items-center gap-2 text-sm">
              <span className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'ai' ? 'bg-orange-500 text-white' : 'bg-orange-500/10 text-orange-300 group-hover:bg-orange-500/20'
              }`}>
                {activeTab === 'ai' ? '当前页面' : '进入管理 →'}
              </span>
            </div>
          </div>
        </button>

        {/* 订阅公告 - 仅在卡片和开卡页面显示 */}
        {subscriptionGuide && (activeTab === 'cards' || activeTab === 'open') && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
            <h3 
              className="font-bold text-blue-400 flex items-center justify-between cursor-pointer select-none"
              onClick={() => setNoticeExpanded(!noticeExpanded)}
            >
              <span className="flex items-center gap-2">
                <span>📌</span> 订阅公告
              </span>
              <span className={`text-gray-400 text-sm transition-transform duration-200 ${noticeExpanded ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </h3>
            <div className={`relative overflow-hidden transition-all duration-300 ease-in-out ${noticeExpanded ? 'max-h-[2000px] mt-3' : 'max-h-[72px] mt-2'}`}>
              <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{subscriptionGuide}</div>
              {!noticeExpanded && (
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-slate-800 to-transparent pointer-events-none" />
              )}
            </div>
            {!noticeExpanded && (
              <button 
                onClick={() => setNoticeExpanded(true)}
                className="text-xs text-blue-400 hover:text-blue-300 mt-1 transition"
              >
                展开全部 ↓
              </button>
            )}
          </div>
        )}

        {/* 我的卡片 */}
        {activeTab === 'cards' && (
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-6">我的卡片</h2>
            
            {userCards.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-4">💳</div>
                <p>您还没有开通任何卡片</p>
                <button onClick={() => setActiveTab('open')} className="mt-4 bg-blue-600 px-6 py-2 rounded-lg hover:bg-blue-700">
                  立即开卡
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userCards.map(card => {
                  const isVisa = card.cardType?.name?.toUpperCase().includes('VISA');
                  const isMaster = card.cardType?.name?.toUpperCase().includes('MASTER');
                  
                  return (
                    <div 
                      key={card.id} 
                      className={`rounded-xl p-4 ${
                        isMaster 
                          ? 'bg-gradient-to-br from-orange-500 to-red-600' 
                          : 'bg-gradient-to-br from-blue-600 to-blue-800'
                      }`}
                    >
                      <div 
                        className="cursor-pointer hover:opacity-90 transition"
                        onClick={() => { setSelectedCard(card); setShowCardDetail(true); setCardDetail(null); setCodeSent(false); setVerifyCode(''); setNeedFirstRecharge(false); }}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <span className={`text-sm ${isMaster ? 'text-orange-200' : 'text-blue-200'}`}>{card.cardType?.issuer || '美国'}</span>
                            <h3 className="font-bold">{card.cardType?.name || 'VISA'}</h3>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* CardVela品牌 + 卡组织图标 */}
                            <span className="text-[10px] font-bold tracking-wider opacity-80">CardVela</span>
                            <div className="w-10 h-6 flex items-center justify-center">
                              {isVisa ? (
                                <svg viewBox="0 0 48 32" className="w-full h-full">
                                  <rect fill="#1A1F71" width="48" height="32" rx="4"/>
                                  <text x="24" y="20" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="bold" fontStyle="italic">VISA</text>
                                </svg>
                              ) : isMaster ? (
                                <svg viewBox="0 0 48 32" className="w-full h-full">
                                  <rect fill="#000000" width="48" height="32" rx="4"/>
                                  <circle cx="18" cy="16" r="10" fill="#EB001B"/>
                                  <circle cx="30" cy="16" r="10" fill="#F79E1B"/>
                                  <path d="M24 8.5a10 10 0 000 15" fill="#FF5F00"/>
                                </svg>
                              ) : (
                                <div className="bg-white/20 rounded px-2 py-1 text-xs font-bold">CARD</div>
                              )}
                            </div>
                            <span className={`px-2 py-1 rounded text-xs ${card.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}`}>
                              {card.status === 'active' ? '正常' : card.status}
                            </span>
                          </div>
                        </div>
                        <div className="text-lg font-mono mb-2">**** **** **** {card.cardNoLast4 || '****'}</div>
                        <div className={`text-center mt-2 text-xs ${isMaster ? 'text-orange-200' : 'text-blue-200'}`}>点击查看卡片详情</div>
                      </div>
                      
                      {/* 余额区域 */}
                      <div 
                        className={`mt-3 pt-3 border-t cursor-pointer rounded-lg p-2 -mx-2 transition ${
                          isMaster 
                            ? 'border-orange-400/30 hover:bg-orange-600/30' 
                            : 'border-blue-500/30 hover:bg-blue-700/30'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCardForRecharge(card);
                          setCardAction('recharge');
                          setCardRechargeAmount('');
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <span className={isMaster ? 'text-orange-200' : 'text-blue-200'}>余额</span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-lg">${card.balance.toFixed(2)}</span>
                            <span className={`text-xs px-2 py-1 rounded ${isMaster ? 'bg-orange-500/50' : 'bg-blue-500/50'}`}>充值/提现</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 推荐横幅 */}
            {referralInfo?.settings?.enabled && (
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-3 mt-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm">🎁</span>
                    <span className="text-sm truncate">{referralInfo.settings.promptText}</span>
                    <span className="font-mono text-xs bg-white/20 px-1.5 py-0.5 rounded shrink-0">{referralInfo.referralCode}</span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(referralInfo.referralLink);
                      setMessage({ type: 'success', text: '推荐链接已复制！' });
                    }}
                    className="bg-white/20 hover:bg-white/30 text-xs px-3 py-1.5 rounded-lg shrink-0 transition"
                  >
                    复制链接
                  </button>
                </div>
              </div>
            )}

            {/* 订阅服务时的持卡人信息填写推荐 */}
            {billingExamples.length > 0 && (
              <div className="bg-blue-900/30 border border-blue-700 rounded-xl p-5 mt-6">
                <h3 className="font-bold text-blue-300 mb-4">📋 订阅服务时的持卡人信息填写推荐：</h3>
                <div className="space-y-4">
                  {billingExamples.map((example, index) => (
                    <div key={example.id} className="bg-slate-800/50 rounded-lg p-4">
                      <div className="text-blue-400 font-semibold text-sm mb-2">示例 {index + 1}</div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-300">
                        <div><span className="text-gray-500">姓名:</span> {example.name}</div>
                        {example.address && <div><span className="text-gray-500">街道:</span> {example.address}</div>}
                        {example.city && <div><span className="text-gray-500">城市:</span> {example.city}</div>}
                        {example.state && <div><span className="text-gray-500">州:</span> {example.state}</div>}
                        {example.zip && <div><span className="text-gray-500">邮编:</span> {example.zip}</div>}
                        {example.country && <div><span className="text-gray-500">国家:</span> {example.country}</div>}
                      </div>
                      {example.billingAddress && (
                        <div className="mt-3 pt-3 border-t border-blue-700/50">
                          <span className="text-gray-500 text-sm">账单地址 (Billing Address):</span>
                          <p className="text-blue-200 font-medium mt-1">{example.billingAddress}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 卡片详情弹窗 */}
        {showCardDetail && selectedCard && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 p-6 rounded-xl w-full max-w-md">
              <h3 className="text-lg font-bold mb-4">卡片详情</h3>
              
              {!cardDetail ? (
                <>
                  {needFirstRecharge ? (
                    <>
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
                        <p className="text-yellow-400 font-medium mb-2">⚠️ 需要先为该卡充值</p>
                        <p className="text-gray-400 text-sm">为保障资金安全，首次查看卡片信息前需要先为该卡充值至少 $5。</p>
                      </div>
                      <button
                        onClick={() => {
                          setShowCardDetail(false);
                          setSelectedCardForRecharge(selectedCard);
                          setCardAction('recharge');
                          setCardRechargeAmount('5');
                        }}
                        className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-lg mb-4"
                      >
                        立即充值
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-400 mb-4">为保护您的卡片安全，查看完整卡号需要验证身份。</p>
                      
                      {!codeSent ? (
                        <button
                          onClick={handleSendVerifyCode}
                          disabled={verifyingCard}
                          className="w-full bg-blue-600 py-3 rounded-lg mb-4 disabled:opacity-50"
                        >
                          {verifyingCard ? '发送中...' : '发送验证码到邮箱'}
                        </button>
                      ) : (
                        <>
                          <input
                            type="text"
                            value={verifyCode}
                            onChange={(e) => setVerifyCode(e.target.value)}
                            placeholder="请输入验证码"
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 mb-4"
                          />
                          <button
                            onClick={handleVerifyAndGetDetail}
                            disabled={verifyingCard || !verifyCode}
                            className="w-full bg-blue-600 py-3 rounded-lg mb-4 disabled:opacity-50"
                          >
                            {verifyingCard ? '验证中...' : '验证并查看'}
                          </button>
                        </>
                      )}
                    </>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div className="bg-slate-700 p-4 rounded-lg">
                    <div className="text-gray-400 text-sm">卡号</div>
                    <div className="font-mono text-lg">{cardDetail.cardNo}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-700 p-4 rounded-lg">
                      <div className="text-gray-400 text-sm">有效期</div>
                      <div className="font-mono">{cardDetail.expiry}</div>
                    </div>
                    <div className="bg-slate-700 p-4 rounded-lg">
                      <div className="text-gray-400 text-sm">CVV</div>
                      <div className="font-mono">{cardDetail.cvv}</div>
                    </div>
                  </div>
                  <p className="text-yellow-400 text-sm">⚠️ 请妥善保管卡片信息，不要泄露给他人</p>
                </div>
              )}

              <button
                onClick={() => { setShowCardDetail(false); setSelectedCard(null); setCardDetail(null); setNeedFirstRecharge(false); }}
                className="w-full bg-slate-600 py-3 rounded-lg mt-4"
              >
                关闭
              </button>
            </div>
          </div>
        )}

        {/* 开通新卡 */}
        {activeTab === 'open' && (
          <div>
            <h2 className="text-xl font-bold mb-6">选择卡片类型</h2>
            {cardTypes.length === 0 ? (
              <div className="bg-slate-800 rounded-xl p-6 text-center text-gray-400">暂无可用卡片类型</div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cardTypes.map(card => (
                  <div key={card.id} className={`rounded-xl p-5 ${card.name.toUpperCase().includes('VISA') ? 'bg-gradient-to-br from-blue-600 to-blue-800' : 'bg-gradient-to-br from-orange-500 to-red-600'}`}>
                    {/* 卡头部 - 发行地区和卡组织图标 */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-xs opacity-70">{card.issuer}发行</span>
                        <h3 className="text-lg font-bold">{card.name}</h3>
                      </div>
                      {/* CardVela品牌 + 卡组织图标 */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold tracking-wider opacity-80">CardVela</span>
                        <div className="w-12 h-8 flex items-center justify-center">
                        {card.name.toUpperCase().includes('VISA') ? (
                          <svg viewBox="0 0 48 32" className="w-full h-full">
                            <rect fill="#1A1F71" width="48" height="32" rx="4"/>
                            <text x="24" y="20" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="bold" fontStyle="italic">VISA</text>
                          </svg>
                        ) : card.name.toUpperCase().includes('MASTER') ? (
                          <svg viewBox="0 0 48 32" className="w-full h-full">
                            <rect fill="#000000" width="48" height="32" rx="4"/>
                            <circle cx="18" cy="16" r="10" fill="#EB001B"/>
                            <circle cx="30" cy="16" r="10" fill="#F79E1B"/>
                            <path d="M24 8.5a10 10 0 000 15" fill="#FF5F00"/>
                          </svg>
                        ) : (
                          <div className="bg-white/20 rounded px-2 py-1 text-xs font-bold">CARD</div>
                        )}
                        </div>
                      </div>
                    </div>
                    
                    {/* 费用信息 - 紧凑布局 */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-3">
                      <div className="flex justify-between">
                        <span className="opacity-70">开卡费:</span>
                        <span className="font-medium">${card.displayOpenFee ?? card.openFee}</span>
                      </div>
                      {(card.displayMonthlyFee !== null && card.displayMonthlyFee !== undefined) && (
                        <div className="flex justify-between">
                          <span className="opacity-70">月费:</span>
                          <span>${card.displayMonthlyFee}</span>
                        </div>
                      )}
                      {card.displayRechargeFee && (
                        <div className="flex justify-between">
                          <span className="opacity-70">充值费:</span>
                          <span>{card.displayRechargeFee}</span>
                        </div>
                      )}
                      {card.displayTransactionFee && (
                        <div className="flex justify-between">
                          <span className="opacity-70">交易费:</span>
                          <span>{card.displayTransactionFee}</span>
                        </div>
                      )}
                      {card.displayAuthFee && (
                        <div className="flex justify-between">
                          <span className="opacity-70">授权费:</span>
                          <span>{card.displayAuthFee}</span>
                        </div>
                      )}
                      {card.displayRefundFee && (
                        <div className="flex justify-between">
                          <span className="opacity-70">退款费:</span>
                          <span>{card.displayRefundFee}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* 产品说明 */}
                    {card.description && (
                      <div className="text-xs opacity-80 mb-3 leading-relaxed border-t border-white/20 pt-2">
                        {card.description}
                      </div>
                    )}
                    
                    <button 
                      onClick={() => handleOpenCard(card)}
                      disabled={openingCard === card.id}
                      className="w-full bg-white text-slate-800 py-2.5 rounded-lg font-semibold hover:bg-gray-100 disabled:opacity-50 text-sm"
                    >
                      {openingCard === card.id ? '开卡中...' : '开通此卡'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 充值 */}
        {activeTab === 'recharge' && (
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-6">账户充值</h2>
            {rechargeStep === 'input' ? (
              <div className="max-w-md">
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">
                    充值金额 {paymentMethod === 'usdt' ? '(USD)' : paymentMethod ? '(USD，将按汇率转换为 CNY)' : '(USD)'}
                  </label>
                  <input
                    type="number"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(e.target.value)}
                    placeholder="最低充值 $10"
                    min="5"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3"
                  />
                  <p className="text-gray-500 text-xs mt-1">
                    首次充值最低 $10，后续充值最低 $5
                  </p>
                </div>
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">支付方式</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setPaymentMethod('usdt')}
                      className={`border rounded-lg p-3 text-center ${paymentMethod === 'usdt' ? 'border-blue-500 bg-blue-500/20' : 'border-slate-600'}`}
                    >
                      <div className="text-xl mb-1">💵</div>
                      <div className="text-xs">USDT</div>
                    </button>
                    <button
                      onClick={() => setPaymentMethod('wechat')}
                      className={`border rounded-lg p-3 text-center ${paymentMethod === 'wechat' ? 'border-blue-500 bg-blue-500/20' : 'border-slate-600'}`}
                    >
                      <div className="text-xl mb-1">💚</div>
                      <div className="text-xs">微信</div>
                    </button>
                    <button
                      onClick={() => setPaymentMethod('alipay')}
                      className={`border rounded-lg p-3 text-center ${paymentMethod === 'alipay' ? 'border-blue-500 bg-blue-500/20' : 'border-slate-600'}`}
                    >
                      <div className="text-xl mb-1">💙</div>
                      <div className="text-xs">支付宝</div>
                    </button>
                  </div>
                </div>

                {/* USDT 网络选择 */}
                {paymentMethod === 'usdt' && (
                  <div className="mb-6">
                    <label className="block text-sm text-gray-400 mb-2">选择网络</label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        onClick={() => setUsdtNetwork('trc20')}
                        className={`border rounded-lg p-3 text-center ${usdtNetwork === 'trc20' ? 'border-green-500 bg-green-500/20' : 'border-slate-600'}`}
                      >
                        <div className="text-sm font-bold">TRC20</div>
                        <div className="text-xs text-gray-400">波场</div>
                      </button>
                      <button
                        onClick={() => setUsdtNetwork('erc20')}
                        className={`border rounded-lg p-3 text-center ${usdtNetwork === 'erc20' ? 'border-green-500 bg-green-500/20' : 'border-slate-600'}`}
                      >
                        <div className="text-sm font-bold">ERC20</div>
                        <div className="text-xs text-gray-400">以太坊</div>
                      </button>
                      <button
                        onClick={() => setUsdtNetwork('bep20')}
                        className={`border rounded-lg p-3 text-center ${usdtNetwork === 'bep20' ? 'border-green-500 bg-green-500/20' : 'border-slate-600'}`}
                      >
                        <div className="text-sm font-bold">BEP20</div>
                        <div className="text-xs text-gray-400">币安链</div>
                      </button>
                    </div>
                  </div>
                )}

                <button onClick={handleRecharge} disabled={submitting} className="w-full bg-blue-600 py-3 rounded-lg font-semibold disabled:opacity-50">
                  {submitting ? '处理中...' : '确认充值'}
                </button>
              </div>
            ) : (
              <div className="max-w-md">
                <div className="bg-slate-700 rounded-lg p-4 mb-4">
                  <h3 className="font-bold mb-3">支付信息</h3>
                  
                  {/* USDT 支付信息 */}
                  {paymentInfo?.type === 'usdt' && (
                    <>
                      <div className="mb-2">
                        <span className="text-gray-400">网络：</span>
                        <span className="text-yellow-400 font-bold">{paymentInfo.network}</span>
                      </div>
                      <div className="mb-2"><span className="text-gray-400">收款地址：</span></div>
                      <div className="bg-slate-800 p-3 rounded break-all font-mono text-sm mb-3 cursor-pointer hover:bg-slate-600"
                        onClick={() => {
                          navigator.clipboard.writeText(paymentInfo.address);
                          setMessage({ type: 'success', text: '地址已复制' });
                        }}
                      >
                        {paymentInfo.address}
                        <span className="text-xs text-gray-400 ml-2">点击复制</span>
                      </div>
                      <div className="mb-2">
                        <span className="text-gray-400">金额：</span>
                        <span className="text-green-400 font-bold text-lg">{paymentInfo.displayAmount}</span>
                      </div>
                      <p className="text-yellow-400 text-sm mt-3">⚠️ 请务必使用 {paymentInfo.network} 网络转账！</p>
                    </>
                  )}

                  {/* 微信/支付宝支付信息 */}
                  {(paymentInfo?.type === 'wechat' || paymentInfo?.type === 'alipay') && (
                    <div className="py-2">
                      {paymentInfo.qrcode ? (
                        <div className="text-center mb-4">
                          <img src={paymentInfo.qrcode} alt="收款码" className="w-48 h-48 mx-auto rounded-lg" />
                        </div>
                      ) : (
                        <p className="text-yellow-400 text-center mb-4">请联系管理员获取收款码</p>
                      )}
                      <div className="text-center">
                        <p className="text-gray-400">订单金额</p>
                        <p className="text-green-400 font-bold text-2xl">{paymentInfo.displayAmount}</p>
                        <p className="text-gray-500 text-sm">（约 ${paymentInfo.amount} USD，汇率 {paymentInfo.exchangeRate}）</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* USDT 填写交易哈希 */}
                {paymentInfo?.type === 'usdt' && (
                  <div className="mb-4">
                    <label className="block text-sm text-gray-400 mb-2">交易哈希 (TxHash)</label>
                    <input
                      type="text"
                      value={txHash}
                      onChange={(e) => setTxHash(e.target.value)}
                      placeholder="转账成功后粘贴交易哈希"
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 font-mono text-sm"
                    />
                  </div>
                )}

                {/* 所有支付方式都必须上传截图 */}
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">
                    上传付款截图 {paymentInfo?.type === 'usdt' ? '（选填）' : <span className="text-red-400">*必填</span>}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="payment-proof"
                  />
                  <label
                    htmlFor="payment-proof"
                    className={`block bg-slate-700 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 ${
                      paymentProof ? 'border-green-500' : 'border-slate-600'
                    }`}
                  >
                    {paymentProof ? (
                      <div>
                        <img src={paymentProof} alt="支付截图" className="max-h-40 mx-auto rounded" />
                        <p className="text-green-400 text-sm mt-2">✅ 已上传，点击更换</p>
                      </div>
                    ) : (
                      <>
                        <div className="text-2xl mb-1">📷</div>
                        <div className="text-gray-400 text-sm">点击上传付款截图</div>
                        {paymentInfo?.type !== 'usdt' && (
                          <div className="text-red-400 text-xs mt-1">提交前必须上传付款截图</div>
                        )}
                      </>
                    )}
                  </label>

                  {/* 截图示例说明 */}
                  {paymentInfo?.type !== 'usdt' && (
                    <div className="mt-3 bg-slate-800/80 border border-slate-600/50 rounded-lg p-3">
                      <p className="text-amber-400 text-xs font-semibold mb-3 text-center">⚠️ 请上传完整的支付「账单详情」截图，否则无法通过审核</p>
                      <div className="grid grid-cols-2 gap-3">
                        {/* 正确示例 */}
                        <div className="relative">
                          <div className="bg-white rounded-lg p-2.5 text-[10px] text-gray-800 leading-relaxed">
                            <div className="text-center text-[11px] font-bold text-gray-600 mb-1.5">账单详情</div>
                            <div className="text-center mb-1">
                              <div className="text-gray-500 text-[9px]">{paymentInfo?.type === 'alipay' ? '支付宝商家' : '微信支付'}</div>
                              <div className="text-lg font-bold text-gray-900 leading-tight">-¥72.00</div>
                              <div className="text-green-600 text-[9px]">交易成功</div>
                            </div>
                            <div className="border-t border-gray-200 pt-1.5 space-y-0.5">
                              <div className="flex justify-between"><span className="text-gray-400">支付时间</span><span>2026-03-23 11:27</span></div>
                              <div className="flex justify-between"><span className="text-gray-400">付款方式</span><span>储蓄卡(9851)</span></div>
                              <div className="flex justify-between"><span className="text-gray-400">收款方</span><span>Outsider</span></div>
                              <div className="flex justify-between"><span className="text-gray-400">交易单号</span><span className="text-[8px]">4500...8710</span></div>
                            </div>
                          </div>
                          <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                            <span className="text-white text-xs font-bold">✓</span>
                          </div>
                          <p className="text-green-400 text-[10px] text-center mt-1.5 font-medium">✅ 正确示例</p>
                        </div>
                        {/* 错误示例 */}
                        <div className="relative">
                          <div className="bg-white rounded-lg p-2.5 text-[10px] text-gray-800 leading-relaxed">
                            <div className="text-center py-4">
                              <div className="w-8 h-8 rounded-full bg-gray-200 mx-auto mb-1.5"></div>
                              <div className="text-gray-500 text-[9px]">Outsider</div>
                              <div className="text-[9px] text-gray-400 mt-2">使用零钱支付</div>
                              <div className="text-xl font-bold text-gray-900 leading-tight">¥ 72.00</div>
                              <div className="text-blue-500 text-[9px] mt-1">账单详情 &gt;</div>
                            </div>
                          </div>
                          <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                            <span className="text-white text-xs font-bold">✕</span>
                          </div>
                          <p className="text-red-400 text-[10px] text-center mt-1.5 font-medium">❌ 缺少详情信息</p>
                        </div>
                      </div>
                      <p className="text-gray-500 text-[10px] mt-2 text-center">💡 支付完成后，点击订单进入「账单详情」页面再截图</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => { 
                      setRechargeStep('input'); 
                      setCurrentOrder(null); 
                      setPaymentInfo(null); 
                      setTxHash(''); 
                      setPaymentProof('');
                    }} 
                    className="flex-1 bg-slate-600 py-3 rounded-lg hover:bg-slate-500"
                  >
                    取消
                  </button>
                  <button 
                    onClick={handleSubmitPayment} 
                    disabled={submitting || (paymentInfo?.type !== 'usdt' && !paymentProof) || (paymentInfo?.type === 'usdt' && !txHash && !paymentProof)}
                    className="flex-1 bg-green-600 py-3 rounded-lg disabled:opacity-50 hover:bg-green-700"
                  >
                    {submitting ? '提交中...' : (paymentInfo?.type !== 'usdt' && !paymentProof) ? '请先上传截图' : '我已支付'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 推荐奖励 */}
        {activeTab === 'referral' && (
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-6">🎁 推荐奖励</h2>
            
            {referralInfo ? (
              <div className="space-y-6">
                {referralInfo.settings?.enabled && referralInfo.settings?.promptText && (
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-4">
                    <p className="font-bold text-lg">{referralInfo.settings.promptText}</p>
                    <p className="text-sm opacity-90 mt-1">
                      每成功推荐一位好友开卡，您将获得 ${referralInfo.settings.rewardAmount} 奖励
                    </p>
                  </div>
                )}

                <div className="bg-slate-700 rounded-lg p-4">
                  <h3 className="font-semibold mb-3">我的推荐码</h3>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-slate-800 px-4 py-3 rounded-lg font-mono text-xl tracking-wider">
                      {referralInfo.referralCode || '生成中...'}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(referralInfo.referralCode || '');
                        setMessage({ type: 'success', text: '推荐码已复制！' });
                      }}
                      className="bg-blue-600 px-4 py-3 rounded-lg hover:bg-blue-700"
                    >
                      复制
                    </button>
                  </div>
                </div>

                <div className="bg-slate-700 rounded-lg p-4">
                  <h3 className="font-semibold mb-3">推荐链接</h3>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-slate-800 px-4 py-3 rounded-lg text-sm break-all">
                      {referralInfo.referralLink || ''}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(referralInfo.referralLink || '');
                        setMessage({ type: 'success', text: '推荐链接已复制！' });
                      }}
                      className="bg-green-600 px-4 py-3 rounded-lg hover:bg-green-700 whitespace-nowrap"
                    >
                      复制链接
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">分享此链接给好友，好友注册时会自动填入您的推荐码</p>
                </div>

                <div className="bg-slate-700 rounded-lg p-4">
                  <h3 className="font-semibold mb-3">已推荐用户 ({referralInfo.referrals?.length || 0})</h3>
                  {referralInfo.referrals && referralInfo.referrals.length > 0 ? (
                    <div className="space-y-2">
                      {referralInfo.referrals.map((ref: any) => (
                        <div key={ref.id} className="flex items-center justify-between bg-slate-800 px-4 py-3 rounded-lg">
                          <div>
                            <span className="font-medium">{ref.username}</span>
                            <span className="text-gray-400 text-sm ml-2">
                              {new Date(ref.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <span className={`text-sm px-2 py-1 rounded ${ref.hasOpenedCard ? 'bg-green-600' : 'bg-gray-600'}`}>
                            {ref.hasOpenedCard ? '已开卡 ✓' : '未开卡'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <div className="text-4xl mb-2">👥</div>
                      <p>暂无推荐用户</p>
                      <p className="text-sm">分享您的推荐码或链接给好友吧！</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-4">🎁</div>
                <p>加载中...</p>
              </div>
            )}
          </div>
        )}

        {/* Claude AI 服务 */}
        {activeTab === 'ai' && (
          <div className="space-y-6">
            {/* 概览卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                  <span className="text-green-400">💰</span> 账户余额
                </div>
                <div className="text-2xl font-bold text-green-400">${aiSummary?.balance?.toFixed(2) || '0.00'}</div>
              </div>
              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                  <span className="text-blue-400">📊</span> 本月消费
                </div>
                <div className="text-2xl font-bold text-blue-400">${aiSummary?.monthCost?.toFixed(2) || '0.00'}</div>
              </div>
              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                  <span className="text-purple-400">⚡</span> 本月请求
                </div>
                <div className="text-2xl font-bold">{aiSummary?.monthRequests || 0}</div>
              </div>
              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                  <span className="text-amber-400">🔑</span> 活跃 Key
                </div>
                <div className="text-2xl font-bold">{aiSummary?.activeKeys || 0} / {aiSummary?.totalKeys || 0}</div>
              </div>
            </div>

            {/* 我的 Key */}
            <div className="bg-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">🔑 我的 API Key</h2>
                <button
                  onClick={() => setShowCreateKey(true)}
                  className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  + 创建新 Key
                </button>
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
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            key.tier?.modelGroup === 'gpt' ? 'bg-emerald-600/20 text-emerald-400' :
                            key.tier?.modelGroup === 'mixed' ? 'bg-purple-600/20 text-purple-400' :
                            'bg-amber-600/20 text-amber-400'
                          }`}>
                            {key.tier?.modelGroup === 'gpt' ? 'GPT' : key.tier?.modelGroup === 'mixed' ? '混合' : 'Claude'}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-blue-600/20 text-blue-400">
                            {key.tier?.displayName || key.tier?.name}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            key.status === 'active' ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                          }`}>
                            {key.status === 'active' ? '活跃' : '已禁用'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleKey(key.id, key.status)}
                            className={`text-xs px-3 py-1 rounded ${
                              key.status === 'active' ? 'bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30' : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                            }`}
                          >
                            {key.status === 'active' ? '禁用' : '启用'}
                          </button>
                          <button
                            onClick={() => handleDeleteKey(key.id)}
                            className="text-xs px-3 py-1 rounded bg-red-600/20 text-red-400 hover:bg-red-600/30"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-800 px-3 py-2 rounded-lg text-sm font-mono">
                        <span className="flex-1 truncate text-gray-300">{key.apiKey}</span>
                        <button
                          onClick={() => copyToClipboard(key.apiKey, key.id)}
                          className="text-blue-400 hover:text-blue-300 text-xs whitespace-nowrap"
                        >
                          {copiedKey === key.id ? '✓ 已复制' : '复制'}
                        </button>
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
                    <button
                      key={tab}
                      onClick={() => setAiConfigTab(tab)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        aiConfigTab === tab ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'
                      }`}
                    >
                      {tab === 'cline' ? 'Cline' : tab === 'cursor' ? 'Cursor' : tab === 'claudecode' ? 'Claude Code' : 'OpenAI 兼容'}
                    </button>
                  ))}
                </div>
                {(() => {
                  const firstKey = aiKeys[0];
                  const baseUrl = platformApiUrl || 'https://api.cardvela.com';
                  const apiKey = firstKey?.apiKey || '';
                  // 不同工具需要不同的 URL 路径层级
                  const urlForTool = (tool: string) => {
                    const clean = baseUrl.replace(/\/+$/, '');
                    switch (tool) {
                      case 'cline': return `${clean}/`;        // Cline (Anthropic 模式) 需要末尾带 /
                      case 'cursor': return `${clean}/v1`;    // Cursor 需要 /v1
                      case 'claudecode': return clean;         // Claude Code 使用根域名
                      case 'openai': return `${clean}/v1`;    // OpenAI 兼容需要 /v1
                      default: return clean;
                    }
                  };
                  return (
                    <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm text-green-400">
                      {aiConfigTab === 'cline' && (
                        <div>
                          <p className="text-gray-500 mb-1"># Cline 配置 → Settings → API Provider → Anthropic</p>
                          <p>Base URL: {urlForTool('cline')}</p>
                          <p>API Key: {apiKey}</p>
                          <p className="text-gray-500 mt-2"># 若选 OpenAI Compatible 模式:</p>
                          <p>Base URL: {urlForTool('openai')}</p>
                        </div>
                      )}
                      {aiConfigTab === 'cursor' && (
                        <div>
                          <p className="text-gray-500 mb-1"># Cursor 配置 → Settings → Models → Override OpenAI Base URL</p>
                          <p>Base URL: {urlForTool('cursor')}</p>
                          <p>API Key: {apiKey}</p>
                        </div>
                      )}
                      {aiConfigTab === 'claudecode' && (
                        <div>
                          <p className="text-gray-500 mb-1"># Claude Code 环境变量</p>
                          <p>export ANTHROPIC_BASE_URL={urlForTool('claudecode')}</p>
                          <p>export ANTHROPIC_API_KEY={apiKey}</p>
                        </div>
                      )}
                      {aiConfigTab === 'openai' && (
                        <div>
                          <p className="text-gray-500 mb-1"># OpenAI 兼容客户端（GPT 套餐 / 任何支持 OpenAI API 的工具）</p>
                          <p>Base URL: {urlForTool('openai')}</p>
                          <p>API Key: {apiKey}</p>
                          <p className="text-gray-500 mt-2"># Python 示例</p>
                          <p>from openai import OpenAI</p>
                          <p>client = OpenAI(base_url=&quot;{urlForTool('openai')}&quot;, api_key=&quot;{apiKey}&quot;)</p>
                        </div>
                      )}
                    </div>
                  );
                })()}
                <button
                  onClick={() => {
                    const firstKey = aiKeys[0];
                    const bUrl = platformApiUrl || 'https://api.cardvela.com';
                    const clean = bUrl.replace(/\/+$/, '');
                    const key = firstKey?.apiKey || '';
                    let text = '';
                    if (aiConfigTab === 'cline') text = `Base URL: ${clean}\nAPI Key: ${key}`;
                    else if (aiConfigTab === 'cursor') text = `Base URL: ${clean}/v1\nAPI Key: ${key}`;
                    else if (aiConfigTab === 'claudecode') text = `export ANTHROPIC_BASE_URL=${clean}\nexport ANTHROPIC_API_KEY=${key}`;
                    else text = `Base URL: ${clean}/v1\nAPI Key: ${key}`;
                    navigator.clipboard.writeText(text);
                    setMessage({ type: 'success', text: '配置信息已复制！' });
                  }}
                  className="mt-3 bg-slate-700 px-4 py-2 rounded-lg hover:bg-slate-600 text-sm"
                >
                  📋 一键复制配置
                </button>
              </div>
            )}

            {/* 用量图表 */}
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
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full flex items-center px-2"
                            style={{ width: `${Math.max((day.cost / maxCost) * 100, 2)}%` }}
                          >
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

            {/* 企业账户升级 - 非企业用户可见 */}
            {user?.role !== 'enterprise' && user?.role?.toUpperCase() !== 'ADMIN' && (
              <div className="bg-gradient-to-r from-slate-800 to-slate-800/80 rounded-xl p-6 border border-purple-500/20">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">🏢 企业账户</h2>
                    <p className="text-sm text-gray-400 mt-1">升级为企业账户，解锁子账户管理、用量分析等高级功能</p>
                  </div>
                  {(() => {
                    const latestApp = enterpriseApps[0];
                    if (!latestApp || latestApp.status === 'rejected') {
                      return (
                        <button
                          onClick={() => setShowEnterpriseApply(true)}
                          className="bg-purple-600 px-4 py-2 rounded-lg hover:bg-purple-700 text-sm font-medium"
                        >
                          申请企业账户
                        </button>
                      );
                    }
                    return null;
                  })()}
                </div>
                {(() => {
                  const latestApp = enterpriseApps[0];
                  if (latestApp?.status === 'pending') {
                    return (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-yellow-400 font-medium">
                          <span>⏳</span> 申请审核中
                        </div>
                        <p className="text-sm text-gray-400 mt-1">
                          您的企业账户申请（{latestApp.companyName}）正在审核中，预计 1-3 个工作日内完成
                        </p>
                        <p className="text-xs text-gray-500 mt-1">提交时间：{new Date(latestApp.createdAt).toLocaleString('zh-CN')}</p>
                      </div>
                    );
                  }
                  if (latestApp?.status === 'rejected') {
                    return (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-red-400 font-medium">
                          <span>✕</span> 申请未通过
                        </div>
                        <p className="text-sm text-gray-400 mt-1">原因：{latestApp.rejectReason}</p>
                        <p className="text-xs text-gray-500 mt-1">您可以修改资料后重新申请</p>
                      </div>
                    );
                  }
                  return (
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-slate-700/50 rounded-lg p-3">
                        <div className="text-purple-400 text-lg mb-1">👥</div>
                        <div className="text-sm font-medium">子账户管理</div>
                        <div className="text-xs text-gray-400">团队成员独立 Key</div>
                      </div>
                      <div className="bg-slate-700/50 rounded-lg p-3">
                        <div className="text-purple-400 text-lg mb-1">📊</div>
                        <div className="text-sm font-medium">用量分析</div>
                        <div className="text-xs text-gray-400">全局用量可视化</div>
                      </div>
                      <div className="bg-slate-700/50 rounded-lg p-3">
                        <div className="text-purple-400 text-lg mb-1">💰</div>
                        <div className="text-sm font-medium">预算管控</div>
                        <div className="text-xs text-gray-400">子账户月度预算</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 企业管理（企业账户和管理员均可见） */}
            {(user?.role === 'enterprise' || user?.role?.toUpperCase() === 'ADMIN') && (
              <div className="space-y-6">
                {/* 企业用量总览 */}
                {enterpriseUsage && (
                  <div className="bg-slate-800 rounded-xl p-6">
                    <h2 className="text-xl font-bold mb-4">📊 企业用量总览</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
                        <div className="text-sm text-gray-400">本月总消费</div>
                        <div className="text-2xl font-bold text-blue-400">${enterpriseUsage.month?.cost?.toFixed(2) || '0.00'}</div>
                      </div>
                      <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
                        <div className="text-sm text-gray-400">本月总请求</div>
                        <div className="text-2xl font-bold">{enterpriseUsage.month?.requests || 0}</div>
                      </div>
                      <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
                        <div className="text-sm text-gray-400">本月 Tokens</div>
                        <div className="text-2xl font-bold text-purple-400">{((enterpriseUsage.month?.tokens || 0) / 1000).toFixed(1)}K</div>
                      </div>
                      <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
                        <div className="text-sm text-gray-400">子账户数</div>
                        <div className="text-2xl font-bold text-cyan-400">{enterpriseUsage.subAccountCount || 0}</div>
                      </div>
                    </div>

                    {/* 按成员用量柱状图 */}
                    {enterpriseUsage.perUser && enterpriseUsage.perUser.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-400 mb-3">成员本月用量分布</h3>
                        <div className="space-y-2">
                          {(() => {
                            const maxCost = Math.max(...enterpriseUsage.perUser.map((u: any) => u.monthCost || 0), 0.01);
                            // 匹配子账户信息
                            const getUserName = (uid: string) => {
                              if (uid === user?.id) return `${user?.username || '我'}（主账户）`;
                              const sa = enterpriseSubAccounts.find((s: any) => s.subUserId === uid);
                              return sa?.user?.username || uid.slice(0, 8);
                            };
                            return enterpriseUsage.perUser.map((pu: any) => (
                              <div key={pu.userId} className="flex items-center gap-3 text-sm">
                                <span className="text-gray-300 w-32 truncate">{getUserName(pu.userId)}</span>
                                <div className="flex-1 bg-slate-700 rounded-full h-6 overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full flex items-center px-2"
                                    style={{ width: `${Math.max(((pu.monthCost || 0) / maxCost) * 100, 3)}%` }}
                                  >
                                    {(pu.monthCost || 0) > 0 && <span className="text-xs text-white font-medium whitespace-nowrap">${(pu.monthCost || 0).toFixed(2)}</span>}
                                  </div>
                                </div>
                                <span className="text-gray-400 w-16 text-right">{pu.requestCount || 0} 次</span>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 子账户管理 */}
                <div className="bg-slate-800 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">🏢 企业子账户管理</h2>
                    <button
                      onClick={() => setShowAddSubAccount(true)}
                      className="bg-purple-600 px-4 py-2 rounded-lg hover:bg-purple-700 text-sm font-medium"
                    >
                      + 添加子账户
                    </button>
                  </div>

                  {enterpriseSubAccounts.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <p>暂无子账户</p>
                      <p className="text-sm mt-1">添加团队成员的邮箱来创建子账户</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-gray-400 border-b border-slate-700">
                            <th className="text-left py-2 px-3">用户名</th>
                            <th className="text-left py-2 px-3">邮箱</th>
                            <th className="text-right py-2 px-3">本月消费</th>
                            <th className="text-right py-2 px-3">天限额</th>
                            <th className="text-right py-2 px-3">周限额</th>
                            <th className="text-right py-2 px-3">月限额</th>
                            <th className="text-center py-2 px-3">状态</th>
                            <th className="text-center py-2 px-3">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {enterpriseSubAccounts.map((sa: any) => {
                            const userUsage = enterpriseUsage?.perUser?.find((p: any) => p.userId === sa.subUserId);
                            const monthCost = userUsage?.monthCost || 0;
                            return (
                              <tr key={sa.id} className={`border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer transition ${selectedSubAccount?.id === sa.id ? 'bg-slate-700/50' : ''}`}
                                onClick={() => { setSelectedSubAccount(sa); setUsageRange('7d'); fetchSubAccountUsage(sa.id, '7d'); }}>
                                <td className="py-3 px-3 font-medium">{sa.user?.username}</td>
                                <td className="py-3 px-3 text-gray-400">{sa.user?.email}</td>
                                <td className="py-3 px-3 text-right font-medium">${monthCost.toFixed(2)}</td>
                                <td className="py-3 px-3 text-right text-sm">{sa.dailyBudget ? `$${sa.dailyBudget}` : <span className="text-gray-500">不限</span>}</td>
                                <td className="py-3 px-3 text-right text-sm">{sa.weeklyBudget ? `$${sa.weeklyBudget}` : <span className="text-gray-500">不限</span>}</td>
                                <td className="py-3 px-3 text-right text-sm">{sa.monthlyBudget ? `$${sa.monthlyBudget}` : <span className="text-gray-500">不限</span>}</td>
                                <td className="py-3 px-3 text-center">
                                  <span className={`text-xs px-2 py-0.5 rounded ${sa.isActive ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}>
                                    {sa.isActive ? '正常' : '已停用'}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center" onClick={e => e.stopPropagation()}>
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => {
                                      setEditingSubAccount(sa);
                                      setEditBudgetForm({
                                        dailyBudget: sa.dailyBudget?.toString() || '',
                                        weeklyBudget: sa.weeklyBudget?.toString() || '',
                                        monthlyBudget: sa.monthlyBudget?.toString() || '',
                                      });
                                    }} className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 text-xs font-medium transition">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                      限额
                                    </button>
                                    <button onClick={() => handleToggleSubAccount(sa)}
                                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition ${sa.isActive ? 'bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/40' : 'bg-green-600/20 text-green-400 hover:bg-green-600/40'}`}>
                                      {sa.isActive ? (
                                        <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>停用</>
                                      ) : (
                                        <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>启用</>
                                      )}
                                    </button>
                                    <button onClick={() => handleRemoveSubAccount(sa.id)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-600/20 text-red-400 hover:bg-red-600/40 text-xs font-medium transition">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                      移除
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* 子账户用量详情面板 */}
                  {selectedSubAccount && subAccountUsage && (
                    <div className="mt-6 border-t border-slate-700 pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold">
                          📊 {selectedSubAccount.user?.username} 的用量详情
                        </h3>
                        <div className="flex items-center gap-2">
                          {['7d', '30d', '90d'].map(r => (
                            <button key={r} onClick={() => { setUsageRange(r); fetchSubAccountUsage(selectedSubAccount.id, r); }}
                              className={`px-3 py-1 rounded text-xs font-medium transition ${usageRange === r ? 'bg-blue-600 text-white' : 'bg-slate-700 text-gray-400 hover:text-white'}`}>
                              {r === '7d' ? '近7天' : r === '30d' ? '近30天' : '近90天'}
                            </button>
                          ))}
                          <button onClick={() => { setSelectedSubAccount(null); setSubAccountUsage(null); }}
                            className="text-gray-400 hover:text-white ml-2">✕</button>
                        </div>
                      </div>

                      {/* 用量概览卡片 */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                        <div className="bg-slate-700/50 rounded-lg p-3">
                          <div className="text-xs text-gray-400">今日消费</div>
                          <div className="text-lg font-bold text-orange-400">${subAccountUsage.today?.cost?.toFixed(4)}</div>
                          <div className="text-xs text-gray-500">{subAccountUsage.today?.requests} 次请求</div>
                          {selectedSubAccount.dailyBudget && (
                            <div className="mt-1">
                              <div className="flex justify-between text-xs"><span className="text-gray-500">限额</span><span>${selectedSubAccount.dailyBudget}</span></div>
                              <div className="bg-slate-600 rounded-full h-1.5 mt-1 overflow-hidden">
                                <div className={`h-full rounded-full ${(subAccountUsage.today?.cost / selectedSubAccount.dailyBudget) > 0.8 ? 'bg-red-500' : 'bg-green-500'}`}
                                  style={{ width: `${Math.min((subAccountUsage.today?.cost / selectedSubAccount.dailyBudget) * 100, 100)}%` }}/>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="bg-slate-700/50 rounded-lg p-3">
                          <div className="text-xs text-gray-400">本周消费</div>
                          <div className="text-lg font-bold text-blue-400">${subAccountUsage.week?.cost?.toFixed(4)}</div>
                          <div className="text-xs text-gray-500">{subAccountUsage.week?.requests} 次请求</div>
                          {selectedSubAccount.weeklyBudget && (
                            <div className="mt-1">
                              <div className="flex justify-between text-xs"><span className="text-gray-500">限额</span><span>${selectedSubAccount.weeklyBudget}</span></div>
                              <div className="bg-slate-600 rounded-full h-1.5 mt-1 overflow-hidden">
                                <div className={`h-full rounded-full ${(subAccountUsage.week?.cost / selectedSubAccount.weeklyBudget) > 0.8 ? 'bg-red-500' : 'bg-blue-500'}`}
                                  style={{ width: `${Math.min((subAccountUsage.week?.cost / selectedSubAccount.weeklyBudget) * 100, 100)}%` }}/>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="bg-slate-700/50 rounded-lg p-3">
                          <div className="text-xs text-gray-400">本月消费</div>
                          <div className="text-lg font-bold text-green-400">${subAccountUsage.month?.cost?.toFixed(4)}</div>
                          <div className="text-xs text-gray-500">{subAccountUsage.month?.requests} 次请求</div>
                          {selectedSubAccount.monthlyBudget && (
                            <div className="mt-1">
                              <div className="flex justify-between text-xs"><span className="text-gray-500">限额</span><span>${selectedSubAccount.monthlyBudget}</span></div>
                              <div className="bg-slate-600 rounded-full h-1.5 mt-1 overflow-hidden">
                                <div className={`h-full rounded-full ${(subAccountUsage.month?.cost / selectedSubAccount.monthlyBudget) > 0.8 ? 'bg-red-500' : 'bg-purple-500'}`}
                                  style={{ width: `${Math.min((subAccountUsage.month?.cost / selectedSubAccount.monthlyBudget) * 100, 100)}%` }}/>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="bg-slate-700/50 rounded-lg p-3">
                          <div className="text-xs text-gray-400">本月 Tokens</div>
                          <div className="text-lg font-bold text-purple-400">{subAccountUsage.month?.tokens >= 1000000 ? `${(subAccountUsage.month.tokens / 1000000).toFixed(1)}M` : subAccountUsage.month?.tokens >= 1000 ? `${(subAccountUsage.month.tokens / 1000).toFixed(1)}K` : subAccountUsage.month?.tokens || 0}</div>
                          <div className="text-xs text-gray-500">累计 ${subAccountUsage.total?.cost?.toFixed(2)}</div>
                        </div>
                      </div>

                      {/* 模型消耗分布 */}
                      {subAccountUsage.modelBreakdown?.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-sm font-semibold text-gray-300 mb-3">🔬 模型消耗分布</h4>
                          <div className="space-y-2">
                            {(() => {
                              const totalCost = subAccountUsage.modelBreakdown.reduce((s: number, m: any) => s + m.cost, 0);
                              const colors = ['bg-pink-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-cyan-500', 'bg-orange-500'];
                              return subAccountUsage.modelBreakdown.map((m: any, i: number) => {
                                const pct = totalCost > 0 ? (m.cost / totalCost) * 100 : 0;
                                return (
                                  <div key={m.model} className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-sm ${colors[i % colors.length]}`}/>
                                    <span className="text-sm w-48 truncate" title={m.model}>{m.model}</span>
                                    <div className="flex-1 bg-slate-700 rounded-full h-4 overflow-hidden relative">
                                      <div className={`h-full ${colors[i % colors.length]} rounded-full transition-all`} style={{ width: `${pct}%` }}/>
                                      {pct > 15 && <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium">${m.cost.toFixed(4)}</span>}
                                    </div>
                                    <span className="text-xs text-gray-400 w-12 text-right">{pct.toFixed(1)}%</span>
                                    <span className="text-xs text-gray-500 w-16 text-right">{m.requests} 次</span>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                          {/* 模型详细表 */}
                          <div className="mt-3 bg-slate-700/30 rounded-lg overflow-hidden">
                            <table className="w-full text-xs">
                              <thead><tr className="text-gray-500 border-b border-slate-600">
                                <th className="text-left py-2 px-3">模型</th>
                                <th className="text-right py-2 px-3">费用</th>
                                <th className="text-right py-2 px-3">请求数</th>
                                <th className="text-right py-2 px-3">Input Tokens</th>
                                <th className="text-right py-2 px-3">Output Tokens</th>
                              </tr></thead>
                              <tbody>
                                {subAccountUsage.modelBreakdown.map((m: any) => (
                                  <tr key={m.model} className="border-b border-slate-700/30">
                                    <td className="py-2 px-3 font-medium">{m.model}</td>
                                    <td className="py-2 px-3 text-right text-orange-400">${m.cost.toFixed(4)}</td>
                                    <td className="py-2 px-3 text-right">{m.requests}</td>
                                    <td className="py-2 px-3 text-right text-gray-400">{m.inputTokens.toLocaleString()}</td>
                                    <td className="py-2 px-3 text-right text-gray-400">{m.outputTokens.toLocaleString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* 消费趋势图 */}
                      {subAccountUsage.trend?.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-300 mb-3">📈 消费趋势</h4>
                          <div className="bg-slate-700/30 rounded-lg p-4">
                            {(() => {
                              const trend = subAccountUsage.trend;
                              const maxCost = Math.max(...trend.map((t: any) => t.cost), 0.01);
                              const chartHeight = 160;
                              // 收集所有模型
                              const allModels = new Set<string>();
                              trend.forEach((t: any) => Object.keys(t.models || {}).forEach(m => allModels.add(m)));
                              const modelList = Array.from(allModels);
                              const barColors = ['#ec4899', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#06b6d4', '#f97316'];
                              return (
                                <div>
                                  <div className="flex items-end gap-1" style={{ height: chartHeight }}>
                                    {trend.map((t: any, i: number) => {
                                      const barHeight = Math.max((t.cost / maxCost) * chartHeight, 2);
                                      // 按模型分段
                                      const segments = modelList.map((model, mi) => ({
                                        model,
                                        cost: t.models?.[model] || 0,
                                        color: barColors[mi % barColors.length],
                                      })).filter(s => s.cost > 0);
                                      const segTotal = segments.reduce((s, seg) => s + seg.cost, 0);
                                      return (
                                        <div key={i} className="flex-1 flex flex-col items-center justify-end group relative">
                                          <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs whitespace-nowrap z-10">
                                            <div className="font-medium mb-1">{t.date}</div>
                                            {segments.map(s => (
                                              <div key={s.model} className="flex items-center gap-1">
                                                <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: s.color }}/>
                                                <span>{s.model}: ${s.cost.toFixed(4)}</span>
                                              </div>
                                            ))}
                                            <div className="border-t border-slate-600 mt-1 pt-1">总计: ${t.cost.toFixed(4)} | {t.requests} 次</div>
                                          </div>
                                          <div className="w-full rounded-t overflow-hidden flex flex-col justify-end" style={{ height: barHeight }}>
                                            {segments.map((s, si) => (
                                              <div key={si} style={{ height: `${segTotal > 0 ? (s.cost / segTotal) * 100 : 0}%`, backgroundColor: s.color, minHeight: '1px' }}/>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  {/* X轴日期 */}
                                  <div className="flex gap-1 mt-1">
                                    {trend.map((t: any, i: number) => (
                                      <div key={i} className="flex-1 text-center text-[10px] text-gray-500 truncate">
                                        {trend.length <= 14 ? t.date.slice(5) : (i % Math.ceil(trend.length / 10) === 0 ? t.date.slice(5) : '')}
                                      </div>
                                    ))}
                                  </div>
                                  {/* 图例 */}
                                  <div className="flex flex-wrap gap-3 mt-3">
                                    {modelList.map((model, mi) => (
                                      <div key={model} className="flex items-center gap-1 text-xs text-gray-400">
                                        <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: barColors[mi % barColors.length] }}/>
                                        {model}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      )}

                      {/* 无数据提示 */}
                      {(!subAccountUsage.modelBreakdown || subAccountUsage.modelBreakdown.length === 0) && (
                        <div className="text-center py-8 text-gray-500">
                          <p>📭 该时间范围内暂无使用数据</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 套餐说明 */}
            {aiTiers.length > 0 && (
              <div className="bg-slate-800 rounded-xl p-6">
                <h2 className="text-xl font-bold mb-4">📋 套餐说明</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {aiTiers.map((tier: any) => (
                    <div key={tier.id} className={`rounded-xl p-5 border transition-all hover:scale-[1.02] ${
                      tier.modelGroup === 'gpt' ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-emerald-900/10' :
                      tier.modelGroup === 'mixed' ? 'border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-purple-900/10' :
                      'border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-amber-900/10'
                    }`}>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {tier.modelGroup === 'gpt' ? <span className="text-lg">🤖</span> : tier.modelGroup === 'mixed' ? <span className="text-lg">🔀</span> : <span><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-[#D4A27C] inline"><path d="M12 1L13.5 9L19 4L15 10.5L23 12L15 13.5L19 20L13.5 15L12 23L10.5 15L5 20L9 13.5L1 12L9 10.5L5 4L10.5 9Z"/></svg></span>}
                        <span className="font-bold text-lg">{tier.displayName}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          tier.modelGroup === 'gpt' ? 'bg-emerald-500/20 text-emerald-400' :
                          tier.modelGroup === 'mixed' ? 'bg-purple-500/20 text-purple-400' :
                          'bg-amber-500/20 text-amber-400'
                        }`}>
                          {tier.modelGroup === 'gpt' ? 'GPT' : tier.modelGroup === 'mixed' ? '混合' : 'Claude'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mb-3">{tier.description}</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Input 价格</span>
                          <span>${tier.pricePerMillionInput}/百万 tokens</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Output 价格</span>
                          <span>${tier.pricePerMillionOutput}/百万 tokens</span>
                        </div>
                      </div>
                      {tier.features && tier.features.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-700">
                          {tier.features.map((f: string, i: number) => (
                            <div key={i} className="text-sm text-gray-300 flex items-center gap-1.5">
                              <span className="text-green-400">✓</span> {f}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 创建 AI Key 弹窗 */}
      {showCreateKey && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">🔑 创建 API Key</h3>
            {(user?.balance ?? 0) <= 0 && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4">
                <p className="text-red-400 text-sm font-medium">⚠️ 账户余额不足，无法创建 Key</p>
                <p className="text-red-400/70 text-xs mt-1">请先充值后再创建 API Key。创建 Key 需要账户余额大于 $0。</p>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Key 名称 *</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="例如：生产环境、测试用"
                  className="w-full bg-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">选择套餐 *</label>
                {aiTiers.length === 0 && (
                  <p className="text-yellow-400 text-sm bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">暂无可用套餐，请联系管理员添加</p>
                )}
                <div className="grid gap-3">
                  {aiTiers.map((tier: any) => (
                    <div
                      key={tier.id}
                      onClick={() => setNewKeyTier(tier.id)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        newKeyTier === tier.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-slate-600 bg-slate-700 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{tier.displayName}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            tier.modelGroup === 'gpt' ? 'bg-emerald-500/20 text-emerald-400' :
                            tier.modelGroup === 'mixed' ? 'bg-purple-500/20 text-purple-400' :
                            'bg-amber-500/20 text-amber-400'
                          }`}>
                            {tier.modelGroup === 'gpt' ? 'GPT' : tier.modelGroup === 'mixed' ? '混合' : 'Claude'}
                          </span>
                        </div>
                        <span className="text-sm text-green-400">
                          输入 ${tier.pricePerMillionInput}/M · 输出 ${tier.pricePerMillionOutput}/M
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {tier.features?.map((f: string, i: number) => (
                          <span key={i} className="text-xs bg-slate-600 px-2 py-0.5 rounded">{f}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">月度限额 (USD，留空不限)</label>
                <input
                  type="number"
                  value={newKeyLimit}
                  onChange={(e) => setNewKeyLimit(e.target.value)}
                  placeholder="例如：100"
                  min="0"
                  step="1"
                  className="w-full bg-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreateKey}
                disabled={creatingKey || !newKeyName.trim() || !newKeyTier || (user?.balance ?? 0) <= 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-2 rounded-lg font-medium transition"
              >
                {creatingKey ? '创建中...' : (user?.balance ?? 0) <= 0 ? '余额不足，请先充值' : '创建 Key'}
              </button>
              <button
                onClick={() => {
                  setShowCreateKey(false);
                  setNewKeyName('');
                  setNewKeyTier('');
                  setNewKeyLimit('');
                }}
                className="flex-1 bg-slate-600 hover:bg-slate-500 py-2 rounded-lg font-medium transition"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 添加子账户弹窗 */}
      {showAddSubAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-xl w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">👥 添加子账户</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">子账户邮箱 *</label>
                <input
                  type="email"
                  value={subAccountEmail}
                  onChange={(e) => setSubAccountEmail(e.target.value)}
                  placeholder="请输入已注册用户的邮箱"
                  className="w-full bg-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">子账户必须是已注册的 CardVela 用户</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddSubAccount}
                disabled={!subAccountEmail.trim()}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-2 rounded-lg font-medium transition"
              >
                添加子账户
              </button>
              <button
                onClick={() => {
                  setShowAddSubAccount(false);
                  setSubAccountEmail('');
                  setSubAccountBudget('');
                }}
                className="flex-1 bg-slate-600 hover:bg-slate-500 py-2 rounded-lg font-medium transition"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑子账户限额弹窗 */}
      {editingSubAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-xl w-full max-w-md">
            <h3 className="text-lg font-bold mb-1">⚙️ 设置限额</h3>
            <p className="text-sm text-gray-400 mb-4">{editingSubAccount.user?.username} ({editingSubAccount.user?.email})</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">日限额 (USD)</label>
                <input
                  type="number"
                  value={editBudgetForm.dailyBudget}
                  onChange={(e) => setEditBudgetForm(f => ({ ...f, dailyBudget: e.target.value }))}
                  placeholder="留空不限"
                  min="0"
                  step="0.01"
                  className="w-full bg-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">周限额 (USD)</label>
                <input
                  type="number"
                  value={editBudgetForm.weeklyBudget}
                  onChange={(e) => setEditBudgetForm(f => ({ ...f, weeklyBudget: e.target.value }))}
                  placeholder="留空不限"
                  min="0"
                  step="0.01"
                  className="w-full bg-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">月限额 (USD)</label>
                <input
                  type="number"
                  value={editBudgetForm.monthlyBudget}
                  onChange={(e) => setEditBudgetForm(f => ({ ...f, monthlyBudget: e.target.value }))}
                  placeholder="留空不限"
                  min="0"
                  step="0.01"
                  className="w-full bg-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleEditSubAccount}
                className="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-medium transition"
              >
                保存设置
              </button>
              <button
                onClick={() => setEditingSubAccount(null)}
                className="flex-1 bg-slate-600 hover:bg-slate-500 py-2 rounded-lg font-medium transition"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 企业账户申请弹窗 */}
      {showEnterpriseApply && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">🏢 申请企业账户</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">公司名称 *</label>
                <input
                  type="text"
                  value={enterpriseForm.companyName}
                  onChange={(e) => setEnterpriseForm({ ...enterpriseForm, companyName: e.target.value })}
                  placeholder="请输入公司全称"
                  className="w-full bg-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">联系人 *</label>
                  <input
                    type="text"
                    value={enterpriseForm.contactName}
                    onChange={(e) => setEnterpriseForm({ ...enterpriseForm, contactName: e.target.value })}
                    placeholder="您的姓名"
                    className="w-full bg-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">联系电话 *</label>
                  <input
                    type="text"
                    value={enterpriseForm.contactPhone}
                    onChange={(e) => setEnterpriseForm({ ...enterpriseForm, contactPhone: e.target.value })}
                    placeholder="手机号或微信号"
                    className="w-full bg-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">使用场景</label>
                <textarea
                  value={enterpriseForm.useCase}
                  onChange={(e) => setEnterpriseForm({ ...enterpriseForm, useCase: e.target.value })}
                  placeholder="简述您的使用场景，如：代码开发辅助、内容生成等"
                  rows={3}
                  className="w-full bg-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">预估月用量</label>
                <input
                  type="text"
                  value={enterpriseForm.estimatedUsage}
                  onChange={(e) => setEnterpriseForm({ ...enterpriseForm, estimatedUsage: e.target.value })}
                  placeholder="例如：$500/月、100万tokens/月"
                  className="w-full bg-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3 text-sm text-gray-400">
                <p className="font-medium text-gray-300 mb-1">📋 审核说明</p>
                <p>· 提交申请后，我们将在 1-3 个工作日内审核</p>
                <p>· 审核通过后，您将自动升级为企业账户</p>
                <p>· 企业账户可管理子账户、分配预算、查看全局用量</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleEnterpriseApply}
                disabled={applyingEnterprise || !enterpriseForm.companyName.trim() || !enterpriseForm.contactName.trim() || !enterpriseForm.contactPhone.trim()}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-2 rounded-lg font-medium transition"
              >
                {applyingEnterprise ? '提交中...' : '提交申请'}
              </button>
              <button
                onClick={() => setShowEnterpriseApply(false)}
                className="flex-1 bg-slate-600 hover:bg-slate-500 py-2 rounded-lg font-medium transition"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 卡充值/提现弹窗 */}
      {selectedCardForRecharge && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-xl w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">卡片余额管理</h3>
            
            {/* 切换充值/提现 */}
            <div className="flex mb-4 bg-slate-700 rounded-lg p-1">
              <button
                onClick={() => setCardAction('recharge')}
                className={`flex-1 py-2 rounded-lg transition ${cardAction === 'recharge' ? 'bg-blue-600' : ''}`}
              >
                充值
              </button>
              <button
                onClick={() => setCardAction('withdraw')}
                className={`flex-1 py-2 rounded-lg transition ${cardAction === 'withdraw' ? 'bg-blue-600' : ''}`}
              >
                提现
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">卡余额</label>
                  <div className="bg-slate-700 px-3 py-2 rounded-lg">
                    ${selectedCardForRecharge.balance.toFixed(2)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">账户余额</label>
                  <div className="bg-slate-700 px-3 py-2 rounded-lg">
                    ${user?.balance.toFixed(2)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  {cardAction === 'recharge' ? '充值金额' : '提现金额'} (USD)
                </label>
                <input
                  type="number"
                  value={cardRechargeAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    const amount = parseFloat(val);
                    
                    if (cardAction === 'recharge') {
                      // 充值：不能超过账户余额
                      if (user && amount > user.balance) {
                        setCardRechargeAmount(user.balance.toString());
                      } else {
                        setCardRechargeAmount(val);
                      }
                    } else {
                      // 提现：不能超过卡余额
                      if (selectedCardForRecharge && amount > selectedCardForRecharge.balance) {
                        setCardRechargeAmount(selectedCardForRecharge.balance.toString());
                      } else {
                        setCardRechargeAmount(val);
                      }
                    }
                  }}
                  placeholder="请输入金额"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3"
                />
                {/* 提示信息 */}
                {cardAction === 'recharge' && user && parseFloat(cardRechargeAmount) > user.balance && (
                  <p className="text-red-400 text-sm mt-1">充值金额不能超过账户余额</p>
                )}
                {cardAction === 'withdraw' && selectedCardForRecharge && parseFloat(cardRechargeAmount) > selectedCardForRecharge.balance && (
                  <p className="text-red-400 text-sm mt-1">提现金额不能超过卡余额</p>
                )}
                {cardAction === 'withdraw' && selectedCardForRecharge && selectedCardForRecharge.balance <= 0 && (
                  <p className="text-yellow-400 text-sm mt-1">卡片余额为0，无法提现</p>
                )}
              </div>

              {cardRechargeAmount && parseFloat(cardRechargeAmount) > 0 && (
                <div className="bg-blue-900/30 border border-blue-700 p-4 rounded-lg space-y-2">
                  {cardAction === 'recharge' ? (
                    (() => {
                      const amount = parseFloat(cardRechargeAmount);
                      const feePercent = selectedCardForRecharge?.cardType?.rechargeFeePercent || 2;
                      const feeMin = selectedCardForRecharge?.cardType?.rechargeFeeMin || 0.5;
                      const percentFee = amount * feePercent / 100;
                      const fee = Math.max(percentFee, feeMin);
                      const cardReceive = Math.max(amount - fee, 0);
                      return (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">充值金额：</span>
                            <span>${amount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">手续费（{feePercent}%，最低${feeMin}）：</span>
                            <span className="text-red-400">-${fee.toFixed(2)}</span>
                          </div>
                          <div className="border-t border-blue-700 pt-2 flex justify-between font-bold">
                            <span>账户扣除：</span>
                            <span className="text-orange-400">${amount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span>卡实际到账：</span>
                            <span className="text-green-400">${cardReceive.toFixed(2)}</span>
                          </div>
                        </>
                      );
                    })()
                  ) : (
                    (() => {
                      const amount = parseFloat(cardRechargeAmount);
                      const fee = calculateCardWithdrawFee(amount);
                      const accountReceive = Math.max(amount - fee, 0);
                      return (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">提现金额：</span>
                            <span>${amount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">手续费：</span>
                            <span className="text-red-400">-${fee.toFixed(2)}</span>
                          </div>
                          <div className="border-t border-blue-700 pt-2 flex justify-between font-bold">
                            <span>账户实际到账：</span>
                            <span className="text-green-400">${accountReceive.toFixed(2)}</span>
                          </div>
                        </>
                      );
                    })()
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setSelectedCardForRecharge(null);
                  setCardRechargeAmount('');
                  setCardAction('recharge');
                }}
                className="flex-1 bg-slate-600 py-3 rounded-lg hover:bg-slate-500"
              >
                取消
              </button>
              <button
                onClick={cardAction === 'recharge' ? handleCardRecharge : handleCardWithdraw}
                disabled={
                  submitting || 
                  !cardRechargeAmount || 
                  parseFloat(cardRechargeAmount) <= 0 ||
                  (cardAction === 'withdraw' && selectedCardForRecharge && selectedCardForRecharge.balance <= 0)
                }
                className="flex-1 bg-blue-600 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? '处理中...' : cardAction === 'recharge' ? '确认充值' : '确认提现'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 账户提现弹窗 - 添加余额验证提示 */}
      {showAccountWithdraw && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">💸 账户提现</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">当前余额</label>
                <div className="bg-slate-700 px-4 py-3 rounded-lg text-green-400 font-bold text-xl">
                  ${user?.balance.toFixed(2)}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">提现金额 (USD)</label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    const amount = parseFloat(val) || 0;
                    if (amount > withdrawConfig.accountMaxAmount) {
                      setWithdrawAmount(withdrawConfig.accountMaxAmount.toString());
                    } else if (user && amount > user.balance) {
                      setWithdrawAmount(user.balance.toString());
                    } else {
                      setWithdrawAmount(val);
                    }
                  }}
                  placeholder={`最低 $${withdrawConfig.accountMinAmount}，最高 $${withdrawConfig.accountMaxAmount}`}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3"
                />
                <p className="text-gray-500 text-xs mt-1">
                  最低提现 ${withdrawConfig.accountMinAmount}，单次最高 ${withdrawConfig.accountMaxAmount}
                </p>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">提现方式</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setWithdrawMethod('usdt_trc20')}
                    className={`border rounded-lg p-2 text-center ${withdrawMethod === 'usdt_trc20' ? 'border-blue-500 bg-blue-500/20' : 'border-slate-600'}`}
                  >
                    <div className="text-lg mb-1">💵</div>
                    <div className="text-xs">TRC20</div>
                  </button>
                  <button
                    onClick={() => setWithdrawMethod('usdt_erc20')}
                    className={`border rounded-lg p-2 text-center ${withdrawMethod === 'usdt_erc20' ? 'border-blue-500 bg-blue-500/20' : 'border-slate-600'}`}
                  >
                    <div className="text-lg mb-1">💵</div>
                    <div className="text-xs">ERC20</div>
                  </button>
                  <button
                    onClick={() => setWithdrawMethod('usdt_bep20')}
                    className={`border rounded-lg p-2 text-center ${withdrawMethod === 'usdt_bep20' ? 'border-blue-500 bg-blue-500/20' : 'border-slate-600'}`}
                  >
                    <div className="text-lg mb-1">💵</div>
                    <div className="text-xs">BEP20</div>
                  </button>
                  <button
                    onClick={() => setWithdrawMethod('bank')}
                    className={`border rounded-lg p-2 text-center ${withdrawMethod === 'bank' ? 'border-blue-500 bg-blue-500/20' : 'border-slate-600'}`}
                  >
                    <div className="text-lg mb-1">🏦</div>
                    <div className="text-xs">银行卡</div>
                  </button>
                  <button
                    onClick={() => setWithdrawMethod('wechat')}
                    className={`border rounded-lg p-2 text-center ${withdrawMethod === 'wechat' ? 'border-blue-500 bg-blue-500/20' : 'border-slate-600'}`}
                  >
                    <div className="text-lg mb-1">💚</div>
                    <div className="text-xs">微信</div>
                  </button>
                  <button
                    onClick={() => setWithdrawMethod('alipay')}
                    className={`border rounded-lg p-2 text-center ${withdrawMethod === 'alipay' ? 'border-blue-500 bg-blue-500/20' : 'border-slate-600'}`}
                  >
                    <div className="text-lg mb-1">💙</div>
                    <div className="text-xs">支付宝</div>
                  </button>
                </div>
              </div>

              {/* 收款信息输入 */}
              {withdrawMethod && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    {withdrawMethod === 'usdt_trc20' ? 'TRC20 收款地址' :
                     withdrawMethod === 'usdt_erc20' ? 'ERC20 收款地址' :
                     withdrawMethod === 'usdt_bep20' ? 'BEP20 收款地址' :
                     withdrawMethod === 'bank' ? '银行卡号' :
                     withdrawMethod === 'wechat' ? '微信收款码' :
                     '支付宝收款码'}
                  </label>
                  
                  {(withdrawMethod === 'wechat' || withdrawMethod === 'alipay') ? (
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => setWithdrawAddress(reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                        id="withdraw-qrcode"
                      />
                      <label
                        htmlFor="withdraw-qrcode"
                        className="block bg-slate-700 border-2 border-dashed border-slate-600 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500"
                      >
                        {withdrawAddress && withdrawAddress.startsWith('data:image') ? (
                          <img src={withdrawAddress} alt="收款码" className="max-h-32 mx-auto rounded" />
                        ) : (
                          <>
                            <div className="text-2xl mb-1">📷</div>
                            <div className="text-gray-400 text-sm">点击上传收款码</div>
                          </>
                        )}
                      </label>
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={withdrawAddress}
                      onChange={(e) => setWithdrawAddress(e.target.value)}
                      placeholder={
                        withdrawMethod === 'usdt_trc20' ? '请输入 TRC20 地址 (T...)' :
                        withdrawMethod === 'usdt_erc20' ? '请输入 ERC20 地址 (0x...)' :
                        withdrawMethod === 'usdt_bep20' ? '请输入 BEP20 地址 (0x...)' :
                        '请输入银行卡号'
                      }
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3"
                    />
                  )}
                </div>
              )}

              {/* 费用计算 - 修改最低金额判断为 2 */}
              {withdrawAmount && parseFloat(withdrawAmount) >= withdrawConfig.accountMinAmount && (
                <div className="bg-green-900/30 border border-green-700 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">扣除手续费到账金额：</span>
                    <span className="text-green-400 font-bold text-xl">
                      ${(parseFloat(withdrawAmount) - calculateAccountWithdrawFee(parseFloat(withdrawAmount))).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {withdrawAmount && parseFloat(withdrawAmount) > 0 && parseFloat(withdrawAmount) < withdrawConfig.accountMinAmount && (
                <div className="bg-red-900/30 border border-red-700 p-3 rounded-lg text-red-400 text-sm">
                  ⚠️ 最低提现金额为 ${withdrawConfig.accountMinAmount}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAccountWithdraw(false);
                  setWithdrawAmount('');
                  setWithdrawMethod(null);
                  setWithdrawAddress('');
                }}
                className="flex-1 bg-slate-600 py-3 rounded-lg hover:bg-slate-500"
              >
                取消
              </button>
              <button
                onClick={handleAccountWithdraw}
                disabled={submitting || !withdrawAmount || parseFloat(withdrawAmount) < withdrawConfig.accountMinAmount || !withdrawMethod || !withdrawAddress}
                className="flex-1 bg-blue-600 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? '处理中...' : '提交申请'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 开卡确认弹窗 */}
      {showOpenCardConfirm && selectedCardType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">确认开卡</h3>
            
            {/* 开卡须知 - 必须阅读才能同意 */}
            {notices.length > 0 && (
              <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-yellow-300 mb-3">⚠️ 开卡须知（请仔细阅读）</h4>
                <div className="text-sm text-gray-300 space-y-2 max-h-48 overflow-y-auto pr-2 mb-4">
                  {notices.map((notice, index) => (
                    <p key={index} className="flex items-start gap-2">
                      <span className="text-yellow-400 font-mono">{index + 1}.</span>
                      <span>{notice}</span>
                    </p>
                  ))}
                </div>
                <label className="flex items-center gap-2 cursor-pointer border-t border-yellow-700/50 pt-3">
                  <input
                    type="checkbox"
                    checked={agreedToNotices}
                    onChange={(e) => setAgreedToNotices(e.target.checked)}
                    className="w-4 h-4 rounded border-yellow-600 text-yellow-600 focus:ring-yellow-500"
                  />
                  <span className="text-sm text-yellow-200">我已阅读并同意以上开卡须知</span>
                </label>
              </div>
            )}
      
            <p className="text-gray-300 mb-4">
              确认开通 <span className="text-blue-400 font-semibold">{selectedCardType.name}</span> ？
            </p>
            
            <div className="bg-slate-700 rounded-lg p-4 mb-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">开卡费</span>
                <span className="font-bold">${selectedCardType.openFee}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">当前余额</span>
                <span className="text-green-400">${user?.balance.toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-600 pt-2 flex justify-between">
                <span className="text-gray-400">开卡后余额</span>
                <span className="text-yellow-400">${(user!.balance - selectedCardType.openFee).toFixed(2)}</span>
              </div>
            </div>
      
            <div className="flex gap-3">
              <button
                onClick={() => { 
                  setShowOpenCardConfirm(false); 
                  setSelectedCardType(null); 
                  setAgreedToNotices(false);
                }}
                className="flex-1 bg-slate-600 py-3 rounded-lg hover:bg-slate-500"
              >
                取消
              </button>
              <button
                onClick={confirmOpenCard}
                disabled={notices.length > 0 && !agreedToNotices}
                className={`flex-1 py-3 rounded-lg font-semibold transition ${
                  notices.length > 0 && !agreedToNotices 
                    ? 'bg-gray-600 cursor-not-allowed opacity-50' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {notices.length > 0 && !agreedToNotices ? '请先同意须知' : '确认开卡'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

