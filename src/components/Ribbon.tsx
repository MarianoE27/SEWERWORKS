import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { useTranslation } from 'react-i18next';
import { RibbonInicio } from './ribbon/tabs/RibbonInicio';
import { RibbonDibujo } from './ribbon/tabs/RibbonDibujo';
import { RibbonAnalisis } from './ribbon/tabs/RibbonAnalisis';
import { RibbonResultados } from './ribbon/tabs/RibbonResultados';
import { RibbonAyuda } from './ribbon/tabs/RibbonAyuda';
import { RibbonModals } from './ribbon/RibbonModals';

export function Ribbon() {
  const { t } = useTranslation();
  const { activeMainTab } = useStore();

  // Modals state
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isConfirmNewProjectOpen, setIsConfirmNewProjectOpen] = useState(false);

  const containerClass = "bg-bg-primary/95 flex items-center px-4 select-none shrink-0 relative z-40 backdrop-blur-md w-full h-[40px] ribbon-shadow ribbon-bar ribbon-animate-in";

  const renderActiveTab = () => {
    switch (activeMainTab) {
      case 'inicio':
        return <RibbonInicio setIsConfirmNewProjectOpen={setIsConfirmNewProjectOpen} />;
      case 'dibujo':
        return <RibbonDibujo />;
      case 'analisis':
        return <RibbonAnalisis />;
      case 'resultados':
        return <RibbonResultados />;
      case 'ayuda':
        return (
          <RibbonAyuda
            setIsShortcutsOpen={setIsShortcutsOpen}
            setIsGuideOpen={setIsGuideOpen}
            setIsAboutOpen={setIsAboutOpen}
          />
        );
      default:
        return (
          <span className="text-[10px] uppercase font-semibold tracking-wider text-text-secondary/70">
            {t('ribbon.fallback') || "Selecciona una pestaña superior para ver las herramientas."}
          </span>
        );
    }
  };

  return (
    <div className={containerClass}>
      {renderActiveTab()}

      {/* Modals rendering */}
      <RibbonModals
        isShortcutsOpen={isShortcutsOpen}
        setIsShortcutsOpen={setIsShortcutsOpen}
        isGuideOpen={isGuideOpen}
        setIsGuideOpen={setIsGuideOpen}
        isAboutOpen={isAboutOpen}
        setIsAboutOpen={setIsAboutOpen}
        isConfirmNewProjectOpen={isConfirmNewProjectOpen}
        setIsConfirmNewProjectOpen={setIsConfirmNewProjectOpen}
      />
    </div>
  );
}

export default Ribbon;
