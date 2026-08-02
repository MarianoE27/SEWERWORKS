import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { Header } from './Header';
import { Ribbon } from './Ribbon';
import { LeftSidebar } from './LeftSidebar';
import { ConsolePanel } from './ConsolePanel';
import { MapArea } from './MapArea';
import { PropertiesPanel } from './PropertiesPanel';
import { DesignHydrologyPanel } from './DesignHydrologyPanel';
import { DesignAportesPanel } from './DesignAportesPanel';
import { DesignNormsPanel } from './DesignNormsPanel';
import { DesignCatalogPanel } from './DesignCatalogPanel';
import { DesignCollectorsPanel } from './DesignCollectorsPanel';
import { AnalysisPanel } from './AnalysisPanel';
import { Settings, Calculator, Ruler, Layers, Droplets, BookOpen, Database } from 'lucide-react';
import { ResultsTable } from './ResultsTable';
import { LayerPanel } from './LayerPanel';
import { useStore } from '../store/useStore';
import { ReportView } from './ReportView';
import { ProjectionPanel } from './ProjectionPanel';
import { ProjectInfoModal } from './ProjectInfoModal';
import { DraggableWindow } from './ui/DraggableWindow';
import { PopoutWindow } from './ui/PopoutWindow';
import { VerticalSplitPane } from './ui/VerticalSplitPane';
import { ProfileContainer } from './profile/ProfileContainer';
import { ExportModal } from './ExportModal';
import { BarChart4, TrendingUp } from 'lucide-react';
import { useGlobalShortcuts } from '../hooks/useGlobalShortcuts';
import { PatreonModal } from './PatreonModal';
import { SupportModal } from './SupportModal';

