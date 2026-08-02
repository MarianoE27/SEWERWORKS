import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { useTranslation } from 'react-i18next';
import { Modal } from './ui/Modal';
import { Send, CheckCircle, AlertCircle, Loader } from 'lucide-react';

export function SupportModal() {
  const { t } = useTranslation();
  const store = useStore();
  const s = store as any;
  
  const isOpen = s.isSupportModalOpen;
  const onClose = () => s.setIsSupportModalOpen?.(false);
  const supportModalType = s.supportModalType || 'bug';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [reportType, setReportType] = useState(supportModalType);
  const [message, setMessage] = useState('');
  const [includeLogs, setIncludeLogs] = useState(true);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // React to changes in supportModalType to prefill the dropdown
  React.useEffect(() => {
    if (isOpen) {
      setReportType(s.supportModalType || 'bug');
    }
  }, [isOpen, s.supportModalType]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    const projectInfo = {
      projectName: s.parameters?.projectName,
      crs: s.crs,
      nodeCount: s.nodes ? Object.keys(s.nodes).length : 0,
      conduitCount: s.conduits ? Object.keys(s.conduits).length : 0,
    };

    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          type: reportType,
          message,
          logs: includeLogs ? s.consoleLogs.slice(-50) : undefined,
          projectInfo,
          userAgent: navigator.userAgent,
          appVersion: '1.0.42',
          calcErrors: includeLogs ? s.consoleLogs.filter((l: string) => l.includes('[Error]')).slice(-10) : []
        }),
      });

      if (response.ok) {
        setStatus('success');
        setTimeout(() => {
          onClose();
          setStatus('idle');
          setMessage('');
        }, 3000);
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={t('support.title', 'Contacto y Soporte')}
      icon={<AlertCircle size={18} className="text-[#FF5A09]" />}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {status === 'success' ? (
          <div className="flex flex-col items-center py-8 text-green-500">
            <CheckCircle size={48} className="mb-4" />
            <p>{t('support.success', '¡Reporte enviado exitosamente!')}</p>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                {t('support.name_label', 'Nombre')}
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('support.name_placeholder', 'Tu nombre')}
                className="w-full bg-bg-primary/50 border border-border-subtle focus:border-accent rounded-lg px-3 py-2 text-xs text-text-primary outline-none transition-colors"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                {t('support.email_label', 'Email de contacto')}
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={t('support.email_placeholder', 'tu@email.com')}
                className="w-full bg-bg-primary/50 border border-border-subtle focus:border-accent rounded-lg px-3 py-2 text-xs text-text-primary outline-none transition-colors"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                {t('support.type_label', 'Tipo de reporte')}
              </label>
              <select
                value={reportType}
                onChange={e => setReportType(e.target.value)}
                className="w-full bg-bg-primary/50 border border-border-subtle focus:border-accent rounded-lg px-3 py-2 text-xs text-text-primary outline-none transition-colors"
              >
                <option value="bug">{t('support.type_bug', 'Reporte de Bug')}</option>
                <option value="suggestion">{t('support.type_suggestion', 'Sugerencia')}</option>
                <option value="contact">{t('support.type_contact', 'Consulta General')}</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                {t('support.message_label', 'Descripción')}
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={t('support.message_placeholder', 'Describí el problema o tu consulta en detalle...')}
                className="w-full bg-bg-primary/50 border border-border-subtle focus:border-accent rounded-lg px-3 py-2 text-xs text-text-primary outline-none transition-colors min-h-[100px] resize-y"
                required
                minLength={10}
              />
            </div>
            
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="includeLogs"
                checked={includeLogs}
                onChange={e => setIncludeLogs(e.target.checked)}
                className="w-4 h-4 rounded border-border-subtle bg-bg-primary/50 text-accent focus:ring-accent/50 cursor-pointer"
              />
              <label htmlFor="includeLogs" className="text-xs text-text-secondary cursor-pointer select-none">
                {t('support.include_logs', 'Incluir logs de la aplicación (últimos 50)')}
              </label>
            </div>

            {status === 'error' && (
              <div className="text-red-500 text-xs mt-2 bg-red-500/10 p-2 rounded border border-red-500/20">
                {t('support.error', 'Error al enviar. Intente de nuevo.')}
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-4 border-t border-border-subtle/50 mt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-all duration-200 text-xs border border-transparent cursor-pointer"
                disabled={status === 'loading'}
              >
                {t('support.cancel', 'Cancelar')}
              </button>
              <button
                type="submit"
                disabled={status === 'loading'}
                className="px-4 py-2 rounded-lg bg-[#FF5A09] text-white hover:bg-[#ff6a20] transition-all duration-200 text-xs flex items-center gap-1.5 font-bold cursor-pointer disabled:opacity-50"
              >
                {status === 'loading' ? <Loader size={13} className="animate-spin" /> : <Send size={13} />}
                {status === 'loading' ? t('support.submitting', 'Enviando...') : t('support.submit', 'Enviar Reporte')}
              </button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
