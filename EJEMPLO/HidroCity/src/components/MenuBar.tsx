import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import {
  ChevronDown,
  FolderOpen,
  Save,
  Download,
  Upload,
  Play,
  Square,
  Settings,
  HelpCircle,
  Layers,
  Map as MapIcon,
  Globe,
  Maximize,
  Moon,
  Sun,
  PanelLeft,
  PanelBottom,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DropdownItem, DropdownSeparator } from './ui/Dropdown';
import { ProjectionPanel } from './ProjectionPanel';
import { LayerManager } from './LayerManager';

// ---------------------------------------------------------------------------
// Helper: detect dominant geometry type in a GeoJSON FeatureCollection
// ---------------------------------------------------------------------------
function detectGeometryType(
  geojson: any
): 'Point' | 'LineString' | 'Polygon' | 'Mixed' {
  const features: any[] = geojson?.features ?? [];
  if (features.length === 0) return 'Mixed';

  const types = new Set<string>();
  for (const f of features) {
    const t: string = f?.geometry?.type ?? '';
    if (t === 'Point' || t === 'MultiPoint') types.add('Point');
    else if (t === 'LineString' || t === 'MultiLineString') types.add('LineString');
    else if (t === 'Polygon' || t === 'MultiPolygon') types.add('Polygon');
    else types.add('Other');
  }

  if (types.size === 1) {
    const only = [...types][0];
    if (only === 'Point' || only === 'LineString' || only === 'Polygon') return only;
  }
  return 'Mixed';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const MenuBar: React.FC = () => {
  const {
    runSimulation,
    isSimulating,
    clearResults,
    exportGeoJSON,
    importGISData,
    toggleMapLayer,
    mapLayers,
    fitMapToBounds,
    saveProject,
    loadProject,
    theme,
    toggleTheme,
    isSidebarCollapsed,
    setSidebarCollapsed,
    isBottomPanelOpen,
    setBottomPanelOpen,
    setLayerManagerOpen,
    addExternalLayer,
  } = useStore();

  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isProjectionPanelOpen, setIsProjectionPanelOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);
  const layerInputRef = useRef<HTMLInputElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      )
        return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveProject();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        projectInputRef.current?.click();
      } else if (e.key === 'F5') {
        e.preventDefault();
        if (!isSimulating) runSimulation();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveProject, runSimulation, isSimulating]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  const handleMenuClick = (menuName: string) => {
    setActiveMenu(activeMenu === menuName ? null : menuName);
  };

  const handleImportGISClick = () => {
    fileInputRef.current?.click();
    setActiveMenu(null);
  };

  const handleImportAsLayerClick = () => {
    layerInputRef.current?.click();
    setActiveMenu(null);
  };

  const handleProjectFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      await loadProject(file);
    }
    if (projectInputRef.current) projectInputRef.current.value = '';
    setActiveMenu(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await importGISData(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleLayerFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let geojson: any;

      if (file.name.toLowerCase().endsWith('.zip')) {
        // Shapefile via shpjs
        const shpjs = await import('shpjs');
        const buffer = await file.arrayBuffer();
        geojson = await shpjs.default(buffer);
      } else {
        // GeoJSON / JSON
        const text = await file.text();
        geojson = JSON.parse(text);
      }

      addExternalLayer({
        name: file.name.replace(/\.[^.]+$/, ''),
        visible: true,
        opacity: 0.8,
        sourceCRS: 'EPSG:4326',
        geojson,
        featureCount: geojson?.features?.length ?? 0,
        geometryType: detectGeometryType(geojson),
        style: {
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.3,
          weight: 2,
          radius: 6,
        },
      });
    } catch (err) {
      console.error('Failed to import layer:', err);
    }

    if (layerInputRef.current) layerInputRef.current.value = '';
  };

  // -------------------------------------------------------------------------
  // Shared animation props
  // -------------------------------------------------------------------------
  const menuAnimation: import('framer-motion').HTMLMotionProps<'div'> = {
    initial: { opacity: 0, y: -5, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -5, scale: 0.95 },
    transition: { duration: 0.15, ease: 'easeOut' },
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div
      className="h-8 border-b border-border-subtle flex items-center px-2 text-xs text-text-primary select-none relative z-[2000] transition-colors bg-bg-surface"
      ref={menuRef}
    >
      {/* ------------------------------------------------------------------ */}
      {/* File Menu                                                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="relative h-full flex items-center">
        <button
          className={`px-3 py-1 rounded hover:bg-bg-hover transition-colors ${
            activeMenu === 'File'
              ? 'bg-bg-hover text-text-primary'
              : 'text-text-secondary'
          }`}
          onClick={() => handleMenuClick('File')}
          onMouseEnter={() => activeMenu && setActiveMenu('File')}
        >
          File
        </button>
        <AnimatePresence>
          {activeMenu === 'File' && (
            <motion.div
              {...menuAnimation}
              className="absolute top-full left-0 mt-1 w-52 bg-bg-surface border border-border-subtle rounded-md shadow-lg py-1"
            >
              <DropdownItem
                icon={<FolderOpen size={14} />}
                label="Open Project..."
                shortcut="Ctrl+O"
                onClick={() => {
                  projectInputRef.current?.click();
                  setActiveMenu(null);
                }}
              />
              <DropdownItem
                icon={<Save size={14} />}
                label="Save Project"
                shortcut="Ctrl+S"
                onClick={() => {
                  saveProject();
                  setActiveMenu(null);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Maps/GIS Menu                                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="relative h-full flex items-center">
        <button
          className={`px-3 py-1 rounded hover:bg-bg-hover transition-colors flex items-center gap-1 ${
            activeMenu === 'Maps'
              ? 'bg-bg-hover text-text-primary'
              : 'text-text-secondary'
          }`}
          onClick={() => handleMenuClick('Maps')}
          onMouseEnter={() => activeMenu && setActiveMenu('Maps')}
        >
          <MapIcon size={12} />
          Maps/GIS
        </button>
        <AnimatePresence>
          {activeMenu === 'Maps' && (
            <motion.div
              {...menuAnimation}
              className="absolute top-full left-0 mt-1 w-56 bg-bg-surface border border-border-subtle rounded-md shadow-lg py-1"
            >
              {/* Layer manager & CRS */}
              <DropdownItem
                icon={<Layers size={14} />}
                label="Layer Manager..."
                onClick={() => {
                  setLayerManagerOpen(true);
                  setActiveMenu(null);
                }}
              />
              <DropdownItem
                icon={<Globe size={14} />}
                label="Coordinate System (CRS)..."
                onClick={() => {
                  setIsProjectionPanelOpen(true);
                  setActiveMenu(null);
                }}
              />
              <DropdownSeparator />

              {/* Fit to bounds */}
              <DropdownItem
                icon={<Maximize size={14} />}
                label="Fit Map to Bounds"
                onClick={() => {
                  fitMapToBounds();
                  setActiveMenu(null);
                }}
              />
              <DropdownSeparator />

              {/* Base-map toggles */}
              <DropdownItem
                label="Base Map (OSM)"
                checked={mapLayers.baseMap}
                onClick={() => toggleMapLayer('baseMap')}
              />
              <DropdownItem
                label="Satellite Map (Esri)"
                checked={mapLayers.satelliteLayer}
                onClick={() => toggleMapLayer('satelliteLayer')}
              />
              <DropdownItem
                label="WMS Layer (Topo)"
                checked={mapLayers.wmsLayer}
                onClick={() => toggleMapLayer('wmsLayer')}
              />
              <DropdownSeparator />

              {/* Data-layer toggles */}
              <DropdownItem
                label="Drainage Network"
                checked={mapLayers.drainageNetwork}
                onClick={() => toggleMapLayer('drainageNetwork')}
              />
              <DropdownItem
                label="Subcatchments"
                checked={mapLayers.subcatchments}
                onClick={() => toggleMapLayer('subcatchments')}
              />
              <DropdownItem
                label="Simulation Results"
                checked={mapLayers.simulationResults}
                onClick={() => toggleMapLayer('simulationResults')}
              />
              <DropdownSeparator />

              {/* Import / Export */}
              <DropdownItem
                icon={<Upload size={14} />}
                label="Import GIS Data..."
                onClick={handleImportGISClick}
              />
              <DropdownItem
                icon={<Upload size={14} />}
                label="Import as Layer..."
                onClick={handleImportAsLayerClick}
              />
              <DropdownItem
                icon={<Download size={14} />}
                label="Export GeoJSON"
                onClick={() => {
                  exportGeoJSON();
                  setActiveMenu(null);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* View Menu                                                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="relative h-full flex items-center">
        <button
          className={`px-3 py-1 rounded hover:bg-bg-hover transition-colors ${
            activeMenu === 'View'
              ? 'bg-bg-hover text-text-primary'
              : 'text-text-secondary'
          }`}
          onClick={() => handleMenuClick('View')}
          onMouseEnter={() => activeMenu && setActiveMenu('View')}
        >
          View
        </button>
        <AnimatePresence>
          {activeMenu === 'View' && (
            <motion.div
              {...menuAnimation}
              className="absolute top-full left-0 mt-1 w-52 bg-bg-surface border border-border-subtle rounded-md shadow-lg py-1"
            >
              <DropdownItem
                icon={
                  theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />
                }
                label={`Toggle ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                onClick={() => {
                  toggleTheme();
                  setActiveMenu(null);
                }}
              />
              <DropdownSeparator />
              <DropdownItem
                icon={<PanelLeft size={14} />}
                label="Sidebar"
                checked={!isSidebarCollapsed}
                onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
              />
              <DropdownItem
                icon={<PanelBottom size={14} />}
                label="Console"
                checked={isBottomPanelOpen}
                onClick={() => setBottomPanelOpen(!isBottomPanelOpen)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Simulation Menu                                                     */}
      {/* ------------------------------------------------------------------ */}
      <div className="relative h-full flex items-center">
        <button
          className={`px-3 py-1 rounded hover:bg-bg-hover transition-colors ${
            activeMenu === 'Simulation'
              ? 'bg-bg-hover text-text-primary'
              : 'text-text-secondary'
          }`}
          onClick={() => handleMenuClick('Simulation')}
          onMouseEnter={() => activeMenu && setActiveMenu('Simulation')}
        >
          Simulation
        </button>
        <AnimatePresence>
          {activeMenu === 'Simulation' && (
            <motion.div
              {...menuAnimation}
              className="absolute top-full left-0 mt-1 w-52 bg-bg-surface border border-border-subtle rounded-md shadow-lg py-1"
            >
              <DropdownItem
                icon={<Play size={14} className="text-accent" />}
                label="Run Simulation"
                shortcut="F5"
                disabled={isSimulating}
                onClick={() => {
                  runSimulation();
                  setActiveMenu(null);
                }}
              />
              <DropdownItem
                icon={<Square size={14} className="text-text-secondary" />}
                label="Clear Results"
                onClick={() => {
                  clearResults();
                  setActiveMenu(null);
                }}
              />
              <DropdownSeparator />
              <DropdownItem
                icon={<Settings size={14} />}
                label="Simulation Options..."
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Help Menu                                                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="relative h-full flex items-center">
        <button
          className={`px-3 py-1 rounded hover:bg-bg-hover transition-colors ${
            activeMenu === 'Help'
              ? 'bg-bg-hover text-text-primary'
              : 'text-text-secondary'
          }`}
          onClick={() => handleMenuClick('Help')}
          onMouseEnter={() => activeMenu && setActiveMenu('Help')}
        >
          Help
        </button>
        <AnimatePresence>
          {activeMenu === 'Help' && (
            <motion.div
              {...menuAnimation}
              className="absolute top-full left-0 mt-1 w-52 bg-bg-surface border border-border-subtle rounded-md shadow-lg py-1"
            >
              <DropdownItem
                icon={<HelpCircle size={14} />}
                label="Documentation"
              />
              <DropdownItem label="About HydroCity Pro" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Panels & hidden inputs                                              */}
      {/* ------------------------------------------------------------------ */}
      <ProjectionPanel
        isOpen={isProjectionPanelOpen}
        onClose={() => setIsProjectionPanelOpen(false)}
      />

      <LayerManager />

      {/* Project file picker */}
      <input
        type="file"
        title="Open Project"
        ref={projectInputRef}
        onChange={handleProjectFileChange}
        className="hidden"
        accept=".json"
      />

      {/* GIS data import picker */}
      <input
        type="file"
        title="Import GIS Data"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".geojson,.json,.zip"
      />

      {/* Import-as-layer picker */}
      <input
        type="file"
        title="Import as Layer"
        ref={layerInputRef}
        onChange={handleLayerFileChange}
        className="hidden"
        accept=".geojson,.json,.zip"
      />
    </div>
  );
};
