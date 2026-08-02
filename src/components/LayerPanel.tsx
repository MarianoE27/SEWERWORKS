import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import { Maximize, Layers, X, Eye, EyeOff, Trash2, ChevronDown, ChevronRight, Palette, Image as ImageIcon, CircleDot, Minus, Mountain } from 'lucide-react';
import L from 'leaflet';
import { ContourConfig } from '../types';
import { ConfirmModal } from './ui/ConfirmModal';
import { useTranslation } from 'react-i18next';

// ── DEM Limits Control ──────────────────────────────────────────

function DemLimitsControl({ dem, updateDEM }: { dem: any; updateDEM: (updates: any) => void }) {
  const { t } = useTranslation();
  const [minText, setMinText] = useState(dem.minVal?.toString() ?? '');
  const [maxText, setMaxText] = useState(dem.maxVal?.toString() ?? '');

  useEffect(() => {
    setMinText(dem.minVal?.toString() ?? '');
  }, [dem.minVal]);

  useEffect(() => {
    setMaxText(dem.maxVal?.toString() ?? '');
  }, [dem.maxVal]);

  const apply = () => {
    const minV = parseFloat(minText);
    const maxV = parseFloat(maxText);
    updateDEM({ 
      minVal: isNaN(minV) ? undefined : minV,
      maxVal: isNaN(maxV) ? undefined : maxV
    });
  };

  return (
    <div className="flex items-center gap-2 text-[10px] mt-1">
      <span className="text-muted w-12 shrink-0">{t('layers.limits', 'Límites:')}</span>
      <input
        type="number"
        title={t('layers.min_elev', 'Cota mín (m)')}
        value={minText}
        onChange={(e) => setMinText(e.target.value)}
        className="w-16 flex-1 bg-bg-primary border border-border-subtle rounded px-1.5 py-1 text-[10px] text-text-primary focus:outline-none focus:border-accent"
        placeholder={t('layers.min_elev', 'Mín')}
      />
      <input
        type="number"
        title={t('layers.max_elev', 'Cota máx (m)')}
        value={maxText}
        onChange={(e) => setMaxText(e.target.value)}
        className="w-16 flex-1 bg-bg-primary border border-border-subtle rounded px-1.5 py-1 text-[10px] text-text-primary focus:outline-none focus:border-accent"
        placeholder={t('layers.max_elev', 'Máx')}
      />
      <button
        type="button"
        onClick={apply}
        className="shrink-0 px-2 py-1 bg-accent text-white rounded text-[10px] hover:bg-accent/80 transition-colors"
      >
        {t('layers.apply', 'Aplicar')}
      </button>
    </div>
  );
}

// ── LOD Control ──────────────────────────────────────────────────

