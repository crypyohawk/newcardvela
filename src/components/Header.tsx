'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function Header() {
  const { user, logout, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-slate-800 border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-white">
          CardVela
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <span className="text-gray-300">余额: ${user.balance.toFixed(2)}</span>
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="text-gray-300 hover:text-white"
                >
                  {user.username}
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-slate-700 rounded-lg shadow-lg py-2 z-50">
                    <Link href="/dashboard" className="block px-4 py-2 hover:bg-slate-600">
                      我的卡片
                    </Link>
                    <Link href="/recharge" className="block px-4 py-2 hover:bg-slate-600">
                      充值
                    </Link>
                    {isAdmin && (
                      <Link href="/admin" className="block px-4 py-2 hover:bg-slate-600 text-yellow-400">
                        管理后台
                      </Link>
                    )}
                    <button
                      onClick={logout}
                      className="block w-full text-left px-4 py-2 hover:bg-slate-600 text-red-400"
                    >
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="text-gray-300 hover:text-white">
                登录
              </Link>
              <Link href="/register" className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700">
                注册
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}