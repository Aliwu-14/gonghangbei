'use client';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'gold' | 'outline';
  className?: string;
}

export function Avatar({ name, size = 'md', variant = 'default', className = '' }: AvatarProps) {
  const sizeClasses = {
    sm: 'avatar-sm',
    md: 'avatar-md',
    lg: 'avatar-lg',
  };
  
  const variantClasses = {
    default: '',
    gold: 'avatar-gold',
    outline: 'avatar-outline',
  };
  
  // 获取名字的首字符
  const initial = name.charAt(0).toUpperCase();
  
  return (
    <div className={`avatar ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}>
      {initial}
    </div>
  );
}

interface AvatarGroupProps {
  avatars: { name: string; src?: string }[];
  max?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function AvatarGroup({ avatars, max = 4, size = 'sm' }: AvatarGroupProps) {
  const displayed = avatars.slice(0, max);
  const remaining = avatars.length - max;
  
  return (
    <div className="flex items-center -space-x-2">
      {displayed.map((avatar, index) => (
        <div 
          key={index} 
          className="ring-2 ring-white"
          title={avatar.name}
        >
          {avatar.src ? (
            <img 
              src={avatar.src} 
              alt={avatar.name}
              className={`avatar ${size === 'sm' ? 'avatar-sm' : size === 'lg' ? 'avatar-lg' : 'avatar-md'}`}
            />
          ) : (
            <Avatar name={avatar.name} size={size} />
          )}
        </div>
      ))}
      
      {remaining > 0 && (
        <div 
          className={`avatar ${size === 'sm' ? 'avatar-sm' : size === 'lg' ? 'avatar-lg' : 'avatar-md'} bg-[var(--ink-3)]`}
          title={`还有 ${remaining} 位`}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
