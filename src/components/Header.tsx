'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function Header() {
  const { user, logout, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="bg-slate-800 border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-white">
          CardVela
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-4">
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
                    <Link href="/vpn" className="block px-4 py-2 hover:bg-slate-600">
                      临时 VPN
                    </Link>
                    <Link href="/guide" className="block px-4 py-2 hover:bg-slate-600">
                      订阅教程
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

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="sm:hidden text-gray-300 hover:text-white p-1"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-slate-700 bg-slate-800 px-4 py-3 space-y-2">
          {user ? (
            <>
              <div className="text-gray-300 text-sm py-1">余额: ${user.balance.toFixed(2)}</div>
              <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="block py-2 text-gray-300 hover:text-white">
                我的卡片
              </Link>
              <Link href="/vpn" onClick={() => setMobileOpen(false)} className="block py-2 text-gray-300 hover:text-white">
                临时 VPN
              </Link>
              <Link href="/guide" onClick={() => setMobileOpen(false)} className="block py-2 text-gray-300 hover:text-white">
                订阅教程
              </Link>
              <Link href="/recharge" onClick={() => setMobileOpen(false)} className="block py-2 text-gray-300 hover:text-white">
                充值
              </Link>
              {isAdmin && (
                <Link href="/admin" onClick={() => setMobileOpen(false)} className="block py-2 text-yellow-400 hover:text-yellow-300">
                  管理后台
                </Link>
              )}
              <button
                onClick={() => { logout(); setMobileOpen(false); }}
                className="block w-full text-left py-2 text-red-400 hover:text-red-300"
              >
                退出登录
              </button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setMobileOpen(false)} className="block py-2 text-gray-300 hover:text-white">
                登录
              </Link>
              <Link href="/register" onClick={() => setMobileOpen(false)} className="block py-2 text-blue-400 hover:text-blue-300">
                注册
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}