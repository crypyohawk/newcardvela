'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global app error:', error);
  }, [error]);

  return (
    <html lang="zh">
      <body>
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
          <div className="max-w-lg text-center">
            <div className="text-sm uppercase tracking-[0.3em] text-rose-400">500</div>
            <h1 className="mt-4 text-4xl font-bold">页面加载失败</h1>
            <p className="mt-4 text-sm leading-6 text-slate-400">
              系统遇到未处理异常，请稍后重试；如果问题持续存在，请联系管理员。
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={reset}
                className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                重试
              </button>
              <Link
                href="/dashboard"
                className="rounded-xl border border-slate-700 px-5 py-3 text-sm text-slate-200 transition hover:border-slate-500"
              >
                返回工作台
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}