import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';
import { 
  X, 
  ExternalLink, 
  Droplets, 
  Calculator, 
  BookOpen, 
  Database, 
  Layers,
  Maximize2
} from 'lucide-react';

import { DesignHydrologyPanel } from './DesignHydrologyPanel';
import { DesignAportesPanel } from './DesignAportesPanel';
import { DesignNormsPanel } from './DesignNormsPanel';
import { DesignCatalogPanel } from './DesignCatalogPanel';
import { DesignCollectorsPanel } from './DesignCollectorsPanel';

const TABS = [
  { id: 'hydrology', icon: Droplets, labelKey: 'layout.hydrology_population', defaultLabel: 'Hidrología' },
  { id: 'aportes', icon: Calculator, labelKey: 'layout.flow_inflows', defaultLabel: 'Aportes' },
  { id: 'norms', icon: BookOpen, labelKey: 'layout.regulations_norms', defaultLabel: 'Normativa' },
  { id: 'catalog', icon: Database, labelKey: 'layout.materials_catalog', defaultLabel: 'Catálogo' },
  { id: 'collectors', icon: Layers, labelKey: 'layout.collectors_classification', defaultLabel: 'Colectores' },
] as const;

export function AnalysisPanel() {
  const { t } = useTranslation();
  const { 
    isAnalysisPanelOpen, 
    setIsAnalysisPanelOpen, 
    activeAnalysisTab, 
    setActiveAnalysisTab,
    analysisMode,
    setAnalysisMode
  } = useStore();

  const [width, setWidth] = useState(480);
  const isResizing = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = window.innerWidth - e.clientX;
      setWidth(Math.max(350, Math.min(newWidth, window.innerWidth * 0.6)));
    };
    
    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = 'default';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  if (!isAnalysisPanelOpen) return null;

  const currentTab = TABS.find(t => t.id === activeAnalysisTab) || TABS[0];
  const Icon = currentTab.icon;

  const renderContent = () => {
    switch (activeAnalysisTab) {
      case 'hydrology': return <DesignHydrologyPanel mode="docked" />;
      case 'aportes': return <DesignAportesPanel mode="docked" />;
      case 'norms': return <DesignNormsPanel mode="docked" />;
      case 'catalog': return <DesignCatalogPanel mode="docked" />;
      case 'collectors': return <DesignCollectorsPanel mode="docked" />;
      default: return null;
    }
  };

  return (
    <div 
      className="shrink-0 flex h-full z-10 relative text-sm border-l border-border-subtle bg-bg-surface"
      style={{ width: `${width}px` }}
    >
      {/* Resizer handle */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-accent/50 z-20 group"
        onMouseDown={() => {
          isResizing.current = true;
          document.body.style.cursor = 'col-resize';
        }}
      />

      {/* Vertical Tabs Strip */}
      <div className="w-12 border-r border-border-subtle bg-bg-primary flex flex-col items-center py-2 shrink-0">
        {TABS.map((tab) => {
          const isActive = activeAnalysisTab === tab.id;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveAnalysisTab(tab.id as any)}
              className={`w-10 h-10 mb-2 rounded-lg flex items-center justify-center transition-all ${
                isActive 
                  ? 'bg-accent/15 text-accent shadow-sm' 
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
              }`}
              title={t(tab.labelKey, tab.defaultLabel)}
            >
              <TabIcon size={18} />
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-bg-surface">
        {/* Header */}
        <div className="h-9 border-b border-border-subtle flex items-center justify-between px-3 shrink-0 bg-bg-primary/50">
          <div className="flex items-center gap-2 text-text-primary text-xs uppercase tracking-wider font-bold">
            <Icon size={15} className="text-accent" />
            <span>{t(currentTab.labelKey, currentTab.defaultLabel)}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setAnalysisMode('floating')}
              className="p-1.5 text-text-secondary hover:text-accent hover:bg-bg-hover rounded transition-colors"
              title={t('analysis.floating', 'Desacoplar a ventana flotante en el navegador')}
            >
              <Maximize2 size={14} />
            </button>
            <button
              onClick={() => setAnalysisMode('popout')}
              className="p-1.5 text-text-secondary hover:text-accent hover:bg-bg-hover rounded transition-colors"
              title={t('analysis.popout', 'Abrir en ventana independiente (Multi-monitor)')}
            >
              <ExternalLink size={14} />
            </button>
            <button
              onClick={() => setIsAnalysisPanelOpen(false)}
              className="p-1.5 text-text-secondary hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
              title={t('common.close', 'Cerrar')}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative">
          {analysisMode === 'popout' || analysisMode === 'floating' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none bg-bg-surface">
              <Maximize2 size={32} className="text-text-secondary/40 mb-3" />
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-2">
                Panel Desacoplado
              </h4>
              <p className="text-[11px] text-text-secondary/80 max-w-[250px] leading-relaxed mb-4">
                {analysisMode === 'popout' 
                  ? 'Los paneles de análisis y diseño se encuentran en una ventana externa para visualización multimonitor.' 
                  : 'Los paneles de análisis se encuentran en una ventana flotante dentro de la aplicación.'}
              </p>
              <button 
                onClick={() => setAnalysisMode('docked')}
                className="px-4 py-2 rounded bg-accent/15 border border-accent/25 hover:bg-accent/25 text-accent text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Acoplar aquí
              </button>
            </div>
          ) : (
            renderContent()
          )}
        </div>
      </div>
    </div>
  );
}
