'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminSettingsPage() {
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
          <Link href="/admin" className="text-xl font-bold">管理后台 - 系统设置</Link>
          <Link href="/admin" className="text-gray-400 hover:text-white">返回</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {message.text}
          </div>
        )}

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
                  value={configs['withdraw_min_amount'] || '8'}
                  onChange={(e) => setConfigs(prev => ({ ...prev, withdraw_min_amount: e.target.value }))}
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                />
                <button
                  onClick={() => saveConfig('withdraw_min_amount', configs['withdraw_min_amount'] || '8')}
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
                  value={configs['withdraw_max_amount'] || '500'}
                  onChange={(e) => setConfigs(prev => ({ ...prev, withdraw_max_amount: e.target.value }))}
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
                />
                <button
                  onClick={() => saveConfig('withdraw_max_amount', configs['withdraw_max_amount'] || '500')}
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
                value={configs['card_withdraw_fee'] || '1.5'}
                onChange={(e) => setConfigs(prev => ({ ...prev, card_withdraw_fee: e.target.value }))}
                placeholder="1.5"
                className="w-32 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2"
              />
              <button
                onClick={() => saveConfig('card_withdraw_fee', configs['card_withdraw_fee'] || '1.5')}
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
            <div className="bg-slate-700 rounded-lg p-4 text-sm text-gray-300">
              <p className="mb-2">按提现金额阶梯收费（1% + 固定费用）：</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>$8-10: 扣 $1</div>
                <div>$10-20: 扣 $1</div>
                <div>$20-50: 扣 $2</div>
                <div>$50-100: 扣 $4</div>
                <div>$100-200: 扣 $6</div>
                <div>$200-300: 扣 $8</div>
                <div>$300-500: 扣 $10</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}