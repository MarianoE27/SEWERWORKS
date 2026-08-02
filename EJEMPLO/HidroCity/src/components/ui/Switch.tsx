import React from 'react';
import { motion } from 'motion/react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, label }) => {
  return (
    <button 
      type="button"
      className="w-full flex items-center justify-between cursor-pointer group py-1 focus:outline-none"
      onClick={() => onChange(!checked)}
    >
      {label && <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors">{label}</span>}
      <div 
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          checked ? 'bg-indigo-500' : 'bg-slate-700'
        }`}
      >
        <motion.div
          className="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm"
          animate={{ x: checked ? 18 : 4 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </div>
    </button>
  );
};
