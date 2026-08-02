import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, Lightbulb, X, ChevronRight, Trash2, SlidersHorizontal, BarChart4, TrendingUp, Maximize2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useTranslation } from 'react-i18next';
import { ResultsTable } from './ResultsTable';
import { ProfileContainer } from './profile/ProfileContainer';

const TAB_CLASS = 'flex items-center px-4 h-full cursor-pointer text-xs font-semibold transition-colors';

function getLogType(log: string): 'error' | 'warning' | 'calc' | 'info' {
  const normalized = log.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (normalized.includes('error') || normalized.includes('fallo') || normalized.includes('erroneo')) {
    return 'error';
  }
  if (normalized.includes('advertencia') || normalized.includes('aviso') || normalized.includes('problema')) {
    return 'warning';
  }
  if (normalized.includes('calculo') || normalized.includes('cota') || normalized.includes('validacion') || normalized.includes('simulacion') || normalized.includes('recalculation') || normalized.includes('perfil')) {
    return 'calc';
  }
  return 'info';
}

function getLogColorClass(type: 'error' | 'warning' | 'calc' | 'info'): string {
  switch (type) {
    case 'error':
      return 'text-red-600 dark:text-red-400 font-semibold';
    case 'warning':
      return 'text-amber-600 dark:text-yellow-400';
    case 'calc':
      return 'text-emerald-600 dark:text-emerald-400 font-semibold';
    default:
      return 'text-text-secondary';
  }
}

