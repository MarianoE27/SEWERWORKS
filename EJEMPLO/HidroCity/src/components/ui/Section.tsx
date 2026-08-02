import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface SectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const Section: React.FC<SectionProps> = ({ title, defaultOpen = true, children, icon, action }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className={`border border-border-subtle rounded-md mb-3 bg-bg-surface/50 ${isOpen ? 'overflow-visible' : 'overflow-hidden'}`}>
      <div 
        className="w-full flex items-center justify-between px-3 py-2.5 bg-bg-primary/80 hover:bg-bg-hover text-xs font-semibold text-text-primary uppercase tracking-wider transition-colors group cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-text-secondary group-hover:text-text-primary transition-colors">{icon}</span>}
          <span>{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {action && <div onClick={e => e.stopPropagation()}>{action}</div>}
          <ChevronDown size={14} className={`text-text-secondary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>
      <div 
        className={`grid transition-all duration-200 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className={isOpen ? 'overflow-visible' : 'overflow-hidden'}>
          <div className="p-3 space-y-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
