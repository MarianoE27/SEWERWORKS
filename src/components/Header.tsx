import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { Undo2, Redo2, Sun, Moon, FileJson, FolderOpen, Trash2, ChevronDown, Download, FileCode2, Terminal, Languages, PanelTopClose, PanelTopOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useExportHandlers } from './ribbon/useExportHandlers';

export function Header() {
  const { t, i18n } = useTranslation();
  const {
    activeMainTab, setActiveMainTab, isRibbonOpen, setIsRibbonOpen, theme, setTheme,
    loadProject, clearProject, addLog, isFetchingElevation,
    isBottomPanelOpen, setBottomPanelOpen
  } = useStore();

  const {
    handleExportProject,
    handleExportDXF,
    handleExportLandXML,
    handleExportSCR
  } = useExportHandlers();

  const projectName = useStore(state => state.parameters.projectName);

  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  const fileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (fileMenuRef.current && !fileMenuRef.current.contains(event.target as Node)) {
        setIsFileMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsFileMenuOpen(false);
        setIsConfirmClearOpen(false);
      }

      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 'z': {
            event.preventDefault();
            const storeUndo = useStore.getState();
            if (storeUndo.history.length > 0) storeUndo.undo();
            break;
          }
          case 'y': {
            event.preventDefault();
            const storeRedo = useStore.getState();
            if (storeRedo.future.length > 0) storeRedo.redo();
            break;
          }
          case 's': {
            event.preventDefault();
            handleExportProject();
            addLog('Proyecto exportado a SewerWorks JSON (Atajo Ctrl+S).');
            setIsFileMenuOpen(false);
            break;
          }
          default:
            break;
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleExportProject, addLog]);

  const handleImportProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.nodes && data.conduits && data.parameters) {
          loadProject(data);
          addLog('Proyecto importado exitosamente.');
        } else {
          addLog('Error: El archivo no tiene el formato de proyecto válido.');
        }
      } catch (err) {
        addLog('Error al leer el archivo del proyecto.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
    setIsFileMenuOpen(false);
  };

  const tabs = [
    { id: 'inicio', label: t('header.tabs.inicio') },
    { id: 'dibujo', label: t('header.tabs.dibujo') },
    { id: 'analisis', label: t('header.tabs.analisis') },
    { id: 'resultados', label: t('header.tabs.resultados') },
    { id: 'ayuda', label: t('header.tabs.ayuda') }
  ];

  return (
    <div className="h-9 bg-bg-primary border-b border-border-subtle/30 flex items-center px-4 text-[11px] text-text-secondary select-none z-50 shrink-0">
      {/* Brand Logo */}
      <div className="flex items-center font-bold mr-6 tracking-widest text-[12px] text-text-primary">
        <img src="/logo.svg" alt="SewerWorks" className="w-5 h-5 mr-2 object-contain drop-shadow-md" />
        SEWER<span className="text-accent">WORKS</span>
      </div>
      
      {/* Top Tabs */}
      <div className="flex space-x-1 h-full">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            className={`px-4 flex items-center cursor-pointer h-full transition-all duration-200 border-b-2 bg-transparent text-[11px] uppercase tracking-wider font-semibold ${
              activeMainTab === tab.id
                ? (isRibbonOpen ? 'text-accent border-accent font-bold' : 'text-text-secondary border-accent/50 opacity-80')
                : 'text-text-secondary hover:text-text-primary border-transparent hover:border-border-subtle/40'
            }`}
            onClick={() => {
              if (activeMainTab === tab.id) {
                setIsRibbonOpen(!isRibbonOpen);
              } else {
                setActiveMainTab(tab.id as any);
                setIsRibbonOpen(true);
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Project Status Pill in Center */}
      <div className="flex-1 flex justify-center items-center space-x-3">
        <div className="flex items-center space-x-1.5 px-2.5 py-0.5 bg-bg-surface border border-border-subtle rounded-md text-[10px] font-semibold">
          <span className="text-text-secondary tracking-wider uppercase opacity-80">{t('header.project')}:</span>
          <span className="text-accent bg-accent/10 px-1.5 py-0.5 rounded text-[10px] tracking-widest uppercase font-bold">
            {projectName || t('header.untitled')}
          </span>
        </div>
        {isFetchingElevation && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-accent/15 border border-accent/25 text-[10px] font-bold text-accent animate-pulse uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping inline-block"></span>
            {t('header.fetching_elevation')}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="ml-auto flex items-center space-x-3 text-text-secondary">
        {/* Ribbon Toggle Button */}
        <button
          type="button"
          title={isRibbonOpen ? "Colapsar herramientas" : "Expandir herramientas"}
          className={`p-1.5 rounded hover:bg-bg-hover hover:text-text-primary transition-all duration-200 flex items-center justify-center cursor-pointer ${!isRibbonOpen ? 'text-accent bg-accent/10 border border-accent/20' : 'text-text-secondary'}`}
          onClick={() => setIsRibbonOpen(!isRibbonOpen)}
        >
          {isRibbonOpen ? <PanelTopClose size={14} /> : <PanelTopOpen size={14} />}
        </button>

        {/* Console Toggle Button */}
        <button
          type="button"
          title={isBottomPanelOpen ? t('header.console_close') : t('header.console_open')}
          className={`p-1.5 rounded hover:bg-bg-hover hover:text-text-primary transition-all duration-200 flex items-center justify-center cursor-pointer ${isBottomPanelOpen ? 'text-accent bg-accent/10 border border-accent/20' : 'text-text-secondary'}`}
          onClick={() => setBottomPanelOpen(!isBottomPanelOpen)}
        >
          <Terminal size={14} />
        </button>

        <div className="w-px h-4 bg-border-subtle"></div>
        
        {/* Archivo Dropdown */}
        <div className="relative" ref={fileMenuRef}>
          <div 
            className={`flex items-center gap-1 cursor-pointer transition-all duration-200 font-bold uppercase tracking-wider select-none px-2 py-1.5 rounded ${isFileMenuOpen ? 'bg-bg-hover text-text-primary' : 'hover:bg-bg-hover hover:text-text-primary'}`}
            onClick={() => setIsFileMenuOpen(!isFileMenuOpen)}
          >
            {t('header.file')}
            <ChevronDown size={11} className={`transition-transform duration-200 ${isFileMenuOpen ? 'rotate-180' : ''}`} />
          </div>

          {isFileMenuOpen && (
            <div className="absolute top-full right-0 mt-1 w-56 glass-panel rounded-lg py-1 z-50 shadow-xl border border-border-subtle/60 ribbon-dropdown">
              <button 
                className="w-full text-left px-3 py-2 text-[11px] hover:bg-bg-hover flex items-center gap-2 text-red-400 hover:text-red-300 font-semibold transition-colors duration-200"
                onClick={() => {
                  setIsConfirmClearOpen(true);
                  setIsFileMenuOpen(false);
                }}
              >
                <Trash2 size={13} /> {t('header.new_project')}
              </button>
              
              <label className="w-full text-left px-3 py-2 text-[11px] hover:bg-bg-hover flex items-center gap-2 text-text-secondary hover:text-accent cursor-pointer font-semibold transition-colors duration-200">
                <FolderOpen size={13} /> {t('header.open_project')}
                <input type="file" accept=".json" className="hidden" onChange={handleImportProject} />
              </label>

              <div className="my-1 border-t border-border-subtle"></div>
              
              <button 
                className="w-full text-left px-3 py-2 text-[11px] hover:bg-bg-hover flex items-center gap-2 text-text-secondary hover:text-accent font-semibold transition-colors duration-200"
                onClick={handleExportProject}
              >
                <FileJson size={13} /> {t('header.export_json')}
              </button>
              
              <button 
                className="w-full text-left px-3 py-2 text-[11px] hover:bg-bg-hover flex items-center gap-2 text-text-secondary hover:text-accent font-semibold transition-colors duration-200"
                onClick={handleExportDXF}
              >
                <Download size={13} /> {t('header.export_dxf')}
              </button>
              
              <button 
                className="w-full text-left px-3 py-2 text-[11px] hover:bg-bg-hover flex items-center gap-2 text-text-secondary hover:text-accent font-semibold transition-colors duration-200"
                onClick={handleExportLandXML}
              >
                <FileCode2 size={13} /> {t('header.export_landxml')}
              </button>

              <button 
                className="w-full text-left px-3 py-2 text-[11px] hover:bg-bg-hover flex items-center gap-2 text-text-secondary hover:text-accent font-semibold transition-colors duration-200"
                onClick={handleExportSCR}
              >
                <Terminal size={13} /> {t('header.export_scr')}
              </button>
            </div>
          )}
        </div>

        <div className="cursor-pointer hover:text-text-primary transition-all duration-200 font-bold uppercase tracking-wider" onClick={() => setActiveMainTab('ayuda')}>{t('header.help')}</div>
        
        {/* Language Switcher */}
        <button
          type="button"
          className="cursor-pointer hover:text-accent transition-all duration-200 flex items-center justify-center p-1 rounded hover:bg-bg-hover text-[11px] font-bold gap-1 uppercase tracking-wider"
          onClick={() => i18n.changeLanguage(i18n.language.startsWith('es') ? 'en' : 'es')}
          title={i18n.language.startsWith('es') ? "Switch to English" : "Cambiar a Español"}
        >
          <Languages size={14} />
          {i18n.language.startsWith('es') ? 'ES' : 'EN'}
        </button>

        <div
          className="cursor-pointer hover:text-accent transition-all duration-200 flex items-center justify-center p-1 rounded hover:bg-bg-hover"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </div>
      </div>

      {isConfirmClearOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] backdrop-blur-sm">
          <div className="bg-bg-surface border border-border-subtle rounded-md p-5 max-w-sm w-full shadow-2xl text-left">
            <h3 className="text-sm font-semibold text-text-primary mb-2">{t('header.confirm_clear_title')}</h3>
            <p className="text-text-secondary mb-5 text-[11px] leading-relaxed">{t('header.confirm_clear_desc')}</p>
            <div className="flex justify-end gap-2 font-medium">
              <button
                type="button"
                className="px-3 py-1.5 rounded text-text-secondary hover:bg-bg-hover transition-all duration-200 text-[11px]"
                onClick={() => setIsConfirmClearOpen(false)}
              >
                {t('header.cancel')}
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-all duration-200 text-[11px]"
                onClick={() => {
                  handleExportProject();
                  clearProject();
                  addLog('Proyecto guardado y limpiado.');
                  setIsConfirmClearOpen(false);
                }}
              >
                {t('header.save_and_clear')}
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all duration-200 text-[11px]"
                onClick={() => {
                  clearProject();
                  addLog('Proyecto limpiado sin guardar.');
                  setIsConfirmClearOpen(false);
                }}
              >
                {t('header.clear_without_saving')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default Header;
