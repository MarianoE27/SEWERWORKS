import React, { ReactNode } from 'react';

interface RibbonGroupProps {
  label: string;
  children: ReactNode;
}

export function RibbonGroup({ label, children }: RibbonGroupProps) {
  return (
    <div className="flex items-center px-3 h-full ribbon-group-separator relative" title={label}>
      <div className="flex items-center justify-center gap-1.5 h-full">
        {children}
      </div>
    </div>
  );
}

export default RibbonGroup;
