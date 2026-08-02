import React from 'react';
import { AlertTriangle, CheckCircle, Trash2, Info } from 'lucide-react';
import { Modal } from './Modal';

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'warning'
}: ConfirmModalProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <Trash2 size={18} className="text-red-500" />,
          button: 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20'
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={18} className="text-yellow-500" />,
          button: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/20'
        };
      case 'success':
        return {
          icon: <CheckCircle size={18} className="text-green-500" />,
          button: 'bg-green-500/10 border-green-500/30 text-green-500 hover:bg-green-500/20'
        };
      case 'info':
      default:
        return {
          icon: <Info size={18} className="text-accent" />,
          button: 'bg-accent/10 border-accent/30 text-accent hover:bg-accent/20'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={styles.icon}
      maxWidth="max-w-sm"
    >
      <div className="text-sm text-text-secondary leading-relaxed mb-6">
        {message}
      </div>

      <div className="flex justify-end gap-2.5 pt-4 border-t border-border-subtle/50 font-semibold">
        <button
          type="button"
          className="px-4 py-2 rounded-lg text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-all duration-200 text-xs border border-transparent hover:border-border-subtle cursor-pointer"
          onClick={onClose}
        >
          {cancelText}
        </button>
        <button
          type="button"
          className={`px-4 py-2 rounded-lg border transition-all duration-200 text-xs font-bold cursor-pointer ${styles.button}`}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
