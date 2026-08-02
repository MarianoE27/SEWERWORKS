import React, { useState, useEffect } from 'react';
import { useStore } from './store';
import { Ribbon } from './components/Ribbon';
import { Sidebar } from './components/Sidebar';
import { PropertiesPanel } from './components/PropertiesPanel';
import { MapView } from './components/Map';
import { BottomPanel } from './components/BottomPanel';
import { Timeline } from './components/Timeline';
import { ProfileViewer } from './components/ProfileViewer';
import { ReportGenerator } from './components/ReportGenerator';
import { ResultsViewer } from './components/ResultsViewer';
import { RainfallManager } from './components/RainfallManager';
import { SimulationSettingsModal } from './components/SimulationSettingsModal';
import { SplashScreen } from './components/SplashScreen';
import { ScenariosPanel } from './components/ScenariosPanel';
import { CommandPalette } from './components/CommandPalette';
import { ProjectionPanel } from './components/ProjectionPanel';
import { LayerManager } from './components/LayerManager';
import { CNLookupModal } from './components/CNLookupModal';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const { theme, isSidebarCollapsed, isBottomPanelOpen, selectedElementId, isRainfallManagerOpen, setRainfallManagerOpen, isSimulationSettingsOpen, setSimulationSettingsOpen, isScenariosOpen, isProjectionPanelOpen, setProjectionPanelOpen, isCNLookupOpen, setCNLookupOpen, applyGlobalCN, undo, redo } = useStore();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid triggering when user is typing in inputs
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const showProperties = !!selectedElementId;

  return (
    <div className="flex flex-col h-screen w-full bg-bg-primary overflow-hidden font-sans relative transition-colors">
      <CommandPalette />
      <AnimatePresence>
        {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      </AnimatePresence>
      
      <Ribbon />
      
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />
        
        <main className="flex flex-col flex-1 overflow-hidden relative min-w-0">
          <div className="flex-1 relative">
            <MapView />
            <Timeline />
            <ProfileViewer />
            <ReportGenerator />
            <ResultsViewer />
          </div>
          
          <AnimatePresence>
            {isBottomPanelOpen && (
              <motion.div 
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <BottomPanel />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <AnimatePresence>
          {showProperties && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="overflow-hidden border-l border-slate-800/50"
            >
              <PropertiesPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isRainfallManagerOpen && (
          <RainfallManager onClose={() => setRainfallManagerOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSimulationSettingsOpen && (
          <SimulationSettingsModal 
            isOpen={isSimulationSettingsOpen} 
            onClose={() => setSimulationSettingsOpen(false)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isScenariosOpen && <ScenariosPanel />}
      </AnimatePresence>

      <ProjectionPanel isOpen={isProjectionPanelOpen} onClose={() => setProjectionPanelOpen(false)} />
      <LayerManager />
      <AnimatePresence>
        {isCNLookupOpen && (
          <CNLookupModal onClose={() => setCNLookupOpen(false)} onApply={applyGlobalCN} />
        )}
      </AnimatePresence>
    </div>
  );
}
