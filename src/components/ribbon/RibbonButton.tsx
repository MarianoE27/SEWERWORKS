import React from 'react';

interface RibbonButtonProps {
  icon: React.ComponentType<{ size: number; className?: string }>;
  label: string;
  onClick: () => void;
  isActive?: boolean;
  isDanger?: boolean;
  disabled?: boolean;
  subtitle?: string;
}

export function RibbonButton({
  icon: Icon,
  label,
  onClick,
  isActive = false,
  isDanger = false,
  disabled = false,
  subtitle
}: RibbonButtonProps) {
  
  const baseClass = `group flex flex-row items-center space-x-1.5 px-2.5 py-1 rounded transition-all duration-150 ease-out cursor-pointer h-7 text-[10px] uppercase font-semibold tracking-wider focus:outline-none relative select-none whitespace-nowrap`;
  
  let stateClass = '';
  if (disabled) {
    stateClass = 'opacity-35 cursor-not-allowed text-text-secondary bg-transparent';
  } else if (isDanger) {
    stateClass = 'text-red-400 hover:bg-red-500/10 hover:text-red-300';
  } else if (isActive) {
    stateClass = 'bg-accent/10 border border-accent/20 text-accent font-bold';
  } else {
    stateClass = 'bg-transparent hover:bg-bg-hover text-text-secondary hover:text-text-primary';
  }

  return (
    <button
      type="button"
      className={`${baseClass} ${stateClass}`}
      onClick={onClick}
      disabled={disabled}
      title={subtitle || label}
    >
      <Icon size={14} className={`text-inherit transition-transform duration-150 ${!disabled && 'group-hover:scale-105'}`} />
      <span className="text-[10px] font-medium leading-none select-none min-w-0 truncate">
        {label}
      </span>
      {isActive && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2px] rounded-full bg-accent"></div>
      )}
    </button>
  );
}
export default RibbonButton;
