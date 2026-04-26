'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/hooks/useAuth';

interface VpnSession {
  id: string;
  status: 'pending_activation' | 'active' | 'expired';
  chargeAmount: number;
  isFree: boolean;
  hasCardBenefit: boolean;
  createdAt: string;
  startedAt: string | null;
  expiresAt: string | null;
  disconnectedAt: string | null;
  remainingSeconds: number;
}

interface VpnPageData {
  balance: number;
  cardsCount: number;
  pricing: {
    currency: string;
    price: number;
    freeEligible: boolean;
    freeUsed: boolean;
    freeRule: string;
  };
  limits: {
    dailyLimit: number;
    todayUsed: number;
    remainingToday: number;
    durationMinutes: number;
  };
  node: {
    configured: boolean;
    name: string;
    region: string;
    protocol: string;
    link: string;
    host: string;
    port: string;
    sni: string;
    publicKey: string;
    shortId: string;
    notice: string;
    supportPlatforms: string[];
    purchaseTip: string;
  };
  policy: {
    title: string;
    usageScope: string;
    compliance: string;
    actionNotice: string;
  };
  activeSession: VpnSession | null;
  recentSessions: Array<VpnSession | null>;
  canStartNewSession: boolean;
  requiresRecharge: boolean;
  rechargeUrl: string;
}

