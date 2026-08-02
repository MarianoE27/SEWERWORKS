import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';
import { Modal } from './ui/Modal';
import { Heart } from 'lucide-react';

export function PatreonModal() {
  const { t } = useTranslation();
  const isPatreonModalOpen = useStore((s: any) => s.isPatreonModalOpen);
  const setIsPatreonModalOpen = useStore((s: any) => s.setIsPatreonModalOpen);
  const [dontShowToday, setDontShowToday] = useState(false);

  if (!isPatreonModalOpen) return null;

  const handleClose = () => {
    if (dontShowToday) {
      localStorage.setItem('sw_patreon_dismissed_date', new Date().toDateString());
    }
    setIsPatreonModalOpen(false);
  };

  const handleSupport = () => {
    window.open('#patreon-a-definir', '_blank');
    handleClose();
  };

  return (
    <Modal
      isOpen={isPatreonModalOpen}
      onClose={handleClose}
      title={t('patreon.title', '¿Te resultó útil SewerWorks?')}
      icon={<Heart size={18} className="text-[#FF424D]" />}
      maxWidth="max-w-md"
    >
      <div className="space-y-6">
        <p className="text-sm text-text-secondary">
          {t('patreon.description', 'Si este software te ahorra tiempo y mejora tu flujo de trabajo, considerá apoyar su desarrollo continuo.')}
        </p>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="dontShowToday"
            checked={dontShowToday}
            onChange={(e) => setDontShowToday(e.target.checked)}
            className="w-4 h-4 rounded border border-border-subtle bg-bg-input text-accent focus:ring-accent focus:ring-offset-bg-surface cursor-pointer"
          />
          <label htmlFor="dontShowToday" className="text-sm text-text-primary select-none cursor-pointer">
            {t('patreon.dismiss_today', 'No mostrar hoy')}
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-border-subtle">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded transition-colors"
          >
            {t('patreon.cta_secondary', 'Continuar trabajando')}
          </button>
          <button
            type="button"
            onClick={handleSupport}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FF5A09] to-[#FF424D] hover:opacity-90 text-white text-sm font-medium rounded transition-opacity shadow shadow-[#FF424D]/20"
          >
            <Heart size={16} className="fill-current" />
            {t('patreon.cta_primary', 'Apoyar en Patreon')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
