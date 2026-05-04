'use client';

import { useAuth } from '../../src/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getMinimumInitialAmountForCardBin, getOpenCardPricing } from '../../src/lib/cardOpening';
import { CreditCard, CirclePlus, WalletMinimal, ArrowUpFromLine, Gift, Globe, BookOpen } from 'lucide-react';

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
  cardSegment: string | null;  // 卡段显示
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

function getCardPricing(cardType: CardType) {
  return getOpenCardPricing({
    cardBin: cardType.cardBin,
    openFee: cardType.openFee,
    requestedInitialAmount: 0,
    rechargeFeePercent: cardType.rechargeFeePercent,
  });
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
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [aiConfigTab, setAiConfigTab] = useState<'cline' | 'cursor' | 'claudecode' | 'openai'>('cline');

  // AI 钱包转账
  const [showAiTransfer, setShowAiTransfer] = useState(false);
  const [aiTransferAmount, setAiTransferAmount] = useState('');
  const [aiTransferDirection, setAiTransferDirection] = useState<'main_to_ai' | 'ai_to_main'>('main_to_ai');
  const [aiTransfering, setAiTransfering] = useState(false);
  const [aiTransferMultiplier, setAiTransferMultiplier] = useState(1);

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
  const [welfareGuide, setWelfareGuide] = useState('');
  const [welfareQrcode, setWelfareQrcode] = useState('');
  const [welfareExpanded, setWelfareExpanded] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [platformApiUrl, setPlatformApiUrl] = useState('');

  // 平台公告弹窗
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementData, setAnnouncementData] = useState<{ content: string; version: number } | null>(null);
  const [announcementScrolled, setAnnouncementScrolled] = useState(false);

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

      setAiTransferMultiplier(Number(configData.aiTransferMultiplier) > 0 ? Number(configData.aiTransferMultiplier) : 1);

      // 获取订阅公告
      if (configData.subscriptionGuide) {
        setSubscriptionGuide(configData.subscriptionGuide);
      }

      // 获取福利指南
      if (configData.welfareGuide) {
        setWelfareGuide(configData.welfareGuide);
      }
      if (configData.welfareQrcode) {
        setWelfareQrcode(configData.welfareQrcode);
      }

      // 检查平台公告
      if (configData.platformAnnouncement) {
        const ann = configData.platformAnnouncement;
        const readKey = `announcement_read_v${ann.version}`;
        if (!localStorage.getItem(readKey)) {
          setAnnouncementData(ann);
          setAnnouncementScrolled(false);
          setShowAnnouncementModal(true);
        }
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
          label: newKeyLabel.trim() || null,
        }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text();
        console.error('[createKey] non-JSON response:', res.status, text.slice(0, 200));
        throw new Error(`服务器返回异常 (${res.status}): ${text.slice(0, 80)}`);
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details || '创建失败');
      setMessage({ type: 'success', text: 'API Key 创建成功！请妥善保管。' });
      setShowCreateKey(false);
      setNewKeyName('');
      setNewKeyTier('');
      setNewKeyLimit('');
      setNewKeyLabel('');
      fetchAIData();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setCreatingKey(false);
    }
  };

  const handleAiTransfer = async () => {
    const amount = parseFloat(aiTransferAmount);
    if (!amount || amount <= 0) {
      setMessage({ type: 'error', text: '请输入有效金额' });
      return;
    }
    setAiTransfering(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/user/ai-service/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ amount, direction: aiTransferDirection }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (aiTransferDirection === 'main_to_ai') {
        setMessage({ type: 'success', text: `转账成功，扣除账户余额 $${amount.toFixed(2)}，AI 钱包到账 $${Number(data.creditedAmount || 0).toFixed(2)}` });
      } else {
        setMessage({ type: 'success', text: `转账成功，账户余额已增加 $${amount.toFixed(2)}` });
      }
      setShowAiTransfer(false);
      setAiTransferAmount('');
      setAiTransferDirection('main_to_ai');
      refreshUser();
      fetchAIData();
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

    const pricing = getCardPricing(cardType);

    if (user.balance < pricing.totalCost) {
      setMessage({ type: 'error', text: `余额不足，开卡需要 $${pricing.totalCost.toFixed(2)}，请先充值` });
      return;
    }

    // 显示确认弹窗
    setSelectedCardType(cardType);
    setShowOpenCardConfirm(true);
  };

  // 确认开卡
  const confirmOpenCard = async () => {
    if (!selectedCardType || !user) return;

    const pricing = getCardPricing(selectedCardType);
    if (user.balance < pricing.totalCost) {
      setMessage({ type: 'error', text: `余额不足，开卡需要 $${pricing.totalCost.toFixed(2)}，请先充值` });
      setShowOpenCardConfirm(false);
      return;
    }

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
          initialAmount: pricing.initialAmount,
        }),
      });

      const raw = await res.text();
      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error('开卡服务暂时不可用，请稍后重试');
      }

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
        <div className="max-w-7xl mx-auto px-4 py-2 flex flex-col gap-2 sm:flex-row sm:h-16 sm:items-center sm:justify-between sm:py-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <Link href="/" className="flex items-center gap-2">
                <img src="/brand/cardvela-wordmark.svg" alt="CardVela" className="h-8 w-auto" />
                <span className="text-sm text-gray-400 hidden sm:inline">卡维拉</span>
              </Link>
              {(user.role === 'admin' || user.role === 'ADMIN') && (
                <Link href="/admin" className="text-purple-400 hover:text-purple-300 font-semibold text-sm">
                  管理后台
                </Link>
              )}
            </div>
            {supportEmail && (
              <span className="text-gray-400 text-xs sm:text-sm hidden sm:inline">
                客服邮箱：<a href={`mailto:${supportEmail}`} className="text-blue-400 hover:text-blue-300">{supportEmail}</a>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-gray-300 text-sm">欢迎, {user.username}</span>
            <div className="flex items-center gap-2">
              <div className="bg-green-600 px-3 py-1.5 rounded-lg">
                <span className="text-xs text-green-200">账户</span>
                <span className="font-bold text-sm ml-1">${user.balance.toFixed(2)}</span>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem('token');
                  router.push('/login');
                }}
                className="text-gray-400 hover:text-white text-sm"
              >
                退出
              </button>
            </div>
          </div>
        </div>
        {supportEmail && (
          <div className="sm:hidden max-w-7xl mx-auto px-4 pb-2">
            <span className="text-gray-400 text-xs">
              客服邮箱：<a href={`mailto:${supportEmail}`} className="text-blue-400 hover:text-blue-300">{supportEmail}</a>
            </span>
          </div>
        )}
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
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
          {/* 我的卡片 */}
          <button
            onClick={() => setActiveTab('cards')}
            className={`relative overflow-hidden p-4 rounded-2xl text-left transition-all group border ${
              activeTab === 'cards'
                ? 'bg-blue-600/90 border-blue-500/60 shadow-lg shadow-blue-900/40'
                : 'bg-slate-800/60 border-slate-700/50 hover:border-blue-500/40 hover:bg-slate-800'
            }`}
          >
            {activeTab !== 'cards' && <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-105 ${
              activeTab === 'cards' ? 'bg-white/20' : 'bg-gradient-to-br from-blue-400 to-blue-700 shadow-lg shadow-blue-900/50'
            }`}>
              <CreditCard className="w-5 h-5 text-white" strokeWidth={1.5} />
            </div>
            <div className="font-semibold text-sm">我的卡片</div>
            <div className="text-xs text-slate-400 mt-0.5">{userCards.length} 张卡片</div>
          </button>
          {/* 开通新卡 */}
          <button
            onClick={() => setActiveTab('open')}
            className={`relative overflow-hidden p-4 rounded-2xl text-left transition-all group border ${
              activeTab === 'open'
                ? 'bg-violet-600/90 border-violet-500/60 shadow-lg shadow-violet-900/40'
                : 'bg-slate-800/60 border-slate-700/50 hover:border-violet-500/40 hover:bg-slate-800'
            }`}
          >
            {activeTab !== 'open' && <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-400/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-105 ${
              activeTab === 'open' ? 'bg-white/20' : 'bg-gradient-to-br from-violet-400 to-purple-700 shadow-lg shadow-violet-900/50'
            }`}>
              <CirclePlus className="w-5 h-5 text-white" strokeWidth={1.5} />
            </div>
            <div className="font-semibold text-sm">开通新卡</div>
            <div className="text-xs text-slate-400 mt-0.5">申请虚拟信用卡</div>
          </button>
          {/* 充值 */}
          <button
            onClick={() => setActiveTab('recharge')}
            className={`relative overflow-hidden p-4 rounded-2xl text-left transition-all group border ${
              activeTab === 'recharge'
                ? 'bg-emerald-600/90 border-emerald-500/60 shadow-lg shadow-emerald-900/40'
                : 'bg-slate-800/60 border-slate-700/50 hover:border-emerald-500/40 hover:bg-slate-800'
            }`}
          >
            {activeTab !== 'recharge' && <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-105 ${
              activeTab === 'recharge' ? 'bg-white/20' : 'bg-gradient-to-br from-emerald-400 to-teal-700 shadow-lg shadow-emerald-900/50'
            }`}>
              <WalletMinimal className="w-5 h-5 text-white" strokeWidth={1.5} />
            </div>
            <div className="font-semibold text-sm">充值</div>
            <div className="text-xs text-slate-400 mt-0.5">账户余额充值</div>
          </button>
          {/* 提现 */}
          <button
            onClick={() => setShowAccountWithdraw(true)}
            className="relative overflow-hidden p-4 rounded-2xl text-left transition-all group border bg-slate-800/60 border-slate-700/50 hover:border-cyan-500/40 hover:bg-slate-800"
          >
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-sky-700 shadow-lg shadow-cyan-900/50 flex items-center justify-center mb-3 transition-transform group-hover:scale-105">
              <ArrowUpFromLine className="w-5 h-5 text-white" strokeWidth={1.5} />
            </div>
            <div className="font-semibold text-sm">提现</div>
            <div className="text-xs text-slate-400 mt-0.5">账户余额提现</div>
          </button>
          {/* 推荐奖励 */}
          <button
            onClick={() => setActiveTab('referral')}
            className={`relative overflow-hidden p-4 rounded-2xl text-left transition-all group border ${
              activeTab === 'referral'
                ? 'bg-rose-600/90 border-rose-500/60 shadow-lg shadow-rose-900/40'
                : 'bg-slate-800/60 border-slate-700/50 hover:border-rose-500/40 hover:bg-slate-800'
            }`}
          >
            {activeTab !== 'referral' && <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-rose-400/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-105 ${
              activeTab === 'referral' ? 'bg-white/20' : 'bg-gradient-to-br from-rose-400 to-pink-700 shadow-lg shadow-rose-900/50'
            }`}>
              <Gift className="w-5 h-5 text-white" strokeWidth={1.5} />
            </div>
            <div className="font-semibold text-sm">推荐奖励</div>
            <div className="text-xs text-slate-400 mt-0.5">邀请好友得奖励</div>
          </button>
          {/* 临时 VPN */}
          <Link
            href="/vpn"
            className="relative overflow-hidden p-4 rounded-2xl text-left transition-all group border bg-slate-800/60 border-slate-700/50 hover:border-slate-500/60 hover:bg-slate-800"
          >
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-400/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-400 to-slate-700 shadow-lg shadow-slate-900/50 flex items-center justify-center mb-3 transition-transform group-hover:scale-105">
              <Globe className="w-5 h-5 text-white" strokeWidth={1.5} />
            </div>
            <div className="font-semibold text-sm">临时 VPN</div>
            <div className="text-xs text-slate-400 mt-0.5">暂未上线</div>
          </Link>
          {/* 订阅教程 */}
          <Link
            href="/guide"
            className="relative overflow-hidden p-4 rounded-2xl text-left transition-all group border bg-slate-800/60 border-slate-700/50 hover:border-amber-500/40 hover:bg-slate-800"
          >
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 shadow-lg shadow-amber-900/50 flex items-center justify-center mb-3 transition-transform group-hover:scale-105">
              <BookOpen className="w-5 h-5 text-white" strokeWidth={1.5} />
            </div>
            <div className="font-semibold text-sm">订阅教程</div>
            <div className="text-xs text-slate-400 mt-0.5">出海 AI 指南</div>
          </Link>
        </div>

        {/* AI 服务入口卡片组 */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">AI 服务</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Claude AI */}
            <Link href="/dashboard/ai/claude" className="relative overflow-hidden rounded-2xl p-4 text-left transition-all group border bg-gradient-to-br from-[#1a1207] to-[#241810] border-orange-900/30 hover:border-orange-500/60 hover:shadow-lg hover:shadow-orange-900/20 block">
              <div className="absolute top-0 right-0 w-16 h-16 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-orange-300"><path d="M12 1L13.5 9L19 4L15 10.5L23 12L15 13.5L19 20L13.5 15L12 23L10.5 15L5 20L9 13.5L1 12L9 10.5L5 4L10.5 9Z"/></svg>
              </div>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-900/40 mb-3 transition-transform group-hover:scale-105">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 1L13.5 9L19 4L15 10.5L23 12L15 13.5L19 20L13.5 15L12 23L10.5 15L5 20L9 13.5L1 12L9 10.5L5 4L10.5 9Z"/></svg>
              </div>
              <div className="font-semibold text-sm text-white">Claude AI</div>
              <div className="text-xs text-orange-400/80 mt-0.5">官转代理</div>
              {aiKeys.filter((k: any) => k.tier?.modelGroup !== 'gemini').length > 0 && (
                <div className="mt-2 text-xs text-orange-300/70">{aiKeys.filter((k: any) => k.tier?.modelGroup !== 'gemini').length} 个 Key</div>
              )}
              <div className="absolute bottom-3 right-3 text-orange-500/40 group-hover:text-orange-400/60 text-sm transition-colors">→</div>
            </Link>

            {/* Gemini AI */}
            <Link href="/dashboard/ai/gemini" className="relative overflow-hidden rounded-2xl p-4 text-left transition-all group border bg-gradient-to-br from-[#071a14] to-[#0a2018] border-teal-900/30 hover:border-teal-500/60 hover:shadow-lg hover:shadow-teal-900/20 block">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center shadow-lg shadow-teal-900/40 mb-3 transition-transform group-hover:scale-105 text-white font-bold text-base">G</div>
              <div className="font-semibold text-sm text-white">Gemini AI</div>
              <div className="text-xs text-teal-400/80 mt-0.5">免费使用</div>
              {aiKeys.filter((k: any) => k.tier?.modelGroup === 'gemini').length > 0 ? (
                <div className="mt-2 text-xs text-teal-300/70">{aiKeys.filter((k: any) => k.tier?.modelGroup === 'gemini').length} 个 Key</div>
              ) : (
                <div className="mt-2 text-xs text-green-400/70">🆓 无需认证</div>
              )}
              <div className="absolute bottom-3 right-3 text-teal-500/40 group-hover:text-teal-400/60 text-sm transition-colors">→</div>
            </Link>

            {/* GPT 专线（预留） */}
            <div className="relative overflow-hidden rounded-2xl p-4 text-left border bg-slate-800/30 border-slate-700/30 opacity-50 cursor-not-allowed">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center shadow-lg mb-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white" strokeWidth="0"><circle cx="12" cy="12" r="10" fill="none" stroke="white" strokeWidth="1.5"/><path d="M8 12h8M12 8v8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </div>
              <div className="font-semibold text-sm text-gray-400">GPT 专线</div>
              <div className="text-xs text-gray-600 mt-0.5">即将上线</div>
              <div className="mt-2 text-xs text-gray-600">敬请期待</div>
            </div>

            {/* Grok 专线（预留） */}
            <div className="relative overflow-hidden rounded-2xl p-4 text-left border bg-slate-800/30 border-slate-700/30 opacity-50 cursor-not-allowed">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-violet-800 flex items-center justify-center shadow-lg mb-3 text-white font-bold text-sm">X</div>
              <div className="font-semibold text-sm text-gray-400">Grok 专线</div>
              <div className="text-xs text-gray-600 mt-0.5">即将上线</div>
              <div className="mt-2 text-xs text-gray-600">敬请期待</div>
            </div>
          </div>
        </div>

        {/* 订阅公告 & 福利指南 - 仅在卡片和开卡页面显示 */}
        {(subscriptionGuide || welfareGuide) && (activeTab === 'cards' || activeTab === 'open') && (
          <div className={`grid gap-4 mb-6 ${subscriptionGuide && welfareGuide ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
            {/* 订阅公告 */}
            {subscriptionGuide && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
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
            {/* 福利指南 */}
            {welfareGuide && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <h3 
                  className="font-bold text-green-400 flex items-center justify-between cursor-pointer select-none"
                  onClick={() => setWelfareExpanded(!welfareExpanded)}
                >
                  <span className="flex items-center gap-2">
                    <span>🎁</span> 福利指南
                  </span>
                  <span className={`text-gray-400 text-sm transition-transform duration-200 ${welfareExpanded ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </h3>
                <div className={`relative overflow-hidden transition-all duration-300 ease-in-out ${welfareExpanded ? 'max-h-[2000px] mt-3' : 'max-h-[72px] mt-2'}`}>
                  <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{welfareGuide}</div>
                  {welfareExpanded && welfareQrcode && (
                    <div className="mt-3 flex items-center gap-3 pt-3 border-t border-slate-700">
                      <img 
                        src={welfareQrcode} 
                        alt="扫码进群" 
                        className="w-24 h-24 rounded-lg bg-white p-1.5 cursor-pointer hover:opacity-80 transition" 
                        onClick={() => setShowQrModal(true)}
                      />
                      <div className="text-xs text-gray-400">
                        <p className="text-green-400 font-semibold mb-1">📱 扫码进群</p>
                        <p>扫描二维码加入咨询群</p>
                        <p className="text-gray-500 mt-1">点击图片放大查看</p>
                      </div>
                    </div>
                  )}
                  {!welfareExpanded && (
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-slate-800 to-transparent pointer-events-none" />
                  )}
                </div>
                {!welfareExpanded && (
                  <button 
                    onClick={() => setWelfareExpanded(true)}
                    className="text-xs text-green-400 hover:text-green-300 mt-1 transition"
                  >
                    展开全部 ↓
                  </button>
                )}
              </div>
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

        {/* 二维码放大弹窗 */}
        {showQrModal && welfareQrcode && (
          <div 
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 cursor-pointer"
            onClick={() => setShowQrModal(false)}
          >
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <img 
                src={welfareQrcode} 
                alt="扫码进群" 
                className="w-56 h-56 sm:w-72 sm:h-72 md:w-80 md:h-80 rounded-2xl bg-white p-3 shadow-2xl" 
              />
              <button 
                onClick={() => setShowQrModal(false)}
                className="absolute -top-3 -right-3 w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center text-gray-300 text-lg transition"
              >
                ✕
              </button>
              <p className="text-center text-gray-300 text-sm mt-3">长按或扫描二维码加入咨询群</p>
            </div>
          </div>
        )}

        {/* 卡片详情弹窗 */}
        {showCardDetail && selectedCard && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
            <div className="bg-slate-800 p-4 sm:p-6 rounded-xl w-full max-w-md">
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
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {cardTypes.map(card => {
                  const isVisa = card.name.toUpperCase().includes('VISA');
                  const isMaster = card.name.toUpperCase().includes('MASTER');
                  const pricing = getCardPricing(card);
                  const mcId = `mc-clip-${card.id}`;
                  return (
                    <div key={card.id} className="group rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-800/40 hover:border-slate-600/80 transition-all duration-200 shadow-lg hover:shadow-2xl hover:shadow-slate-900/60 hover:-translate-y-0.5">
                      {/* 卡面区域 */}
                      <div className={`relative p-5 h-44 flex flex-col justify-between overflow-hidden ${
                        isVisa
                          ? 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-800'
                          : isMaster
                            ? 'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900'
                            : 'bg-gradient-to-br from-slate-600 to-slate-800'
                      }`}>
                        {/* 装饰圆 */}
                        <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-white/[0.06] pointer-events-none" />
                        <div className="absolute right-6 top-14 w-28 h-28 rounded-full bg-white/[0.04] pointer-events-none" />
                        {/* 顶部：发行地区 + 品牌 */}
                        <div className="relative flex justify-between items-start">
                          <div>
                            <div className="text-white/50 text-xs font-medium tracking-wide uppercase">{card.issuer}</div>
                            <div className="text-white font-bold text-xl leading-tight mt-0.5">{card.name}</div>
                          </div>
                          <span className="text-white/30 text-xs font-bold tracking-widest mt-0.5">CardVela</span>
                        </div>
                        {/* 中部：虚拟卡段 */}
                        <div className="relative font-mono text-white/50 text-sm tracking-[0.25em]">
                          {card.cardSegment
                            ? `${card.cardSegment.slice(0, 6)} •••• •••• ••••`
                            : '•••• •••• •••• ••••'}
                        </div>
                        {/* 底部：卡编号 + 网络 logo */}
                        <div className="relative flex justify-between items-end">
                          <div className="text-white/35 text-xs font-mono">#{card.cardBin}</div>
                          {isVisa && (
                            <svg viewBox="0 0 60 20" className="h-5 w-auto" aria-label="Visa">
                              <text x="2" y="17" fontFamily="Arial,Helvetica,sans-serif" fontSize="19" fontStyle="italic" fontWeight="800" fill="white" letterSpacing="-1">VISA</text>
                            </svg>
                          )}
                          {isMaster && (
                            <svg viewBox="0 0 46 30" className="h-7 w-auto" aria-label="Mastercard">
                              <defs>
                                <clipPath id={mcId}><circle cx="30" cy="15" r="13"/></clipPath>
                              </defs>
                              <circle cx="30" cy="15" r="13" fill="#F79E1B"/>
                              <circle cx="16" cy="15" r="13" fill="#EB001B"/>
                              <circle cx="16" cy="15" r="13" fill="#FF5F00" clipPath={`url(#${mcId})`}/>
                            </svg>
                          )}
                          {!isVisa && !isMaster && (
                            <span className="text-white/40 text-xs font-bold tracking-widest">CARD</span>
                          )}
                        </div>
                      </div>

                      {/* 费用信息区域 */}
                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                          <div className="flex justify-between items-baseline">
                            <span className="text-xs text-slate-500">开卡费</span>
                            <span className="text-sm font-bold text-white">${card.displayOpenFee ?? card.openFee}</span>
                          </div>
                          {card.displayMonthlyFee !== null && card.displayMonthlyFee !== undefined && (
                            <div className="flex justify-between items-baseline">
                              <span className="text-xs text-slate-500">月费</span>
                              <span className="text-sm font-bold text-white">${card.displayMonthlyFee}</span>
                            </div>
                          )}
                          {card.displayRechargeFee && (
                            <div className="flex justify-between items-baseline">
                              <span className="text-xs text-slate-500">充值费</span>
                              <span className="text-sm font-semibold text-slate-200">{card.displayRechargeFee}</span>
                            </div>
                          )}
                          {card.displayTransactionFee && (
                            <div className="flex justify-between items-baseline">
                              <span className="text-xs text-slate-500">交易费</span>
                              <span className="text-sm font-semibold text-slate-200">{card.displayTransactionFee}</span>
                            </div>
                          )}
                          {card.displayAuthFee && (
                            <div className="flex justify-between items-baseline">
                              <span className="text-xs text-slate-500">授权费</span>
                              <span className="text-sm font-semibold text-slate-200">{card.displayAuthFee}</span>
                            </div>
                          )}
                          {card.displayRefundFee && (
                            <div className="flex justify-between items-baseline">
                              <span className="text-xs text-slate-500">退款费</span>
                              <span className="text-sm font-semibold text-slate-200">{card.displayRefundFee}</span>
                            </div>
                          )}
                        </div>

                        {getMinimumInitialAmountForCardBin(card.cardBin) > 0 && (
                          <div className="flex justify-between items-center pt-2.5 border-t border-slate-700/60">
                            <span className="text-xs text-slate-400">开卡合计（含预充值）</span>
                            <span className="text-base font-bold text-white">${pricing.totalCost.toFixed(2)}</span>
                          </div>
                        )}

                        {card.description && (
                          <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-700/40 pt-2.5">
                            {card.description}
                          </p>
                        )}

                        <button
                          onClick={() => handleOpenCard(card)}
                          disabled={openingCard === card.id}
                          className="w-full mt-1 py-2.5 rounded-xl font-semibold text-sm transition-all bg-white text-slate-900 hover:bg-slate-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {openingCard === card.id ? (
                            <span className="flex items-center justify-center gap-2">
                              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                              </svg>
                              开卡中...
                            </span>
                          ) : '开通此卡'}
                        </button>
                      </div>
                    </div>
                  );
                })}
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
                    <div className="flex-1 bg-slate-800 px-4 py-3 rounded-lg font-mono text-sm sm:text-xl tracking-wider break-all">
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
                      className="bg-green-600 px-3 sm:px-4 py-3 rounded-lg hover:bg-green-700 whitespace-nowrap text-sm"
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
              <div className="bg-slate-800 rounded-xl p-4 border border-blue-500/30">
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                  <span className="text-blue-400">🤖</span> AI 钱包余额
                </div>
                <div className="text-2xl font-bold text-blue-400">${aiSummary?.aiBalance?.toFixed(2) || (user?.aiBalance ?? 0).toFixed(2)}</div>
                <button
                  onClick={() => setShowAiTransfer(true)}
                  className="text-xs text-blue-400 hover:text-blue-300 mt-1 underline"
                >
                  转入/转出
                </button>
              </div>
              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                  <span className="text-red-400">📊</span> 本月消费
                </div>
                <div className="text-2xl font-bold text-red-400">${aiSummary?.monthCost?.toFixed(2) || '0.00'}</div>
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

            {/* 可选套餐 — 直接展示在 Key 区上方 */}
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
                      <button
                        onClick={() => { setNewKeyTier(tier.id); setShowCreateKey(true); }}
                        disabled={tier.canUse === false}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                          tier.canUse === false
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {tier.canUse === false ? '🔒 需企业认证' : '+ 创建 Key'}
                      </button>
                    </div>
                    {tier.description && <p className="text-sm text-gray-400 mb-4">{tier.description}</p>}

                    {/* 特性 */}
                    {tier.features && tier.features.length > 0 && (
                      <div className="mb-4 rounded-lg bg-slate-800/80 p-3">
                        <div className="text-xs text-gray-400 mb-1">核心特性</div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          {tier.features.map((f: string, i: number) => (
                            <span key={i} className="text-sm text-gray-300 flex items-center gap-1">
                              <span className="text-green-400">✓</span> {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 模型定价表 */}
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
                          <p>export CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK=1</p>
                          <p>export CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1</p>
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
                    else if (aiConfigTab === 'claudecode') text = `export ANTHROPIC_BASE_URL=${clean}\nexport ANTHROPIC_API_KEY=${key}\nexport CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK=1\nexport CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1`;
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
                    <p className="text-sm text-gray-400 mt-1">升级为企业账户，解锁员工 Key 管理、用量分析等高级功能</p>
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
                        <div className="text-sm font-medium">员工 Key 管理</div>
                        <div className="text-xs text-gray-400">按员工分配独立 Key</div>
                      </div>
                      <div className="bg-slate-700/50 rounded-lg p-3">
                        <div className="text-purple-400 text-lg mb-1">📊</div>
                        <div className="text-sm font-medium">用量分析</div>
                        <div className="text-xs text-gray-400">全局用量可视化</div>
                      </div>
                      <div className="bg-slate-700/50 rounded-lg p-3">
                        <div className="text-purple-400 text-lg mb-1">💰</div>
                        <div className="text-sm font-medium">预算管控</div>
                        <div className="text-xs text-gray-400">按 Key 设置月度限额</div>
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
                        <div className="text-sm text-gray-400">员工 Key 数</div>
                        <div className="text-2xl font-bold text-cyan-400">{enterpriseUsage.keyCount || 0}</div>
                      </div>
                    </div>

                    {/* 按 Key（员工）用量柱状图 */}
                    {enterpriseUsage.perKey && enterpriseUsage.perKey.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-400 mb-3">员工 Key 本月用量分布</h3>
                        <div className="space-y-2">
                          {(() => {
                            const maxCost = Math.max(...enterpriseUsage.perKey.map((k: any) => k.monthCost || 0), 0.01);
                            return enterpriseUsage.perKey.map((pk: any) => (
                              <div key={pk.keyId} className="flex items-center gap-3 text-sm">
                                <span className="text-gray-300 w-36 truncate" title={pk.label ? `${pk.keyName} (${pk.label})` : pk.keyName}>{pk.label || pk.keyName}</span>
                                <div className="flex-1 bg-slate-700 rounded-full h-6 overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full flex items-center px-2"
                                    style={{ width: `${Math.max(((pk.monthCost || 0) / maxCost) * 100, 3)}%` }}
                                  >
                                    {(pk.monthCost || 0) > 0 && <span className="text-xs text-white font-medium whitespace-nowrap">${(pk.monthCost || 0).toFixed(2)}</span>}
                                  </div>
                                </div>
                                <span className="text-gray-400 w-16 text-right">{pk.requestCount || 0} 次</span>
                                {pk.monthlyLimit && (
                                  <span className="text-xs text-yellow-400 w-20 text-right">限${pk.monthlyLimit}</span>
                                )}
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 员工 Key 列表 */}
                <div className="bg-slate-800 rounded-xl p-6">
                  <h2 className="text-xl font-bold mb-4">🏢 员工 Key 管理</h2>
                  <p className="text-sm text-gray-400 mb-4">创建 Key 时用员工名称命名（如：员工A、设计部-张三），分配给对应员工使用，所有费用从企业账户余额扣除。</p>

                  {aiKeys.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <p>暂无 Key</p>
                      <p className="text-sm mt-1">在上方创建 Key，用员工名称命名方便管理</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-gray-400 border-b border-slate-700">
                            <th className="text-left py-2 px-3">Key 名称（员工）</th>
                            <th className="text-left py-2 px-3 hidden md:table-cell">标签</th>
                            <th className="text-right py-2 px-3">本月消费</th>
                            <th className="text-right py-2 px-3 hidden sm:table-cell">月限额</th>
                            <th className="text-right py-2 px-3 hidden md:table-cell">累计消费</th>
                            <th className="text-center py-2 px-3">状态</th>
                            <th className="text-left py-2 px-3 hidden sm:table-cell">最后使用</th>
                          </tr>
                        </thead>
                        <tbody>
                          {aiKeys.map((key: any) => (
                            <tr key={key.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition">
                              <td className="py-3 px-3 font-medium">{key.keyName}</td>
                              <td className="py-3 px-3 text-gray-400 text-sm hidden md:table-cell">{key.label || '-'}</td>
                              <td className="py-3 px-3 text-right text-blue-400">${(key.monthUsed || 0).toFixed(4)}</td>
                              <td className="py-3 px-3 text-right hidden sm:table-cell">
                                {key.monthlyLimit ? <span className="text-yellow-400">${key.monthlyLimit}</span> : <span className="text-gray-500">不限</span>}
                              </td>
                              <td className="py-3 px-3 text-right text-gray-300 hidden md:table-cell">${(key.totalUsed || 0).toFixed(2)}</td>
                              <td className="py-3 px-3 text-center">
                                <span className={`text-xs px-2 py-0.5 rounded ${key.status === 'active' ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}>
                                  {key.status === 'active' ? '正常' : '已停用'}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-gray-400 text-sm hidden sm:table-cell">
                                {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString('zh-CN') : '从未使用'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* 创建 AI Key 弹窗 */}
      {showCreateKey && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-slate-800 p-4 sm:p-6 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">🔑 创建 API Key</h3>
            {(user?.aiBalance ?? 0) <= 0 && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4">
                <p className="text-red-400 text-sm font-medium">AI 钱包余额不足，无法创建 Key</p>
                <p className="text-red-400/70 text-xs mt-1">请先从账户余额转入 AI 钱包。AI 服务使用独立余额，与开卡充卡互不影响。</p>
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
                      onClick={() => tier.canUse !== false && setNewKeyTier(tier.id)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        tier.canUse === false
                          ? 'border-slate-700 bg-slate-800 opacity-50 cursor-not-allowed'
                          : newKeyTier === tier.id
                            ? 'border-blue-500 bg-blue-500/10 cursor-pointer'
                            : 'border-slate-600 bg-slate-700 hover:border-slate-500 cursor-pointer'
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
                          {tier.canUse === false && (
                            <span className="text-xs text-orange-400">🔒 需企业认证</span>
                          )}
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

              {(user?.role === 'enterprise' || user?.role === 'admin' || user?.role === 'ADMIN') && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">员工/部门标签（便于企业统计）</label>
                  <input
                    type="text"
                    value={newKeyLabel}
                    onChange={(e) => setNewKeyLabel(e.target.value)}
                    placeholder="例如：张三、设计部、前端组"
                    className="w-full bg-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreateKey}
                disabled={creatingKey || !newKeyName.trim() || !newKeyTier || (user?.aiBalance ?? 0) <= 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-2 rounded-lg font-medium transition"
              >
                {creatingKey ? '创建中...' : (user?.aiBalance ?? 0) <= 0 ? 'AI余额不足，请先转入' : '创建 Key'}
              </button>
              <button
                onClick={() => {
                  setShowCreateKey(false);
                  setNewKeyName('');
                  setNewKeyTier('');
                  setNewKeyLimit('');
                  setNewKeyLabel('');
                }}
                className="flex-1 bg-slate-600 hover:bg-slate-500 py-2 rounded-lg font-medium transition"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI 钱包转账弹窗 */}
      {showAiTransfer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-slate-800 p-4 sm:p-6 rounded-xl w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">💰 AI 钱包转账</h3>
            {(() => {
              const normalizedRole = user?.role?.toLowerCase();
              const transferOutBlockedByRole = normalizedRole === 'enterprise';
              const transferOutBlockedByMultiplier = aiTransferMultiplier > 1;
              const canTransferOut = !transferOutBlockedByRole && !transferOutBlockedByMultiplier;
              const previewAmount = parseFloat(aiTransferAmount || '0');
              const creditedPreview = previewAmount > 0 ? previewAmount * aiTransferMultiplier : 0;

              return (
                <>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-center text-sm">
                <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-3">
                  <div className="text-green-400 text-xs mb-1">账户余额</div>
                  <div className="font-bold text-green-400">${user?.balance.toFixed(2)}</div>
                </div>
                <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-3">
                  <div className="text-blue-400 text-xs mb-1">AI 钱包</div>
                  <div className="font-bold text-blue-400">${(user?.aiBalance ?? 0).toFixed(2)}</div>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">转账方向</label>
                <select
                  value={aiTransferDirection}
                  onChange={(e) => setAiTransferDirection(e.target.value as any)}
                  className="w-full bg-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="main_to_ai">账户余额 → AI 钱包</option>
                  {canTransferOut && <option value="ai_to_main">AI 钱包 → 账户余额</option>}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">转账金额 ($)</label>
                <input
                  type="number"
                  value={aiTransferAmount}
                  onChange={(e) => setAiTransferAmount(e.target.value)}
                  placeholder={aiTransferDirection === 'main_to_ai' ? '最低 $10' : '最低 $1'}
                  min={aiTransferDirection === 'main_to_ai' ? '10' : '1'}
                  step="0.01"
                  className="w-full bg-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {aiTransferDirection === 'main_to_ai' && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
                  ⚠️ AI 钱包充值<span className="font-semibold text-amber-300">最低 $10 起</span>，单次不足 $10 将无法提交。
                  {aiTransferMultiplier > 1 && ` 当前赠送倍率 ${aiTransferMultiplier}x，预计到账 $${creditedPreview > 0 ? creditedPreview.toFixed(2) : '0.00'}。`}
                </div>
              )}
              {!canTransferOut && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                  {transferOutBlockedByRole
                    ? '企业账号的 AI 钱包余额仅可用于 API 消费，不支持转回账户余额。'
                    : '当前已启用 AI 钱包充值倍率。为避免套利风险，AI 钱包暂不支持转回账户余额。'}
                </div>
              )}
              <p className="text-xs text-gray-500">AI 服务使用独立余额，与开卡、充卡业务互不影响，防止延迟扣费风险。</p>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAiTransfer}
                disabled={aiTransfering || !aiTransferAmount || parseFloat(aiTransferAmount) <= 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-2 rounded-lg font-medium transition"
              >
                {aiTransfering ? '转账中...' : '确认转账'}
              </button>
              <button
                onClick={() => { setShowAiTransfer(false); setAiTransferAmount(''); setAiTransferDirection('main_to_ai'); }}
                className="flex-1 bg-slate-600 hover:bg-slate-500 py-2 rounded-lg font-medium transition"
              >
                取消
              </button>
            </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* 企业账户申请弹窗 */}
      {showEnterpriseApply && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-slate-800 p-4 sm:p-6 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-slate-800 p-4 sm:p-6 rounded-xl w-full max-w-md">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-slate-800 p-4 sm:p-6 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-slate-800 p-4 sm:p-6 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
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

            {(() => {
              const pricing = getCardPricing(selectedCardType);
              const minimumInitialAmount = getMinimumInitialAmountForCardBin(selectedCardType.cardBin);

              return (
                <div className="bg-slate-700 rounded-lg p-4 mb-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">开卡费</span>
                    <span className="font-bold">${selectedCardType.openFee.toFixed(2)}</span>
                  </div>
                  {minimumInitialAmount > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-400">预充值</span>
                        <span>${pricing.initialAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">手续费</span>
                        <span>${pricing.rechargeFee.toFixed(2)}</span>
                      </div>
                      <div className="text-xs text-amber-300 bg-amber-950/30 border border-amber-800 rounded px-3 py-2">
                        当前卡段 {selectedCardType.cardBin} 开卡时要求预充值金额大于 $0。
                      </div>
                    </>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">当前余额</span>
                    <span className="text-green-400">${user?.balance.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-slate-600 pt-2 flex justify-between">
                    <span className="text-gray-400">开卡合计</span>
                    <span className="font-bold text-white">${pricing.totalCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">开卡后余额</span>
                    <span className="text-yellow-400">${(user!.balance - pricing.totalCost).toFixed(2)}</span>
                  </div>
                </div>
              );
            })()}
      
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

      {/* 平台公告弹窗 */}
      {showAnnouncementModal && announcementData && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col" style={{ maxHeight: '80vh' }}>
            <div className="px-6 pt-6 pb-4 border-b border-slate-700 flex-shrink-0">
              <h2 className="text-xl font-bold text-white">📢 平台公告</h2>
              <p className="text-sm text-gray-400 mt-1">请将以下内容完整阅读后方可关闭</p>
            </div>
            <div
              className="flex-1 overflow-y-auto px-6 py-4"
              onScroll={(e) => {
                const el = e.currentTarget;
                if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
                  setAnnouncementScrolled(true);
                }
              }}
            >
              <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{announcementData!.content}</p>
            </div>
            <div className="px-6 pb-6 pt-4 border-t border-slate-700 flex-shrink-0">
              {!announcementScrolled && (
                <p className="text-xs text-yellow-400 mb-3 text-center">↓ 请向下滚动阅读完整公告</p>
              )}
              <button
                disabled={!announcementScrolled}
                onClick={() => {
                  localStorage.setItem(`announcement_read_v${announcementData!.version}`, '1');
                  setShowAnnouncementModal(false);
                }}
                className={`w-full py-3 rounded-xl text-sm font-semibold transition ${
                  announcementScrolled
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-slate-600 text-gray-500 cursor-not-allowed'
                }`}
              >
                {announcementScrolled ? '我已阅读，确认关闭' : '请先阅读完整公告'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

