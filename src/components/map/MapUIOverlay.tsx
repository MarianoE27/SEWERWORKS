import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Rectangle, useMap } from 'react-leaflet';
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import L from 'leaflet';
import { useStore } from '../../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { toXY } from '../../lib/proj';
import { formatCoordinates } from '../../lib/projections';
import { useLOD } from '../../hooks/useLOD';
import { useTranslation } from 'react-i18next';

// ── Measure helpers ───────────────────────────────────────────

export function haversineM(a: [number, number], b: [number, number]): number {
  const R = 6371e3;
  const φ1 = a[0] * Math.PI / 180, φ2 = b[0] * Math.PI / 180;
  const dφ = (b[0] - a[0]) * Math.PI / 180, dλ = (b[1] - a[1]) * Math.PI / 180;
  const x = Math.sin(dφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(dλ/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function polygonAreaM2(pts: [number, number][]): number {
  if (pts.length < 3) return 0;
  const ref = pts[0];
  const cart = pts.map(p => [
    haversineM([ref[0], ref[1]], [ref[0], p[1]]) * (p[1] >= ref[1] ? 1 : -1),
    haversineM([ref[0], ref[1]], [p[0], ref[1]]) * (p[0] >= ref[0] ? 1 : -1),
  ]);
  let area = 0;
  for (let i = 0; i < cart.length; i++) {
    const j = (i + 1) % cart.length;
    area += cart[i][0] * cart[j][1] - cart[j][0] * cart[i][1];
  }
  return Math.abs(area / 2);
}

export function fmtDist(m: number) { return m >= 1000 ? `${(m/1000).toFixed(3)} km` : `${m.toFixed(1)} m`; }
export function fmtArea(m2: number) {
  if (m2 >= 1e6) return `${(m2/1e6).toFixed(4)} km²`;
  if (m2 >= 1e4) return `${(m2/1e4).toFixed(3)} ha`;
  return `${m2.toFixed(1)} m²`;
}

// ── Measure Panel ───────────────────────────────────────────

export type MeasureMode = 'Distance' | 'Area';

export interface MeasurePanelProps {
  mode: MeasureMode;
  points: [number, number][];
  onClear: () => void;
}

export const MeasurePanel: React.FC<MeasurePanelProps> = ({ mode, points, onClear }) => {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const totalDist = useMemo(() => {
    let cum = 0;
    for (let i = 1; i < points.length; i++) {
      cum += haversineM(points[i-1], points[i]);
    }
    return cum;
  }, [points]);

  const areaM2 = points.length >= 3 ? polygonAreaM2(points) : null;

  return (
    <div className="absolute top-14 right-3 z-[1000] w-[280px] glass-panel pointer-events-auto overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center gap-2 p-2 border-b border-border-subtle cursor-pointer group bg-bg-surface/30"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className="text-text-secondary group-hover:text-text-primary font-semibold text-[10px] uppercase tracking-wider flex-1 transition-colors">{t('measure.title', 'Medición')} - {mode === 'Distance' ? t('measure.distance', 'Distancia') : t('measure.area', 'Área')}</span>
        <button 
          type="button" 
          onClick={(e) => { e.stopPropagation(); onClear(); }} 
          title={t('measure.clear', 'Limpiar')}
          className="text-text-secondary hover:text-red-400 p-1 rounded-sm transition-colors"
        >
          <Trash2 size={13}/>
        </button>
        <button type="button" className="text-text-secondary group-hover:text-text-primary transition-colors p-1">
          {collapsed ? <ChevronRight size={13}/> : <ChevronDown size={13}/>}
        </button>
      </div>

      {/* Summary */}
      {!collapsed && (
        <div className="p-2.5">
          {points.length === 0
            ? <div className="text-text-secondary text-center py-4 text-[10px]">
                {t('measure.hint_line1', 'Haz clic en el mapa para agregar puntos.')}<br/>{t('measure.hint_line2', 'Clic derecho para limpiar.')}
              </div>
            : <div className="space-y-1">
              <div className="flex justify-between items-center py-1 border-b border-border-subtle/30">
                <span className="text-text-secondary text-[10px]">{t('measure.points', 'Puntos')}</span>
                <span className="text-text-primary font-bold text-xs">{points.length}</span>
              </div>
              {totalDist > 0 && (
                <div className="flex justify-between items-center py-1 border-b border-border-subtle/30">
                  <span className="text-text-secondary text-[10px]">{t('measure.distance', 'Distancia')}</span>
                  <span className="text-text-primary font-bold text-xs font-mono">{fmtDist(totalDist)}</span>
                </div>
              )}
              {areaM2 !== null && (
                <>
                  <div className="flex justify-between items-center py-1 border-b border-border-subtle/30">
                    <span className="text-text-secondary text-[10px]">{t('measure.area', 'Área')}</span>
                    <span className="text-accent font-bold text-xs font-mono">{fmtArea(areaM2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-text-secondary text-[10px]">{t('measure.perimeter', 'Perímetro')}</span>
                    <span className="text-text-primary text-xs font-mono">
                      {fmtDist(totalDist + (points.length > 1 ? haversineM(points[points.length-1], points[0]) : 0))}
                    </span>
                  </div>
                </>
              )}
            </div>
          }
        </div>
      )}
    </div>
  );
};

export function CoordinatesControl() {
  const map = useMap();
  const { crs, dem, setDemHoverValue, demHoverValue } = useStore(useShallow(s => ({ crs: s.crs, dem: s.dem, setDemHoverValue: s.setDemHoverValue, demHoverValue: s.demHoverValue })));
  const [coords, setCoords] = useState({ lat: 0, lng: 0, formatted: '' });
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      const now = Date.now();
      if (now - lastUpdateRef.current < 40) return;
      lastUpdateRef.current = now;

      const { lat, lng } = e.latlng;
      const formatted = formatCoordinates(lng, lat, crs);
      setCoords({ lat, lng, formatted });

      // Sample DEM value under cursor
      if (dem && dem.data && dem.visible !== false) {
        const { bbox, width, height, data } = dem;
        const { crs: storeCrs } = useStore.getState();
        // Convert WGS84 lat/lng to project coordinates
        const [px, py] = toXY(lat, lng, storeCrs);
        const [minX, minY, maxX, maxY] = bbox;
        if (px >= minX && px <= maxX && py >= minY && py <= maxY) {
          const pixelX = Math.floor(((px - minX) / (maxX - minX)) * width);
          const pixelY = Math.floor(((maxY - py) / (maxY - minY)) * height);
          if (pixelX >= 0 && pixelX < width && pixelY >= 0 && pixelY < height) {
            const v = data[pixelY * width + pixelX];
            setDemHoverValue(v !== undefined && v > -9000 ? v : null);
          } else {
            setDemHoverValue(null);
          }
        } else {
          setDemHoverValue(null);
        }
      } else {
        setDemHoverValue(null);
      }
    };
    map.on('mousemove', handleMouseMove);
    return () => { map.off('mousemove', handleMouseMove); };
  }, [map, crs, dem, setDemHoverValue]);

  return (
    <div className="absolute bottom-0 left-0 glass-panel text-text-secondary text-[10px] px-3 py-1.5 z-[1000] border-t-0 border-l-0 rounded-none rounded-tr-md pointer-events-none flex items-center gap-3 font-mono shadow-xl">
      <span className="text-text-secondary/80">{coords.formatted}</span>
      <div className="flex items-center gap-1.5 border-l border-border-subtle/40 pl-3">
        <span className="text-text-secondary/60">Z:</span>
        {demHoverValue !== null ? (
          <span className="text-text-primary font-semibold">{demHoverValue.toFixed(2)} m</span>
        ) : (
          <span className="text-text-secondary/40">---</span>
        )}
      </div>
      <span className="text-accent font-semibold border-l border-border-subtle/40 pl-3">{crs}</span>
    </div>
  );
}

function MinimapBounds({ parentMap }: { parentMap: L.Map }) {
  const minimap = useMap();
  const [bounds, setBounds] = useState(parentMap.getBounds());

  useEffect(() => {
    const onChange = () => {
      setBounds(parentMap.getBounds());
      minimap.setView(parentMap.getCenter(), Math.max(1, parentMap.getZoom() - 5));
    };
    parentMap.on('move', onChange);
    parentMap.on('zoom', onChange);
    return () => {
      parentMap.off('move', onChange);
      parentMap.off('zoom', onChange);
    };
  }, [minimap, parentMap]);

  return <Rectangle bounds={bounds} pathOptions={{ weight: 1, color: '#FF5A09', fillOpacity: 0.1 }} />;
}

export function MinimapControl() {
  const parentMap = useMap();
  const theme = useStore(s => s.theme);
  const [mapZoom, setMapZoom] = useState(parentMap.getZoom());

  useEffect(() => {
    const onZoom = () => setMapZoom(parentMap.getZoom());
    parentMap.on('zoomend', onZoom);
    return () => {
      parentMap.off('zoomend', onZoom);
    };
  }, [parentMap]);

  return (
    <div className="leaflet-top leaflet-left" style={{ top: '10px', left: '10px' }}>
      <div className="leaflet-control leaflet-bar border border-border-subtle rounded-md overflow-hidden shadow-2xl">
        <MapContainer
          style={{ height: 150, width: 150 }}
          center={parentMap.getCenter()}
          zoom={Math.max(1, mapZoom - 5)}
          zoomControl={false}
          attributionControl={false}
          dragging={false}
          doubleClickZoom={false}
          scrollWheelZoom={false}
        >
          <TileLayer url={`https://{s}.basemaps.cartocdn.com/${theme === 'light' ? 'light_all' : 'dark_all'}/{z}/{x}/{y}{r}.png`} />
          <MinimapBounds parentMap={parentMap} />
        </MapContainer>
      </div>
    </div>
  );
}

// ── DEM color scale functions ─────────────────────────────────
export function interpolateColor(stops: [number, number, number][], t: number): [number, number, number] {
  const n = stops.length;
  if (t <= 0) return stops[0];
  if (t >= 1) return stops[n - 1];
  const seg = (n - 1) * t;
  const i = Math.floor(seg);
  const f = seg - i;
  const a = stops[i], b = stops[i + 1];
  return [
    Math.round(a[0] + f * (b[0] - a[0])),
    Math.round(a[1] + f * (b[1] - a[1])),
    Math.round(a[2] + f * (b[2] - a[2])),
  ];
}

export const COLOR_SCALES: Record<string, [number, number, number][]> = {
  grayscale: [[0,0,0],[255,255,255]],
  viridis:   [[68,1,84],[59,82,139],[33,145,140],[94,201,98],[253,231,37]],
  terrain:   [[0,97,0],[77,130,30],[189,167,98],[210,185,148],[255,255,255]],
  elevation: [[0,0,128],[0,128,255],[0,220,0],[200,180,50],[180,100,30],[255,255,255]],
  rainbow:   [[0,0,255],[0,255,255],[0,255,0],[255,255,0],[255,128,0],[255,0,0]],
  hot:       [[0,0,0],[255,0,0],[255,255,0],[255,255,255]],
};

export function makeDemColorFn(colorScale: string, minVal: number, maxVal: number) {
  const stops = COLOR_SCALES[colorScale] ?? COLOR_SCALES.terrain;
  const range = maxVal - minVal || 1;
  return (values: number[]) => {
    const v = values[0];
    if (v === undefined || v === null || v < -9000) return null;
    const t = Math.max(0, Math.min(1, (v - minVal) / range));
    const [r, g, b] = interpolateColor(stops, t);
    return `rgba(${r},${g},${b},0.85)`;
  };
}

export function DemColorBar() {
  const { t } = useTranslation();
  const dem = useStore(s => s.dem);
  const [collapsed, setCollapsed] = useState(false);
  
  if (!dem || dem.visible === false || dem.minVal === undefined || dem.maxVal === undefined) return null;

  const colorScale = dem.colorScale ?? 'terrain';
  const stops = COLOR_SCALES[colorScale] ?? COLOR_SCALES.terrain;
  const min = dem.minVal;
  const max = dem.maxVal;

  // Build CSS gradient from stops
  const gradientStops = stops.map((c, i) => {
    const pct = Math.round((i / (stops.length - 1)) * 100);
    return `rgb(${c[0]},${c[1]},${c[2]}) ${pct}%`;
  }).join(', ');

  const mid = ((min + max) / 2);

  return (
    <div className="absolute bottom-10 right-4 z-[1000] glass-panel p-2 pointer-events-auto" style={{ width: 140 }}>
      <div 
        className="flex items-center justify-between cursor-pointer group"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className="text-[9px] font-semibold text-text-secondary uppercase tracking-wider group-hover:text-text-primary transition-colors">{t('map_overlay.dem_elevation', 'Elevación DEM')}</span>
        <button type="button" className="text-text-secondary group-hover:text-text-primary transition-colors">
          {collapsed ? <ChevronRight size={12}/> : <ChevronDown size={12}/>}
        </button>
      </div>
      
      {!collapsed && (
        <div className="mt-2">
          <div className="rounded overflow-hidden mb-1" style={{ height: 10, background: `linear-gradient(to right, ${gradientStops})` }} />
          <div className="flex justify-between text-[9px] font-mono text-text-secondary">
            <span>{min.toFixed(0)}m</span>
            <span>{mid.toFixed(0)}m</span>
            <span>{max.toFixed(0)}m</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function VisualizationModeControl() {
  const { t } = useTranslation();
  const { conduitVisualizationMode, setConduitVisualizationMode } = useStore(useShallow(s => ({ conduitVisualizationMode: s.conduitVisualizationMode, setConduitVisualizationMode: s.setConduitVisualizationMode })));

  const modes = [
    { value: 'state' as const, label: t('map_overlay.mode_state', 'Estado') },
    { value: 'hRatio' as const, label: t('map_overlay.mode_hratio', 'h/D') },
    { value: 'diameter' as const, label: t('map_overlay.mode_diameter', 'Diámetro') },
    { value: 'cover' as const, label: t('map_overlay.mode_cover', 'Tapada') }
  ];

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-1 glass-panel px-2 py-1.5 pointer-events-auto rounded-full shadow-lg font-sans">
      <span className="text-[9px] font-semibold text-text-secondary uppercase tracking-wider pl-2 pr-1">{t('map_overlay.visualization', 'Visualización:')}</span>
      <div className="flex items-center gap-0.5">
        {modes.map(mode => (
          <button
            key={mode.value}
            type="button"
            onClick={() => setConduitVisualizationMode(mode.value)}
            className={`px-2.5 py-1 text-[10px] font-medium rounded-full transition-all ${
              conduitVisualizationMode === mode.value
                ? 'bg-accent text-white shadow-sm font-semibold'
                : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Legend() {
  const { t } = useTranslation();
  const { layers, conduitVisualizationMode, parameters } = useStore(useShallow(s => ({ layers: s.layers, conduitVisualizationMode: s.conduitVisualizationMode, parameters: s.parameters })));
  const [nodesCollapsed, setNodesCollapsed] = useState(false);
  const [conduitsCollapsed, setConduitsCollapsed] = useState(false);

  if (!layers.nodes && !layers.conduits) return null;

  return (
    <div className="absolute bottom-10 left-4 z-[1000] flex flex-col gap-1.5 pointer-events-auto">
      {layers.nodes && (
        <div className="glass-panel p-2.5 text-[11px] w-[180px]">
          <div className="flex justify-between items-center cursor-pointer group" onClick={() => setNodesCollapsed(!nodesCollapsed)}>
            <h4 className="text-text-secondary font-semibold uppercase tracking-wider text-[9px] group-hover:text-text-primary transition-colors">{t('map_overlay.legend_manholes', 'Cámaras')}</h4>
            <button type="button" className="text-text-secondary group-hover:text-text-primary transition-colors">
              {nodesCollapsed ? <ChevronRight size={13}/> : <ChevronDown size={13}/>}
            </button>
          </div>
          
          {!nodesCollapsed && (
            <div className="mt-2.5">
              <h4 className="text-text-secondary/70 font-semibold mb-1.5 uppercase tracking-wider text-[8px]">{t('map_overlay.legend_depth', 'Profundidad')}</h4>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></div>
                  <span className="text-text-secondary">&lt; 1.5 m</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#eab308]"></div>
                  <span className="text-text-secondary">1.5 - 2.5 m</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#f97316]"></div>
                  <span className="text-text-secondary">2.5 - 4.0 m</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></div>
                  <span className="text-text-secondary">&ge; 4.0 m</span>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-border-subtle/30">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#71717a]"></div>
                  <span className="text-text-secondary/60 italic">{t('map_overlay.legend_uncalculated', 'Sin calcular')}</span>
                </div>
              </div>
              <h4 className="text-text-secondary/70 font-semibold mt-2.5 mb-1.5 uppercase tracking-wider text-[8px]">{t('map_overlay.legend_node_type', 'Tipo de Nodo')}</h4>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <svg width="11" height="11" viewBox="0 0 14 14"><polygon points="7,1 13,13 1,13" fill="#71717a" stroke="rgba(0,0,0,0.4)" strokeWidth="1"/></svg>
                  <span className="text-text-secondary">{t('map_overlay.legend_head', 'Cabecera')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#71717a]"></div>
                  <span className="text-text-secondary">{t('map_overlay.legend_intermediate', 'Intermedio')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg width="11" height="11" viewBox="0 0 14 14"><polygon points="7,1 13,7 7,13 1,7" fill="#71717a" stroke="rgba(0,0,0,0.4)" strokeWidth="1"/></svg>
                  <span className="text-text-secondary">{t('map_overlay.legend_outfall', 'Descarga')}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {layers.conduits && (
        <div className="glass-panel p-2.5 text-[11px] w-[180px]">
          <div className="flex justify-between items-center cursor-pointer group" onClick={() => setConduitsCollapsed(!conduitsCollapsed)}>
            <h4 className="text-text-secondary font-semibold uppercase tracking-wider text-[9px] group-hover:text-text-primary transition-colors">{t('map_overlay.legend_conduits', 'Conductos')}</h4>
            <button type="button" className="text-text-secondary group-hover:text-text-primary transition-colors">
              {conduitsCollapsed ? <ChevronRight size={13}/> : <ChevronDown size={13}/>}
            </button>
          </div>
          
          {!conduitsCollapsed && (
            <div className="mt-2.5">
              <h4 className="text-text-secondary/70 font-semibold mb-1.5 uppercase tracking-wider text-[8px]">
                {conduitVisualizationMode === 'hRatio' && t('map_overlay.legend_hratio', 'Relación h/D')}
                {conduitVisualizationMode === 'diameter' && t('map_overlay.legend_nominal_diameter', 'Diámetro Nominal')}
                {conduitVisualizationMode === 'cover' && t('map_overlay.legend_cover', 'Tapada')}
                {conduitVisualizationMode === 'state' && t('map_overlay.legend_state', 'Estado')}
              </h4>
              <div className="space-y-1 mt-1.5">
                {conduitVisualizationMode === 'hRatio' && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-0.5 bg-[#10b981] rounded-full"></div>
                      <span className="text-text-secondary">h/D &lt; 0.60</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-0.5 bg-[#eab308] rounded-full"></div>
                      <span className="text-text-secondary">0.60 ≤ h/D &lt; 0.80</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-0.5 bg-[#f97316] rounded-full"></div>
                      <span className="text-text-secondary">0.80 ≤ h/D &lt; 0.94</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-0.5 bg-[#ef4444] rounded-full"></div>
                      <span className="text-text-secondary">h/D ≥ 0.94</span>
                    </div>
                  </>
                )}
                {conduitVisualizationMode === 'diameter' && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-0.5 bg-[#eab308] rounded-full"></div>
                      <span className="text-text-secondary">DN &lt; {parameters.collectorMinDN} mm</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-0.5 bg-[#ef4444] rounded-full"></div>
                      <span className="text-text-secondary">DN ≥ {parameters.collectorMinDN} mm</span>
                    </div>
                  </>
                )}
                {conduitVisualizationMode === 'cover' && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-0.5 bg-[#10b981] rounded-full"></div>
                      <span className="text-text-secondary">{t('map_overlay.mode_cover', 'Tapada')} &lt; 2.0 m</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-0.5 bg-[#eab308] rounded-full"></div>
                      <span className="text-text-secondary">2.0 m ≤ {t('map_overlay.mode_cover', 'Tapada')} &lt; {parameters.collectorMaxCover} m</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-0.5 bg-[#ef4444] rounded-full"></div>
                      <span className="text-text-secondary">{t('map_overlay.mode_cover', 'Tapada')} ≥ {parameters.collectorMaxCover} m</span>
                    </div>
                  </>
                )}
                {conduitVisualizationMode === 'state' && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-0.5 bg-[#10b981] rounded-full"></div>
                      <span className="text-text-secondary">OK</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-0.5 bg-[#eab308] rounded-full"></div>
                      <span className="text-text-secondary">Warning</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-0.5 bg-[#ef4444] rounded-full"></div>
                      <span className="text-text-secondary">Error</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-border-subtle/30">
                      <div className="w-3.5 h-0.5 bg-[#71717a] rounded-full"></div>
                      <span className="text-text-secondary/60 italic">{t('map_overlay.legend_uncalculated', 'Sin calcular')}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-border-subtle/30">
                      <span className="text-[10px] font-bold text-accent w-4 text-center">C</span>
                      <span className="text-text-secondary">{t('map_overlay.legend_collector', 'Colector')}</span>
                    </div>
                  </>
                )}
                <div className="flex items-center gap-2 pt-1 border-t border-border-subtle/30">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0">
                    <line x1="8" y1="0" x2="8" y2="16" stroke="#71717a" strokeWidth="2.5" strokeLinecap="round"/>
                    <line x1="8" y1="8" x2="16" y2="8" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2,2"/>
                  </svg>
                  <span className="text-text-secondary">{t('map_overlay.legend_subnetwork_start', 'Inicio de subred')}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function LODIndicator() {
  const { t } = useTranslation();
  const lod = useLOD();
  
  if (lod.lodLevel === 0) return null;
  
  const labels = [
    '',
    t('map_overlay.lod_labels.1', 'Detalle reducido'),
    t('map_overlay.lod_labels.2', 'Vista general'),
    t('map_overlay.lod_labels.3', 'Esquemático')
  ];
  
  return (
    <div className="absolute top-3 right-3 z-[1000] glass-panel px-3 py-1.5 pointer-events-none
                    text-[10px] text-text-secondary font-mono flex items-center gap-2">
      <span className="text-accent">{t('map_overlay.lod_level', { level: lod.lodLevel, defaultValue: `LOD ${lod.lodLevel}` })}</span>
      <span>{labels[lod.lodLevel]}</span>
    </div>
  );
}

export function MapUIOverlay() {
  return (
    <>
      <LODIndicator />
      <CoordinatesControl />
      <MinimapControl />
      <Legend />
      <VisualizationModeControl />
      <DemColorBar />
    </>
  );
}
