'use client';

import { useState, useRef, useEffect } from 'react';

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
}

export function Dropdown({ trigger, children, align = 'left' }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  return (
    <div className="dropdown relative inline-block" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      <div className={`dropdown-menu ${align === 'right' ? 'dropdown-menu-right' : ''} ${isOpen ? 'opacity-100 visible -translate-y-1' : 'opacity-0 invisible translate-y-0'}`}>
        {children}
      </div>
    </div>
  );
}

interface DropdownItemProps {
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export function DropdownItem({ 
  icon, 
  children, 
  onClick,
  danger = false,
  disabled = false 
}: DropdownItemProps) {
  return (
    <div 
      className={`dropdown-item ${danger ? 'text-[var(--danger)]' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={disabled ? undefined : onClick}
    >
      {icon && <span className="w-4 h-4">{icon}</span>}
      <span>{children}</span>
    </div>
  );
}

export function DropdownDivider() {
  return <div className="dropdown-divider" />;
}
