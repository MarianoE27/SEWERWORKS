import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Eye, EyeOff, Trash2, Map, Satellite, Layers,
  CircleDot, Minus, Hexagon, BarChart2, Globe, ChevronDown, ChevronRight,
  FileText, Mountain
} from 'lucide-react';
import { useStore } from '../store';
import { ExternalLayer } from '../types';

// Layer descriptor for system/tile layers
interface SystemLayerDef {
  key: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'basemap' | 'overlay';
  color: string;
}

const SYSTEM_LAYERS: SystemLayerDef[] = [
  {
    key: 'baseMap',
    name: 'Base Map (CartoDB)',
    description: 'CartoDB vector base map',
    icon: <Map size={14} />,
    category: 'basemap',
    color: '#64748b',
  },
  {
    key: 'satelliteLayer',
    name: 'Satellite (Esri)',
    description: 'Esri World Imagery satellite photos',
    icon: <Satellite size={14} />,
    category: 'basemap',
    color: '#22c55e',
  },
  {
    key: 'wmsLayer',
    name: 'Topographic (USGS)',
    description: 'USGS National Map topographic WMS',
    icon: <Layers size={14} />,
    category: 'basemap',
    color: '#f59e0b',
  },
  {
    key: 'subcatchments',
    name: 'Subcatchments',
    description: 'Drainage area polygons',
    icon: <Hexagon size={14} />,
    category: 'overlay',
    color: '#10b981',
  },
  {
    key: 'drainageNetwork',
    name: 'Drainage Network',
    description: 'Network conduits and nodes',
    icon: <Minus size={14} />,
    category: 'overlay',
    color: '#3b82f6',
  },
  {
    key: 'simulationResults',
    name: 'Simulation Results',
    description: 'Colorization by flow and depth',
    icon: <BarChart2 size={14} />,
    category: 'overlay',
    color: '#ef4444',
  },
];

// Geometry icon helper
const GeomIcon: React.FC<{ type: ExternalLayer['geometryType'] }> = ({ type }) => {
  if (type === 'Point') return <CircleDot size={12} />;
  if (type === 'LineString') return <Minus size={12} />;
  if (type === 'Polygon') return <Hexagon size={12} />;
  return <Layers size={12} />;
};

// Geometry color helper
const geomColor = (type: ExternalLayer['geometryType']) => {
  if (type === 'Point') return '#10b981';
  if (type === 'LineString') return '#3b82f6';
  if (type === 'Polygon') return '#f59e0b';
  return '#8b5cf6';
};

// ── Subcomponents ──────────────────────────────────────────────

interface LayerRowProps {
  name: string;
  description?: string;
  icon: React.ReactNode;
  color: string;
  visible: boolean;
  opacity: number;
  onToggleVisible: () => void;
  onOpacityChange: (val: number) => void;
  onDelete?: () => void;
  badge?: string;
  badgeColor?: string;
}

