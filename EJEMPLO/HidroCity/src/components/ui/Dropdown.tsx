import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({ trigger, children, align = 'left', className = '' }) => {
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
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer h-full flex items-center">
        {trigger}
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`absolute z-[2000] mt-1 w-48 bg-bg-surface border border-border-subtle rounded-md shadow-xl py-1 ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
            onClick={(e) => {
              if (!(e.target as HTMLElement).closest('button:disabled')) {
                setIsOpen(false);
              }
            }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface DropdownItemProps {
  icon?: ReactNode;
  label: string;
  shortcut?: string;
  checked?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export const DropdownItem: React.FC<DropdownItemProps> = ({ icon, label, shortcut, checked, disabled, onClick, className = '' }) => {
  return (
    <button
      className={`w-full flex items-center justify-between px-4 py-1.5 text-left text-sm transition-colors group ${
        disabled 
          ? 'opacity-50 cursor-not-allowed text-text-secondary' 
          : 'hover:bg-accent hover:text-white text-text-primary'
      } ${className}`}
      onClick={(e) => {
        if (disabled) {
          e.stopPropagation();
          return;
        }
        onClick?.();
      }}
      disabled={disabled}
    >
      <div className="flex items-center gap-2">
        {checked !== undefined ? (
          <div className="w-4 flex justify-center">
            {checked && <div className="w-1.5 h-1.5 rounded-full bg-current" />}
          </div>
        ) : (
          <div className="w-4 flex justify-center text-text-secondary group-hover:text-white transition-colors">
            {icon}
          </div>
        )}
        <span>{label}</span>
      </div>
      {shortcut && <span className="text-text-secondary text-[10px] group-hover:text-accent transition-colors">{shortcut}</span>}
    </button>
  );
};

export const DropdownSeparator: React.FC = () => (
  <div className="h-px bg-bg-hover my-1" />
);
