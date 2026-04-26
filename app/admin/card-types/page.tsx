'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface CardType {
  id: string;
  name: string;
  cardBin: string;
  issuer: string;
  // 用户端显示字段
  displayOpenFee: number;
  displayMonthlyFee: number | null;
  displayRechargeFee: string | null;
  displayTransactionFee: string | null;
  displayRefundFee: string | null;
  displayAuthFee: string | null;
  // 实际运行费率
  openFee: number;
  monthlyFee: number;
  rechargeFeePercent: number;
  rechargeFeeMin: number;
  transactionFeePercent: number;
  transactionFeeMin: number;
  authFee: number;
  authFeePercent: number;
  authFeeMin: number;
  authFailFee: number;
  refundFeePercent: number;
  refundFeeMin: number;
  smallRefundFee: number;
  largeRefundThreshold: number;
  crossBorderFeePercent: number;
  crossBorderFeeMin: number;
  chargebackFee: number;
  description: string | null;  // 新增
  cardSegment: string | null;  // 卡段显示
  isActive: boolean;
  createdAt: string;
  targetRole: string;  // 新增这一行
}

export default function CardTypesPage() {
  const router = useRouter();
  const [cardTypes, setCardTypes] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingCard, setEditingCard] = useState<CardType | null>(null);
  const [activeSection, setActiveSection] = useState<'display' | 'actual'>('display');
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    cardBin: '',
    issuer: '美国',
    // 用户端显示
    displayOpenFee: 10,
    displayMonthlyFee: null as number | null,
    displayRechargeFee: '2%',
    displayTransactionFee: '1%',
    displayRefundFee: '$2',
    displayAuthFee: '$0.1',
    // 实际运行
    openFee: 2,
    monthlyFee: 0.1,
    rechargeFeePercent: 2,
    rechargeFeeMin: 0.6,
    transactionFeePercent: 1,
    transactionFeeMin: 0.6,
    authFee: 0.2,
    authFeePercent: 0,
    authFeeMin: 0,
    authFailFee: 0.5,
    refundFeePercent: 1,
    refundFeeMin: 0.5,
    smallRefundFee: 3,
    largeRefundThreshold: 20,
    crossBorderFeePercent: 1,
    crossBorderFeeMin: 0,
    chargebackFee: 15,
    description: '',  // 新增
    cardSegment: '',  // 卡段显示
    targetRole: 'user',  // 新增这一行
    isActive: true,
  });

  const getToken = () => localStorage.getItem('token');

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }
    fetchCardTypes();
  }, [router]);

  const fetchCardTypes = async () => {
    try {
      const res = await fetch('/api/admin/card-types', {
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.cardTypes) setCardTypes(data.cardTypes);
    } catch (error) {
      console.error('获取卡片类型失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (card?: CardType) => {
    if (card) {
      setEditingCard(card);
      setFormData({
        name: card.name,
        cardBin: card.cardBin,
        issuer: card.issuer,
        // 用户端显示
        displayOpenFee: card.displayOpenFee ?? card.openFee,
        displayMonthlyFee: card.displayMonthlyFee,
        displayRechargeFee: card.displayRechargeFee || '2%',
        displayTransactionFee: card.displayTransactionFee || '1%',
        displayRefundFee: card.displayRefundFee || '$2',
        displayAuthFee: card.displayAuthFee || '$0.1',
        // 实际运行
        openFee: card.openFee,
        monthlyFee: card.monthlyFee,
        rechargeFeePercent: card.rechargeFeePercent || 2,
        rechargeFeeMin: card.rechargeFeeMin || 0,
        transactionFeePercent: card.transactionFeePercent || 1,
        transactionFeeMin: card.transactionFeeMin || 0,
        authFee: card.authFee || 0.2,
        authFeePercent: card.authFeePercent || 0,
        authFeeMin: card.authFeeMin || 0,
        authFailFee: card.authFailFee || 0.5,
        refundFeePercent: card.refundFeePercent || 1,
        refundFeeMin: card.refundFeeMin || 0.5,
        smallRefundFee: card.smallRefundFee || 3,
        largeRefundThreshold: card.largeRefundThreshold || 20,
        crossBorderFeePercent: card.crossBorderFeePercent || 1,
        crossBorderFeeMin: card.crossBorderFeeMin || 0,
        chargebackFee: card.chargebackFee || 15,
        description: card.description || '',
        cardSegment: card.cardSegment || '',  // 卡段显示
        targetRole: card.targetRole || 'user',  // 新增这一行
        isActive: card.isActive,
      });
    } else {
      setEditingCard(null);
      setFormData({
        name: '',
        cardBin: '',
        issuer: '美国',
        displayOpenFee: 10,
        displayMonthlyFee: null,
        displayRechargeFee: '2%',
        displayTransactionFee: '1%',
        displayRefundFee: '$2',
        displayAuthFee: '$0.1',
        openFee: 2,
        monthlyFee: 0.1,
        rechargeFeePercent: 2,
        rechargeFeeMin: 0.6,
        transactionFeePercent: 1,
        transactionFeeMin: 0.6,
        authFee: 0.2,
        authFeePercent: 0,
        authFeeMin: 0,
        authFailFee: 0.5,
        refundFeePercent: 1,
        refundFeeMin: 0.5,
        smallRefundFee: 3,
        largeRefundThreshold: 20,
        crossBorderFeePercent: 1,
        crossBorderFeeMin: 0,
        chargebackFee: 15,
        description: '',  // 新增
        cardSegment: '',  // 卡段显示
        targetRole: 'user',  // 新增这一行
        isActive: true,
      });
    }
    setActiveSection('display');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCard(null);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    
    // 基本验证
    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: '请填写卡片名称' });
      return;
    }
    if (!formData.cardBin.trim()) {
      setMessage({ type: 'error', text: '请填写卡产品编号' });
      return;
    }

    setSubmitting(true);
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
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '操作失败');

      setMessage({ type: 'success', text: editingCard ? '修改成功' : '添加成功' });
      handleCloseModal();
      fetchCardTypes();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
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

  const handleToggleStatus = async (card: CardType) => {
    try {
      const res = await fetch(`/api/admin/card-types/${card.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ ...card, isActive: !card.isActive }),
      });
      if (!res.ok) throw new Error('操作失败');
      setMessage({ type: 'success', text: card.isActive ? '已禁用' : '已启用' });
      fetchCardTypes();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">加载中...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <nav className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <h1 className="text-xl font-bold">CardVela 管理后台 - 卡片类型</h1>
          <Link href="/admin" className="text-gray-400 hover:text-white">返回</Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {message.text}
          </div>
        )}

        <div className="bg-slate-800 rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">卡片类型管理</h2>
            <button onClick={() => handleOpenModal()} className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700">
              + 添加卡片类型
            </button>
          </div>

          {cardTypes.length === 0 ? (
            <p className="text-gray-400 text-center py-8">暂无卡片类型</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-slate-700">
                    <th className="pb-3">名称</th>
                    <th className="pb-3">卡产品编号</th>
                    <th className="pb-3">卡段显示</th>
                    <th className="pb-3">发行地</th>
                    <th className="pb-3">显示开卡费</th>
                    <th className="pb-3">实际开卡费</th>
                    <th className="pb-3">适用对象</th>  {/* 新增 */}
                    <th className="pb-3">状态</th>
                    <th className="pb-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {cardTypes.map((card) => (
                    <tr key={card.id} className="border-b border-slate-700">
                      <td className="py-4 font-medium">{card.name}</td>
                      <td className="py-4 font-mono text-sm">{card.cardBin}</td>
                      <td className="py-4 text-gray-300 text-sm">{card.cardSegment || <span className="text-gray-500">-</span>}</td>
                      <td className="py-4">{card.issuer}</td>
                      <td className="py-4 text-blue-400">${card.displayOpenFee ?? card.openFee}</td>
                      <td className="py-4 text-green-400">${card.openFee}</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded text-xs ${card.targetRole === 'agent' ? 'bg-purple-600' : 'bg-blue-600'}`}>
                          {card.targetRole === 'agent' ? '代理商' : '普通用户'}
                        </span>
                      </td>
                      <td className="py-4">
                        <button
                          onClick={() => handleToggleStatus(card)}
                          className={`px-2 py-1 rounded text-xs ${card.isActive ? 'bg-green-600' : 'bg-gray-600'}`}
                        >
                          {card.isActive ? '启用' : '禁用'}
                        </button>
                      </td>
                      <td className="py-4">
                        <div className="flex gap-2">
                          <button onClick={() => handleOpenModal(card)} className="text-blue-400 hover:text-blue-300">编辑</button>
                          <button onClick={() => handleDelete(card.id)} className="text-red-400 hover:text-red-300">删除</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 编辑弹窗 */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 p-6 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4">{editingCard ? '编辑卡片类型' : '添加卡片类型'}</h3>

              {/* 基本信息 */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-blue-400 mb-3">📋 基本信息</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">卡片名称</label>
                    <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="如 VISA" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">卡产品编号</label>
                    <input type="text" value={formData.cardBin} onChange={(e) => setFormData({ ...formData, cardBin: e.target.value })} placeholder="如 G36161" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2" />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm text-gray-400 mb-1">卡段显示</label>
                  <input type="text" value={formData.cardSegment || ''} onChange={(e) => setFormData({ ...formData, cardSegment: e.target.value })} placeholder="如 4413-Apple Pay" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2" />
                </div>
                <div className="mt-4">
                  <label className="block text-sm text-gray-400 mb-1">发行地区</label>
                  <select value={formData.issuer} onChange={(e) => setFormData({ ...formData, issuer: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2">
                    <option value="美国">美国</option>
                    <option value="香港">香港</option>
                    <option value="新加坡">新加坡</option>
                    <option value="英国">英国</option>
                  </select>
                </div>
              </div>

              {/* 适用对象 */}
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-1">适用对象</label>
                <select 
                  value={formData.targetRole} 
                  onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })} 
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                >
                  <option value="user">普通用户</option>
                  <option value="agent">代理商</option>
                </select>
              </div>

              {/* 切换标签 */}
              <div className="flex mb-4 bg-slate-700 rounded-lg p-1">
                <button onClick={() => setActiveSection('display')} className={`flex-1 py-2 rounded-lg transition ${activeSection === 'display' ? 'bg-blue-600' : ''}`}>
                  👁️ 用户端显示
                </button>
                <button onClick={() => setActiveSection('actual')} className={`flex-1 py-2 rounded-lg transition ${activeSection === 'actual' ? 'bg-green-600' : ''}`}>
                  ⚙️ 实际运行费率
                </button>
              </div>

              {/* 用户端显示设置 */}
              {activeSection === 'display' && (
                <div className="space-y-4 border border-blue-500/30 rounded-lg p-4 bg-blue-900/10">
                  <p className="text-blue-300 text-sm">💡 这些内容仅展示给用户看，不影响实际扣费</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">显示开卡费 (USD)</label>
                      <input type="number" step="0.01" value={formData.displayOpenFee} onChange={(e) => setFormData({ ...formData, displayOpenFee: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">显示月费 (留空不显示)</label>
                      <input type="number" step="0.01" value={formData.displayMonthlyFee ?? ''} onChange={(e) => setFormData({ ...formData, displayMonthlyFee: e.target.value ? parseFloat(e.target.value) : null })} placeholder="留空则不显示" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">显示充值费</label>
                      <input type="text" value={formData.displayRechargeFee || ''} onChange={(e) => setFormData({ ...formData, displayRechargeFee: e.target.value })} placeholder="如 2%" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">显示交易费</label>
                      <input type="text" value={formData.displayTransactionFee || ''} onChange={(e) => setFormData({ ...formData, displayTransactionFee: e.target.value })} placeholder="如 1%" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">显示授权费</label>
                      <input type="text" value={formData.displayAuthFee || ''} onChange={(e) => setFormData({ ...formData, displayAuthFee: e.target.value })} placeholder="如 $0.1" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">显示退款费</label>
                      <input type="text" value={formData.displayRefundFee || ''} onChange={(e) => setFormData({ ...formData, displayRefundFee: e.target.value })} placeholder="如 $2" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2" />
                    </div>
                  </div>
                  
                  {/* 产品说明 - 新增 */}
                  <div className="mt-4">
                    <label className="block text-sm text-gray-400 mb-1">产品说明</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      placeholder="例如：Valid for 24 months. Good use to pay on FaceBook, Google, Amazon, PayPal, Shopify, Walmart, Alibaba, AliExpress, etc."
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                    />
                  </div>
                </div>
              )}

              {/* 实际运行费率 */}
              {activeSection === 'actual' && (
                <div className="space-y-6 border border-green-500/30 rounded-lg p-4 bg-green-900/10">
                  <p className="text-green-300 text-sm">⚠️ 这些是实际扣费的参数，请谨慎设置</p>
                  
                  {/* 开卡费用 */}
                  <div>
                    <h4 className="text-sm font-semibold text-green-400 mb-3">💳 开卡费用</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">开卡费 (USD)</label>
                        <input type="number" step="0.01" value={formData.openFee} onChange={(e) => setFormData({ ...formData, openFee: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">月费 (USD)</label>
                        <input type="number" step="0.01" value={formData.monthlyFee} onChange={(e) => setFormData({ ...formData, monthlyFee: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2" />
                      </div>
                    </div>
                  </div>

                  {/* 充值手续费 */}
                  <div>
                    <h4 className="text-sm font-semibold text-yellow-400 mb-3">💰 充值手续费</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">百分比 (%)</label>
                        <input type="number" step="0.1" value={formData.rechargeFeePercent} onChange={(e) => setFormData({ ...formData, rechargeFeePercent: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">最低收费 (USD)</label>
                        <input type="number" step="0.01" value={formData.rechargeFeeMin} onChange={(e) => setFormData({ ...formData, rechargeFeeMin: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2" />
                      </div>
                    </div>
                  </div>

                  {/* 交易手续费 */}
                  <div>
                    <h4 className="text-sm font-semibold text-orange-400 mb-3">🛒 交易手续费</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">百分比 (%)</label>
                        <input type="number" step="0.1" value={formData.transactionFeePercent} onChange={(e) => setFormData({ ...formData, transactionFeePercent: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">最低收费 (USD)</label>
                        <input type="number" step="0.01" value={formData.transactionFeeMin} onChange={(e) => setFormData({ ...formData, transactionFeeMin: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2" />
                      </div>
                    </div>
                  </div>

                  {/* 授权费用 */}
                  <div>
                    <h4 className="text-sm font-semibold text-purple-400 mb-3">🔐 授权费用</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">授权费/笔 (USD)</label>
                        <input type="number" step="0.01" value={formData.authFee} onChange={(e) => setFormData({ ...formData, authFee: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">授权失败费 (USD)</label>
                        <input type="number" step="0.01" value={formData.authFailFee} onChange={(e) => setFormData({ ...formData, authFailFee: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">授权费 (%)</label>
                        <input type="number" step="0.1" value={formData.authFeePercent} onChange={(e) => setFormData({ ...formData, authFeePercent: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2" />
                      </div>
                    </div>
                  </div>

                  {/* 退款费用 */}
                  <div>
                    <h4 className="text-sm font-semibold text-red-400 mb-3">💸 退款费用</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">小额退款费 (USD)</label>
                        <input type="number" step="0.1" value={formData.smallRefundFee} onChange={(e) => setFormData({ ...formData, smallRefundFee: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2" />
                        <p className="text-xs text-gray-500 mt-1">低于阈值的退款收取此费用</p>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">大额退款阈值 (USD)</label>
                        <input type="number" step="1" value={formData.largeRefundThreshold} onChange={(e) => setFormData({ ...formData, largeRefundThreshold: parseFloat(e.target.value) || 20 })} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2" />
                        <p className="text-xs text-gray-500 mt-1">≥此金额的退款会被拦截</p>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">退款费 (%)</label>
                        <input type="number" step="0.1" value={formData.refundFeePercent} onChange={(e) => setFormData({ ...formData, refundFeePercent: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">退款最低费 (USD)</label>
                        <input type="number" step="0.01" value={formData.refundFeeMin} onChange={(e) => setFormData({ ...formData, refundFeeMin: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2" />
                      </div>
                    </div>
                  </div>

                  {/* 其他费用 */}
                  <div>
                    <h4 className="text-sm font-semibold text-cyan-400 mb-3">📊 其他费用</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">跨境费 (%)</label>
                        <input type="number" step="0.1" value={formData.crossBorderFeePercent} onChange={(e) => setFormData({ ...formData, crossBorderFeePercent: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">拒付费 (USD)</label>
                        <input type="number" step="0.01" value={formData.chargebackFee} onChange={(e) => setFormData({ ...formData, chargebackFee: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 状态 */}
              <div className="flex items-center gap-2 mt-4">
                <input type="checkbox" id="isActive" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="w-4 h-4" />
                <label htmlFor="isActive" className="text-sm text-gray-400">启用此卡片类型</label>
              </div>

              {/* 在弹窗底部按钮处 */}
              <div className="flex gap-3 mt-6">
                <button onClick={handleCloseModal} className="flex-1 bg-slate-600 py-2 rounded-lg hover:bg-slate-500">取消</button>
                <button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-blue-600 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {submitting ? '提交中...' : editingCard ? '保存' : '添加'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
