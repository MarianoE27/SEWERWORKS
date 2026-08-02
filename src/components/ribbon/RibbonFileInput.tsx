import React from 'react';

interface RibbonFileInputProps {
  icon: React.ComponentType<{ size: number; className?: string }>;
  label: string;
  accept: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  multiple?: boolean;
}

export function RibbonFileInput({
  icon: Icon,
  label,
  accept,
  onChange,
  multiple = false
}: RibbonFileInputProps) {
  
  const baseClass = `group flex flex-row items-center space-x-1.5 px-2.5 py-1 bg-transparent hover:bg-bg-hover rounded text-[10px] uppercase font-semibold tracking-wider text-text-secondary hover:text-text-primary transition-all duration-150 ease-out cursor-pointer h-7 select-none whitespace-nowrap`;

  return (
    <label className={baseClass} title={label}>
      <Icon size={14} className={`text-inherit transition-transform duration-150 group-hover:scale-105`} />
      <span className="text-[10px] font-medium leading-none select-none min-w-0 truncate">
        {label}
      </span>
      <input type="file" accept={accept} multiple={multiple} className="hidden" onChange={onChange} />
    </label>
  );
}

export default RibbonFileInput;
