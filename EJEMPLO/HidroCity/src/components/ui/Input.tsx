import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  action?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, action, className = '', ...props }) => {
  return (
    <div className="flex flex-col space-y-1">
      {(label || action) && (
        <label className="text-xs font-medium text-text-secondary flex justify-between items-center">
          {label && <span>{label}</span>}
          {action && <div>{action}</div>}
        </label>
      )}
      <input
        className={`bg-bg-primary border border-border-subtle rounded-md px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent hover:border-border-subtle transition-colors focus:ring-1 focus:ring-accent/50 ${className}`}
        {...props}
      />
    </div>
  );
};