export function Layout() {
  const { t } = useTranslation();
  const { 
    selectedElementId, selectedElementType, selectedElementIds, setTool, selectElement, 
    clearMultiSelection, deleteNode, deleteConduit, deleteSelected, theme,
    isReportOpen, setReportOpen, isProjectionPanelOpen, setProjectionPanelOpen,
    isProjectInfoOpen, setProjectInfoOpen, nodes, conduits, parameters,
    isResultsFloatingOpen, resultsMode,
    isBottomPanelOpen,
    setBottomPanelOpen,
    isAnalysisPanelOpen,
    activeAnalysisTab,
    analysisMode,
    triggerZoomToFit,
    calculateNetwork,
    setActiveMainTab,
    measureToolActive,
    setMeasureToolActive,
    isProfileFloatingOpen,
    profileMode,
    isRibbonOpen
  } = useStore() as any;

  useGlobalShortcuts();

  return (
    <div className={`flex flex-col h-screen w-full bg-background text-foreground overflow-hidden font-sans ${theme === 'dark' ? 'dark' : ''}`}>
      <Header />
      <AnimatePresence initial={false}>
        {isRibbonOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
            animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
            exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="shrink-0 z-40 w-full"
          >
            <Ribbon />
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />
        
        <div className="flex flex-col flex-1 overflow-hidden relative">
          <div className="flex flex-1 overflow-hidden relative">
            <MapArea />
            {/* Floating configuration panels remain here */}
            {isResultsFloatingOpen && resultsMode === 'floating' && (
              <DraggableWindow 
                isOpen={true} 
                onClose={() => useStore.getState().setIsResultsFloatingOpen(false)}
                title={t('layout.results_table', 'Resultados de Cálculo')}
                icon={<BarChart4 size={14} className="text-accent" />}
                initialWidth={900}
                initialHeight={500}
                minWidth={600}
                minHeight={300}
              >
                <ResultsTable />
              </DraggableWindow>
            )}

            {isResultsFloatingOpen && resultsMode === 'popout' && (
              <PopoutWindow 
                title={t('layout.results_table', 'Resultados de Cálculo')}
                onClose={() => {
                  useStore.getState().setResultsMode('docked');
                  useStore.getState().setIsResultsFloatingOpen(false);
                  useStore.getState().setBottomPanelOpen(true);
                  useStore.getState().setActiveBottomTab('results');
                }}
              >
                <ResultsTable />
              </PopoutWindow>
            )}

            {isProfileFloatingOpen && profileMode === 'floating' && (
              <DraggableWindow 
                isOpen={true} 
                onClose={() => useStore.getState().setIsProfileFloatingOpen(false)}
                title={t('layout.profile_view', 'Perfil Longitudinal')}
                icon={<TrendingUp size={14} className="text-accent" />}
                initialWidth={1000}
                initialHeight={500}
                minWidth={600}
                minHeight={400}
              >
                <ProfileContainer />
              </DraggableWindow>
            )}

            {isProfileFloatingOpen && profileMode === 'popout' && (
              <PopoutWindow 
                title={t('layout.profile_view', 'Perfil Longitudinal')}
                onClose={() => {
                  useStore.getState().setProfileMode('docked');
                  useStore.getState().setIsProfileFloatingOpen(false);
                  useStore.getState().setBottomPanelOpen(true);
                  useStore.getState().setActiveBottomTab('profile');
                }}
              >
                <ProfileContainer />
              </PopoutWindow>
            )}

            {isAnalysisPanelOpen && analysisMode === 'floating' && (
              <DraggableWindow 
                isOpen={true} 
                onClose={() => useStore.getState().setIsAnalysisPanelOpen(false)}
                title={t(`layout.analysis_${activeAnalysisTab}`, 'Análisis')}
                icon={<Settings size={14} className="text-accent" />}
                initialWidth={900}
                initialHeight={550}
                minWidth={600}
                minHeight={400}
              >
                {activeAnalysisTab === 'hydrology' && <DesignHydrologyPanel mode="floating" />}
                {activeAnalysisTab === 'aportes' && <DesignAportesPanel mode="floating" />}
                {activeAnalysisTab === 'norms' && <DesignNormsPanel mode="floating" />}
                {activeAnalysisTab === 'catalog' && <DesignCatalogPanel mode="floating" />}
                {activeAnalysisTab === 'collectors' && <DesignCollectorsPanel mode="floating" />}
              </DraggableWindow>
            )}

            {isAnalysisPanelOpen && analysisMode === 'popout' && (
              <PopoutWindow 
                title={t(`layout.analysis_${activeAnalysisTab}`, 'Análisis')}
                onClose={() => {
                  useStore.getState().setAnalysisMode('docked');
                }}
              >
                {activeAnalysisTab === 'hydrology' && <DesignHydrologyPanel mode="popout" />}
                {activeAnalysisTab === 'aportes' && <DesignAportesPanel mode="popout" />}
                {activeAnalysisTab === 'norms' && <DesignNormsPanel mode="popout" />}
                {activeAnalysisTab === 'catalog' && <DesignCatalogPanel mode="popout" />}
                {activeAnalysisTab === 'collectors' && <DesignCollectorsPanel mode="popout" />}
              </PopoutWindow>
            )}

            {(isAnalysisPanelOpen || selectedElementId || selectedElementIds.length > 1) && (
              <div className="flex flex-col h-full z-10 relative shrink-0 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.1)]">
                {isAnalysisPanelOpen && !(selectedElementId || selectedElementIds.length > 1) && (
                  <div className="flex flex-1 min-h-0 overflow-hidden">
                    <AnalysisPanel />
                  </div>
                )}
                {!isAnalysisPanelOpen && (selectedElementId || selectedElementIds.length > 1) && (
                  <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                    <PropertiesPanel isStacked={false} />
                  </div>
                )}
                {isAnalysisPanelOpen && (selectedElementId || selectedElementIds.length > 1) && (
                  <VerticalSplitPane
                    initialRatio={0.6}
                    minTopHeight={160}
                    minBottomHeight={140}
                    top={<AnalysisPanel />}
                    bottom={<PropertiesPanel isStacked={true} />}
                  />
                )}
              </div>
            )}

            <LayerPanel />
            
            {isReportOpen && (
              <ReportView
                nodes={nodes}
                conduits={conduits}
                parameters={parameters}
                onClose={() => setReportOpen(false)}
              />
            )}
            
            <ProjectionPanel isOpen={isProjectionPanelOpen} onClose={() => setProjectionPanelOpen(false)} />
            {isProjectInfoOpen && <ProjectInfoModal onClose={() => setProjectInfoOpen(false)} />}
            <ExportModal />
            <PatreonModal />
            <SupportModal />
          </div>
          <AnimatePresence>
            {isBottomPanelOpen && <ConsolePanel />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
