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
  const [activeTab, setActiveTab] = useState<'cards' | 'open' | 'recharge' | 'referral'>('cards');
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

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    fetchData();
    fetchReferralInfo();
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
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

        {/* 在快捷操作区域后添加推荐横幅 */}
        {referralInfo?.settings?.enabled && (
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-4 mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="font-bold text-lg">🎁 {referralInfo.settings.promptText}</h3>
                <p className="text-sm opacity-90 mt-1">
                  您的推荐码：<span className="font-mono bg-white/20 px-2 py-1 rounded">{referralInfo.referralCode}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(referralInfo.referralLink);
                  setMessage({ type: 'success', text: '推荐链接已复制！' });
                }}
                className="bg-white text-purple-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100"
              >
                复制链接
              </button>
            </div>
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
                        <span className="text-[10px] font-bold tracking-wider opacity-80">CardVela</span>
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
      </div>

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

