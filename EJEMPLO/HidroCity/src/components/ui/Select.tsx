import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  optionLabels?: string[];
  className?: string;
  label?: string;
}

export const Select: React.FC<SelectProps> = ({ value, onChange, options, optionLabels, className = '', label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const selectRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const isInsideSelect = selectRef.current?.contains(event.target as Node);
      const isInsidePortal = portalRef.current?.contains(event.target as Node);
      
      if (!isInsideSelect && !isInsidePortal) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Don't close on scroll if we want to allow interaction, 
      // but usually repositioning is needed. For now, let's keep it simple.
      window.addEventListener('resize', () => setIsOpen(false));
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', () => setIsOpen(false));
    };
  }, [isOpen]);

  const toggleOpen = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
    setIsOpen(!isOpen);
  };

  const selectedIndex = options.indexOf(value);
  const displayLabel = selectedIndex >= 0 && optionLabels ? optionLabels[selectedIndex] : value;

  return (
    <div className={`flex flex-col space-y-1 ${className}`} ref={selectRef}>
      {label && <label className="text-xs font-medium text-text-secondary">{label}</label>}
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={toggleOpen}
          title={label || 'Select Dropdown'}
          className="w-full h-[34px] flex items-center justify-between bg-bg-primary border border-border-subtle rounded-md px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 hover:bg-bg-hover transition-all"
        >
          <span className="truncate">{displayLabel || 'Select...'}</span>
          <ChevronDown size={14} className={`text-text-secondary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && createPortal(
          <div 
            ref={portalRef}
            className="fixed z-[9999] bg-bg-surface border border-border-subtle rounded-md shadow-2xl overflow-y-auto py-1 max-h-60"
            // eslint-disable-next-line react/forbid-dom-props
            style={{
              top: coords.top + 4,
              left: coords.left,
              width: coords.width,
            }}
          >
            {options.map((opt, i) => (
              <button
                key={opt}
                type="button"
                className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-accent hover:text-bg-primary transition-colors ${
                  value === opt ? 'text-accent bg-accent/10' : 'text-text-primary'
                }`}
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
              >
                <span className="truncate">{optionLabels ? optionLabels[i] : opt}</span>
                {value === opt && <Check size={14} className="flex-shrink-0" />}
              </button>
            ))}
          </div>,
          document.body
        )}
      </div>
    </div>
  );
};