function formatCountdown(totalSeconds: number) {
  const seconds = Math.max(0, totalSeconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainSeconds = seconds % 60;

  return [hours, minutes, remainSeconds].map((value) => String(value).padStart(2, '0')).join(':');
}

export default function VpnPage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<VpnPageData | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [agreedPolicy, setAgreedPolicy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const activeSession = data?.activeSession || null;

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, router, user]);

  const fetchVpnData = useCallback(async (showLoading = true) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (showLoading) {
      setPageLoading(true);
    }

    try {
      const response = await fetch('/api/user/vpn', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '加载 VPN 信息失败');
      }

      setData(result);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '加载 VPN 信息失败' });
    } finally {
      if (showLoading) {
        setPageLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      void fetchVpnData();
    }
  }, [fetchVpnData, user]);

  useEffect(() => {
    if (!activeSession || activeSession.status !== 'active' || !activeSession.expiresAt) {
      setRemainingSeconds(0);
      return;
    }

    const updateRemaining = () => {
      const next = Math.max(0, Math.floor((new Date(activeSession.expiresAt as string).getTime() - Date.now()) / 1000));
      setRemainingSeconds(next);
      if (next === 0) {
        void fetchVpnData(false);
      }
    };

    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [activeSession, fetchVpnData]);

  const recentSessions = useMemo(() => (data?.recentSessions || []).filter(Boolean) as VpnSession[], [data?.recentSessions]);

  async function createSession() {
    const token = localStorage.getItem('token');
    if (!token) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/user/vpn/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '创建 VPN 会话失败');
      }

      setData(result.state);
      setAgreedPolicy(false);
      setMessage({ type: 'success', text: result.message || 'VPN 会话已创建' });
      await refreshUser();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '创建 VPN 会话失败' });
    } finally {
      setSubmitting(false);
    }
  }

  async function activateSession() {
    const token = localStorage.getItem('token');
    if (!token || !activeSession) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/user/vpn/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId: activeSession.id }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '开始计时失败');
      }

      setData(result.state);
      setMessage({ type: 'success', text: result.message || 'VPN 已开始计时' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '开始计时失败' });
    } finally {
      setSubmitting(false);
    }
  }

  async function disconnectSession() {
    const token = localStorage.getItem('token');
    if (!token || !activeSession) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/user/vpn/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId: activeSession.id }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '结束 VPN 会话失败');
      }

      setData(result.state);
      setAgreedPolicy(false);
      setMessage({ type: 'success', text: result.message || 'VPN 会话已结束' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '结束 VPN 会话失败' });
    } finally {
      setSubmitting(false);
    }
  }

  async function copyText(value: string, successText: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage({ type: 'success', text: successText });
    } catch {
      setMessage({ type: 'error', text: '复制失败，请手动复制' });
    }
  }

  if (loading || pageLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-gray-300">加载中...</p>
      </div>
    );
  }

  if (!user || !data) {
    return null;
  }

  const canActivate = activeSession?.status === 'pending_activation' && agreedPolicy;
  const showNodeInfo = activeSession?.status === 'pending_activation' || activeSession?.status === 'active';

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <nav className="border-b border-slate-800 bg-slate-900/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white transition">
              返回工作台
            </Link>
            <span className="text-lg font-semibold">临时订阅 VPN</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-400">账户余额</span>
            <span className="rounded-lg bg-emerald-600/20 px-3 py-1 text-emerald-300">${user.balance.toFixed(2)}</span>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {message && (
          <div className={`rounded-2xl border px-4 py-3 ${message.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-red-500/30 bg-red-500/10 text-red-200'}`}>
            {message.text}
          </div>
        )}

        <section className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs text-amber-200">
                  仅限短时订阅 / 海淘使用
                </div>
                <h1 className="mt-4 text-3xl font-bold">1 小时临时 VPN 会话</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  仅用于海外 AI 订阅、Google/Gmail 登录、海淘支付等短时场景。不是长期线路，不提供持续代理用途。
                </p>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-900/80 px-5 py-4 text-right">
                <div className="text-xs text-slate-400">当前价格</div>
                <div className="mt-1 text-3xl font-bold text-white">${data.pricing.price.toFixed(2)}</div>
                <div className="text-xs text-slate-400">每次 1 小时，每日最多 {data.limits.dailyLimit} 次</div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="text-xs text-slate-400">今日已用</div>
                <div className="mt-2 text-2xl font-semibold">{data.limits.todayUsed}/{data.limits.dailyLimit}</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="text-xs text-slate-400">剩余次数</div>
                <div className="mt-2 text-2xl font-semibold">{data.limits.remainingToday}</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="text-xs text-slate-400">开卡福利</div>
                <div className="mt-2 text-sm text-slate-200">
                  {data.pricing.freeEligible ? '你已开卡，可免费使用 1 次' : data.pricing.freeUsed ? '免费次数已使用' : '开卡后可免费使用 1 次'}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">当前状态</h2>

            {!activeSession && (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
                  {data.pricing.freeEligible
                    ? '你已满足开卡条件，本次会话可免费领取。'
                    : `每次使用将从账户余额扣除 $${data.pricing.price.toFixed(2)}。`}
                </div>

                {data.requiresRecharge && (
                  <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                    账号余额不足请先充值。
                  </div>
                )}

                <button
                  onClick={createSession}
                  disabled={submitting || !data.canStartNewSession}
                  className="w-full rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                >
                  {submitting ? '处理中...' : data.pricing.freeEligible ? '免费领取 1 小时' : `立即扣费 $${data.pricing.price.toFixed(2)}`}
                </button>

                {data.requiresRecharge && (
                  <Link href={data.rechargeUrl} className="block rounded-2xl border border-slate-700 px-4 py-3 text-center text-sm text-slate-200 transition hover:border-slate-500">
                    去充值
                  </Link>
                )}
              </div>
            )}

            {activeSession?.status === 'pending_activation' && (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                  {activeSession.isFree ? '免费会话已创建。' : '扣费已完成。'} 请先使用下方节点连接，确认连接成功后再开始计时。
                </div>
                <label className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                  <input
                    type="checkbox"
                    checked={agreedPolicy}
                    onChange={(event) => setAgreedPolicy(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-emerald-400 bg-slate-900 text-emerald-500"
                  />
                  <span>我已阅读使用说明与免责声明，且已确认 VPN 已连接成功。勾选后按钮变绿，才能开始 1 小时倒计时。</span>
                </label>
                <button
                  onClick={activateSession}
                  disabled={submitting || !canActivate}
                  className={`w-full rounded-2xl px-4 py-3 font-semibold transition ${canActivate ? 'bg-emerald-500 text-white hover:bg-emerald-400' : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}
                >
                  {submitting ? '处理中...' : '我已连接成功，开始计时'}
                </button>
              </div>
            )}

            {activeSession?.status === 'active' && (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                  VPN 已启用，倒计时结束后会自动失效。
                </div>
                <div className="rounded-2xl border border-slate-700 bg-slate-950 p-5 text-center">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">倒计时</div>
                  <div className="mt-3 text-4xl font-bold text-white">{formatCountdown(remainingSeconds)}</div>
                </div>
                <button
                  onClick={disconnectSession}
                  disabled={submitting}
                  className="w-full rounded-2xl border border-slate-700 px-4 py-3 text-sm text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? '处理中...' : '提前结束本次会话'}
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-xl font-semibold">使用说明与免责声明</h2>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                <p>{data.policy.usageScope}</p>
                <p>{data.policy.compliance}</p>
                <p>{data.policy.actionNotice}</p>
                <p>{data.pricing.freeRule}</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-xl font-semibold">适用场景</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {data.node.supportPlatforms.map((item) => (
                  <span key={item} className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-sm text-slate-200">
                    {item}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-400">{data.node.notice}</p>
            </div>

            {showNodeInfo && (
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold">连接信息</h2>
                  {data.node.link && (
                    <button
                      onClick={() => copyText(data.node.link, '节点链接已复制')}
                      className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                    >
                      复制节点链接
                    </button>
                  )}
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <div className="text-xs text-slate-500">线路名称</div>
                    <div className="mt-2 text-sm text-slate-100">{data.node.name}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <div className="text-xs text-slate-500">区域 / 协议</div>
                    <div className="mt-2 text-sm text-slate-100">{data.node.region} / {data.node.protocol}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 md:col-span-2">
                    <div className="text-xs text-slate-500">节点链接</div>
                    <div className="mt-2 break-all text-sm text-slate-100">{data.node.link || '后台暂未填写链接，请使用下方手动参数。'}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <div className="text-xs text-slate-500">Host / Port</div>
                    <div className="mt-2 text-sm text-slate-100">{data.node.host || '-'}:{data.node.port || '-'}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <div className="text-xs text-slate-500">SNI / Short ID</div>
                    <div className="mt-2 text-sm text-slate-100">{data.node.sni || '-'} / {data.node.shortId || '-'}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 md:col-span-2">
                    <div className="text-xs text-slate-500">Public Key</div>
                    <div className="mt-2 break-all text-sm text-slate-100">{data.node.publicKey || '-'}</div>
                  </div>
                </div>
                <p className="mt-4 text-sm text-slate-400">{data.node.purchaseTip}</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-xl font-semibold">常见问题</h2>
              <div className="mt-4 space-y-4 text-sm text-slate-300">
                <div>
                  <div className="font-medium text-white">为什么不是长期 VPN？</div>
                  <p className="mt-1 leading-6 text-slate-400">这个服务的定位是帮助用户完成订阅、登录、海淘等短时动作，降低首次使用门槛，不提供长期代理线路。</p>
                </div>
                <div>
                  <div className="font-medium text-white">什么时候开始计时？</div>
                  <p className="mt-1 leading-6 text-slate-400">你点击“立即扣费/免费领取”后只是创建会话并展示节点。只有在你确认连接成功并点击“开始计时”后，1 小时倒计时才会开始。</p>
                </div>
                <div>
                  <div className="font-medium text-white">余额不足会怎样？</div>
                  <p className="mt-1 leading-6 text-slate-400">系统会直接提示“账号余额不足请先充值”，不会创建新的收费会话。</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-xl font-semibold">最近记录</h2>
              <div className="mt-4 space-y-3">
                {recentSessions.length === 0 && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">暂无使用记录</div>
                )}
                {recentSessions.map((session) => (
                  <div key={session.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-white">{session.isFree ? '免费体验' : `$${session.chargeAmount.toFixed(2)} 会话`}</span>
                      <span className="text-xs text-slate-500">{session.status === 'active' ? '使用中' : session.status === 'pending_activation' ? '待激活' : '已结束'}</span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">创建时间：{new Date(session.createdAt).toLocaleString('zh-CN')}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}