import React, { useRef, useState, useEffect } from 'react';
import { useStore } from '../store';
import {
  MousePointer2, CircleDot, Minus, Hexagon,
  Play, Square, Trash2, Ruler, Activity,
  Layers, CloudRain, Settings,
  PanelLeft, PanelBottom,
  Upload, Download, Moon, Sun, Undo2, Redo2,
  FilePlus, FileText, BarChart2,
  FolderOpen, Save, Globe, Map as MapIcon,
  Maximize, HelpCircle, Brain, BookOpen, RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DropdownItem, DropdownSeparator } from './ui/Dropdown';

// ── Helpers ───────────────────────────────────────────────────

function detectGeometryType(geojson: any): 'Point' | 'LineString' | 'Polygon' | 'Mixed' {
  const features: any[] = geojson?.features ?? [];
  if (!features.length) return 'Mixed';
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

// ── Sub-components ────────────────────────────────────────────

const RibbonGroup: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col h-full border-r border-border-subtle pr-4 last:border-r-0 min-w-fit">
    <div className="flex-1 flex items-center gap-1.5">{children}</div>
    <div className="text-[9px] text-text-secondary font-medium text-center uppercase tracking-wider mt-1">
      {label}
    </div>
  </div>
);

interface RibbonButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  primary?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