export function ConsolePanel() {
  const { t } = useTranslation();
  const { setBottomPanelOpen, consoleLogs, activeBottomTab, setActiveBottomTab, resultsMode, setResultsMode, setIsResultsFloatingOpen, profileMode, setProfileMode, setIsProfileFloatingOpen } = useStore();
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warning' | 'calc' | 'info'>('all');
  const [height, setHeight] = useState(280);
  const isResizing = useRef(false);
  const [advisorAlert, setAdvisorAlert] = useState<string | null>(null);

  const handleRunAIAdvisor = async () => {
    setAdvisorAlert(null);
    useStore.getState().addLog('[AI Advisor] Conectando con servidor...');
    
    try {
      const response = await fetch('/api/advisor', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error desconocido del servidor');
      }
      
      const msg = data.message || 'Conexión iniciada correctamente.';
      useStore.getState().addLog(`[AI Advisor] ${msg}`);
    } catch (err: any) {
      const msg = err.message || 'La asistencia IA requiere configuración del servidor o una API Key válida.';
      setAdvisorAlert(msg);
      useStore.getState().addLog(`[AI Advisor] Error: ${msg}`);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      // Calculate height from bottom of window
      const newHeight = window.innerHeight - e.clientY;
      setHeight(Math.max(150, Math.min(newHeight, window.innerHeight - 150)));
    };
    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = '';
      }
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const startResizing = () => {
    isResizing.current = true;
    document.body.style.cursor = 'row-resize';
  };

  const handleClear = () => {
    useStore.setState({ consoleLogs: [] });
  };

  const counts = useMemo(() => {
    const c = { all: consoleLogs.length, error: 0, warning: 0, calc: 0, info: 0 };
    consoleLogs.forEach(log => {
      c[getLogType(log)]++;
    });
    return c;
  }, [consoleLogs]);

  const filteredLogs = useMemo(() => {
    if (logFilter === 'all') return consoleLogs;
    return consoleLogs.filter(log => {
      const type = getLogType(log);
      return type === logFilter;
    });
  }, [consoleLogs, logFilter]);

  return (
    <motion.div 
      initial={{ height: 0, opacity: 0 }}
      animate={{ height, opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="glass-panel border-t flex flex-col shrink-0 z-40 overflow-hidden relative"
      style={{ height: `${height}px` }}
    >
      {/* Resizer Handle */}
      <div 
        className="absolute top-0 left-0 right-0 h-1 cursor-row-resize hover:bg-accent z-50 transition-colors"
        onMouseDown={startResizing}
      />

      {/* Header Tabs */}
      <div className="flex items-center h-10 border-b border-border-subtle px-2 select-none bg-bg-primary/50 shrink-0 mt-1">
        <button
          type="button"
          className={`${TAB_CLASS} gap-2 ${
            activeBottomTab === 'console'
              ? 'text-accent border-b-2 border-accent font-semibold'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
          }`}
          onClick={() => setActiveBottomTab('console')}
          title={t('console.view_log', 'Ver consola de registro')}
        >
          <Terminal size={14} />
          {t('console.title', 'CONSOLA')}
        </button>

        <button
          type="button"
          className={`${TAB_CLASS} gap-2 ${
            activeBottomTab === 'advisor'
              ? 'text-accent border-b-2 border-accent font-semibold'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
          }`}
          onClick={() => setActiveBottomTab('advisor')}
          title={t('console.view_advisor', 'Ver asistente de diseño')}
        >
          <Lightbulb size={14} />
          {t('console.advisor_title', 'AI ADVISOR')}
        </button>

        <button
          type="button"
          className={`${TAB_CLASS} gap-2 ${
            activeBottomTab === 'results'
              ? 'text-accent border-b-2 border-accent font-semibold'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
          }`}
          onClick={() => setActiveBottomTab('results')}
        >
          <BarChart4 size={14} />
          {t('console.results_title', 'RESULTADOS')}
        </button>

        <button
          type="button"
          className={`${TAB_CLASS} gap-2 ${
            activeBottomTab === 'profile'
              ? 'text-accent border-b-2 border-accent font-semibold'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
          }`}
          onClick={() => setActiveBottomTab('profile')}
        >
          <TrendingUp size={14} />
          {t('console.profile_title', 'PERFIL LONGITUDINAL')}
        </button>

        {/* Right Controls / Filters */}
        <div className="ml-auto flex items-center gap-3 px-2">
          {activeBottomTab === 'console' && (
            <div className="flex items-center gap-1.5 bg-bg-surface/50 border border-border-subtle/50 px-2 py-0.5 rounded-md text-[9px] font-bold">
              <SlidersHorizontal size={10} className="text-text-secondary" />
              <button 
                onClick={() => setLogFilter('all')}
                className={`px-1.5 py-0.5 rounded transition ${logFilter === 'all' ? 'text-accent bg-accent/10 font-bold' : 'text-text-secondary hover:text-text-primary'}`}
              >
                {t('console.filter_all', 'TODOS')} ({counts.all})
              </button>
              <button 
                onClick={() => setLogFilter('info')}
                className={`px-1.5 py-0.5 rounded transition ${logFilter === 'info' ? 'text-blue-600 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-400/10 font-bold' : 'text-text-secondary hover:text-text-primary'}`}
              >
                {t('console.filter_info', 'INFO')} ({counts.info})
              </button>
              <button 
                onClick={() => setLogFilter('calc')}
                className={`px-1.5 py-0.5 rounded transition ${logFilter === 'calc' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-400/10 font-bold' : 'text-text-secondary hover:text-text-primary'}`}
              >
                {t('console.filter_calc', 'CÁLCULOS')} ({counts.calc})
              </button>
              <button 
                onClick={() => setLogFilter('warning')}
                className={`px-1.5 py-0.5 rounded transition ${logFilter === 'warning' ? 'text-amber-600 dark:text-yellow-400 bg-amber-500/10 dark:bg-yellow-400/10 font-bold' : 'text-text-secondary hover:text-text-primary'}`}
              >
                {t('console.filter_warning', 'AVISOS')} ({counts.warning})
              </button>
              <button 
                onClick={() => setLogFilter('error')}
                className={`px-1.5 py-0.5 rounded transition ${logFilter === 'error' ? 'text-red-600 dark:text-red-400 bg-red-500/10 dark:bg-red-400/10 font-bold' : 'text-text-secondary hover:text-text-primary'}`}
              >
                {t('console.filter_error', 'ERRORES')} ({counts.error})
              </button>
            </div>
          )}

          {activeBottomTab === 'console' && consoleLogs.length > 0 && (
            <button
              type="button"
              className="p-1.5 rounded hover:bg-bg-hover text-text-secondary hover:text-red-400 transition-colors flex items-center justify-center cursor-pointer"
              onClick={handleClear}
              title={t('console.clear', 'Limpiar consola')}
            >
              <Trash2 size={13} />
            </button>
          )}
          
          <button
            type="button"
            className="p-1.5 rounded hover:bg-bg-hover text-text-secondary hover:text-accent transition-colors flex items-center justify-center cursor-pointer"
            onClick={() => setBottomPanelOpen(false)}
            title={t('console.close', 'Cerrar panel inferior')}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Panel Contents */}
      <div className="flex-1 overflow-hidden relative bg-bg-primary/20">
        <AnimatePresence mode="wait">
          {activeBottomTab === 'console' && (
            <motion.div
              key="console"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full overflow-y-auto p-3 font-mono text-[11px] custom-scrollbar"
            >
              {filteredLogs.length === 0 ? (
                <div className="text-text-secondary/50 text-center py-8 italic select-none">
                  {t('console.empty', 'No hay entradas de registro que coincidan con el filtro.')}
                </div>
              ) : (
                filteredLogs.map((log, i) => {
                  const type = getLogType(log);
                  const colorClass = getLogColorClass(type);
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`mb-1 leading-normal ${colorClass}`}
                    >
                      {log}
                    </motion.div>
                  );
                })
              )}
              <div className="flex items-center text-text-secondary/60 mt-2 select-none">
                <ChevronRight size={12} className="mr-1" />
                <span className="animate-pulse">_</span>
              </div>
            </motion.div>
          )}

          {activeBottomTab === 'advisor' && (
            <motion.div
              key="advisor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-center justify-center p-6 text-center h-full max-w-lg mx-auto select-none overflow-y-auto"
            >
              <Lightbulb size={24} className="text-yellow-400 animate-pulse mb-2.5 shrink-0" />
              <h4 className="text-text-primary font-bold text-xs uppercase tracking-wider mb-1">{t('console.advisor_header', 'AI Hydraulic Advisor')}</h4>
              <p className="text-[11px] text-text-secondary leading-relaxed mb-3">
                {t('console.advisor_desc', 'El asistente de diseño hidráulico inteligente se encuentra activo. Próximamente analizará su red cloacal en tiempo real para recomendar pendientes óptimas, optimizar volúmenes de excavación y sugerir diámetros comerciales cumpliendo estrictamente con ENOHSA.')}
              </p>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 bg-accent/15 border border-accent/20 rounded text-accent font-extrabold text-[8px] uppercase tracking-widest animate-pulse">
                  {t('console.coming_soon', 'Próximamente en v1.1')}
                </span>
                <button
                  type="button"
                  onClick={handleRunAIAdvisor}
                  className="px-2.5 py-1 bg-accent/20 hover:bg-accent/30 border border-accent/40 rounded text-accent font-semibold text-[10px] transition-colors cursor-pointer"
                >
                  Analizar Red con IA
                </button>
              </div>
              {advisorAlert && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-2.5 bg-amber-500/15 border border-amber-500/30 rounded-md text-amber-600 dark:text-yellow-400 text-[11px] leading-snug max-w-md mt-1"
                >
                  {advisorAlert}
                </motion.div>
              )}
            </motion.div>
          )}

          {activeBottomTab === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full w-full"
            >
              {resultsMode === 'floating' || resultsMode === 'popout' ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 text-text-secondary select-none">
                  <Maximize2 size={32} className="text-text-secondary/40 mb-3" />
                  <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-1">Resultados Desacoplados</h4>
                  <p className="text-[10px] text-text-secondary/80 max-w-sm leading-relaxed mb-3">
                    {resultsMode === 'popout' ? 'La tabla de resultados se encuentra en una ventana externa para múltiples monitores.' : 'La tabla de resultados se encuentra en una ventana flotante.'}
                  </p>
                  <button 
                    onClick={() => {
                      setResultsMode('docked');
                      setIsResultsFloatingOpen(false);
                    }}
                    className="px-3 py-1.5 rounded bg-accent/15 border border-accent/25 hover:bg-accent/25 text-accent text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Acoplar aquí
                  </button>
                </div>
              ) : (
                <ResultsTable />
              )}
            </motion.div>
          )}

          {activeBottomTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full w-full"
            >
              {profileMode === 'floating' || profileMode === 'popout' ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 text-text-secondary select-none">
                  <Maximize2 size={32} className="text-text-secondary/40 mb-3" />
                  <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-1">Perfil Desacoplado</h4>
                  <p className="text-[10px] text-text-secondary/80 max-w-sm leading-relaxed mb-3">
                    {profileMode === 'popout' ? 'El perfil longitudinal se encuentra en una ventana externa.' : 'El perfil longitudinal se encuentra en una ventana flotante.'}
                  </p>
                  <button 
                    onClick={() => {
                      setProfileMode('docked');
                      setIsProfileFloatingOpen(false);
                    }}
                    className="px-3 py-1.5 rounded bg-accent/15 border border-accent/25 hover:bg-accent/25 text-accent text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Acoplar aquí
                  </button>
                </div>
              ) : (
                <ProfileContainer />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
