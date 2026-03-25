'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminSettingsPage() {
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 添加状态
  const [accountWithdrawMinAmount, setAccountWithdrawMinAmount] = useState(2);
  const [accountWithdrawMaxAmount, setAccountWithdrawMaxAmount] = useState(500);
  const [accountWithdrawFeePercent, setAccountWithdrawFeePercent] = useState(5);
  const [accountWithdrawFeeMin, setAccountWithdrawFeeMin] = useState(2);
  const [cardWithdrawFeePercent, setCardWithdrawFeePercent] = useState(1);
  const [cardWithdrawFeeMin, setCardWithdrawFeeMin] = useState(1);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/config', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.configs) {
        setConfigs(data.configs);
        // 从 SystemConfig 读取提现配置
        setAccountWithdrawMinAmount(parseFloat(data.configs['withdraw_min_amount']) || 2);
        setAccountWithdrawMaxAmount(parseFloat(data.configs['withdraw_max_amount']) || 500);
        setCardWithdrawFeePercent(parseFloat(data.configs['card_withdraw_fee_percent']) || 1);
        setCardWithdrawFeeMin(parseFloat(data.configs['card_withdraw_fee']) || 1);
        setAccountWithdrawFeePercent(parseFloat(data.configs['withdraw_fee_percent']) || 5);
        setAccountWithdrawFeeMin(parseFloat(data.configs['withdraw_fee_min']) || 2);
      }
    } catch (error) {
      console.error('获取配置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (key: string, value: string) => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ key, value }),
      });
      
      if (!res.ok) throw new Error('保存失败');
      
      setConfigs(prev => ({ ...prev, [key]: value }));
      setMessage({ type: 'success', text: '保存成功' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (key: string, file: File) => {
    // 简单处理：转为 base64 存储（生产环境建议用 OSS）
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      await saveConfig(key, base64);
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">加载中...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <nav className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <Link href="/admin" className="text-xl font-bold">CardVela 管理后台 - 系统设置</Link>
          <Link href="/admin" className="text-gray-400 hover:text-white">返回</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {message.text}
          </div>
        )}

        {/* 客服联系方式配置 - 添加在最前面 */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">📧 客服联系方式</h2>
          <p className="text-gray-400 text-sm mb-4">配置客服邮箱，用户在仪表盘页面可以看到</p>
          
          <div>
            <label className="block text-sm text-gray-400 mb-2">客服邮箱</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={configs['support_email'] || ''}
                onChange={(e) => setConfigs(prev => ({ ...prev, support_email: e.target.value }))}
                placeholder="support@cardvela.com"
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
              />
              <button
                onClick={() => saveConfig('support_email', configs['support_email'] || '')}
                disabled={saving}
                className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                保存
              </button>
            </div>
          </div>
        </div>

        {/* AI API 域名配置 */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">🤖 AI API 域名</h2>
          <p className="text-gray-400 text-sm mb-4">配置面向用户的 API 接入地址。用户创建 Key 后看到的 Base URL 就是这个地址。上游服务商地址仅用于内部代理转发，不会暴露给用户。</p>
          
          <div>
            <label className="block text-sm text-gray-400 mb-2">平台 API 域名</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={configs['ai_api_base_url'] || ''}
                onChange={(e) => setConfigs(prev => ({ ...prev, ai_api_base_url: e.target.value }))}
                placeholder="https://api.cardvela.com"
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
              />
              <button
                onClick={() => saveConfig('ai_api_base_url', configs['ai_api_base_url'] || '')}
                disabled={saving}
                className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                保存
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">用户在 Cline / Cursor / Claude Code 等工具中使用此域名接入。不同工具的路径（如 /v1）由系统自动处理</p>
          </div>
        </div>

        {/* AI 信用额度配置 */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">💳 AI 信用额度</h2>
          <p className="text-gray-400 text-sm mb-4">允许用户余额透支的最大金额。API 调用是事后扣费，当用户正在执行任务时余额可能不足，信用额度允许用户完成当前任务，余额变为负数。超过信用下限后 Key 会被自动禁用，充值后可重新启用。</p>
          
          <div>
            <label className="block text-sm text-gray-400 mb-2">信用额度上限 ($)</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={configs['ai_credit_limit'] || '5'}
                onChange={(e) => setConfigs(prev => ({ ...prev, ai_credit_limit: e.target.value }))}
                placeholder="5"
                step="1"
                min="0"
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
              />
              <button
                onClick={() => saveConfig('ai_credit_limit', configs['ai_credit_limit'] || '5')}
                disabled={saving}
                className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                保存
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">例如设为 5，则用户余额最低可到 -$5。设为 0 表示不允许透支（余额归零即禁用 Key）。建议 3~10 美元</p>
          </div>
        </div>

        {/* 企业子账户默认日限额 */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">🏢 子账户默认日限额</h2>
          <p className="text-gray-400 text-sm mb-4">当企业子账户未设置任何预算限额（日/周/月都为空）时，系统自动应用此默认日限额，防止子账户无限消费。企业主可在子账户管理中覆盖此值。</p>
          
          <div>
            <label className="block text-sm text-gray-400 mb-2">默认每日限额 ($)</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={configs['ai_sub_account_default_daily_budget'] || '10'}
                onChange={(e) => setConfigs(prev => ({ ...prev, ai_sub_account_default_daily_budget: e.target.value }))}
                placeholder="10"
                step="1"
                min="1"
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
              />
              <button
                onClick={() => saveConfig('ai_sub_account_default_daily_budget', configs['ai_sub_account_default_daily_budget'] || '10')}
                disabled={saving}
                className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                保存
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">建议设为 10~50 美元。仅对未设置任何限额的子账户生效，已设限额的子账户不受影响</p>
          </div>
        </div>

        {/* USDT 收款地址配置 */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">💵 USDT 收款地址</h2>
          <p className="text-gray-400 text-sm mb-4">配置你的 USDT 钱包地址，用户充值时会显示这些地址</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">TRC20 地址（波场）</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={configs['usdt_trc20_address'] || ''}
                  onChange={(e) => setConfigs(prev => ({ ...prev, usdt_trc20_address: e.target.value }))}
                  placeholder="T..."
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                />
                <button
                  onClick={() => saveConfig('usdt_trc20_address', configs['usdt_trc20_address'] || '')}
                  disabled={saving}
                  className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  保存
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">ERC20 地址（以太坊）</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={configs['usdt_erc20_address'] || ''}
                  onChange={(e) => setConfigs(prev => ({ ...prev, usdt_erc20_address: e.target.value }))}
                  placeholder="0x..."
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                />
                <button
                  onClick={() => saveConfig('usdt_erc20_address', configs['usdt_erc20_address'] || '')}
                  disabled={saving}
                  className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  保存
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">BEP20 地址（币安链）</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={configs['usdt_bep20_address'] || ''}
                  onChange={(e) => setConfigs(prev => ({ ...prev, usdt_bep20_address: e.target.value }))}
                  placeholder="0x..."
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                />
                <button
                  onClick={() => saveConfig('usdt_bep20_address', configs['usdt_bep20_address'] || '')}
                  disabled={saving}
                  className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 微信收款码 */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">💚 微信收款码</h2>
          <div className="flex gap-6">
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload('wechat_qrcode', file);
                }}
                className="hidden"
                id="wechat-upload"
              />
              <label
                htmlFor="wechat-upload"
                className="block bg-slate-700 border-2 border-dashed border-slate-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500"
              >
                <div className="text-4xl mb-2">📤</div>
                <div className="text-gray-400">点击上传微信收款码</div>
              </label>
            </div>
            {configs['wechat_qrcode'] && (
              <div className="w-48">
                <img src={configs['wechat_qrcode']} alt="微信收款码" className="w-full rounded-lg" />
              </div>
            )}
          </div>
        </div>

        {/* 支付宝收款码 */}
        <div className="bg-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">💙 支付宝收款码</h2>
          <div className="flex gap-6">
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload('alipay_qrcode', file);
                }}
                className="hidden"
                id="alipay-upload"
              />
              <label
                htmlFor="alipay-upload"
                className="block bg-slate-700 border-2 border-dashed border-slate-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500"
              >
                <div className="text-4xl mb-2">📤</div>
                <div className="text-gray-400">点击上传支付宝收款码</div>
              </label>
            </div>
            {configs['alipay_qrcode'] && (
              <div className="w-48">
                <img src={configs['alipay_qrcode']} alt="支付宝收款码" className="w-full rounded-lg" />
              </div>
            )}
          </div>
        </div>

        {/* 汇率配置 */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">💱 汇率配置</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">充值汇率 (USD → CNY)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={configs['recharge_usd_cny_rate'] || '7.2'}
                  onChange={(e) => setConfigs(prev => ({ ...prev, recharge_usd_cny_rate: e.target.value }))}
                  placeholder="7.20"
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                />
                <button
                  onClick={() => saveConfig('recharge_usd_cny_rate', configs['recharge_usd_cny_rate'] || '7.2')}
                  disabled={saving}
                  className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  保存
                </button>
              </div>
              <p className="text-gray-500 text-xs mt-1">用户充值时，$1 = ¥{configs['recharge_usd_cny_rate'] || '7.2'}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">提现汇率 (USD → CNY)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={configs['withdraw_usd_cny_rate'] || '7.0'}
                  onChange={(e) => setConfigs(prev => ({ ...prev, withdraw_usd_cny_rate: e.target.value }))}
                  placeholder="7.00"
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                />
                <button
                  onClick={() => saveConfig('withdraw_usd_cny_rate', configs['withdraw_usd_cny_rate'] || '7.0')}
                  disabled={saving}
                  className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  保存
                </button>
              </div>
              <p className="text-gray-500 text-xs mt-1">用户提现时，$1 = ¥{configs['withdraw_usd_cny_rate'] || '7.0'}</p>
            </div>
          </div>
        </div>

        {/* 提现费率配置 */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">💸 提现费率配置</h2>
          
          <div className="grid grid-cols-2 gap-6 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">账户提现最低金额 (USD)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={accountWithdrawMinAmount}
                  onChange={(e) => setAccountWithdrawMinAmount(parseFloat(e.target.value) || 0)}
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                />
                <button
                  onClick={() => saveConfig('withdraw_min_amount', String(accountWithdrawMinAmount))}
                  disabled={saving}
                  className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  保存
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">账户提现最高金额 (USD)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={accountWithdrawMaxAmount}
                  onChange={(e) => setAccountWithdrawMaxAmount(parseFloat(e.target.value) || 0)}
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                />
                <button
                  onClick={() => saveConfig('withdraw_max_amount', String(accountWithdrawMaxAmount))}
                  disabled={saving}
                  className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  保存
                </button>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">卡片提现到账户手续费 (USD)</label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.1"
                value={cardWithdrawFeeMin}
                onChange={(e) => setCardWithdrawFeeMin(parseFloat(e.target.value) || 0)}
                placeholder="1.5"
                className="w-32 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
              />
              <button
                onClick={() => saveConfig('card_withdraw_fee', String(cardWithdrawFeeMin))}
                disabled={saving}
                className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                保存
              </button>
            </div>
            <p className="text-gray-500 text-xs mt-1">卡余额转到账户余额时收取的固定手续费</p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">账户提现手续费规则</label>
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">手续费百分比 (%)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.1"
                    value={accountWithdrawFeePercent}
                    onChange={(e) => setAccountWithdrawFeePercent(parseFloat(e.target.value) || 0)}
                    className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                  />
                  <button
                    onClick={() => saveConfig('withdraw_fee_percent', String(accountWithdrawFeePercent))}
                    disabled={saving}
                    className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    保存
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">最低手续费 (USD)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.1"
                    value={accountWithdrawFeeMin}
                    onChange={(e) => setAccountWithdrawFeeMin(parseFloat(e.target.value) || 0)}
                    className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                  />
                  <button
                    onClick={() => saveConfig('withdraw_fee_min', String(accountWithdrawFeeMin))}
                    disabled={saving}
                    className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    保存
                  </button>
                </div>
              </div>
            </div>
            <p className="text-gray-500 text-xs">手续费 = 提现金额 × {accountWithdrawFeePercent}%，最低收取 ${accountWithdrawFeeMin}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