const LayerRow: React.FC<LayerRowProps> = ({
  name, description, icon, color, visible, opacity,
  onToggleVisible, onOpacityChange, onDelete, badge, badgeColor
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-lg border transition-colors ${visible ? 'border-border-subtle bg-bg-surface' : 'border-border-subtle bg-bg-primary/40'}`}>
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Visibility toggle */}
        <button
          onClick={onToggleVisible}
          className={`shrink-0 transition-colors ${visible ? 'text-text-primary hover:text-text-primary' : 'text-text-secondary hover:text-text-secondary'}`}
          title={visible ? 'Hide layer' : 'Show layer'}
        >
          {visible ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>

        {/* Color dot + icon */}
        <div className="shrink-0 w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: `${color}22`, color }}>
          {icon}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <div className={`text-xs font-medium truncate ${visible ? 'text-text-primary' : 'text-text-secondary'}`}>
            {name}
          </div>
          {badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono" style={{ backgroundColor: `${badgeColor ?? '#64748b'}22`, color: badgeColor ?? '#94a3b8' }}>
              {badge}
            </span>
          )}
        </div>

        {/* Expand opacity + delete */}
        <div className="flex items-center gap-1 shrink-0">
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1 text-text-secondary hover:text-red-400 transition-colors rounded"
              title="Delete layer"
            >
              <Trash2 size={12} />
            </button>
          )}
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1 text-text-secondary hover:text-text-primary transition-colors rounded"
            title="Opacity options"
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        </div>
      </div>

      {/* Opacity slider (expanded) */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-2 flex items-center gap-2">
              {description && (
                <span className="text-[10px] text-text-secondary flex-1 truncate">{description}</span>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-[10px] text-text-secondary w-8 text-right">{Math.round(opacity * 100)}%</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={opacity}
                  onChange={e => onOpacityChange(Number(e.target.value))}
                  className="w-24 accent-[var(--color-accent)] cursor-pointer"
                  title="Opacity"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Section header ────────────────────────────────────────────

const SectionHeader: React.FC<{ title: string; count?: number; isOpen: boolean; onToggle: () => void }> = ({ title, count, isOpen, onToggle }) => (
  <button
    onClick={onToggle}
    className="w-full flex items-center gap-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-secondary hover:text-text-secondary transition-colors"
  >
    {isOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
    {title}
    {count !== undefined && (
      <span className="ml-auto bg-bg-hover text-text-secondary px-1.5 py-0.5 rounded-full text-[9px]">{count}</span>
    )}
  </button>
);

// ── Main Component ────────────────────────────────────────────

export const LayerManager: React.FC = () => {
  const {
    mapLayers,
    toggleMapLayer,
    layerOpacity,
    setLayerOpacity,
    externalLayers,
    removeExternalLayer,
    updateExternalLayer,
    rasterLayers,
    removeRasterLayer,
    updateRasterLayer,
    setElevationSource,
    isLayerManagerOpen,
    setLayerManagerOpen,
  } = useStore();

  const [basemapOpen, setBasemapOpen] = useState(true);
  const [overlayOpen, setOverlayOpen] = useState(true);
  const [externalOpen, setExternalOpen] = useState(true);
  const [rasterOpen, setRasterOpen] = useState(true);

  const basemapLayers = SYSTEM_LAYERS.filter(l => l.category === 'basemap');
  const overlayLayers = SYSTEM_LAYERS.filter(l => l.category === 'overlay');

  return (
    <AnimatePresence>
      {isLayerManagerOpen && (
        <>
          {/* Backdrop (click to close) */}
          <motion.div
            className="fixed inset-0 z-[2900]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLayerManagerOpen(false)}
          />

          {/* Panel - slides in from right */}
          <motion.div
            className="fixed top-0 right-0 bottom-0 w-80 z-[3000] bg-bg-primary border-l border-border-subtle flex flex-col shadow-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
              <div className="flex items-center gap-2 text-text-primary font-semibold text-sm">
                <Layers size={16} className="text-accent" />
                Layer Manager
              </div>
              <button
                onClick={() => setLayerManagerOpen(false)}
                className="p-1 text-text-secondary hover:text-text-primary transition-colors rounded"
              >
                <X size={16} />
              </button>
            </div>

            {/* Layer list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">

              {/* ── Basemap layers ── */}
              <SectionHeader
                title="Base Maps"
                count={basemapLayers.length}
                isOpen={basemapOpen}
                onToggle={() => setBasemapOpen(o => !o)}
              />
              <AnimatePresence>
                {basemapOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1 overflow-hidden"
                  >
                    {basemapLayers.map(layer => (
                      <LayerRow
                        key={layer.key}
                        name={layer.name}
                        description={layer.description}
                        icon={layer.icon}
                        color={layer.color}
                        visible={mapLayers[layer.key as keyof typeof mapLayers]}
                        opacity={layerOpacity[layer.key] ?? 1}
                        onToggleVisible={() => toggleMapLayer(layer.key as keyof typeof mapLayers)}
                        onOpacityChange={(val) => setLayerOpacity(layer.key, val)}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="h-px bg-bg-hover my-2" />

              {/* ── Overlay layers ── */}
              <SectionHeader
                title="Data Layers"
                count={overlayLayers.length}
                isOpen={overlayOpen}
                onToggle={() => setOverlayOpen(o => !o)}
              />
              <AnimatePresence>
                {overlayOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1 overflow-hidden"
                  >
                    {overlayLayers.map(layer => (
                      <LayerRow
                        key={layer.key}
                        name={layer.name}
                        description={layer.description}
                        icon={layer.icon}
                        color={layer.color}
                        visible={mapLayers[layer.key as keyof typeof mapLayers]}
                        opacity={layerOpacity[layer.key] ?? 1}
                        onToggleVisible={() => toggleMapLayer(layer.key as keyof typeof mapLayers)}
                        onOpacityChange={(val) => setLayerOpacity(layer.key, val)}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── External layers ── */}
              {externalLayers.length > 0 && (
                <>
                  <div className="h-px bg-bg-hover my-2" />
                  <SectionHeader
                    title="External GIS Layers"
                    count={externalLayers.length}
                    isOpen={externalOpen}
                    onToggle={() => setExternalOpen(o => !o)}
                  />
                  <AnimatePresence>
                    {externalOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-1 overflow-hidden"
                      >
                        {externalLayers.map(layer => (
                          <LayerRow
                            key={layer.id}
                            name={layer.name}
                            description={`${layer.featureCount} features · ${layer.sourceCRS}`}
                            icon={<GeomIcon type={layer.geometryType} />}
                            color={geomColor(layer.geometryType)}
                            visible={layer.visible}
                            opacity={layer.opacity}
                            badge={layer.geometryType}
                            badgeColor={geomColor(layer.geometryType)}
                            onToggleVisible={() => updateExternalLayer(layer.id, { visible: !layer.visible })}
                            onOpacityChange={(val) => updateExternalLayer(layer.id, { opacity: val })}
                            onDelete={() => removeExternalLayer(layer.id)}
                          />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}

              {/* Empty state for external layers */}
              {externalLayers.length === 0 && (
                <div className="mt-4 p-4 rounded-lg border border-dashed border-border-subtle text-center">
                  <FileText size={20} className="text-text-secondary mx-auto mb-2" />
                  <p className="text-[11px] text-text-secondary">
                    No external GIS layers.<br />
                    Use <strong className="text-text-secondary">Maps → Import as Layer</strong> to add GIS data without affecting the model.
                  </p>
                </div>
              )}

              {/* ── Raster layers ── */}
              <div className="h-px bg-bg-hover my-2" />
              <SectionHeader
                title="Raster Layers"
                count={rasterLayers.length}
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
                    {rasterLayers.length === 0 ? (
                      <div className="p-3 rounded-lg border border-dashed border-border-subtle text-center">
                        <p className="text-[11px] text-text-secondary">
                          No raster layers loaded.<br />
                          Import a GeoTIFF or ASC file to display raster data.
                        </p>
                      </div>
                    ) : (
                      rasterLayers.map(layer => {
                        const formatBadge = layer.format === 'geotiff' ? 'TIFF' : 'ASC';
                        const formatColor = layer.format === 'geotiff' ? '#8b5cf6' : '#f59e0b';
                        return (
                          <div
                            key={layer.id}
                            className={`rounded-lg border transition-colors ${layer.visible ? 'border-border-subtle bg-bg-surface' : 'border-border-subtle bg-bg-primary/40'}`}
                          >
                            <div className="flex items-center gap-2 px-3 py-2">
                              {/* Visibility toggle */}
                              <button
                                onClick={() => updateRasterLayer(layer.id, { visible: !layer.visible })}
                                className={`shrink-0 transition-colors ${layer.visible ? 'text-text-primary hover:text-text-primary' : 'text-text-secondary hover:text-text-secondary'}`}
                                title={layer.visible ? 'Hide layer' : 'Show layer'}
                              >
                                {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                              </button>

                              {/* Format icon dot */}
                              <div
                                className="shrink-0 w-5 h-5 rounded flex items-center justify-center"
                                style={{ backgroundColor: `${formatColor}22`, color: formatColor }}
                              >
                                <Layers size={12} />
                              </div>

                              {/* Name + meta */}
                              <div className="flex-1 min-w-0">
                                <div className={`text-xs font-medium truncate ${layer.visible ? 'text-text-primary' : 'text-text-secondary'}`}>
                                  {layer.name}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span
                                    className="text-[10px] px-1.5 py-0.5 rounded-full font-mono"
                                    style={{ backgroundColor: `${formatColor}22`, color: formatColor }}
                                  >
                                    {formatBadge}
                                  </span>
                                  <span className="text-[10px] text-text-secondary">
                                    {layer.width}×{layer.height}
                                  </span>
                                  {layer.isElevationSource && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-emerald-500/20 text-emerald-400">
                                      ELEV SRC
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Elevation source toggle */}
                              <button
                                onClick={() => setElevationSource(layer.isElevationSource ? null : layer.id)}
                                className={`p-1 transition-colors rounded shrink-0 ${layer.isElevationSource ? 'text-emerald-400 hover:text-emerald-300' : 'text-text-secondary hover:text-emerald-400'}`}
                                title={layer.isElevationSource
                                  ? 'Fuente de elevación activa — click para volver al API'
                                  : layer.rawValues
                                    ? 'Usar como fuente de elevación (Measure tool)'
                                    : 'Sin valores crudos — reimportá el raster para habilitarlo'}
                              >
                                <Mountain size={12} />
                              </button>

                              {/* Delete button */}
                              <button
                                onClick={() => removeRasterLayer(layer.id)}
                                className="p-1 text-text-secondary hover:text-red-400 transition-colors rounded shrink-0"
                                title="Delete layer"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>

                            {/* Opacity slider (always visible, inline) */}
                            <div className="px-3 pb-2 flex items-center gap-2">
                              <span className="text-[10px] text-text-secondary w-8 text-right">{Math.round(layer.opacity * 100)}%</span>
                              <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.05}
                                value={layer.opacity}
                                onChange={e => updateRasterLayer(layer.id, { opacity: Number(e.target.value) })}
                                className="w-full accent-[var(--color-accent)] cursor-pointer"
                                title="Opacity"
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-border-subtle text-[10px] text-text-secondary flex items-center justify-between">
              <span>{SYSTEM_LAYERS.length + externalLayers.length + rasterLayers.length} layers total</span>
              <div className="flex items-center gap-1">
                <Globe size={10} />
                <span>WGS84 display</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