function LODControl() {
  const { t } = useTranslation();
  const { lodConfig, setLodConfig } = useStore();
  
  return (
    <div className={`mt-2 flex items-center justify-between px-2.5 py-1.5 rounded border transition-colors ${lodConfig.enabled ? 'border-accent/50 bg-accent/5' : 'border-border-subtle/50 bg-bg-primary/10'}`}>
      <span className={`text-[11px] font-medium ${lodConfig.enabled ? 'text-accent' : 'text-text-secondary'}`}>
        {t('layers.lod_title', 'Nivel de Detalle (LOD)')}
      </span>
      <button
        onClick={() => setLodConfig({ enabled: !lodConfig.enabled })}
        className={`w-7 h-3.5 rounded-full relative transition-colors ${lodConfig.enabled ? 'bg-accent' : 'bg-surface-hover border border-border-subtle'}`}
      >
        <div className={`absolute top-0.5 left-0.5 w-2.5 h-2.5 bg-white rounded-full transition-transform ${lodConfig.enabled ? 'translate-x-3.5' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

// ── DEM Color Scale Control ────────────────────────────────────

function DemColorScaleControl({ dem, updateDEM }: { dem: any; updateDEM: (updates: any) => void }) {
  const { t } = useTranslation();
  const [pendingScale, setPendingScale] = useState(dem.colorScale ?? 'terrain');

  useEffect(() => {
    setPendingScale(dem.colorScale ?? 'terrain');
  }, [dem.colorScale]);

  const apply = () => updateDEM({ colorScale: pendingScale });

  return (
    <div className="flex items-center gap-2 text-[10px] pb-1">
      <span className="text-muted w-12 shrink-0">{t('layers.scale', 'Escala:')}</span>
      <select
        title={t('layers.scale', 'Escala de colores DEM')}
        value={pendingScale}
        onChange={(e) => setPendingScale(e.target.value)}
        className="flex-1 bg-bg-primary border border-border-subtle rounded px-1.5 py-1 text-[10px] text-text-primary focus:outline-none focus:border-accent"
      >
        <option value="terrain">{t('layers.scales.terrain', 'Terreno')}</option>
        <option value="elevation">{t('layers.scales.elevation', 'Elevación')}</option>
        <option value="viridis">{t('layers.scales.viridis', 'Viridis')}</option>
        <option value="grayscale">{t('layers.scales.grayscale', 'Escala de grises')}</option>
        <option value="rainbow">{t('layers.scales.rainbow', 'Arcoíris')}</option>
        <option value="hot">{t('layers.scales.hot', 'Calor')}</option>
      </select>
      <button
        type="button"
        onClick={apply}
        className="shrink-0 px-2 py-1 bg-accent text-white rounded text-[10px] hover:bg-accent/80 transition-colors"
      >
        {t('layers.apply', 'Aplicar')}
      </button>
    </div>
  );
}

// ── Layer Row ──────────────────────────────────────────────────

interface LayerRowProps {
  name: string;
  icon: React.ReactNode;
  color: string;
  visible: boolean;
  opacity: number;
  onToggleVisible: () => void;
  onOpacityChange: (val: number) => void;
  onDelete?: () => void;
  onZoom?: () => void;
  children?: React.ReactNode;
}

const LayerRow: React.FC<LayerRowProps> = ({
  name, icon, color, visible, opacity,
  onToggleVisible, onOpacityChange, onDelete, onZoom, children
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded border transition-colors ${visible ? 'border-border-subtle bg-bg-primary/40' : 'border-border-subtle/50 bg-bg-primary/10'}`}>
      <div className="flex items-center gap-2 px-2.5 py-1.5">
        <button
          onClick={onToggleVisible}
          className={`shrink-0 transition-colors ${visible ? 'text-text-primary' : 'text-text-secondary'}`}
          title={visible ? t('layers.hide', 'Ocultar capa') : t('layers.show', 'Mostrar capa')}
        >
          {visible ? <Eye size={13} /> : <EyeOff size={13} />}
        </button>

        <div className="shrink-0 w-4 h-4 rounded flex items-center justify-center text-[10px]" style={{ backgroundColor: `${color}15`, color }}>
          {icon}
        </div>

        <div className={`flex-1 min-w-0 text-[11px] font-medium truncate ${visible ? 'text-text-primary' : 'text-text-secondary'}`}>
          {name}
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          {onZoom && (
            <button onClick={onZoom} className="p-0.5 text-text-secondary hover:text-accent transition-colors rounded" title={t('layers.zoom', 'Ajustar a la capa')}>
              <Maximize size={11} />
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} className="p-0.5 text-text-secondary hover:text-red-400 transition-colors rounded" title={t('layers.delete', 'Eliminar capa')}>
              <Trash2 size={11} />
            </button>
          )}
          <button onClick={() => setExpanded(e => !e)} className="p-0.5 text-text-secondary hover:text-text-primary transition-colors rounded">
            {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="overflow-hidden"
          >
            <div className="px-2.5 pb-2 space-y-1.5 border-t border-border-subtle/20 pt-1.5 bg-bg-primary/20">
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-text-secondary w-14">{t('layers.opacity', 'Opacidad')}</span>
                <input
                  type="range" min={0} max={1} step={0.05}
                  value={opacity}
                  onChange={e => onOpacityChange(Number(e.target.value))}
                  className="flex-1 accent-accent cursor-pointer h-1"
                />
                <span className="text-[9px] text-text-secondary w-8 text-right font-mono">{Math.round(opacity * 100)}%</span>
              </div>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Section Header ──────────────────────────────────────────────

const SectionHeader: React.FC<{ title: string; icon?: React.ReactNode; count?: number; isOpen: boolean; onToggle: () => void }> = ({ title, icon, count, isOpen, onToggle }) => (
  <button
    onClick={onToggle}
    className="w-full flex items-center gap-2 py-2 text-[9px] font-bold uppercase tracking-wider text-text-secondary hover:text-text-primary transition-colors text-left"
  >
    {isOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
    {icon}
    {title}
    {count !== undefined && (
      <span className="ml-auto bg-bg-primary/50 text-text-secondary px-1.5 py-0.5 rounded text-[8px] font-mono">{count}</span>
    )}
  </button>
);

// ── Contour Controls ───────────────────────────────────────────

const INPUT_CLS = 'w-full bg-bg-input border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent';

function ContourControls({ config, update }: { config: ContourConfig; update: (u: Partial<ContourConfig>) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  // Umbrales estimados para mostrar al usuario
  const estimatedCount = config.interval > 0
    ? '~' + Math.round(100 / config.interval) + ' ' + t('layers.contours_unit', 'curvas/100 m')
    : '—';

  return (
    <div className="mt-2 border border-border/60 rounded-md overflow-hidden">
      {/* Header toggle */}
      <button
        type="button"
        className="w-full flex items-center gap-2 px-2 py-1.5 bg-surface-hover hover:bg-bg-input transition-colors text-xs"
        onClick={() => setOpen(o => !o)}
      >
        <Mountain size={12} className="text-emerald-400 shrink-0" />
        <span className="flex-1 text-left font-medium text-text-primary">{t('layers.contours', 'Curvas de Nivel')}</span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); update({ visible: !config.visible }); }}
          className="p-0.5 rounded hover:bg-bg-hover transition-colors"
          title={config.visible ? t('layers.hide', 'Ocultar') : t('layers.show', 'Mostrar')}
        >
          {config.visible
            ? <Eye size={12} className="text-accent" />
            : <EyeOff size={12} className="text-muted" />}
        </button>
        {open ? <ChevronDown size={11} className="text-muted" /> : <ChevronRight size={11} className="text-muted" />}
      </button>

      {open && (
        <div className="px-3 py-2 space-y-2.5 bg-bg-surface">
          {/* Intervalo */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-muted mb-1">{t('layers.interval', 'Intervalo (m)')}</label>
              <input
                type="number" min="0.1" step="0.5" title={t('layers.interval', 'Intervalo entre curvas de nivel (m)')}
                value={config.interval}
                onChange={(e) => update({ interval: parseFloat(e.target.value) || 1 })}
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label className="block text-[10px] text-muted mb-1">{t('layers.major_every', 'Curva maestra cada')}</label>
              <select
                title={t('layers.major_every', 'Intervalo entre curvas maestras')}
                value={config.majorMultiplier}
                onChange={(e) => update({ majorMultiplier: parseInt(e.target.value) })}
                className={INPUT_CLS}
              >
                {[2, 4, 5, 10, 20].map(n => (
                  <option key={n} value={n}>× {n}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Rango elevación */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-muted mb-1">{t('layers.min_elev', 'Cota mín (m)')}</label>
              <input
                type="number" step="1" placeholder={t('layers.auto', 'Auto')}
                value={config.minElev ?? ''}
                onChange={(e) => update({ minElev: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label className="block text-[10px] text-muted mb-1">{t('layers.max_elev', 'Cota máx (m)')}</label>
              <input
                type="number" step="1" placeholder={t('layers.auto', 'Auto')}
                value={config.maxElev ?? ''}
                onChange={(e) => update({ maxElev: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                className={INPUT_CLS}
              />
            </div>
          </div>

          {/* Colores y grosores */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-muted mb-1">{t('layers.minor_color', 'Color secundaria')}</label>
              <div className="flex gap-1 items-center">
                <input type="color" value={config.color}
                  onChange={(e) => update({ color: e.target.value })}
                  className="w-7 h-7 rounded cursor-pointer border border-border bg-transparent p-0.5" />
                <input type="number" min="0.5" max="4" step="0.5"
                  value={config.weight}
                  onChange={(e) => update({ weight: parseFloat(e.target.value) || 1 })}
                  className={INPUT_CLS}
                  title={t('layers.weight_px', 'Grosor (px)')} />
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-muted mb-1">{t('layers.major_color', 'Color maestra')}</label>
              <div className="flex gap-1 items-center">
                <input type="color" value={config.majorColor}
                  onChange={(e) => update({ majorColor: e.target.value })}
                  className="w-7 h-7 rounded cursor-pointer border border-border bg-transparent p-0.5" />
                <input type="number" min="0.5" max="6" step="0.5"
                  value={config.majorWeight}
                  onChange={(e) => update({ majorWeight: parseFloat(e.target.value) || 2 })}
                  className={INPUT_CLS}
                  title={t('layers.weight_px', 'Grosor (px)')} />
              </div>
            </div>
          </div>

          {/* Opacidad y etiquetas */}
          <div className="grid grid-cols-2 gap-2 items-center">
            <div>
              <label className="block text-[10px] text-muted mb-1">{t('layers.opacity', 'Opacidad')} {Math.round(config.opacity * 100)}%</label>
              <input type="range" min="0.1" max="1" step="0.05" title={t('layers.opacity', 'Opacidad de curvas de nivel')}
                value={config.opacity}
                onChange={(e) => update({ opacity: parseFloat(e.target.value) })}
                className="w-full h-1.5 accent-accent" />
            </div>
            <div className="flex items-center gap-2 pt-3">
              <input type="checkbox" id="contour-labels"
                checked={config.labelVisible}
                onChange={(e) => update({ labelVisible: e.target.checked })}
                className="accent-accent" />
              <label htmlFor="contour-labels" className="text-[10px] text-text-primary cursor-pointer">
                {t('layers.labels_on_major', 'Cotas en maestras')}
              </label>
            </div>
          </div>

          {/* Info estimada */}
          <div className="text-[9px] text-faint text-right">{estimatedCount}</div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────

export function LayerPanel() {
  const { t } = useTranslation();
  const {
    isLayerManagerOpen, setIsLayerManagerOpen, layers, setLayerVisibility,
    shapefiles, dem, contourConfig,
    updateShapefile, removeShapefile, reorderShapefiles, updateDEM, removeDEM,
    updateContourConfig, setZoomBounds
  } = useStore();

  const [systemOpen, setSystemOpen] = useState(true);
  const [vectorOpen, setVectorOpen] = useState(true);
  const [rasterOpen, setRasterOpen] = useState(true);

  const [layerToDelete, setLayerToDelete] = useState<{ id: string, type: 'shapefile' | 'dem', name: string } | null>(null);

  const confirmDelete = () => {
    if (!layerToDelete) return;
    if (layerToDelete.type === 'shapefile') {
      removeShapefile(layerToDelete.id);
    } else if (layerToDelete.type === 'dem') {
      removeDEM();
    }
    setLayerToDelete(null);
  };

  const SYSTEM_LAYER_DEFS = React.useMemo(() => [
    { key: 'nodes' as const, name: t('layers.system.nodes', 'Cámaras (Nodos)'), icon: <CircleDot size={11} />, color: '#10b981' },
    { key: 'conduits' as const, name: t('layers.system.conduits', 'Tuberías (Conductos)'), icon: <Minus size={11} />, color: '#3b82f6' },
    { key: 'backgroundMap' as const, name: t('layers.system.backgroundMap', 'Mapa Base'), icon: <Layers size={11} />, color: '#64748b' },
    { key: 'labels' as const, name: t('layers.system.labels', 'Etiquetas'), icon: <Layers size={11} />, color: '#f59e0b' },
    { key: 'flowArrows' as const, name: t('layers.system.flowArrows', 'Flechas de Flujo'), icon: <Layers size={11} />, color: '#8b5cf6' },
  ], [t]);

  const zoomToShapefile = (shp: any) => {
    try {
      const geoJsonLayer = L.geoJSON(shp.data);
      const bounds = geoJsonLayer.getBounds();
      if (bounds.isValid()) setZoomBounds(bounds);
    } catch (e) {
      console.error("Error calculating bounds", e);
    }
  };

  const zoomToDEM = () => {
    if (dem?.bbox) {
      try {
        const bounds = L.latLngBounds(
          [dem.bbox[1], dem.bbox[0]],
          [dem.bbox[3], dem.bbox[2]]
        );
        setZoomBounds(bounds);
      } catch (e) {
        console.error("Error calculating DEM bounds", e);
      }
    }
  };

  return (
    <AnimatePresence>
      {isLayerManagerOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-[2900]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsLayerManagerOpen(false)}
          />

          <motion.div
            className="fixed top-0 right-0 bottom-0 w-80 z-[3000] bg-bg-surface border-l border-border-subtle flex flex-col shadow-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-11 border-b border-border-subtle bg-bg-surface">
              <div className="flex items-center gap-2 text-text-primary font-bold text-xs uppercase tracking-wider">
                <Layers size={14} className="text-accent" />
                {t('layers.title', 'Gestor de Capas')}
              </div>
              <button
                onClick={() => setIsLayerManagerOpen(false)}
                className="p-1 text-text-secondary hover:text-text-primary transition-colors rounded"
              >
                <X size={15} />
              </button>
            </div>

            {/* Layer list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">

              {/* ── System layers ── */}
              <SectionHeader
                title={t('layers.system_layers', 'Capas del Sistema')}
                icon={<Layers size={10} />}
                count={SYSTEM_LAYER_DEFS.length}
                isOpen={systemOpen}
                onToggle={() => setSystemOpen(o => !o)}
              />
              <AnimatePresence>
                {systemOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1 overflow-hidden"
                  >
                    {SYSTEM_LAYER_DEFS.map(layer => (
                      <div key={layer.key} className={`flex items-center gap-2 px-2.5 py-1.5 rounded border transition-colors ${layers[layer.key] ? 'border-border-subtle bg-bg-primary/40' : 'border-border-subtle/50 bg-bg-primary/10'}`}>
                        <button
                          onClick={() => setLayerVisibility(layer.key, !layers[layer.key])}
                          className={`shrink-0 transition-colors ${layers[layer.key] ? 'text-text-primary' : 'text-text-secondary'}`}
                        >
                          {layers[layer.key] ? <Eye size={13} /> : <EyeOff size={13} />}
                        </button>
                        <div className="shrink-0 w-4 h-4 rounded flex items-center justify-center text-[10px]" style={{ backgroundColor: `${layer.color}15`, color: layer.color }}>
                          {layer.icon}
                        </div>
                        <span className={`text-[11px] font-medium ${layers[layer.key] ? 'text-text-primary' : 'text-text-secondary'}`}>
                          {layer.name}
                        </span>
                      </div>
                    ))}
                    <LODControl />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="h-px bg-border-subtle/30 my-2" />

              {/* ── Vector layers (Shapefiles) ── */}
              <SectionHeader
                title={t('layers.vector_layers', 'Capas Vectoriales')}
                icon={<Palette size={10} />}
                count={shapefiles.length}
                isOpen={vectorOpen}
                onToggle={() => setVectorOpen(o => !o)}
              />
              <AnimatePresence>
                {vectorOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1 overflow-hidden"
                  >
                    {shapefiles.length === 0 ? (
                      <div className="p-3 rounded border border-dashed border-border-subtle/50 text-center bg-bg-primary/5">
                        <Palette size={14} className="text-text-secondary mx-auto mb-1.5" />
                        <p className="text-[10px] text-text-secondary leading-normal">
                          {t('layers.empty_vector', 'No hay capas vectoriales. Use Inicio > Capas o Importar para agregar datos.')}
                        </p>
                      </div>
                    ) : (
                      shapefiles.map((shp, index) => (
                        <LayerRow
                          key={shp.id}
                          name={shp.name}
                          icon={<Minus size={12} />}
                          color={shp.color || '#8b5cf6'}
                          visible={shp.visible !== false}
                          opacity={shp.opacity ?? 1}
                          onToggleVisible={() => updateShapefile(shp.id, { visible: !shp.visible })}
                          onOpacityChange={(val) => updateShapefile(shp.id, { opacity: val })}
                          onDelete={() => setLayerToDelete({ id: shp.id, type: 'shapefile', name: shp.name })}
                          onZoom={() => zoomToShapefile(shp)}
                        >
                          {/* Extra controls: color, weight, fill opacity */}
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-text-secondary w-14">{t('layers.color', 'Color')}</span>
                            <input
                              type="color"
                              value={shp.color || '#8b5cf6'}
                              onChange={(e) => updateShapefile(shp.id, { color: e.target.value })}
                              className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 p-0"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-text-secondary w-14">{t('layers.weight', 'Grosor')}</span>
                            <input
                              type="range" min={0} max={10} step={0.5}
                              value={shp.weight ?? 2}
                              onChange={(e) => updateShapefile(shp.id, { weight: parseFloat(e.target.value) })}
                              className="flex-1 accent-accent cursor-pointer h-1"
                            />
                            <span className="text-[9px] text-text-secondary w-8 text-right font-mono">{shp.weight ?? 2}px</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-text-secondary w-14">{t('layers.fill', 'Relleno')}</span>
                            <input
                              type="range" min={0} max={1} step={0.05}
                              value={shp.fillOpacity ?? 0.1}
                              onChange={(e) => updateShapefile(shp.id, { fillOpacity: parseFloat(e.target.value) })}
                              className="flex-1 accent-accent cursor-pointer h-1"
                            />
                            <span className="text-[9px] text-text-secondary w-8 text-right font-mono">{Math.round((shp.fillOpacity ?? 0.1) * 100)}%</span>
                          </div>
                          {/* Move up/down */}
                          <div className="flex items-center gap-2 pt-1 border-t border-border-subtle/10 mt-1">
                            <button
                              onClick={() => { if (index > 0) reorderShapefiles(index, index - 1); }}
                              disabled={index === 0}
                              className="text-[9px] text-text-secondary hover:text-text-primary disabled:opacity-30 transition-colors font-semibold"
                            >
                              {t('layers.up', 'Subir')}
                            </button>
                            <button
                              onClick={() => { if (index < shapefiles.length - 1) reorderShapefiles(index, index + 1); }}
                              disabled={index === shapefiles.length - 1}
                              className="text-[9px] text-text-secondary hover:text-text-primary disabled:opacity-30 transition-colors font-semibold"
                            >
                              {t('layers.down', 'Bajar')}
                            </button>
                          </div>
                        </LayerRow>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="h-px bg-surface-hover my-2" />

              {/* ── Raster layers (DEM) ── */}
              <SectionHeader
                title={t('layers.raster_layers', 'Capas Raster')}
                icon={<ImageIcon size={10} />}
                count={dem ? 1 : 0}
                isOpen={rasterOpen}
                onToggle={() => setRasterOpen(o => !o)}
              />
              <AnimatePresence>
                {rasterOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1 overflow-hidden"
                  >
                    {!dem ? (
                      <div className="p-3 rounded border border-dashed border-border-subtle/50 text-center bg-bg-primary/5">
                        <ImageIcon size={14} className="text-text-secondary mx-auto mb-1.5" />
                        <p className="text-[10px] text-text-secondary leading-normal">
                          {t('layers.empty_raster', 'No hay modelo de elevación (DEM). Importe un archivo GeoTIFF para visualizarlo.')}
                        </p>
                      </div>
                    ) : (
                      <LayerRow
                        name={dem.file}
                        icon={<ImageIcon size={11} />}
                        color="#8b5cf6"
                        visible={dem.visible !== false}
                        opacity={dem.opacity ?? 0.6}
                        onToggleVisible={() => updateDEM({ visible: dem.visible === false ? true : false })}
                        onOpacityChange={(val) => updateDEM({ opacity: val })}
                        onDelete={() => setLayerToDelete({ id: 'dem', type: 'dem', name: dem.file })}
                        onZoom={zoomToDEM}
                      >
                        <div className="flex items-center gap-2 text-[9px] text-text-secondary mb-1">
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 font-mono">TIFF</span>
                          <span>{dem.width}x{dem.height}</span>
                          {dem.minVal !== undefined && dem.maxVal !== undefined && (
                            <span className="text-text-secondary/50 font-mono">{dem.minVal.toFixed(0)}–{dem.maxVal.toFixed(0)} m</span>
                          )}
                        </div>
                        <DemColorScaleControl dem={dem} updateDEM={updateDEM} />
                        <DemLimitsControl dem={dem} updateDEM={updateDEM} />
                        <ContourControls config={contourConfig} update={updateContourConfig} />
                      </LayerRow>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="px-4 py-2 border-t border-border-subtle text-[10px] text-text-secondary flex items-center justify-between bg-bg-surface">
              <span>{t('layers.total_layers', { count: SYSTEM_LAYER_DEFS.length + shapefiles.length + (dem ? 1 : 0) })}</span>
            </div>
          </motion.div>
          <ConfirmModal
            isOpen={layerToDelete !== null}
            onClose={() => setLayerToDelete(null)}
            onConfirm={confirmDelete}
            title={t('layers.delete_title', 'Eliminar Capa')}
            message={t('layers.delete_message', { name: layerToDelete?.name })}
            confirmText={t('layers.delete_confirm', 'Eliminar')}
            cancelText={t('layers.delete_cancel', 'Cancelar')}
            variant="danger"
          />
        </>
      )}
    </AnimatePresence>
  );
}
