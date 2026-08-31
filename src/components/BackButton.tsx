'use client';

// 通用返回上一级按钮（工行红主调）
export default function BackButton({ 
  onClick, 
  label = '返回',
  href
}: { 
  onClick?: () => void; 
  label?: string;
  href?: string;
}) {
  const baseClass = "inline-flex items-center gap-1.5 text-sm text-[var(--ink-2)] hover:text-[var(--brand-red)] transition-colors tracking-wider";
  
  if (href) {
    return (
      <a href={href} className={baseClass} aria-label="返回上一级">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        <span>{label}</span>
      </a>
    );
  }

  return (
    <button
      onClick={onClick}
      className={baseClass}
      aria-label="返回上一级"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
      </svg>
      <span>{label}</span>
    </button>
  );
}
