'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 记录错误日志
    console.error('[ICBC-WMP] Global Error:', error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <head>
        <title>系统错误 - 中国工商银行财富规划</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, padding: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          {/* 顶部红条 */}
          <div style={{ height: '2px', background: '#C7000B' }} />
          
          {/* 工具条 */}
          <div style={{ background: '#F5F5F5', borderBottom: '1px solid #E5E5E5', padding: '7px 32px', fontSize: '12px', color: '#4A4A4A' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="flex items-center gap-5">
                <span>个人网上银行</span>
                <span style={{ color: '#B5B5B5' }}>|</span>
                <span>欢迎使用 ICBC 财富规划服务</span>
              </div>
              <div className="flex items-center gap-5">
                <span>客户服务热线 <span style={{ color: '#C7000B', fontWeight: 500 }}>95588</span></span>
              </div>
            </div>
          </div>

          {/* 错误内容 */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 32px' }}>
            <div style={{ textAlign: 'center', maxWidth: '576px' }}>
              {/* 错误图标 */}
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: '32px' }}>
                <div style={{ width: '128px', height: '128px', border: '2px solid #8B2635', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F2E0E2', margin: '0 auto' }}>
                  <svg style={{ width: '64px', height: '64px', color: '#8B2635' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <div style={{ position: 'absolute', bottom: '-8px', right: '-8px', width: '32px', height: '32px', background: '#B07F1F' }} />
              </div>

              <div style={{ fontSize: '10px', letterSpacing: '0.24em', color: '#8B2635', textTransform: 'uppercase', marginBottom: '16px' }}>
                GLOBAL ERROR
              </div>
              
              <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#1F1F1F', marginBottom: '12px' }}>
                系统发生错误
              </h1>
              
              <div style={{ width: '32px', height: '2px', background: '#B08552', margin: '0 auto 24px' }} />
              
              <p style={{ fontSize: '14px', color: '#4A4A4A', lineHeight: 1.7, marginBottom: '24px' }}>
                抱歉，系统遇到了一个意外错误。这可能是因为网络连接问题或服务器暂时不可用。请稍后重试。
              </p>

              {/* 错误详情（开发环境显示） */}
              {process.env.NODE_ENV === 'development' && error?.message && (
                <div style={{ marginTop: '16px', padding: '16px', background: '#FAFAFA', border: '1px solid #E5E5E5', textAlign: 'left', fontSize: '12px', color: '#888888', fontFamily: 'monospace', borderRadius: '2px', marginBottom: '24px' }}>
                  <div style={{ color: '#4A4A4A', fontWeight: 600, marginBottom: '4px' }}>错误信息：</div>
                  <div style={{ wordBreak: 'break-all' }}>{error.message}</div>
                  {error?.digest && (
                    <>
                      <div style={{ color: '#4A4A4A', fontWeight: 600, marginTop: '8px', marginBottom: '4px' }}>错误标识：</div>
                      <div style={{ fontFamily: 'monospace' }}>{error.digest}</div>
                    </>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                <button
                  onClick={reset}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px 24px',
                    fontSize: '14px',
                    fontWeight: 500,
                    letterSpacing: '0.04em',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: '1px solid #E5E5E5',
                    borderRadius: '2px',
                    fontFamily: 'inherit',
                    background: '#FFFFFF',
                    color: '#1F1F1F',
                  }}
                >
                  ← 重试
                </button>
                <a
                  href="/"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px 24px',
                    fontSize: '14px',
                    fontWeight: 500,
                    letterSpacing: '0.04em',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: '1px solid #C7000B',
                    borderRadius: '2px',
                    fontFamily: 'inherit',
                    background: '#C7000B',
                    color: '#FFFFFF',
                    textDecoration: 'none',
                  }}
                >
                  返回首页
                </a>
              </div>

              {/* 帮助信息 */}
              <div style={{ marginTop: '48px', paddingTop: '32px', borderTop: '1px solid #E5E5E5' }}>
                <p style={{ fontSize: '12px', color: '#888888', marginBottom: '16px' }}>
                  如果问题持续存在，请联系客服：
                </p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                  <span style={{ width: '32px', height: '32px', background: '#C7000B', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                    </svg>
                  </span>
                  <span style={{ color: '#C7000B', fontWeight: 500, fontFamily: 'monospace' }}>95588</span>
                  <span style={{ color: '#888888' }}>24小时客服热线</span>
                </div>
              </div>
            </div>
          </div>

          {/* 页脚 */}
          <footer style={{ background: '#1F1F1F', color: 'rgba(255,255,255,0.4)', padding: '24px 32px' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '16px', fontSize: '11px', letterSpacing: '0.04em' }}>
              <div className="flex items-center gap-4">
                <span>© {new Date().getFullYear()} 中国工商银行股份有限公司</span>
                <span style={{ opacity: 0.2 }}>|</span>
                <span>京ICP备 10003424 号</span>
              </div>
              <div className="flex items-center gap-3">
                <span style={{ opacity: 0.3 }}>本网站支持 IPv6</span>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
