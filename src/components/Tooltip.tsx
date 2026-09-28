'use client';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ 
  children, 
  content, 
  position = 'top' 
}: TooltipProps) {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[position];
  
  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-[var(--ink)] border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-[var(--ink)] border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-[var(--ink)] border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-[var(--ink)] border-y-transparent border-l-transparent',
  }[position];
  
  return (
    <div className="tooltip relative inline-block">
      {children}
      <div className={`tooltip-content absolute ${positionClasses}`}>
        {content}
        <span 
          className={`absolute w-0 h-0 border-6 border-solid ${arrowClasses}`}
        />
      </div>
    </div>
  );
}
