import Link from 'next/link';

export default function Custom500Page() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <div className="max-w-lg text-center">
        <div className="text-sm uppercase tracking-[0.3em] text-rose-400">500</div>
        <h1 className="mt-4 text-4xl font-bold">服务器开小差了</h1>
        <p className="mt-4 text-sm leading-6 text-slate-400">
          页面暂时无法加载，请稍后再试。如果问题持续存在，请联系管理员处理。
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            返回工作台
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-slate-700 px-5 py-3 text-sm text-slate-200 transition hover:border-slate-500"
          >
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}