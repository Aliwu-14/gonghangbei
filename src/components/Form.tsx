'use client';

import { forwardRef } from 'react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  error?: string;
  success?: string;
  helpText?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  success,
  helpText,
  prefix,
  suffix,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;
  
  const getStateClass = () => {
    if (error) return 'input-error';
    if (success) return 'input-success';
    return '';
  };

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
          {props.required && <span className="text-[var(--danger)] ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {prefix && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-3)]">
            {prefix}
          </div>
        )}
        
        <input
          ref={ref}
          id={inputId}
          className={`input ${getStateClass()} ${prefix ? 'pl-9' : ''} ${suffix ? 'pr-9' : ''} ${className}`}
          {...props}
        />
        
        {suffix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-3)]">
            {suffix}
          </div>
        )}
      </div>
      
      {error && (
        <div className="field-error">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <span>{error}</span>
        </div>
      )}
      
      {success && !error && (
        <div className="field-success">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <span>{success}</span>
        </div>
      )}
      
      {helpText && !error && !success && (
        <div className="text-xs text-[var(--ink-3)]">{helpText}</div>
      )}
    </div>
  );
});

Input.displayName = 'Input';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  error,
  options,
  placeholder,
  className = '',
  id,
  ...props
}, ref) => {
  const selectId = id || `select-${Math.random().toString(36).slice(2, 9)}`;
  
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={selectId} className="label">
          {label}
          {props.required && <span className="text-[var(--danger)] ml-1">*</span>}
        </label>
      )}
      
      <select
        ref={ref}
        id={selectId}
        className={`input ${error ? 'input-error' : ''} ${className}`}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      
      {error && (
        <div className="field-error">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
});

Select.displayName = 'Select';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  error,
  helpText,
  className = '',
  id,
  ...props
}, ref) => {
  const textareaId = id || `textarea-${Math.random().toString(36).slice(2, 9)}`;
  
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={textareaId} className="label">
          {label}
          {props.required && <span className="text-[var(--danger)] ml-1">*</span>}
        </label>
      )}
      
      <textarea
        ref={ref}
        id={textareaId}
        className={`input min-h-[100px] resize-y ${error ? 'input-error' : ''} ${className}`}
        {...props}
      />
      
      {error && (
        <div className="field-error">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <span>{error}</span>
        </div>
      )}
      
      {helpText && !error && (
        <div className="text-xs text-[var(--ink-3)]">{helpText}</div>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  description?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({
  label,
  description,
  className = '',
  id,
  ...props
}, ref) => {
  const checkboxId = id || `checkbox-${Math.random().toString(36).slice(2, 9)}`;
  
  return (
    <label htmlFor={checkboxId} className={`flex items-start gap-3 cursor-pointer group ${className}`}>
      <input
        ref={ref}
        type="checkbox"
        id={checkboxId}
        className="w-4 h-4 mt-0.5 accent-[var(--brand-red)] cursor-pointer"
        {...props}
      />
      <div className="flex-1">
        <span className="text-sm text-[var(--ink)] group-hover:text-[var(--brand-red)] transition-colors">
          {label}
        </span>
        {description && (
          <p className="text-xs text-[var(--ink-3)] mt-0.5">{description}</p>
        )}
      </div>
    </label>
  );
});

Checkbox.displayName = 'Checkbox';

interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  description?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(({
  label,
  description,
  className = '',
  id,
  ...props
}, ref) => {
  const radioId = id || `radio-${Math.random().toString(36).slice(2, 9)}`;
  
  return (
    <label htmlFor={radioId} className={`flex items-start gap-3 cursor-pointer group ${className}`}>
      <input
        ref={ref}
        type="radio"
        id={radioId}
        className="w-4 h-4 mt-0.5 accent-[var(--brand-red)] cursor-pointer"
        {...props}
      />
      <div className="flex-1">
        <span className="text-sm text-[var(--ink)] group-hover:text-[var(--brand-red)] transition-colors">
          {label}
        </span>
        {description && (
          <p className="text-xs text-[var(--ink-3)] mt-0.5">{description}</p>
        )}
      </div>
    </label>
  );
});

Radio.displayName = 'Radio';
