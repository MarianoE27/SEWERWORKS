import React from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, HelpCircle, Info, Network } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { ConfirmModal } from '../ui/ConfirmModal';
import { useStore } from '../../store/useStore';

interface RibbonModalsProps {
  isShortcutsOpen: boolean;
  setIsShortcutsOpen: (open: boolean) => void;
  isGuideOpen: boolean;
  setIsGuideOpen: (open: boolean) => void;
  isAboutOpen: boolean;
  setIsAboutOpen: (open: boolean) => void;
  isConfirmNewProjectOpen: boolean;
  setIsConfirmNewProjectOpen: (open: boolean) => void;
}

export function RibbonModals({
  isShortcutsOpen,
  setIsShortcutsOpen,
  isGuideOpen,
  setIsGuideOpen,
  isAboutOpen,
  setIsAboutOpen,
  isConfirmNewProjectOpen,
  setIsConfirmNewProjectOpen
}: RibbonModalsProps) {
  const { t } = useTranslation();
  const { clearProject, addLog } = useStore();

  return (
    <>
      {/* Keyboard Shortcuts Modal */}
      <Modal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
        title={t('shortcuts.title') || "Atajos de Teclado"}
        icon={<Keyboard size={18} className="text-accent" />}
        maxWidth="max-w-sm"
      >
        <div className="space-y-2 text-[11px] text-text-secondary mb-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {[
            ['1, 2, 3, 4, 5', t('shortcuts.tabs') || 'Cambiar Pestañas Principales'],
            ['V', t('shortcuts.select') || 'Seleccionar'],
            ['P', t('shortcuts.pan') || 'Pan (Mover Vista)'],
            ['C', t('shortcuts.manhole') || 'Insertar Cámara'],
            ['T', t('shortcuts.pipe') || 'Insertar Tubería'],
            ['M', t('shortcuts.move') || 'Herramienta Mover'],
            ['D', t('shortcuts.delete') || 'Herramienta Eliminar'],
            ['F', t('shortcuts.zoom_fit') || 'Ajustar Vista (Zoom Fit)'],
            ['B', t('shortcuts.console') || 'Mostrar/Ocultar Consola'],
            ['Enter', t('shortcuts.calculate') || 'Calcular Red Hidráulica'],
            ['Ctrl + S', t('shortcuts.save') || 'Guardar Proyecto JSON'],
            ['Ctrl + Z', t('shortcuts.undo') || 'Deshacer Acción'],
            ['Ctrl + Y', t('shortcuts.redo') || 'Rehacer Acción'],
            ['Supr / Backspace', t('shortcuts.delete_selected') || 'Eliminar Elemento Seleccionado'],
            ['Esc', t('shortcuts.cancel') || 'Cancelar / Cerrar Paneles'],
          ].map(([key, desc]) => (
            <div key={key} className="flex justify-between items-center py-1.5 border-b border-border-subtle/15 hover:bg-bg-hover px-2 rounded transition-colors">
              <span className="font-bold text-accent">{key}</span>
              <span className="text-text-primary text-[10px] font-semibold uppercase tracking-wider">{desc}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-4 mt-4 border-t border-border-subtle/30">
          <button
            type="button"
            className="px-4 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 text-xs font-semibold transition-all cursor-pointer"
            onClick={() => setIsShortcutsOpen(false)}
          >
            {t('shortcuts.ok') || "Entendido"}
          </button>
        </div>
      </Modal>

      {/* Quick Guide Modal */}
      <Modal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        title={t('guide.title') || "Guía Rápida de SewerWorks"}
        icon={<HelpCircle size={18} className="text-accent" />}
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-sm text-text-secondary mb-4">
          <p>{t('guide.desc') || "Siga estos pasos para diseñar su red cloacal:"}</p>
          <ul className="space-y-3 list-none pl-0">
            <li className="flex items-start gap-3">
              <div className="bg-accent/10 text-accent font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 border border-accent/20 text-xs">1</div>
              <div><strong className="text-text-primary block">{t('guide.step1_title') || "Configurar Proyecto"}</strong>{t('guide.step1_desc') || "Use la pestaña 'Inicio' para cargar capas base, DEMs y establecer el sistema de coordenadas."}</div>
            </li>
            <li className="flex items-start gap-3">
              <div className="bg-accent/10 text-accent font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 border border-accent/20 text-xs">2</div>
              <div><strong className="text-text-primary block">{t('guide.step2_title') || "Dibujar Red"}</strong>{t('guide.step2_desc') || "Use la pestaña 'Dibujo' para insertar cámaras y trazar tuberías."}</div>
            </li>
            <li className="flex items-start gap-3">
              <div className="bg-accent/10 text-accent font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 border border-accent/20 text-xs">3</div>
              <div><strong className="text-text-primary block">{t('guide.step3_title') || "Parámetros"}</strong>{t('guide.step3_desc') || "En la pestaña 'Análisis', configure la población, dotación y reglas de diseño."}</div>
            </li>
            <li className="flex items-start gap-3">
              <div className="bg-accent/10 text-accent font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 border border-accent/20 text-xs">4</div>
              <div><strong className="text-text-primary block">{t('guide.step4_title') || "Calcular"}</strong>{t('guide.step4_desc') || "Presione 'Calcular' en 'Análisis' para simular hidráulicamente la red."}</div>
            </li>
            <li className="flex items-start gap-3">
              <div className="bg-accent/10 text-accent font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 border border-accent/20 text-xs">5</div>
              <div><strong className="text-text-primary block">{t('guide.step5_title') || "Resultados"}</strong>{t('guide.step5_desc') || "Analice velocidades, tapadas y genere perfiles longitudinales en la pestaña 'Resultados'."}</div>
            </li>
          </ul>
        </div>
        <div className="flex justify-end pt-4 mt-4 border-t border-border-subtle/30">
          <button
            type="button"
            className="px-4 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 text-xs font-semibold transition-all cursor-pointer"
            onClick={() => setIsGuideOpen(false)}
          >
            {t('guide.start') || "Comenzar a usar"}
          </button>
        </div>
      </Modal>

      {/* About Modal */}
      <Modal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        title={t('about.title') || "Acerca de SewerWorks"}
        icon={<Info size={18} className="text-accent" />}
        maxWidth="max-w-sm"
      >
        <div className="flex flex-col items-center justify-center text-center space-y-4 mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/30 rounded-xl flex items-center justify-center shadow-lg shadow-accent/10">
            <Network size={32} className="text-accent" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-text-primary tracking-tight">SewerWorks Pro</h3>
            <p className="text-xs font-mono text-text-secondary/70 mt-1">Versión 1.0.42</p>
          </div>
          <p className="text-sm text-text-secondary">
            {t('about.desc') || "Desarrollado para ingeniería y diseño óptimo de redes colectoras cloacales. Cumple con directivas ENOHSA y OSN."}
          </p>
          <div className="text-[11px] text-text-secondary/60 pt-4 border-t border-border-subtle/20 w-full">
            <p>{t('about.support') || "Soporte Técnico: soporte@sewerworks.org"}</p>
            <p className="mt-1">Copyright &copy; 2026. Todos los derechos reservados.</p>
          </div>
        </div>
        <div className="flex justify-end pt-4 mt-2 border-t border-border-subtle/30">
          <button
            type="button"
            className="px-4 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 text-xs font-semibold transition-all cursor-pointer"
            onClick={() => setIsAboutOpen(false)}
          >
            {t('about.close') || "Cerrar"}
          </button>
        </div>
      </Modal>

      {/* Confirm New Project Modal */}
      <ConfirmModal
        isOpen={isConfirmNewProjectOpen}
        onClose={() => setIsConfirmNewProjectOpen(false)}
        onConfirm={() => {
          clearProject();
          addLog("[Sistema] Nuevo proyecto inicializado.");
        }}
        title={t('confirm.new.title') || "Nuevo Proyecto"}
        message={t('confirm.new.message') || "¿Seguro que desea limpiar el proyecto? Se perderán todos los cambios no guardados."}
        confirmText={t('confirm.new.confirm') || "Limpiar Proyecto"}
        cancelText={t('confirm.new.cancel') || "Cancelar"}
        variant="danger"
      />
    </>
  );
}

export default RibbonModals;
