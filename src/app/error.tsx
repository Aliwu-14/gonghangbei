'use client';

import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* 顶部红条 */}
      <div className="icbc-topbar-strip" />
      
      {/* 工具条 */}
      <div className="icbc-utility">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-5 text-xs">
            <span>个人网上银行</span>
            <span className="text-[var(--ink-4)]">|</span>
            <span>欢迎使用 ICBC 财富规划服务</span>
          </div>
          <div className="flex items-center gap-5 text-xs">
            <span>客户服务热线 <span className="text-[var(--brand-red)] font-medium">95588</span></span>
          </div>
        </div>
      </div>

      {/* 主导航 */}
      <header className="icbc-nav">
        <Link href="/" className="icbc-logo">
          <span className="icbc-logo-mark">ICBC</span>
          <span className="icbc-logo-text">
            <span className="icbc-logo-title">工商银行</span>
            <span className="icbc-logo-sub">PRIVATE WEALTH</span>
          </span>
        </Link>
        <nav className="icbc-nav-menu">
          <Link href="/" className="icbc-nav-item">
            首页
          </Link>
          <Link href="/welcome" className="icbc-nav-item">
            财富规划
          </Link>
          <Link href="/customer" className="icbc-nav-item">
            客户信息
          </Link>
        </nav>
        <div className="icbc-nav-right">
          <Link href="/login" className="cursor-pointer">
            登录
          </Link>
        </div>
      </header>

      {/* 错误内容 */}
      <main className="flex-1 flex items-center justify-center px-8 py-16">
        <div className="text-center max-w-lg">
          {/* 错误图标 */}
          <div className="relative inline-block mb-8">
            <div className="w-32 h-32 border-2 border-[var(--danger)] flex items-center justify-center mx-auto bg-[var(--danger-bg)]">
              <svg className="w-16 h-16 text-[var(--danger)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[var(--warning)]" />
          </div>

          <div className="text-[10px] tracking-[0.24em] text-[var(--danger)] uppercase mb-4">
            SYSTEM ERROR
          </div>
          
          <h1 className="text-[28px] font-semibold text-[var(--ink)] mb-3">
            页面加载失败
          </h1>
          
          <div className="w-8 h-0.5 bg-[var(--brand-gold)] mx-auto mb-6" />
          
          <p className="text-sm text-[var(--ink-2)] leading-relaxed mb-4">
            抱歉，加载页面时遇到了问题。这可能是网络原因或系统临时故障。
          </p>

          {/* 错误详情（开发环境显示） */}
          {process.env.NODE_ENV === 'development' && error.message && (
            <div className="mt-4 p-4 bg-[var(--canvas)] border border-[var(--line)] text-left text-xs text-[var(--ink-3)] font-mono rounded mb-6">
              <div className="text-[var(--ink-2)] font-semibold mb-1">错误信息：</div>
              <div className="break-all">{error.message}</div>
              {error.digest && (
                <>
                  <div className="text-[var(--ink-2)] font-semibold mt-2 mb-1">错误标识：</div>
                  <div className="font-mono">{error.digest}</div>
                </>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={reset}
              className="btn btn-secondary"
            >
              ← 重试
            </button>
            <Link href="/" className="btn btn-primary">
              返回首页
            </Link>
          </div>

          {/* 帮助信息 */}
          <div className="mt-12 pt-8 border-t border-[var(--line)]">
            <p className="text-xs text-[var(--ink-3)] mb-4">
              如果问题持续存在，请联系客服：
            </p>
            <div className="inline-flex items-center gap-2 text-sm">
              <span className="w-8 h-8 bg-[var(--brand-red)] text-white flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
              </span>
              <span className="text-[var(--brand-red)] font-medium font-mono">95588</span>
              <span className="text-[var(--ink-3)]">24小时客服热线</span>
            </div>
          </div>
        </div>
      </main>

      {/* 页脚 */}
      <footer className="bg-[var(--ink)] text-white/60 mt-auto">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-white/40 tracking-wider">
            <div className="flex items-center gap-4">
              <span>© {new Date().getFullYear()} 中国工商银行股份有限公司</span>
              <span className="text-white/20">|</span>
              <span>京ICP备 10003424 号</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-white/30">本网站支持 IPv6</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
