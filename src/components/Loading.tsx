'use client';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'red' | 'gold';
  className?: string;
}

export function Spinner({ size = 'md', color = 'red', className = '' }: SpinnerProps) {
  const sizeClass = size === 'sm' ? 'spinner-sm' : size === 'lg' ? 'spinner-lg' : '';
  const colorClass = color === 'gold' ? 'spinner-gold' : '';
  
  return (
    <div className={`spinner ${sizeClass} ${colorClass} ${className}`} />
  );
}

interface LoadingProps {
  text?: string;
  fullScreen?: boolean;
}

export function Loading({ text = '加载中...', fullScreen = false }: LoadingProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <Spinner size="lg" />
      <span className="text-sm text-[var(--ink-3)]">{text}</span>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        {content}
      </div>
    );
  }

  return (
    <div className="py-8 flex items-center justify-center">
      {content}
    </div>
  );
}

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular';
  className?: string;
}

export function Skeleton({ 
  width, 
  height, 
  variant = 'rectangular', 
  className = '' 
}: SkeletonProps) {
  const style: React.CSSProperties = {};
  
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;
  
  const variantClass = variant === 'circular' ? 'rounded-full' : variant === 'text' ? 'rounded' : '';
  
  return (
    <div 
      className={`skeleton ${variantClass} ${className}`}
      style={style}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton height={16} className="w-1/3" />
          <Skeleton height={12} className="w-1/2" />
        </div>
      </div>
      <Skeleton height={12} />
      <Skeleton height={12} className="w-4/5" />
      <Skeleton height={12} className="w-3/5" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {/* 表头 */}
      <div className="flex gap-4 p-4 bg-[var(--paper)] border-b border-[var(--line)]">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} height={14} className="flex-1" />
        ))}
      </div>
      {/* 表格行 */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border-b border-[var(--line)]">
          {[1, 2, 3, 4].map((j) => (
            <Skeleton key={j} height={14} className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
