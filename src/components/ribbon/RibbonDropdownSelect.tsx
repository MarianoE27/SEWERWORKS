import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export interface RibbonDropdownOption {
  value: string;
  label: string;
}

interface RibbonDropdownSelectProps {
  value: string;
  options: RibbonDropdownOption[];
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export function RibbonDropdownSelect({
  value,
  options,
  onChange,
  className = '',
  disabled = false
}: RibbonDropdownSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        className={`flex items-center justify-between w-full h-full px-1.5 bg-transparent border-0 text-[10px] font-semibold uppercase tracking-wider text-text-primary cursor-pointer focus:outline-none transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:text-accent'}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate pr-2">{selectedOption?.label}</span>
        <ChevronDown size={11} className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-accent' : 'text-text-secondary/70'}`} />
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%+4px)] right-0 min-w-full w-max glass-panel rounded-md py-1 z-50 shadow-xl border border-border-subtle/60 ribbon-dropdown">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`w-full text-left px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider hover:bg-bg-hover transition-colors flex items-center justify-between ${
                value === opt.value ? 'text-accent' : 'text-text-secondary hover:text-text-primary'
              }`}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
            >
              <span className="truncate pr-3">{opt.label}</span>
              {value === opt.value && <div className="w-1 h-1 rounded-full bg-accent shrink-0 ml-1"></div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default RibbonDropdownSelect;
