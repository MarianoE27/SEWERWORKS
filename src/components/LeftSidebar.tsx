import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import { 
  ChevronDown, ChevronRight, BarChart2, FolderTree, 
  PanelLeftClose, PanelLeftOpen, Search, FileText, 
  Focus, Trash2, BarChart4, MousePointer
} from 'lucide-react';
import { toLatLon } from '../lib/proj';
import L from 'leaflet';
import { ConfirmModal } from './ui/ConfirmModal';
import { useTranslation } from 'react-i18next';

const STAT_CARD = 'flex flex-col items-start justify-center p-2 transition-all duration-200';

export function LeftSidebar() {
  const { t } = useTranslation();
  const { 
    nodes, conduits, selectElement, selectedElementId, parameters,
    deleteNode, deleteConduit, crs, setZoomBounds, setProjectInfoOpen,
    setActiveBottomTab, setBottomPanelOpen
  } = useStore();

  const nodeCount = Object.keys(nodes).length;
  const conduitCount = Object.keys(conduits).length;

  const [isOpen, setIsOpen] = useState(true);
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [explorerOpen, setExplorerOpen] = useState(true);
  const [nodesOpen, setNodesOpen] = useState(true);
  const [conduitsOpen, setConduitsOpen] = useState(true);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'issues'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'id'>('name');

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    id: string;
    type: 'node' | 'conduit';
  } | null>(null);

  const [elementToDelete, setElementToDelete] = useState<{
    id: string;
    type: 'node' | 'conduit';
  } | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalLength = useMemo(() => {
    return Object.values(conduits).reduce((acc, c) => acc + (c.length || 0), 0);
  }, [conduits]);

  const totalPointFlow = useMemo(() => {
    return Object.values(nodes).reduce((acc, n) => acc + (n.pointFlow || 0), 0);
  }, [nodes]);

  const qMedio = useMemo(() => {
    return (parameters.population0 * parameters.dotation * parameters.returnRate * parameters.industrialCoefficient) / 86400;
  }, [parameters.population0, parameters.dotation, parameters.returnRate, parameters.industrialCoefficient]);

  const qInf = useMemo(() => {
    return parameters.infiltrationRate * (totalLength / 1000);
  }, [parameters.infiltrationRate, totalLength]);

  const totalFlow = useMemo(() => {
    return qMedio * parameters.babbittCoefficient + qInf + totalPointFlow;
  }, [qMedio, parameters.babbittCoefficient, qInf, totalPointFlow]);

  // Filter and sort lists
  const filteredNodes = useMemo(() => {
    return Object.values(nodes)
      .filter(n => {
        const matchesSearch = n.name.toLowerCase().includes(searchTerm.toLowerCase());
        if (activeFilter === 'issues') {
          return matchesSearch && ((n.pointFlow || 0) < 0 || n.ctn == null || n.state === 'error');
        }
        return matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'id') return a.id.localeCompare(b.id);
        return a.name.localeCompare(b.name);
      });
  }, [nodes, searchTerm, activeFilter, sortBy]);

  const filteredConduits = useMemo(() => {
    return Object.values(conduits)
      .filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
        if (activeFilter === 'issues') {
          return matchesSearch && (c.state === 'error' || c.errorMessage != null);
        }
        return matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'id') return a.id.localeCompare(b.id);
        return a.name.localeCompare(b.name);
      });
  }, [conduits, searchTerm, activeFilter, sortBy]);

  const [nodesParentEl, setNodesParentEl] = useState<HTMLDivElement | null>(null);
  const [conduitsParentEl, setConduitsParentEl] = useState<HTMLDivElement | null>(null);

  const rowVirtualizerNodes = useVirtualizer({
    count: filteredNodes.length,
    getScrollElement: () => nodesParentEl,
    estimateSize: () => 24,
    overscan: 10,
  });

  const rowVirtualizerConduits = useVirtualizer({
    count: filteredConduits.length,
    getScrollElement: () => conduitsParentEl,
    estimateSize: () => 24,
    overscan: 10,
  });

  const handleFocusElement = (id: string, type: 'node' | 'conduit') => {
    selectElement(id, type);
    if (type === 'node') {
      const n = nodes[id];
      if (n) {
        const latLon = toLatLon(n.x, n.y, crs);
        const bounds = L.latLng([latLon[0], latLon[1]]).toBounds(80);
        setZoomBounds(bounds);
      }
    } else {
      const c = conduits[id];
      if (c) {
        const nFrom = nodes[c.from];
        const nTo = nodes[c.to];
        if (nFrom && nTo) {
          const bounds = L.latLngBounds([
            toLatLon(nFrom.x, nFrom.y, crs),
            toLatLon(nTo.x, nTo.y, crs)
          ]);
          setZoomBounds(bounds);
        }
      }
    }
    setContextMenu(null);
  };

  const handleDeleteElement = (id: string, type: 'node' | 'conduit') => {
    setElementToDelete({ id, type });
    setContextMenu(null);
  };

  const confirmDelete = () => {
    if (!elementToDelete) return;
    if (elementToDelete.type === 'node') {
      deleteNode(elementToDelete.id);
    } else {
      deleteConduit(elementToDelete.id);
    }
    setElementToDelete(null);
  };

  const handleShowProfile = (id: string) => {
    selectElement(id, 'conduit');
    setActiveBottomTab('profile');
    setBottomPanelOpen(true);
    setContextMenu(null);
  };

  return (
    <motion.div 
      initial={false}
      animate={{ width: isOpen ? 240 : 0 }}
      transition={{ duration: 0.2 }}
      className={`bg-bg-primary flex flex-col h-full text-xs select-none shrink-0 z-30 relative ${isOpen ? 'border-r border-border-subtle shadow-md' : ''}`}
    >
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="absolute top-2 -right-8 p-1.5 bg-bg-primary hover:bg-bg-hover rounded-r shadow-md border border-l-0 border-border-subtle text-text-secondary hover:text-text-primary transition-all duration-200 z-50 cursor-pointer"
          title={t('sidebar.expand') || "Expandir panel"}
        >
          <PanelLeftOpen size={14} />
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="flex flex-col h-full w-[240px] overflow-hidden"
          >
      {/* HEADER TOGGLE */}
      <div className="h-9 flex items-center justify-between px-2 border-b border-border-subtle shrink-0 bg-bg-surface/10">
        <span className="text-[10px] font-extrabold text-text-secondary uppercase tracking-widest ml-2">
          {t('sidebar.title') || "EXPLORADOR DE RED"}
        </span>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-bg-hover rounded text-text-secondary hover:text-text-primary transition-all duration-200 flex items-center justify-center cursor-pointer"
          title={t('sidebar.collapse') || "Contraer panel"}
        >
          <PanelLeftClose size={13} />
        </button>
      </div>

      <div className="flex flex-col h-full overflow-y-auto">
          {/* MINI PROJECT INFO CARD */}
          <div 
            onClick={() => setProjectInfoOpen(true)}
            className="p-3 border-b border-border-subtle/50 bg-bg-surface/20 hover:bg-bg-hover cursor-pointer transition-colors duration-150 group"
          >
            <div className="flex items-center gap-1.5 text-accent font-bold text-[10px] uppercase tracking-widest mb-1 select-none">
              <FileText size={10} />
              {t('sidebar.general_data') || "Datos Generales"}
            </div>
            <div className="text-[11px] font-bold text-text-primary group-hover:text-accent truncate transition-colors">
              {parameters.projectName || t('header.untitled')}
            </div>
            <div className="text-[10px] text-text-secondary font-semibold uppercase mt-0.5 truncate tracking-wide">
              {parameters.location || t('sidebar.no_location') || 'Sin Ubicación'} · {parameters.date}
            </div>
          </div>

          {/* NETWORK SUMMARY */}
          <div className="border-b border-border-subtle">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-bg-hover cursor-pointer font-bold text-text-secondary uppercase text-[10px] tracking-wider transition-all duration-200 border-none bg-transparent"
              onClick={() => setSummaryOpen(!summaryOpen)}
              title={t('sidebar.toggle_summary') || "Alternar resumen"}
            >
              <div className="flex items-center gap-1.5">
                <BarChart2 size={12} className="text-accent" />
                {t('sidebar.summary_title') || "RESUMEN DE RED"}
              </div>
              {summaryOpen ? <ChevronDown size={11} className="text-text-secondary" /> : <ChevronRight size={11} className="text-text-secondary" />}
            </button>

            {summaryOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden p-3 grid grid-cols-2 gap-x-2 gap-y-1 bg-bg-primary/20"
              >
                <div className={`${STAT_CARD}`}>
                  <span className="text-accent text-[15px] font-black font-mono leading-none">{nodeCount}</span>
                  <span className="text-text-secondary text-[10px] uppercase font-bold tracking-wider mt-1.5">{t('sidebar.manholes') || "Cámaras"}</span>
                </div>
                <div className={`${STAT_CARD}`}>
                  <span className="text-text-primary text-[15px] font-black font-mono leading-none">{conduitCount}</span>
                  <span className="text-text-secondary text-[10px] uppercase font-bold tracking-wider mt-1.5">{t('sidebar.pipes') || "Tuberías"}</span>
                </div>
                <div className={`${STAT_CARD}`}>
                  <span className="text-text-primary text-[15px] font-black font-mono leading-none">{totalFlow.toFixed(2)}</span>
                  <span className="text-text-secondary text-[10px] uppercase font-bold tracking-wider mt-1.5">{t('sidebar.flow') || "Caudal (L/s)"}</span>
                </div>
                <div className={`${STAT_CARD}`}>
                  <span className="text-text-primary text-[15px] font-black font-mono leading-none">{totalLength.toFixed(0)}m</span>
                  <span className="text-text-secondary text-[10px] uppercase font-bold tracking-wider mt-1.5">{t('sidebar.length') || "Longitud"}</span>
                </div>
              </motion.div>
            )}
          </div>

          {/* PROJECT EXPLORER */}
          <div className="flex-1 flex flex-col min-h-0">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-bg-hover cursor-pointer font-bold text-text-secondary uppercase text-[10px] tracking-wider border-b border-border-subtle border-t-0 border-l-0 border-r-0 transition-all duration-200 shrink-0 bg-transparent"
              onClick={() => setExplorerOpen(!explorerOpen)}
              title={t('sidebar.toggle_explorer') || "Alternar explorador"}
            >
              <div className="flex items-center gap-1.5">
                <FolderTree size={12} className="text-accent" />
                {t('sidebar.explorer_title') || "EXPLORADOR DE PROYECTO"}
              </div>
              {explorerOpen ? <ChevronDown size={11} className="text-text-secondary" /> : <ChevronRight size={11} className="text-text-secondary" />}
            </button>

            {explorerOpen && (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Search & Filters */}
                <div className="px-4 py-2.5 border-b border-border-subtle flex flex-col space-y-2 shrink-0 bg-bg-surface/5">
                  <div className="relative flex items-center">
                    <Search size={11} className="absolute left-2 text-text-secondary/60" />
                    <input
                      type="text"
                      placeholder={t('sidebar.search_placeholder') || "Buscar elementos..."}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-bg-surface border border-border-subtle rounded pl-7 pr-2 py-1 text-[11px] text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-accent/40 transition-colors"
                    />
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => setActiveFilter('all')}
                      className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-extrabold border transition-colors cursor-pointer focus:outline-none ${
                        activeFilter === 'all'
                          ? 'bg-accent/10 border-accent/30 text-accent font-black shadow-sm'
                          : 'bg-bg-surface border-border-subtle text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {t('sidebar.filter_all') || "Todos"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFilter('issues')}
                      className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-extrabold border transition-colors cursor-pointer focus:outline-none ${
                        activeFilter === 'issues'
                          ? 'bg-accent/10 border-accent/30 text-accent font-black shadow-sm'
                          : 'bg-bg-surface border-border-subtle text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {t('sidebar.filter_alerts') || "Alertas"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortBy(sortBy === 'name' ? 'id' : 'name')}
                      className="ml-auto px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-extrabold bg-bg-surface border border-border-subtle text-text-secondary hover:text-text-primary transition-colors cursor-pointer focus:outline-none"
                    >
                      {t('sidebar.sort_by') || "Orden:"} {sortBy === 'name' ? 'A-Z' : 'ID'}
                    </button>
                  </div>
                </div>

                {/* Items Folders */}
                <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
                  {/* Nodes Folder */}
                  <div>
                    <button
                      type="button"
                      className="w-full flex items-center px-4 py-1.5 hover:bg-bg-hover cursor-pointer text-text-secondary text-[10px] font-bold uppercase tracking-wider transition-all duration-200 border-none bg-transparent"
                      onClick={() => setNodesOpen(!nodesOpen)}
                      title={t('sidebar.toggle_manholes_folder') || "Alternar carpeta de cámaras"}
                    >
                      {nodesOpen ? <ChevronDown size={11} className="mr-1.5 text-accent" /> : <ChevronRight size={11} className="mr-1.5 text-accent" />}
                      {t('sidebar.manholes_folder') || "CÁMARAS"}
                      <span className="ml-auto bg-bg-hover text-[10px] px-1.5 rounded-full font-bold">{filteredNodes.length}</span>
                    </button>
                    {nodesOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        {filteredNodes.length === 0 ? (
                          <div className="pl-8 text-[10px] text-text-secondary italic py-1">{t('sidebar.no_manholes') || "Ninguna cámara"}</div>
                        ) : (
                          <div ref={setNodesParentEl} className="max-h-[240px] overflow-y-auto custom-scrollbar">
                            <div
                              style={{
                                height: `${rowVirtualizerNodes.getTotalSize()}px`,
                                width: '100%',
                                position: 'relative',
                              }}
                            >
                              {rowVirtualizerNodes.getVirtualItems().map((virtualRow) => {
                                const n = filteredNodes[virtualRow.index];
                                if (!n) return null;
                                return (
                                  <button
                                    key={n.id}
                                    type="button"
                                    style={{
                                      position: 'absolute',
                                      top: 0,
                                      left: 0,
                                      width: '100%',
                                      height: `${virtualRow.size}px`,
                                      transform: `translateY(${virtualRow.start}px)`,
                                    }}
                                    className={`pl-8 pr-4 py-1 text-[11px] cursor-pointer text-left transition-all duration-200 border-l-2 border-t-0 border-r-0 border-b-0 truncate ${
                                      selectedElementId === n.id
                                        ? 'bg-accent/10 border-accent text-accent font-semibold shadow-[inset_1px_0_0_rgba(255,90,9,0.2)]'
                                        : 'border-transparent text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                                    }`}
                                    onClick={() => selectElement(n.id, 'node')}
                                    onDoubleClick={() => handleFocusElement(n.id, 'node')}
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      setContextMenu({
                                        x: e.clientX,
                                        y: e.clientY,
                                        id: n.id,
                                        type: 'node'
                                      });
                                    }}
                                  >
                                    {n.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>

                  {/* Conduits Folder */}
                  <div className="mt-2">
                    <button
                      type="button"
                      className="w-full flex items-center px-4 py-1.5 hover:bg-bg-hover cursor-pointer text-text-secondary text-[10px] font-bold uppercase tracking-wider transition-all duration-200 border-none bg-transparent"
                      onClick={() => setConduitsOpen(!conduitsOpen)}
                      title={t('sidebar.toggle_pipes_folder') || "Alternar carpeta de tuberías"}
                    >
                      {conduitsOpen ? <ChevronDown size={11} className="mr-1.5 text-accent" /> : <ChevronRight size={11} className="mr-1.5 text-accent" />}
                      {t('sidebar.pipes_folder') || "TUBERÍAS"}
                      <span className="ml-auto bg-bg-hover text-[10px] px-1.5 rounded-full font-bold">{filteredConduits.length}</span>
                    </button>
                    {conduitsOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        {filteredConduits.length === 0 ? (
                          <div className="pl-8 text-[10px] text-text-secondary italic py-1">{t('sidebar.no_pipes') || "Ninguna tubería"}</div>
                        ) : (
                          <div ref={setConduitsParentEl} className="max-h-[240px] overflow-y-auto custom-scrollbar">
                            <div
                              style={{
                                height: `${rowVirtualizerConduits.getTotalSize()}px`,
                                width: '100%',
                                position: 'relative',
                              }}
                            >
                              {rowVirtualizerConduits.getVirtualItems().map((virtualRow) => {
                                const c = filteredConduits[virtualRow.index];
                                if (!c) return null;
                                return (
                                  <button
                                    key={c.id}
                                    type="button"
                                    style={{
                                      position: 'absolute',
                                      top: 0,
                                      left: 0,
                                      width: '100%',
                                      height: `${virtualRow.size}px`,
                                      transform: `translateY(${virtualRow.start}px)`,
                                    }}
                                    className={`pl-8 pr-4 py-1 text-[11px] cursor-pointer text-left transition-all duration-200 border-l-2 border-t-0 border-r-0 border-b-0 truncate ${
                                      selectedElementId === c.id
                                        ? 'bg-accent/10 border-accent text-accent font-semibold shadow-[inset_1px_0_0_rgba(255,90,9,0.2)]'
                                        : 'border-transparent text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                                    }`}
                                    onClick={() => selectElement(c.id, 'conduit')}
                                    onDoubleClick={() => handleFocusElement(c.id, 'conduit')}
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      setContextMenu({
                                        x: e.clientX,
                                        y: e.clientY,
                                        id: c.id,
                                        type: 'conduit'
                                      });
                                    }}
                                  >
                                    {c.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        </motion.div>
        )}
      </AnimatePresence>

      {/* FLOATING CONTEXT MENU */}
      {contextMenu && (
        <div 
          ref={menuRef}
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-[9999] bg-bg-surface border border-border-subtle rounded-lg py-1 shadow-2xl w-44 glass-panel text-[11px]"
        >
          <button 
            className="w-full text-left px-3 py-1.5 hover:bg-bg-hover flex items-center gap-2 text-text-primary hover:text-accent font-bold transition-all border-none bg-transparent cursor-pointer"
            onClick={() => { selectElement(contextMenu.id, contextMenu.type); setContextMenu(null); }}
          >
            <MousePointer size={12} />
            {t('sidebar.menu.select') || "Seleccionar"}
          </button>
          
          <button 
            className="w-full text-left px-3 py-1.5 hover:bg-bg-hover flex items-center gap-2 text-text-primary hover:text-accent font-bold transition-all border-none bg-transparent cursor-pointer"
            onClick={() => handleFocusElement(contextMenu.id, contextMenu.type)}
          >
            <Focus size={12} />
            {t('sidebar.menu.focus') || "Zoom y Enfocar"}
          </button>

          {contextMenu.type === 'conduit' && (
            <button 
              className="w-full text-left px-3 py-1.5 hover:bg-bg-hover flex items-center gap-2 text-text-primary hover:text-accent font-bold transition-all border-none bg-transparent cursor-pointer"
              onClick={() => handleShowProfile(contextMenu.id)}
            >
              <BarChart4 size={12} />
              {t('sidebar.menu.profile') || "Ver Perfil Long."}
            </button>
          )}

          <div className="my-1 border-t border-border-subtle/55"></div>

          <button 
            className="w-full text-left px-3 py-1.5 hover:bg-bg-hover flex items-center gap-2 text-red-400 hover:text-red-300 font-bold transition-all border-none bg-transparent cursor-pointer"
            onClick={() => handleDeleteElement(contextMenu.id, contextMenu.type)}
          >
            <Trash2 size={12} />
            {t('sidebar.menu.delete') || "Eliminar Elemento"}
          </button>
        </div>
      )}

      <ConfirmModal
        isOpen={elementToDelete !== null}
        onClose={() => setElementToDelete(null)}
        onConfirm={confirmDelete}
        title={t('sidebar.confirm_delete_title') || "Eliminar Elemento"}
        message={t('sidebar.confirm_delete_msg') || "¿Estás seguro de que deseas eliminar este elemento? Esta acción no se puede deshacer."}
        confirmText={t('sidebar.confirm_delete_confirm') || "Eliminar"}
        cancelText={t('sidebar.confirm_delete_cancel') || "Cancelar"}
        variant="danger"
      />
    </motion.div>
  );
}
