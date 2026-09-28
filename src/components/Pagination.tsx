'use client';

interface PaginationProps {
  current: number;
  total: number;
  pageSize?: number;
  onChange: (page: number) => void;
  className?: string;
}

export function Pagination({ 
  current, 
  total, 
  pageSize = 10,
  onChange,
  className = '' 
}: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  
  if (totalPages <= 1) return null;
  
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      if (current > 3) {
        pages.push('ellipsis');
      }
      
      const start = Math.max(2, current - 1);
      const end = Math.min(totalPages - 1, current + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (current < totalPages - 2) {
        pages.push('ellipsis');
      }
      
      pages.push(totalPages);
    }
    
    return pages;
  };
  
  const pages = getPageNumbers();
  
  return (
    <div className={`pagination ${className}`}>
      {/* 上一页 */}
      <button
        className="pagination-item"
        onClick={() => onChange(current - 1)}
        disabled={current === 1}
        aria-label="上一页"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>
      
      {/* 页码 */}
      {pages.map((page, index) => {
        if (page === 'ellipsis') {
          return (
            <span key={`ellipsis-${index}`} className="px-2 text-[var(--ink-3)]">
              ···
            </span>
          );
        }
        
        return (
          <button
            key={page}
            className={`pagination-item ${current === page ? 'active' : ''}`}
            onClick={() => onChange(page)}
          >
            {page}
          </button>
        );
      })}
      
      {/* 下一页 */}
      <button
        className="pagination-item"
        onClick={() => onChange(current + 1)}
        disabled={current === totalPages}
        aria-label="下一页"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>
      
      {/* 总数 */}
      <span className="ml-4 text-xs text-[var(--ink-3)]">
        共 {total} 条
      </span>
    </div>
  );
}
