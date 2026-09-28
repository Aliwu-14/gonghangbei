'use client';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'gold' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ 
  children, 
  variant = 'default', 
  size = 'md',
  className = '' 
}: BadgeProps) {
  const variantClasses = {
    default: '',
    gold: 'badge-gold',
    success: 'badge-success',
    warning: 'badge-warning',
    danger: '',
  };
  
  const sizeStyles = size === 'sm' ? 'text-[10px] min-w-[16px] h-4 px-1.5' : '';
  
  return (
    <span className={`badge ${variantClasses[variant]} ${sizeStyles} ${className}`}>
      {children}
    </span>
  );
}

interface StatusBadgeProps {
  status: 'online' | 'offline' | 'busy' | 'away';
  label?: string;
  showLabel?: boolean;
}

export function StatusBadge({ 
  status, 
  label,
  showLabel = false 
}: StatusBadgeProps) {
  const dotClass = {
    online: 'badge-dot-success',
    offline: '',
    busy: '',
    away: 'badge-dot-warning',
  }[status];
  
  const statusColor = {
    online: 'var(--positive)',
    offline: 'var(--ink-3)',
    busy: 'var(--danger)',
    away: 'var(--warning)',
  }[status];
  
  const statusLabel = label || {
    online: '在线',
    offline: '离线',
    busy: '忙碌',
    away: '离开',
  }[status];
  
  return (
    <div className="flex items-center gap-2">
      <span 
        className={`badge-dot ${dotClass}`}
        style={{ background: statusColor }}
      />
      {showLabel && (
        <span className="text-xs text-[var(--ink-2)]">{statusLabel}</span>
      )}
    </div>
  );
}

interface CountBadgeProps {
  count: number;
  max?: number;
  variant?: 'default' | 'gold';
  className?: string;
}

export function CountBadge({ 
  count, 
  max = 99,
  variant = 'default',
  className = '' 
}: CountBadgeProps) {
  if (count <= 0) return null;
  
  const displayCount = count > max ? `${max}+` : count;
  
  return (
    <span className={`badge ${variant === 'gold' ? 'badge-gold' : ''} ${className}`}>
      {displayCount}
    </span>
  );
}