const RibbonButton: React.FC<RibbonButtonProps> = ({ icon, label, active, primary, disabled, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={label}
    className={`flex flex-col items-center min-w-[52px] h-[62px] rounded-lg transition-all px-1 py-1.5 ${
      disabled
        ? 'opacity-30 cursor-not-allowed text-text-secondary'
        : active
        ? 'bg-accent/10 text-accent shadow-[inset_0_0_0_1px_var(--color-accent)]'
        : primary
        ? 'bg-accent text-bg-primary hover:bg-accent-hover shadow-lg shadow-accent/20'
        : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
    }`}
  >
    <div className="flex-1 flex items-center justify-center w-full">{icon}</div>
    <span className="text-[10px] font-medium leading-tight text-center w-full">{label}</span>
  </button>
);

/** Small icon-only button for the top bar quick-actions */
const QuickButton: React.FC<{ icon: React.ReactNode; label: string; disabled?: boolean; onClick: () => void }> = ({ icon, label, disabled, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={label}
    className={`p-1.5 rounded transition-colors ${
      disabled ? 'opacity-30 cursor-not-allowed text-text-secondary' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
    }`}
  >
    {icon}
  </button>
);

const RefreshCwIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
  </svg>
);

// ── Dropdown menu button in top bar ──────────────────────────

interface TopMenuProps {
  label: string;
  icon?: React.ReactNode;
  active: boolean;
  onToggle: () => void;
  onHover: () => void;
  children: React.ReactNode;
}

const TopMenu: React.FC<TopMenuProps> = ({ label, icon, active, onToggle, onHover, children }) => (
  <div className="relative h-full flex items-center">
    <button
      type="button"
      onClick={onToggle}
      onMouseEnter={onHover}
      className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1 whitespace-nowrap ${
        active ? 'bg-bg-hover text-text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
      }`}
    >
      {icon}
      {label}
    </button>
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.12 }}
          className="fixed mt-1 bg-bg-surface border border-border-subtle rounded-md shadow-2xl py-1 z-[9999]"
          style={{ top: 32, minWidth: '14rem' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

// Layer visibility checkbox row
const LayerToggle: React.FC<{ label: string; checked: boolean; onChange: () => void }> = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-1.5 cursor-pointer hover:text-text-primary transition-colors text-[10px] text-text-secondary">
    <input
      type="checkbox"
      className="accent-[var(--color-accent)] w-3 h-3"
      checked={checked}
      onChange={onChange}
    />
    {label}
  </label>
);

// ── Main Component ────────────────────────────────────────────

const TABS = ['Draw', 'Hydrology', 'Maps', 'Simulation', 'Results', 'Settings'] as const;

export const Ribbon: React.FC = () => {
  const {
    activeTool, setActiveTool,
    runSimulation, isSimulating, clearResults,
    selectedElementId, selectedElementType, deleteElement,
    setIsProfileViewerOpen,
    activeRibbonTab, setActiveRibbonTab,
    isSidebarCollapsed, setSidebarCollapsed,
    isBottomPanelOpen, setBottomPanelOpen,
    mapLayers, toggleMapLayer,
    importGISData, exportGeoJSON,
    theme, toggleTheme,
    isRainfallManagerOpen, setRainfallManagerOpen,
    undo, redo, past, future,
    resetProject, setReportViewerOpen,
    isSimulationSettingsOpen, setSimulationSettingsOpen,
    isProfileViewerOpen, isReportViewerOpen,
    isResultsViewerOpen, setResultsViewerOpen,
    simulationResults, addLogMessage,
    saveProject, loadProject,
    fitMapToBounds,
    setLayerManagerOpen, addExternalLayer, addRasterLayer,
    setScenariosOpen, isScenariosOpen, scenarios,
    setProjectionPanelOpen,
    setCNLookupOpen,
    defaultInfilMethod, setDefaultInfilMethod, applyGlobalInfilMethod,
    defaultTransformMethod, setDefaultTransformMethod, applyGlobalTransformMethod,
    subcatchments, rainfallEvents, activeRainfallEventId,
  } = useStore();

  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const ribbonRef = useRef<HTMLDivElement>(null);

  const projectRef     = useRef<HTMLInputElement>(null);
  const gisImportRef   = useRef<HTMLInputElement>(null);
  const layerImportRef = useRef<HTMLInputElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ribbonRef.current && !ribbonRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveProject(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') { e.preventDefault(); projectRef.current?.click(); }
      else if (e.key === 'F5') { e.preventDefault(); if (!isSimulating) runSimulation(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [saveProject, runSimulation, isSimulating]);

  const toggleMenu = (name: string) => setActiveMenu(prev => prev === name ? null : name);
  const hoverMenu  = (name: string) => { if (activeMenu) setActiveMenu(name); };
  const closeMenu  = () => setActiveMenu(null);

  const handleProjectLoad = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await loadProject(file);
    if (projectRef.current) projectRef.current.value = '';
    closeMenu();
  };

  const handleGISImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) { if (gisImportRef.current) gisImportRef.current.value = ''; return; }
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    // GeoJSON / Shapefile zip → extract network elements into the model
    if (ext === 'geojson' || ext === 'json' || ext === 'zip') {
      await importGISData(file);
    } else {
      // All other formats → add as a visual layer (same pipeline as "As Layer")
      await processGISFile(file, ext);
    }
    if (gisImportRef.current) gisImportRef.current.value = '';
  };

  // Shared elevation color ramp
  const elevationColor = (t: number): [number, number, number] => {
    const stops: [number, [number, number, number]][] = [
      [0.0,  [65,  105, 225]],
      [0.15, [34,  139, 34]],
      [0.35, [154, 205, 50]],
      [0.55, [218, 165, 32]],
      [0.75, [139, 90,  43]],
      [1.0,  [255, 255, 255]],
    ];
    for (let i = 0; i < stops.length - 1; i++) {
      const [t0, c0] = stops[i];
      const [t1, c1] = stops[i + 1];
      if (t >= t0 && t <= t1) {
        const f = (t - t0) / (t1 - t0);
        return [
          Math.round(c0[0] + f * (c1[0] - c0[0])),
          Math.round(c0[1] + f * (c1[1] - c0[1])),
          Math.round(c0[2] + f * (c1[2] - c0[2])),
        ];
      }
    }
    return [255, 255, 255];
  };

  // Core multi-format processing — used by both "Import GIS" and "As Layer"
  const processGISFile = async (file: File, ext: string) => {
    try {
      if (ext === 'tif' || ext === 'tiff') {
        const { fromArrayBuffer } = await import('geotiff');
        const buffer = await file.arrayBuffer();
        const tiff = await fromArrayBuffer(buffer);
        const image = await tiff.getImage();
        const bbox = image.getBoundingBox(); // [west, south, east, north] in native CRS
        const geoKeys = image.getGeoKeys();
        const epsgCode: number | undefined = geoKeys?.ProjectedCSTypeGeoKey || geoKeys?.GeographicTypeGeoKey;

        let [west, south, east, north] = bbox as [number, number, number, number];
        const looksProjected = Math.abs(west) > 180 || Math.abs(south) > 90 || Math.abs(east) > 180 || Math.abs(north) > 90;

        if (looksProjected && epsgCode) {
          const proj4Module = await import('proj4');
          const proj4 = (proj4Module as any).default ?? proj4Module;
          let proj4def: string | null = null;
          if (epsgCode >= 32601 && epsgCode <= 32660) {
            proj4def = `+proj=utm +zone=${epsgCode - 32600} +datum=WGS84 +units=m +no_defs`;
          } else if (epsgCode >= 32701 && epsgCode <= 32760) {
            proj4def = `+proj=utm +zone=${epsgCode - 32700} +south +datum=WGS84 +units=m +no_defs`;
          } else if (epsgCode === 3857 || epsgCode === 900913) {
            proj4def = '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs';
          } else if (epsgCode === 4269) {
            proj4def = '+proj=longlat +datum=NAD83 +no_defs';
          }
          if (proj4def) {
            proj4.defs(`EPSG:${epsgCode}`, proj4def);
            const sw = proj4(`EPSG:${epsgCode}`, 'EPSG:4326', [west, south]);
            const ne = proj4(`EPSG:${epsgCode}`, 'EPSG:4326', [east, north]);
            west = sw[0]; south = sw[1];
            east = ne[0]; north = ne[1];
          }
        }

        const origW = image.getWidth(), origH = image.getHeight();
        const MAX = 2048;
        const scale = Math.min(1, MAX / Math.max(origW, origH));
        const w = Math.round(origW * scale), h = Math.round(origH * scale);
        const nodata = image.getGDALNoData();
        const rasters = await image.readRasters({ interleave: true, width: w, height: h }) as unknown as number[];
        const bands = image.getSamplesPerPixel();
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        const imgData = ctx.createImageData(w, h);
        const colorMode: 'rgb' | 'elevation' = bands >= 3 ? 'rgb' : 'elevation';
        let min = Infinity, max = -Infinity;
        if (bands < 3) {
          for (let i = 0; i < w * h; i++) {
            const v = rasters[i * bands];
            if (nodata === null || Math.abs(v - nodata) > 0.001) { min = Math.min(min, v); max = Math.max(max, v); }
          }
        }
        for (let i = 0; i < w * h; i++) {
          const base = i * bands;
          let r: number, g: number, b: number, a = 255;
          if (bands >= 3) {
            r = rasters[base]; g = rasters[base + 1]; b = rasters[base + 2];
          } else {
            const v = rasters[base];
            const isNodata = nodata !== null && Math.abs(v - nodata) < 0.001;
            if (isNodata) { a = 0; r = g = b = 0; }
            else { const t = max > min ? (v - min) / (max - min) : 0.5; [r, g, b] = elevationColor(t); }
          }
          imgData.data[i * 4] = r!; imgData.data[i * 4 + 1] = g!; imgData.data[i * 4 + 2] = b!; imgData.data[i * 4 + 3] = a;
        }
        ctx.putImageData(imgData, 0, 0);

        // Build downsampled raw lookup grid for cursor sampling (≤256×256, single-band only)
        const RAW_MAX = 256;
        const rawW = Math.min(w, RAW_MAX);
        const rawH = Math.min(h, RAW_MAX);
        let rawValues: Float32Array | undefined;
        if (bands < 3 && min !== Infinity) {
          rawValues = new Float32Array(rawW * rawH);
          for (let ry = 0; ry < rawH; ry++) {
            for (let rx = 0; rx < rawW; rx++) {
              const sx = rawW > 1 ? Math.round((rx / (rawW - 1)) * (w - 1)) : 0;
              const sy = rawH > 1 ? Math.round((ry / (rawH - 1)) * (h - 1)) : 0;
              const v = rasters[(sy * w + sx) * bands];
              rawValues[ry * rawW + rx] = (nodata !== null && Math.abs(v - nodata) < 0.001) ? NaN : v;
            }
          }
        }

        addRasterLayer({
          name: file.name.replace(/\.[^.]+$/, ''), visible: true, opacity: 0.8,
          imageUrl: canvas.toDataURL('image/png'),
          bounds: [[south, west], [north, east]],
          width: w, height: h, min, max, colorMode, format: 'geotiff',
          rawValues, rawW, rawH,
        });
        fitMapToBounds();
        return;
      }

      if (ext === 'asc' || ext === 'dem') {
        const text = await file.text();
        const lines = text.trim().split(/\r?\n/);
        const header: Record<string, number> = {};
        let dataStart = 0;
        for (let i = 0; i < lines.length; i++) {
          const m = lines[i].trim().match(/^(\w+)\s+([^\s]+)/);
          if (m && isNaN(Number(m[1]))) { header[m[1].toLowerCase()] = parseFloat(m[2]); dataStart = i + 1; }
          else break;
        }
        const ncols = header['ncols'] | 0, nrows = header['nrows'] | 0;
        const xll = header['xllcorner'] ?? header['xllcenter'] ?? 0;
        const yll = header['yllcorner'] ?? header['yllcenter'] ?? 0;
        const cell = header['cellsize'] ?? 1;
        const nodata = header['nodata_value'] ?? -9999;
        const values: number[] = [];
        for (let i = dataStart; i < lines.length; i++) {
          lines[i].trim().split(/\s+/).forEach(v => values.push(parseFloat(v)));
        }
        let min = Infinity, max = -Infinity;
        values.forEach(v => { if (Math.abs(v - nodata) > 0.001) { min = Math.min(min, v); max = Math.max(max, v); } });
        const canvas = document.createElement('canvas');
        canvas.width = ncols; canvas.height = nrows;
        const ctx = canvas.getContext('2d')!;
        const imgData = ctx.createImageData(ncols, nrows);
        values.forEach((v, i) => {
          const isNodata = Math.abs(v - nodata) < 0.001;
          const t = (!isNodata && max > min) ? (v - min) / (max - min) : 0;
          const [r, g, b] = isNodata ? [0, 0, 0] : elevationColor(t);
          imgData.data[i * 4] = r; imgData.data[i * 4 + 1] = g; imgData.data[i * 4 + 2] = b;
          imgData.data[i * 4 + 3] = isNodata ? 0 : 255;
        });
        ctx.putImageData(imgData, 0, 0);

        // Build downsampled raw lookup grid for cursor sampling
        const RAW_MAX_ASC = 256;
        const rawW = Math.min(ncols, RAW_MAX_ASC);
        const rawH = Math.min(nrows, RAW_MAX_ASC);
        const rawValues = new Float32Array(rawW * rawH);
        for (let ry = 0; ry < rawH; ry++) {
          for (let rx = 0; rx < rawW; rx++) {
            const sx = rawW > 1 ? Math.round((rx / (rawW - 1)) * (ncols - 1)) : 0;
            const sy = rawH > 1 ? Math.round((ry / (rawH - 1)) * (nrows - 1)) : 0;
            const v = values[sy * ncols + sx];
            rawValues[ry * rawW + rx] = Math.abs(v - nodata) < 0.001 ? NaN : v;
          }
        }

        addRasterLayer({
          name: file.name.replace(/\.[^.]+$/, ''), visible: true, opacity: 0.8,
          imageUrl: canvas.toDataURL('image/png'),
          bounds: [[yll, xll], [yll + nrows * cell, xll + ncols * cell]],
          width: ncols, height: nrows, min, max, colorMode: 'elevation', format: 'asc',
          rawValues, rawW, rawH,
        });
        fitMapToBounds();
        return;
      }

      // Vector formats → GeoJSON
      let geojson: any;
      if (ext === 'zip') {
        const shpjs = await import('shpjs');
        geojson = await shpjs.default(await file.arrayBuffer());
      } else if (ext === 'kml') {
        const { kml } = await import('@tmcw/togeojson');
        geojson = kml(new DOMParser().parseFromString(await file.text(), 'application/xml'));
      } else if (ext === 'kmz') {
        const JSZip = (await import('jszip')).default;
        const { kml } = await import('@tmcw/togeojson');
        const zip = await JSZip.loadAsync(file);
        const kmlName = Object.keys(zip.files).find(f => f.toLowerCase().endsWith('.kml'));
        if (!kmlName) throw new Error('No KML file inside KMZ');
        geojson = kml(new DOMParser().parseFromString(await zip.files[kmlName].async('string'), 'application/xml'));
      } else if (ext === 'gpx') {
        const { gpx } = await import('@tmcw/togeojson');
        geojson = gpx(new DOMParser().parseFromString(await file.text(), 'application/xml'));
      } else if (ext === 'csv') {
        const lines = (await file.text()).trim().split(/\r?\n/);
        const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
        const latIdx = headers.findIndex(h => ['lat', 'latitude', 'y'].includes(h));
        const lngIdx = headers.findIndex(h => ['lon', 'lng', 'longitude', 'x'].includes(h));
        if (latIdx < 0 || lngIdx < 0) throw new Error('CSV must have lat/lon columns');
        const features = lines.slice(1).filter(Boolean).map(line => {
          const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
          const props: Record<string, string> = {};
          headers.forEach((h, i) => { props[h] = cols[i] ?? ''; });
          return { type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [parseFloat(cols[lngIdx]), parseFloat(cols[latIdx])] }, properties: props };
        });
        geojson = { type: 'FeatureCollection', features };
      } else if (ext === 'geojson' || ext === 'json') {
        geojson = JSON.parse(await file.text());
      } else {
        throw new Error(`Unsupported format: .${ext}`);
      }

      if (geojson?.type === 'Feature') geojson = { type: 'FeatureCollection', features: [geojson] };
      if (!geojson?.features) geojson = { type: 'FeatureCollection', features: [] };

      addExternalLayer({
        name: file.name.replace(/\.[^.]+$/, ''), visible: true, opacity: 0.8, sourceCRS: 'EPSG:4326',
        geojson, featureCount: geojson.features.length,
        geometryType: detectGeometryType(geojson),
        style: { color: '#5EC2B0', fillColor: '#5EC2B0', fillOpacity: 0.3, weight: 2, radius: 6 },
      });
    } catch (err: any) {
      console.error('Layer import failed:', err);
      addLogMessage(`Layer import failed: ${err?.message ?? 'Unknown error'}`);
    }
  };

  const handleLayerImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    await processGISFile(file, ext);
    if (layerImportRef.current) layerImportRef.current.value = '';
  };

  // ── Render ──────────────────────────────────────────────────
  return (
    <div ref={ribbonRef} className="flex flex-col z-30 bg-bg-surface border-b border-border-subtle" style={{ overflow: 'visible' }}>

      {/* ── Top row ── */}
      <div className="flex items-center h-8 px-2 bg-bg-primary/60 border-b border-border-subtle gap-1" style={{ overflow: 'visible' }}>

        {/* Logo */}
        <div className="font-bold text-sm text-accent flex items-center gap-1.5 shrink-0 mr-1">
          <div className="w-5 h-5 bg-accent rounded flex items-center justify-center text-bg-primary">
            <span className="font-black text-[10px]">H</span>
          </div>
          HidroCity
        </div>

        <div className="w-px h-4 bg-border-subtle mx-1 shrink-0" />

        {/* ── TABS — contiguous, left-aligned ── */}
        <div className="flex items-end h-full">
          {TABS.map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveRibbonTab(tab)}
              className={`px-3 h-full text-xs font-medium transition-colors relative whitespace-nowrap ${
                activeRibbonTab === tab
                  ? 'text-accent bg-bg-surface/60'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
              }`}
            >
              {tab}
              {activeRibbonTab === tab && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
              )}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Quick actions */}
        <div className="flex items-center gap-0.5">
          <QuickButton icon={<Undo2 size={14}/>} label="Undo (Ctrl+Z)" disabled={past.length === 0} onClick={undo} />
          <QuickButton icon={<Redo2 size={14}/>} label="Redo (Ctrl+Y)" disabled={future.length === 0} onClick={redo} />
        </div>

        <div className="w-px h-4 bg-border-subtle mx-1 shrink-0" />

        {/* File menu */}
        <TopMenu
          label="File"
          active={activeMenu === 'File'}
          onToggle={() => toggleMenu('File')}
          onHover={() => hoverMenu('File')}
        >
          <DropdownItem icon={<FolderOpen size={14}/>} label="Open Project..." shortcut="Ctrl+O"
            onClick={() => { projectRef.current?.click(); closeMenu(); }} />
          <DropdownItem icon={<Save size={14}/>} label="Save Project" shortcut="Ctrl+S"
            onClick={() => { saveProject(); closeMenu(); }} />
          <DropdownSeparator />
          <DropdownItem icon={<FilePlus size={14}/>} label="New Project"
            onClick={() => { if (window.confirm('Start a new project? Unsaved progress will be lost.')) { resetProject(); closeMenu(); } }} />
        </TopMenu>

        {/* Help menu */}
        <TopMenu
          label="Help"
          active={activeMenu === 'Help'}
          onToggle={() => toggleMenu('Help')}
          onHover={() => hoverMenu('Help')}
        >
          <DropdownItem icon={<HelpCircle size={14}/>} label="Documentation" onClick={closeMenu} />
          <DropdownItem label="About HidroCity Pro" onClick={closeMenu} />
        </TopMenu>

        <div className="w-px h-4 bg-border-subtle mx-1 shrink-0" />

        {/* Theme toggle */}
        <QuickButton
          icon={theme === 'dark' ? <Sun size={14}/> : <Moon size={14}/>}
          label="Toggle theme"
          onClick={toggleTheme}
        />
      </div>

      {/* ── Ribbon content area ── */}
      <div className="h-[88px] px-3 py-1.5 flex items-center gap-4 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>

        {/* ════════════ DRAW ════════════ */}
        {activeRibbonTab === 'Draw' && (
          <>
            <RibbonGroup label="Selection">
              <RibbonButton
                icon={<MousePointer2 size={20}/>}
                label="Select"
                active={activeTool === 'Select'}
                onClick={() => setActiveTool('Select')}
              />
              <RibbonButton
                icon={<Trash2 size={20}/>}
                label="Delete"
                disabled={!selectedElementId}
                onClick={() => selectedElementId && selectedElementType && deleteElement(selectedElementId, selectedElementType)}
              />
            </RibbonGroup>

            <RibbonGroup label="History">
              <RibbonButton icon={<Undo2 size={20}/>} label="Undo" disabled={past.length === 0} onClick={undo} />
              <RibbonButton icon={<Redo2 size={20}/>} label="Redo" disabled={future.length === 0} onClick={redo} />
            </RibbonGroup>

            <RibbonGroup label="Nodes">
              <RibbonButton
                icon={<CircleDot size={20}/>}
                label="Node"
                active={activeTool === 'AddNode'}
                onClick={() => setActiveTool('AddNode')}
              />
            </RibbonGroup>

            <RibbonGroup label="Drainage Network">
              <RibbonButton
                icon={<Minus size={20}/>}
                label="Conduit"
                active={activeTool === 'AddConduit'}
                onClick={() => setActiveTool('AddConduit')}
              />
            </RibbonGroup>

            <RibbonGroup label="Subcatchments">
              <RibbonButton
                icon={<Hexagon size={20}/>}
                label="Subcatchment"
                active={activeTool === 'AddSubcatchment'}
                onClick={() => setActiveTool('AddSubcatchment')}
              />
            </RibbonGroup>

            <RibbonGroup label="Measurement">
              <RibbonButton
                icon={<Ruler size={20}/>}
                label="Measure"
                active={activeTool === 'Measure'}
                onClick={() => setActiveTool('Measure')}
              />
            </RibbonGroup>
          </>
        )}

        {/* ════════════ HYDROLOGY ════════════ */}
        {activeRibbonTab === 'Hydrology' && (() => {
          const activeEvent = rainfallEvents.find(e => e.id === activeRainfallEventId);
          const totalArea = subcatchments.reduce((s, c) => s + c.area, 0);
          const avgImperv = subcatchments.length > 0
            ? subcatchments.reduce((s, c) => s + c.imperv, 0) / subcatchments.length
            : 0;
          const cnSubcatchments = subcatchments.filter(s => s.infilMethod === 'Curve_Number');
          const avgCN = cnSubcatchments.length > 0
            ? cnSubcatchments.reduce((s, c) => s + (c.curveNumber ?? 0), 0) / cnSubcatchments.length
            : null;
          return (
            <>
              {/* ── Rainfall ── */}
              <RibbonGroup label="Rainfall">
                <RibbonButton
                  icon={<CloudRain size={20}/>}
                  label="Manager"
                  active={isRainfallManagerOpen}
                  onClick={() => setRainfallManagerOpen(true)}
                />
                <div className="flex flex-col justify-center text-[10px] text-text-secondary max-w-[90px]">
                  <span className="font-medium text-text-primary truncate">
                    {activeEvent ? activeEvent.name : 'No event'}
                  </span>
                  <span>{rainfallEvents.length} event{rainfallEvents.length !== 1 ? 's' : ''}</span>
                </div>
              </RibbonGroup>

              {/* ── Global Infiltration ── */}
              <RibbonGroup label="Global Infiltration">
                <div className="flex flex-col gap-1.5 justify-center">
                  <select
                    title="Default infiltration method"
                    value={defaultInfilMethod}
                    onChange={e => setDefaultInfilMethod(e.target.value as any)}
                    className="bg-bg-primary border border-border-subtle rounded text-[10px] text-text-primary px-1.5 py-1 outline-none hover:border-accent/50 transition-colors cursor-pointer"
                  >
                    <option value="Horton">Horton</option>
                    <option value="Green_Ampt">Green-Ampt</option>
                    <option value="Curve_Number">SCS Curve Number</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => applyGlobalInfilMethod(defaultInfilMethod)}
                    disabled={subcatchments.length === 0}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <RefreshCw size={10}/> Apply to All
                  </button>
                </div>
              </RibbonGroup>

              {/* ── Global Transform ── */}
              <RibbonGroup label="Global Transform">
                <div className="flex flex-col gap-1.5 justify-center">
                  <select
                    title="Default transform method"
                    value={defaultTransformMethod}
                    onChange={e => setDefaultTransformMethod(e.target.value as any)}
                    className="bg-bg-primary border border-border-subtle rounded text-[10px] text-text-primary px-1.5 py-1 outline-none hover:border-accent/50 transition-colors cursor-pointer"
                  >
                    <option value="SCS_Unit_Hydrograph">SCS Unit Hydrograph</option>
                    <option value="SWMM_NonLinear_Reservoir">SWMM Non-Linear Reservoir</option>
                    <option value="Clark_Unit_Hydrograph">Clark Unit Hydrograph</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => applyGlobalTransformMethod(defaultTransformMethod)}
                    disabled={subcatchments.length === 0}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <RefreshCw size={10}/> Apply to All
                  </button>
                </div>
              </RibbonGroup>

              {/* ── Reference ── */}
              <RibbonGroup label="Reference">
                <RibbonButton
                  icon={<BookOpen size={20}/>}
                  label="CN Lookup"
                  onClick={() => setCNLookupOpen(true)}
                />
              </RibbonGroup>

              {/* ── Basin Summary ── */}
              <RibbonGroup label="Basin Summary">
                <div className="flex flex-col gap-0.5 text-[10px] text-text-secondary justify-center">
                  <div>Subcatchments: <span className="text-text-primary font-medium">{subcatchments.length}</span></div>
                  <div>Total area: <span className="text-text-primary font-medium">{totalArea.toFixed(2)} ha</span></div>
                  <div>Avg imperv.: <span className="text-text-primary font-medium">{avgImperv.toFixed(1)}%</span></div>
                  <div>Avg CN: <span className="text-text-primary font-medium">{avgCN !== null ? avgCN.toFixed(0) : '—'}</span></div>
                </div>
              </RibbonGroup>
            </>
          );
        })()}

        {/* ════════════ MAPS ════════════ */}
        {activeRibbonTab === 'Maps' && (
          <>
            <RibbonGroup label="Navigation">
              <RibbonButton icon={<Maximize size={20}/>} label="Fit View" onClick={fitMapToBounds} />
            </RibbonGroup>

            <RibbonGroup label="Layer Management">
              <RibbonButton icon={<Layers size={20}/>} label="Layer Manager" onClick={() => setLayerManagerOpen(true)} />
              <RibbonButton icon={<Globe size={20}/>} label="CRS System" onClick={() => setProjectionPanelOpen(true)} />
            </RibbonGroup>

            <RibbonGroup label="Base Maps">
              <div className="flex flex-col gap-1">
                <LayerToggle label="OpenStreetMap" checked={mapLayers.baseMap} onChange={() => toggleMapLayer('baseMap')} />
                <LayerToggle label="Satellite (Esri)" checked={mapLayers.satelliteLayer} onChange={() => toggleMapLayer('satelliteLayer')} />
                <LayerToggle label="Topographic WMS" checked={mapLayers.wmsLayer} onChange={() => toggleMapLayer('wmsLayer')} />
              </div>
            </RibbonGroup>

            <RibbonGroup label="Data Layers">
              <div className="flex flex-col gap-1">
                <LayerToggle label="Drainage Network" checked={mapLayers.drainageNetwork} onChange={() => toggleMapLayer('drainageNetwork')} />
                <LayerToggle label="Subcatchments" checked={mapLayers.subcatchments} onChange={() => toggleMapLayer('subcatchments')} />
                <LayerToggle label="Results" checked={mapLayers.simulationResults} onChange={() => toggleMapLayer('simulationResults')} />
              </div>
            </RibbonGroup>

            <RibbonGroup label="GIS">
              <RibbonButton icon={<Upload size={20}/>} label="Import GIS" onClick={() => gisImportRef.current?.click()} />
              <RibbonButton icon={<MapIcon size={20}/>} label="As Layer" onClick={() => layerImportRef.current?.click()} />
              <RibbonButton icon={<Download size={20}/>} label="Export" onClick={exportGeoJSON} />
            </RibbonGroup>
          </>
        )}

        {/* ════════════ SIMULATION ════════════ */}
        {activeRibbonTab === 'Simulation' && (
          <>
            <RibbonGroup label="Execution">
              <RibbonButton
                icon={isSimulating ? <Square size={20} className="animate-pulse"/> : <Play size={20}/>}
                label={isSimulating ? 'Simulating...' : 'Run'}
                primary
                onClick={runSimulation}
                disabled={isSimulating}
              />
              <RibbonButton icon={<RefreshCwIcon size={20}/>} label="Clear" onClick={clearResults} />
            </RibbonGroup>

            <RibbonGroup label="Scenarios">
              <RibbonButton
                icon={<BarChart2 size={20}/>}
                label="Scenarios"
                active={isScenariosOpen}
                onClick={() => setScenariosOpen(!isScenariosOpen)}
              />
              {scenarios.length > 0 && (
                <div className="flex flex-col justify-center text-[10px] text-text-secondary">
                  <span>{scenarios.length} saved</span>
                </div>
              )}
            </RibbonGroup>

            <RibbonGroup label="Configuration">
              <RibbonButton
                icon={<Settings size={20}/>}
                label="Parameters"
                active={isSimulationSettingsOpen}
                onClick={() => setSimulationSettingsOpen(true)}
              />
            </RibbonGroup>

            <RibbonGroup label="Status">
              <div className="flex flex-col gap-1 text-[10px]">
                <div className={`flex items-center gap-1.5 ${isSimulating ? 'text-accent' : 'text-text-secondary'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${isSimulating ? 'bg-accent animate-pulse' : 'bg-text-secondary/30'}`} />
                  {isSimulating ? 'Running...' : simulationResults ? 'Completed' : 'No results'}
                </div>
                {simulationResults && (
                  <div className="text-text-secondary">
                    Nodes: {Object.keys(simulationResults.nodes ?? {}).length}
                  </div>
                )}
              </div>
            </RibbonGroup>
          </>
        )}

        {/* ════════════ RESULTS ════════════ */}
        {activeRibbonTab === 'Results' && (
          <>
            <RibbonGroup label="Visualization">
              <RibbonButton
                icon={<BarChart2 size={20}/>}
                label="Dashboard"
                active={isResultsViewerOpen}
                onClick={() => {
                  if (simulationResults) setResultsViewerOpen(true);
                  else addLogMessage('Run a simulation first to view the dashboard.');
                }}
              />
              <RibbonButton
                icon={<Activity size={20}/>}
                label="Profile"
                active={isProfileViewerOpen}
                onClick={() => setIsProfileViewerOpen(true)}
              />
              <RibbonButton
                icon={<FileText size={20}/>}
                label="Report"
                active={isReportViewerOpen}
                onClick={() => setReportViewerOpen(true)}
              />
              <RibbonButton
                icon={<BarChart2 size={20}/>}
                label="Scenarios"
                active={isScenariosOpen}
                onClick={() => setScenariosOpen(!isScenariosOpen)}
              />
            </RibbonGroup>

            <RibbonGroup label="Results Map">
              <div className="flex flex-col gap-1">
                <LayerToggle
                  label="Show on map"
                  checked={mapLayers.simulationResults}
                  onChange={() => toggleMapLayer('simulationResults')}
                />
              </div>
            </RibbonGroup>

            <RibbonGroup label="Artificial Intelligence">
              <RibbonButton
                icon={<Brain size={20}/>}
                label="AI Advisor"
                onClick={() => addLogMessage('AI Advisor: run a simulation to get automatic recommendations.')}
              />
            </RibbonGroup>
          </>
        )}

        {/* ════════════ SETTINGS ════════════ */}
        {activeRibbonTab === 'Settings' && (
          <>
            <RibbonGroup label="Interface">
              <RibbonButton
                icon={theme === 'dark' ? <Moon size={20}/> : <Sun size={20}/>}
                label="Theme"
                onClick={toggleTheme}
              />
              <RibbonButton
                icon={<PanelLeft size={20}/>}
                label="Sidebar"
                active={!isSidebarCollapsed}
                onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
              />
              <RibbonButton
                icon={<PanelBottom size={20}/>}
                label="Console"
                active={isBottomPanelOpen}
                onClick={() => setBottomPanelOpen(!isBottomPanelOpen)}
              />
            </RibbonGroup>

            <RibbonGroup label="Diagnostics">
              <div className="flex flex-col gap-1 text-[10px] text-text-secondary">
                <div>Theme: <span className="text-text-primary">{theme}</span></div>
                <div>Project CRS: <span className="text-text-primary">EPSG:4326</span></div>
                <div>Version: <span className="text-text-primary">1.0.0</span></div>
              </div>
            </RibbonGroup>
          </>
        )}
      </div>

      {/* ── Hidden inputs ── */}
      <input type="file" title="Open Project"      ref={projectRef}     onChange={handleProjectLoad} className="hidden" accept=".json" />
      <input type="file" title="Import GIS"        ref={gisImportRef}   onChange={handleGISImport}   className="hidden" accept=".geojson,.json,.zip,.kml,.kmz,.gpx,.csv,.tif,.tiff,.dem,.asc" />
      <input type="file" title="Import as Layer"   ref={layerImportRef} onChange={handleLayerImport} className="hidden" accept=".geojson,.json,.zip,.kml,.kmz,.gpx,.csv,.tif,.tiff,.dem,.asc" />
    </div>
  );
};
