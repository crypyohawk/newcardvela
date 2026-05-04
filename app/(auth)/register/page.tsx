'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { useAuth } from '../../../src/hooks/useAuth';

function RegisterContent() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeTip, setCodeTip] = useState('');
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();

  // 密码验证规则
  const pwRules = {
    length: password.length >= 10 && password.length <= 20,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password),
  };
  const passwordValid = pwRules.length && pwRules.upper && pwRules.lower && pwRules.special;
  const confirmMatch = confirmPassword.length > 0 && password === confirmPassword;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSendCode = emailValid && passwordValid && confirmMatch;

  // Auto fill referral code from URL
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) setReferralCode(ref);
  }, [searchParams]);

  const sendCode = async () => {
    if (!canSendCode) return;

    setCodeLoading(true);
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'register' }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to send.' });
        setCodeLoading(false);
        return;
      }

      setMessage({ type: 'success', text: 'Verification code sent.' });
      setCodeSent(true);
      setCodeLoading(false);
    } catch (error: any) {
      console.error('Send code error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to send.' });
      setCodeLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !username || !password || !code) {
      setMessage({ type: 'error', text: 'Please fill in all required fields.' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          username,
          password,
          code,
          referralCode: referralCode || undefined,
        }),
      });

      const data = await res.json();
      console.log('Register response:', { status: res.status, data });

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Registration failed.' });
        setLoading(false);
        return;
      }

      if (data.token) {
        localStorage.setItem('token', data.token);
        await refreshUser();
      }

      setMessage({ type: 'success', text: 'Registration successful! Redirecting...' });
      
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (error: any) {
      console.error('Register error:', error);
      setMessage({ type: 'error', text: error.message || 'Registration failed.' });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <a href="/" aria-label="CardVela">
            <img src="/brand/cardvela-wordmark.svg" alt="CardVela" className="h-10 w-auto" />
          </a>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-center mb-6 text-white">创建账户</h1>

          {message && (
            <div className={`mb-4 p-3 rounded-xl text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
              {message.text}
            </div>
          )}

          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">邮箱</label>
              <input
                type="email"
                placeholder="请输入邮箱地址"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition"
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">用户名</label>
              <input
                type="text"
                placeholder="请输入用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">密码</label>
              <div className="mb-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-xs text-amber-400">⚠️ 密码丢失等于账号丢失，注册前请务必备份保存密码</p>
              </div>
              <input
                type="password"
                placeholder="8-10位，含大写、小写字母和特殊字符"
                value={password}
                onChange={(e) => setPassword(e.target.value.slice(0, 10))}
                maxLength={10}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition"
              />
              {password.length > 0 && (
                <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                  <span className={pwRules.length ? 'text-green-400' : 'text-gray-500'}>
                    {pwRules.length ? '✓' : '○'} 10-20位字符
                  </span>
                  <span className={pwRules.upper ? 'text-green-400' : 'text-gray-500'}>
                    {pwRules.upper ? '✓' : '○'} 含大写字母
                  </span>
                  <span className={pwRules.lower ? 'text-green-400' : 'text-gray-500'}>
                    {pwRules.lower ? '✓' : '○'} 含小写字母
                  </span>
                  <span className={pwRules.special ? 'text-green-400' : 'text-gray-500'}>
                    {pwRules.special ? '✓' : '○'} 含特殊字符
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">确认密码</label>
              <input
                type="password"
                placeholder="请再次输入密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value.slice(0, 10))}
                maxLength={10}
                className={`w-full px-4 py-2.5 bg-white/5 border rounded-xl text-white placeholder-gray-500 focus:outline-none transition ${
                  confirmPassword.length === 0
                    ? 'border-white/10 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25'
                    : confirmMatch
                      ? 'border-green-500/50 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/25'
                      : 'border-red-500/50 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/25'
                }`}
              />
              {confirmPassword.length > 0 && !confirmMatch && (
                <p className="mt-1 text-xs text-red-400">两次密码输入不一致</p>
              )}
              {confirmMatch && (
                <p className="mt-1 text-xs text-green-400">✓ 密码一致</p>
              )}
            </div>

            {/* Email Verification Code */}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">邮箱验证码</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="请输入验证码"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition"
                />
                <button
                  onClick={() => {
                    if (!canSendCode) {
                      const tips: string[] = [];
                      if (!email.trim()) tips.push('请填写邮箱');
                      else if (!emailValid) tips.push('邮箱格式不正确');
                      if (!pwRules.length) tips.push('密码需10-20位');
                      if (!pwRules.upper) tips.push('密码需含大写字母');
                      if (!pwRules.lower) tips.push('密码需含小写字母');
                      if (!pwRules.special) tips.push('密码需含特殊字符');
                      if (!confirmMatch) tips.push('两次密码不一致');
                      setCodeTip(tips.join('；'));
                      setTimeout(() => setCodeTip(''), 4000);
                      return;
                    }
                    setCodeTip('');
                    sendCode();
                  }}
                  disabled={codeLoading || codeSent}
                  className="bg-white/10 border border-white/10 text-white px-4 py-2.5 rounded-xl hover:bg-white/15 disabled:opacity-50 whitespace-nowrap text-sm font-medium transition"
                >
                  {codeLoading ? '发送中...' : codeSent ? '已发送' : '获取验证码'}
                </button>
              </div>
              {codeTip && (
                <div className="mt-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs leading-relaxed">
                  ⚠ {codeTip}
                </div>
              )}
            </div>

            {/* Referral Code */}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">推荐码 <span className="text-gray-600">(可选)</span></label>
              <input
                type="text"
                placeholder="请输入推荐码"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition"
              />
            </div>

            {/* Register Button */}
            <button
              onClick={handleRegister}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-400 text-black font-semibold py-2.5 rounded-xl hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 transition-all mt-2"
            >
              {loading ? '注册中...' : '注册'}
            </button>
          </div>

          <p className="text-center mt-6 text-sm text-gray-500">
            已有账户？ <Link href="/login" className="text-blue-400 hover:text-blue-300 transition">立即登录</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <RegisterContent />
    </Suspense>
  );
}
