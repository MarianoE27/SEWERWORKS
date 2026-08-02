import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Polygon, useMapEvents, Tooltip, useMap, Marker, ImageOverlay } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useStore } from '../store';
import { Node, ExternalLayer, RasterLayer } from '../types';
import { formatCoordinates } from '../utils/projections';
import { LatLngBounds, LatLng } from 'leaflet';

// Fix for default marker icons in Leaflet with Webpack/Vite
import L from 'leaflet';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapEvents: React.FC<{ onMouseMove: (e: L.LeafletMouseEvent) => void, onMapClick: (e: L.LeafletMouseEvent) => void, onMapRightClick: (e: L.LeafletMouseEvent) => void }> = ({ onMouseMove, onMapClick, onMapRightClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e);
    },
    mousemove(e) {
      onMouseMove(e);
    },
    contextmenu(e) {
      onMapRightClick(e);
    }
  });

  return null;
};

// Fits the map to all visible content (nodes, subcatchments, raster layers).
// Defined at module level so it never remounts when MapView re-renders.
const FitBoundsHandler: React.FC = () => {
  const map = useMap();
  const triggerFitBounds = useStore(s => s.triggerFitBounds);

  useEffect(() => {
    if (triggerFitBounds <= 0) return;
    const { nodes: ns, subcatchments: subs, rasterLayers: rl } = useStore.getState();
    const bounds = new LatLngBounds([]);

    ns.forEach(n => bounds.extend(new LatLng(n.lat, n.lng)));
    subs.forEach(s => s.polygon.forEach(p => bounds.extend(new LatLng(p[0], p[1]))));
    rl.filter(l => l.visible).forEach(l => {
      const [[s, w], [n, e]] = l.bounds;
      // Guard: only use if coords look like valid WGS84
      if (Math.abs(s) <= 90 && Math.abs(n) <= 90 && Math.abs(w) <= 180 && Math.abs(e) <= 180) {
        bounds.extend(new LatLng(s, w));
        bounds.extend(new LatLng(n, e));
      }
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [triggerFitBounds, map]);

  return null;
};

// ── Measure helpers ───────────────────────────────────────────

function haversineM(a: [number, number], b: [number, number]): number {
  const R = 6371e3;
  const φ1 = a[0] * Math.PI / 180, φ2 = b[0] * Math.PI / 180;
  const dφ = (b[0] - a[0]) * Math.PI / 180, dλ = (b[1] - a[1]) * Math.PI / 180;
  const x = Math.sin(dφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(dλ/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function polygonAreaM2(pts: [number, number][]): number {
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

interface MeasureSegment {
  fromIdx: number; toIdx: number;
  distM: number; cumDistM: number;
  elevFrom: number | null; elevTo: number | null;
  slope: number | null; // % — positive = uphill
}

function buildSegments(pts: [number, number][], elevs: Map<number, number | null>): MeasureSegment[] {
  let cum = 0;
  return pts.slice(1).map((_, i) => {
    const d = haversineM(pts[i], pts[i + 1]);
    cum += d;
    const eF = elevs.has(i) ? elevs.get(i)! : null;
    const eT = elevs.has(i + 1) ? elevs.get(i + 1)! : null;
    const slope = (eF !== null && eT !== null && d > 0) ? ((eT - eF) / d) * 100 : null;
    return { fromIdx: i, toIdx: i + 1, distM: d, cumDistM: cum, elevFrom: eF, elevTo: eT, slope };
  });
}

function sampleRasterBilinear(layer: RasterLayer, lat: number, lng: number): number | null {
  if (!layer.rawValues || !layer.rawW || !layer.rawH) return null;
  const [[south, west], [north, east]] = layer.bounds;
  if (lat < south || lat > north || lng < west || lng > east) return null;
  const { rawValues, rawW, rawH } = layer;
  const px = ((lng - west) / (east - west)) * (rawW - 1);
  const py = ((north - lat) / (north - south)) * (rawH - 1);
  const x0 = Math.floor(px), y0 = Math.floor(py);
  const x1 = Math.min(x0 + 1, rawW - 1), y1 = Math.min(y0 + 1, rawH - 1);
  const fx = px - x0, fy = py - y0;
  const v00 = rawValues[y0 * rawW + x0], v10 = rawValues[y0 * rawW + x1];
  const v01 = rawValues[y1 * rawW + x0], v11 = rawValues[y1 * rawW + x1];
  if ([v00, v10, v01, v11].some(v => isNaN(v))) return null;
  return (v00*(1-fx) + v10*fx)*(1-fy) + (v01*(1-fx) + v11*fx)*fy;
}

function fmtDist(m: number) { return m >= 1000 ? `${(m/1000).toFixed(3)} km` : `${m.toFixed(1)} m`; }
function fmtArea(m2: number) {
  if (m2 >= 1e6) return `${(m2/1e6).toFixed(4)} km²`;
  if (m2 >= 1e4) return `${(m2/1e4).toFixed(3)} ha`;
  return `${m2.toFixed(1)} m²`;
}

// ── MeasurePanel (outside MapContainer) ───────────────────────

type MeasureMode = 'Distance' | 'Elevation' | 'Area';

interface MeasurePanelProps {
  mode: MeasureMode;
  onModeChange: (m: MeasureMode) => void;
  points: [number, number][];
  elevs: Map<number, number | null>;
  fetchingIdx: Set<number>;
  onClear: () => void;
}

const MeasurePanel: React.FC<MeasurePanelProps> = ({ mode, onModeChange, points, elevs, fetchingIdx, onClear }) => {
  const segs = useMemo(() => buildSegments(points, elevs), [points, elevs]);

  const totalDist = segs.reduce((s, g) => s + g.distM, 0);
  const areaM2 = points.length >= 3 ? polygonAreaM2(points) : null;
  const allElevs = [...elevs.values()].filter((v): v is number => v !== null);
  const elevMin = allElevs.length ? Math.min(...allElevs) : null;
  const elevMax = allElevs.length ? Math.max(...allElevs) : null;
  const slopes = segs.map(s => s.slope).filter((v): v is number => v !== null);
  const avgSlope = slopes.length ? slopes.reduce((a, b) => a + Math.abs(b), 0) / slopes.length : null;

  const copyResults = () => {
    const lines = [
      `=== Measure (${mode}) ===`,
      `Points: ${points.length}`,
      `Total distance: ${fmtDist(totalDist)}`,
      ...(areaM2 !== null ? [`Area: ${fmtArea(areaM2)}`] : []),
      ...(elevMin !== null && elevMax !== null ? [
        `Elevation range: ${elevMin.toFixed(1)} – ${elevMax.toFixed(1)} m`,
        `ΔH: ${(elevMax - elevMin).toFixed(1)} m`,
      ] : []),
      ...(avgSlope !== null ? [`Avg slope: ${avgSlope.toFixed(2)}%`] : []),
      '',
      ...segs.map(s =>
        `Pt${s.fromIdx+1}→Pt${s.toIdx+1}: ${fmtDist(s.distM)}` +
        (s.slope !== null ? ` | slope ${s.slope >= 0 ? '+' : ''}${s.slope.toFixed(2)}%` : '') +
        (s.elevFrom !== null ? ` | z${s.fromIdx+1}=${s.elevFrom.toFixed(1)}m` : '')
      ),
    ];
    navigator.clipboard.writeText(lines.join('\n')).catch(() => {});
  };

  const panelStyle: React.CSSProperties = {
    position: 'absolute', top: 56, right: 12, zIndex: 1000, width: 252,
    background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
    borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.35)', pointerEvents: 'auto',
    fontSize: 11,
  };

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', borderBottom: '1px solid var(--border-subtle)' }}>
        <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 12, flex: 1 }}>Measure</span>
        <button type="button" onClick={copyResults} title="Copy to clipboard"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '2px 4px', borderRadius: 4 }}>⎘</button>
        <button type="button" onClick={onClear} title="Clear (or right-click)"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '2px 4px', borderRadius: 4 }}>✕</button>
      </div>

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 4, padding: '6px 10px', borderBottom: '1px solid var(--border-subtle)' }}>
        {(['Distance', 'Elevation', 'Area'] as MeasureMode[]).map(m => (
          <button key={m} type="button" onClick={() => onModeChange(m)}
            style={{
              flex: 1, fontSize: 10, padding: '3px 4px', borderRadius: 4, cursor: 'pointer',
              border: '1px solid var(--border-subtle)',
              background: mode === m ? 'var(--accent)' : 'transparent',
              color: mode === m ? 'var(--bg-primary)' : 'var(--text-secondary)',
              fontWeight: mode === m ? 600 : 400,
            }}>{m}</button>
        ))}
      </div>

      {/* Segments table */}
      {segs.length > 0 && (
        <div style={{ maxHeight: 160, overflowY: 'auto', padding: '4px 10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '42px 1fr 60px 60px', gap: 2,
            color: 'var(--text-secondary)', fontSize: 9, fontWeight: 600,
            padding: '2px 0', borderBottom: '1px solid var(--border-subtle)', marginBottom: 2 }}>
            <span>Seg</span><span>Length</span>
            <span style={{ textAlign: 'right' }}>Slope</span>
            <span style={{ textAlign: 'right' }}>Cum.</span>
          </div>
          {segs.map(s => {
            const loadingA = fetchingIdx.has(s.fromIdx), loadingB = fetchingIdx.has(s.toIdx);
            const slopeStr = (loadingA || loadingB) ? '…'
              : s.slope !== null ? `${s.slope >= 0 ? '+' : ''}${s.slope.toFixed(1)}%` : '—';
            return (
              <div key={s.fromIdx} style={{ display: 'grid', gridTemplateColumns: '42px 1fr 60px 60px', gap: 2,
                padding: '2px 0', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{s.fromIdx+1}→{s.toIdx+1}</span>
                <span>{fmtDist(s.distM)}</span>
                <span style={{ textAlign: 'right',
                  color: s.slope !== null ? (s.slope > 5 ? '#f97316' : s.slope < -5 ? '#3b82f6' : 'var(--text-primary)') : 'var(--text-secondary)'
                }}>{slopeStr}</span>
                <span style={{ textAlign: 'right' }}>{fmtDist(s.cumDistM)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Per-point elevations (Elevation mode) */}
      {mode === 'Elevation' && points.length > 0 && (
        <div style={{ maxHeight: 120, overflowY: 'auto', padding: '4px 10px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: 9, fontWeight: 600, marginBottom: 2 }}>Point Elevations</div>
          {points.map((_, i) => {
            const isFetching = fetchingIdx.has(i);
            const elev = elevs.get(i);
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0',
                color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Pt {i+1}</span>
                <span style={{ fontFamily: 'monospace' }}>
                  {isFetching ? '⏳ loading…'
                    : elev !== null && elev !== undefined ? `${elev.toFixed(1)} m`
                    : '—'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary */}
      <div style={{ padding: '6px 10px', borderTop: '1px solid var(--border-subtle)' }}>
        {points.length === 0
          ? <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '8px 0' }}>
              Click on map to add points.<br/>Right-click to clear.
            </div>
          : <>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Points</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{points.length}</span>
            </div>
            {totalDist > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total length</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontFamily: 'monospace' }}>{fmtDist(totalDist)}</span>
              </div>
            )}
            {areaM2 !== null && (mode === 'Area' || mode === 'Distance') && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Area</span>
                  <span style={{ color: 'var(--accent)', fontWeight: 600, fontFamily: 'monospace' }}>{fmtArea(areaM2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Perimeter</span>
                  <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                    {fmtDist(totalDist + (points.length > 1 ? haversineM(points[points.length-1], points[0]) : 0))}
                  </span>
                </div>
              </>
            )}
            {mode === 'Elevation' && elevMin !== null && elevMax !== null && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Min / Max elev.</span>
                  <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{elevMin.toFixed(1)} / {elevMax.toFixed(1)} m</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>ΔH</span>
                  <span style={{ color: 'var(--accent)', fontWeight: 600, fontFamily: 'monospace' }}>{(elevMax - elevMin).toFixed(1)} m</span>
                </div>
                {avgSlope !== null && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Avg slope</span>
                    <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{avgSlope.toFixed(2)} %</span>
                  </div>
                )}
              </>
            )}
          </>
        }
      </div>
    </div>
  );
};

// ── Edit handle icons ─────────────────────────────────────────

const vertexIcon = L.divIcon({
  className: '',
  html: '<div style="width:10px;height:10px;background:#fff;border:2px solid #10b981;border-radius:2px;box-shadow:0 1px 4px rgba(0,0,0,0.5)"></div>',
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

const conduitHandleIcon = L.divIcon({
  className: '',
  html: '<div style="width:12px;height:12px;background:#f97316;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.5)"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

// Component to render external GIS layers on the map
const ExternalLayersRenderer: React.FC<{ layers: ExternalLayer[] }> = ({ layers }) => {
  const map = useMap();
  const layerGroupsRef = useRef<Record<string, L.GeoJSON>>({});

  useEffect(() => {
    // Remove layers that no longer exist
    Object.keys(layerGroupsRef.current).forEach(id => {
      if (!layers.find(l => l.id === id)) {
        map.removeLayer(layerGroupsRef.current[id]);
        delete layerGroupsRef.current[id];
      }
    });

    layers.forEach(layer => {
      // Remove existing layer to re-render with new props
      if (layerGroupsRef.current[layer.id]) {
        map.removeLayer(layerGroupsRef.current[layer.id]);
        delete layerGroupsRef.current[layer.id];
      }

      if (!layer.visible || !layer.geojson) return;

      const geoLayer = L.geoJSON(layer.geojson, {
        style: () => ({
          color: layer.style.color,
          fillColor: layer.style.fillColor,
          fillOpacity: layer.style.fillOpacity * layer.opacity,
          weight: layer.style.weight,
          opacity: layer.opacity,
        }),
        pointToLayer: (_feature, latlng) => {
          return L.circleMarker(latlng, {
            radius: layer.style.radius,
            color: layer.style.color,
            fillColor: layer.style.fillColor,
            fillOpacity: layer.style.fillOpacity * layer.opacity,
            weight: layer.style.weight,
            opacity: layer.opacity,
          });
        },
      });

      geoLayer.bindTooltip(layer.name, { sticky: true });
      geoLayer.addTo(map);
      layerGroupsRef.current[layer.id] = geoLayer;
    });

    return () => {
      // Cleanup on unmount
      Object.values(layerGroupsRef.current).forEach(gl => map.removeLayer(gl));
      layerGroupsRef.current = {};
    };
  }, [layers, map]);

  return null;
};

export const MapView: React.FC = () => {
  const { 
    nodes, conduits, subcatchments, 
    activeTool, setActiveTool, 
    addNode, addConduit, addSubcatchment, 
    selectElement, selectedElementId, selectedElementType,
    mapLayers,
    simulationResults, currentTimeStep, isMaxMode, theme, crs,
    displayCRS,
    layerOpacity,
    externalLayers,
    rasterLayers,
  } = useStore();
  const [drawingConduitFrom, setDrawingConduitFrom] = useState<string | null>(null);
  const [drawingPolygon, setDrawingPolygon] = useState<[number, number][]>([]);
  const [mousePos, setMousePos] = useState<[number, number] | null>(null);

  // ── Measure tool state ───────────────────────────────────────
  const [measurePoints, setMeasurePoints] = useState<[number, number][]>([]);
  const [measureMode, setMeasureMode] = useState<MeasureMode>('Distance');
  const [measureElevs, setMeasureElevs] = useState<Map<number, number | null>>(new Map());
  const [fetchingElevIdx, setFetchingElevIdx] = useState<Set<number>>(new Set());
  const [rasterSampleValue, setRasterSampleValue] = useState<{ name: string; value: number } | null>(null);

  // ── Elevation fetch (OpenTopoData SRTM 90m) ─────────────────
  const fetchElevation = useCallback(async (lat: number, lng: number, idx: number) => {
    // ── 1. Raster elevation source (instant, no network) ────────
    const elevSrc = rasterLayers.find(l => l.isElevationSource && l.rawValues);
    if (elevSrc) {
      const sampled = sampleRasterBilinear(elevSrc, lat, lng);
      if (sampled !== null) {
        setMeasureElevs(prev => new Map(prev).set(idx, sampled));
        return;
      }
      // Point outside raster bounds → fall through to API
    }

    // ── 2. Fallback: OpenTopoData API ───────────────────────────
    setFetchingElevIdx(prev => new Set(prev).add(idx));
    setMeasureElevs(prev => new Map(prev).set(idx, null)); // null = loading
    try {
      const res = await fetch(`https://api.opentopodata.org/v1/srtm90m?locations=${lat},${lng}`);
      const data = await res.json();
      const elev: number = data.results?.[0]?.elevation;
      setMeasureElevs(prev => new Map(prev).set(idx, typeof elev === 'number' ? elev : null));
    } catch {
      setMeasureElevs(prev => { const m = new Map(prev); m.delete(idx); return m; });
    } finally {
      setFetchingElevIdx(prev => { const s = new Set(prev); s.delete(idx); return s; });
    }
  }, [rasterLayers]);

  const clearMeasure = useCallback(() => {
    setMeasurePoints([]);
    setMeasureElevs(new Map());
    setFetchingElevIdx(new Set());
  }, []);

  // ── Map event handlers ───────────────────────────────────────
  const handleMapClick = (e: L.LeafletMouseEvent) => {
    if (activeTool === 'AddNode') {
      addNode(e.latlng.lat, e.latlng.lng);
    } else if (activeTool === 'Select') {
      if ((e.originalEvent?.target as HTMLElement)?.classList?.contains('leaflet-container')) {
        selectElement(null, null);
      }
    } else if (activeTool === 'AddSubcatchment') {
      setDrawingPolygon(prev => [...prev, [e.latlng.lat, e.latlng.lng]]);
    } else if (activeTool === 'Measure') {
      const idx = measurePoints.length;
      setMeasurePoints(prev => [...prev, [e.latlng.lat, e.latlng.lng]]);
      if (measureMode === 'Elevation') fetchElevation(e.latlng.lat, e.latlng.lng, idx);
    }
  };

  const handleMapRightClick = (_e: L.LeafletMouseEvent) => {
    if (activeTool === 'AddSubcatchment') {
      if (drawingPolygon.length >= 3) addSubcatchment(drawingPolygon, '');
      setDrawingPolygon([]);
      setMousePos(null);
    } else if (activeTool === 'Measure') {
      clearMeasure();
      setMousePos(null);
    }
  };

  const handleNodeClick = (e: L.LeafletMouseEvent, node: Node) => {
    if (e.originalEvent) {
      e.originalEvent.stopPropagation();
    }
    
    if (activeTool === 'Select') {
      selectElement(node.id, 'Node');
    } else if (activeTool === 'AddConduit') {
      if (!drawingConduitFrom) {
        setDrawingConduitFrom(node.id);
      } else {
        if (drawingConduitFrom !== node.id) {
          addConduit(drawingConduitFrom, node.id);
        }
        setDrawingConduitFrom(null);
      }
    } else if (activeTool === 'AddSubcatchment') {
      // Allow clicking a node to add it as a point in the polygon
      setDrawingPolygon(prev => [...prev, [node.lat, node.lng]]);
    } else if (activeTool === 'Measure') {
      setMeasurePoints(prev => [...prev, [node.lat, node.lng]]);
    }
  };

  const handleConduitClick = (e: L.LeafletMouseEvent, conduitId: string) => {
    if (e.originalEvent) {
      e.originalEvent.stopPropagation();
    }
    if (activeTool === 'Select') {
      selectElement(conduitId, 'Conduit');
    } else if (activeTool === 'AddNode') {
      // Snap node to conduit and split it
      addNode(e.latlng.lat, e.latlng.lng, conduitId);
    }
  };

  const handleSubcatchmentClick = (e: L.LeafletMouseEvent, subId: string) => {
    if (e.originalEvent) {
      e.originalEvent.stopPropagation();
    }
    if (activeTool === 'Select') {
      selectElement(subId, 'Subcatchment');
    }
  };

  const handleMouseMove = (e: L.LeafletMouseEvent) => {
    const { lat, lng } = e.latlng;
    setMousePos([lat, lng]);
    // Sample topmost visible raster with raw values
    const activeRaster = [...rasterLayers].reverse().find(l => l.visible && l.rawValues);
    if (activeRaster) {
      const val = sampleRasterBilinear(activeRaster, lat, lng);
      setRasterSampleValue(val !== null ? { name: activeRaster.name, value: val } : null);
    } else {
      setRasterSampleValue(null);
    }
  };

  const getNodeColor = (node: Node) => {
    if (selectedElementId === node.id) return '#f43f5e'; // rose-500
    
    if (mapLayers.simulationResults && simulationResults?.nodes[node.id]) {
      const res = simulationResults.nodes[node.id];
      const depthSeries = res.depthSeries;
      
      const currentDepth = isMaxMode ? res.depth : (depthSeries[currentTimeStep]?.value || 0);
      const maxDepth = node.maxDepth || 1;
      const currentFlooding = isMaxMode 
        ? res.flooding 
        : (res.floodingSeries[currentTimeStep]?.value || 0);
      
      if (currentFlooding > 0.00001) return '#ef4444'; // Flooding (red)
      if (currentDepth >= maxDepth) return '#f97316';  // Surcharged/Full (orange)
      if (currentDepth > maxDepth * 0.75) return '#f59e0b'; // High (amber)
      if (currentDepth > 0.0001) return '#3b82f6';    // Flowing (blue)
      return '#475569'; // Dry during simulation (slate-600)
    }

    if (node.type === 'Outfall') return '#3b82f6'; 
    if (node.type === 'Storage') return '#8b5cf6'; 
    return '#10b981'; 
  };

  const createNodeIcon = (node: Node) => {
    const color = getNodeColor(node);
    const isSelected = selectedElementId === node.id;
    const size = isSelected ? 20 : 14;
    
    // Check if flooding
    let isFlooding = false;
    if (mapLayers.simulationResults && simulationResults?.nodes[node.id]) {
       const depthSeries = simulationResults.nodes[node.id].depthSeries;
       const currentDepth = depthSeries[currentTimeStep]?.value || 0;
       if (currentDepth >= node.maxDepth) isFlooding = true;
    }

    return L.divIcon({
      className: 'custom-node-icon',
      html: `
        <div class="relative flex items-center justify-center">
          ${isFlooding ? '<div class="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20"></div>' : ''}
          ${isSelected ? `<div class="absolute inset-0 bg-indigo-500 rounded-full animate-pulse opacity-40 scale-150"></div>` : ''}
          <div style="
            width: ${size}px; 
            height: ${size}px; 
            background-color: ${color}; 
            border: 2px solid ${isSelected ? '#ffffff' : '#1e293b'}; 
            border-radius: 50%; 
            box-shadow: 0 0 10px ${color}80;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 10;
          "></div>
        </div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  };

  const getConduitColor = (conduitId: string) => {
    if (selectedElementId === conduitId) return '#f43f5e'; // rose-500
    if (mapLayers.simulationResults && simulationResults?.conduits[conduitId]) {
      const res = simulationResults.conduits[conduitId];
      const q = isMaxMode ? Math.abs(res.qFull) : Math.abs(res.flowSeries[currentTimeStep]?.value || 0);
      
      if (res.capacity > 0) {
        const ratio = q / res.capacity;
        if (ratio > 0.9) return '#ef4444'; // red-500 (Surcharge/Pressure)
        if (ratio > 0.7) return '#f59e0b'; // amber-500 (High)
        if (q > 0.00001) return '#10b981'; // emerald-500 (Flowing)
        return '#475569';                 // slate-600 (Dry)
      } else {
        if (q > 5) return '#ef4444';      // red-500
        if (q > 2) return '#f59e0b';      // amber-500
        if (q > 0.0001) return '#3b82f6';  // blue-500 (Flowing)
        return '#475569';                 // slate-600 (Dry)
      }
    }
    return '#64748b'; // slate-500 (Static/No results)
  };

  const getConduitWeight = (conduitId: string) => {
    if (selectedElementId === conduitId) return 6;
    if (mapLayers.simulationResults && simulationResults?.conduits[conduitId]) {
      const flowSeries = simulationResults.conduits[conduitId].flowSeries;
      const q = Math.abs(flowSeries[currentTimeStep]?.value || 0);
      return Math.min(Math.max(q * 2, 3), 10);
    }
    return 4;
  };

  return (
    <div className={`flex-1 h-full relative bg-slate-800 ${activeTool === 'Select' ? 'cursor-default' : 'cursor-crosshair'}`}>
      <MapContainer
        center={[37.7749, -122.4194]} // SF Default
        zoom={13}
        className="h-full w-full bg-[#0f172a] z-0"
        zoomControl={false}
        crs={crs === 'EPSG:4326' ? L.CRS.EPSG4326 : L.CRS.EPSG3857}
      >
        <FitBoundsHandler />
        <ExternalLayersRenderer layers={externalLayers} />
        {mapLayers.baseMap && (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url={theme === 'dark'
              ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            }
            opacity={layerOpacity['baseMap'] ?? 1}
          />
        )}
        {mapLayers.satelliteLayer && (
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
            opacity={layerOpacity['satelliteLayer'] ?? 1}
          />
        )}
        {mapLayers.wmsLayer && (
          <TileLayer
            url="https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}"
            attribution='USGS The National Map: National Boundaries Dataset, 3DEP Elevation Program, Geographic Names Information System, National Hydrography Dataset, National Land Cover Database, National Structures Dataset, and National Transportation Dataset; USGS Global Ecosystems; U.S. Census Bureau TIGER/Line data; USFS Road Data; Natural Earth Data; U.S. Department of State Humanitarian Information Unit; and NOAA National Centers for Environmental Information, U.S. Coastal Relief Model. Data refreshed October, 2020.'
            opacity={layerOpacity['wmsLayer'] ?? 0.5}
          />
        )}
        <MapEvents onMouseMove={handleMouseMove} onMapClick={handleMapClick} onMapRightClick={handleMapRightClick} />
        
        {/* Draw temporary conduit line */}
        {drawingConduitFrom && mousePos && (
          <Polyline
            positions={[
              [nodes.find(n => n.id === drawingConduitFrom)!.lat, nodes.find(n => n.id === drawingConduitFrom)!.lng],
              mousePos
            ]}
            color="#94a3b8"
            dashArray="5, 10"
            weight={3}
          />
        )}

        {/* Draw temporary subcatchment polygon */}
        {drawingPolygon.length > 0 && mousePos && (
          <Polygon
            positions={[...drawingPolygon, mousePos]}
            color="#10b981"
            fillColor="#10b981"
            fillOpacity={0.2}
            dashArray="5, 5"
            weight={2}
          />
        )}

        {/* Measure Tool Rendering */}
        {activeTool === 'Measure' && (
          <>
            {/* Committed segments — solid */}
            {measurePoints.length >= 2 && (
              <Polyline positions={measurePoints} color="#f59e0b" weight={2} />
            )}
            {/* Rubber-band to cursor — dashed */}
            {measurePoints.length >= 1 && mousePos && (
              <Polyline
                positions={[measurePoints[measurePoints.length - 1], mousePos]}
                color="#f59e0b" dashArray="6,6" weight={2}
              />
            )}
            {/* Area fill polygon */}
            {measureMode === 'Area' && measurePoints.length >= 3 && (
              <Polygon
                positions={measurePoints}
                color="#f59e0b" fillColor="#f59e0b" fillOpacity={0.15} weight={2}
              />
            )}
            {/* Numbered point markers */}
            {measurePoints.map((pt, i) => (
              <Marker
                key={i}
                position={pt}
                icon={L.divIcon({
                  className: '',
                  html: `<div style="width:18px;height:18px;border-radius:50%;background:#f59e0b;border:2px solid #1e293b;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#1e293b;line-height:1">${i + 1}</div>`,
                  iconSize: [18, 18],
                  iconAnchor: [9, 9],
                })}
              />
            ))}
          </>
        )}

        {/* Raster Layers */}
        {rasterLayers.filter(l => l.visible).map(layer => (
          <ImageOverlay
            key={layer.id}
            url={layer.imageUrl}
            bounds={layer.bounds}
            opacity={layer.opacity}
            zIndex={100}
          />
        ))}

        {/* Render Subcatchments */}
        {mapLayers.subcatchments && subcatchments.map(sub => (
          <Polygon
            key={sub.id}
            positions={sub.polygon}
            color={selectedElementId === sub.id ? '#f43f5e' : '#10b981'}
            fillColor={selectedElementId === sub.id ? '#f43f5e' : '#10b981'}
            fillOpacity={0.2}
            weight={2}
            bubblingMouseEvents={false}
            eventHandlers={{
              click: (e) => handleSubcatchmentClick(e, sub.id)
            }}
          >
            <Tooltip sticky>
              <div className="text-sm">
                <strong>{sub.name}</strong><br/>
                Area: {sub.area} ha<br/>
                Imperv: {sub.imperv}%
                {mapLayers.simulationResults && simulationResults?.subcatchments[sub.id] && (
                  <>
                    <br/>
                    <span className="text-emerald-500 font-bold">
                      Runoff: {simulationResults.subcatchments[sub.id].runoffSeries[currentTimeStep]?.value.toFixed(3) || 0} m³/s
                    </span>
                  </>
                )}
              </div>
            </Tooltip>
          </Polygon>
        ))}

        {/* Render Conduits */}
        {mapLayers.drainageNetwork && conduits.map(conduit => {
          const fromNode = nodes.find(n => n.id === conduit.fromNode);
          const toNode = nodes.find(n => n.id === conduit.toNode);
          if (!fromNode || !toNode) return null;

          const N = conduit.parallelCount ?? 1;
          const midLat = (fromNode.lat + toNode.lat) / 2;
          const midLng = (fromNode.lng + toNode.lng) / 2;

          return (
            <React.Fragment key={conduit.id}>
            <Polyline
              positions={[[fromNode.lat, fromNode.lng], [toNode.lat, toNode.lng]]}
              pathOptions={{ color: getConduitColor(conduit.id), weight: getConduitWeight(conduit.id) }}
              bubblingMouseEvents={false}
              eventHandlers={{
                click: (e) => handleConduitClick(e, conduit.id)
              }}
            >
              <Tooltip sticky>
                <div style={{ fontSize: '12px', lineHeight: '1.5' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>{conduit.name}{N > 1 ? ` (×${N})` : ''}</div>
                  <div style={{ color: '#94a3b8', fontSize: '10px', marginBottom: '4px' }}>
                    {nodes.find(n => n.id === conduit.fromNode)?.name ?? conduit.fromNode} → {nodes.find(n => n.id === conduit.toNode)?.name ?? conduit.toNode}
                  </div>
                  <div>Length: <b>{conduit.length} m</b> | Slope: <b>{conduit.slope}%</b></div>
                  <div>
                    Section: <b>{conduit.shape === 'Circular' ? `Circ. Ø${conduit.diameter}m` : conduit.shape === 'Rectangular' ? `Rect. ${conduit.width}×${conduit.height}m` : `Trap. ${conduit.width}m`}</b>
                    {N > 1 && <span style={{ color: '#818cf8', fontWeight: 700 }}> ×{N} paralelo</span>}
                  </div>
                  {mapLayers.simulationResults && simulationResults?.conduits[conduit.id] && (() => {
                    const res = simulationResults.conduits[conduit.id];
                    const rawFlow = isMaxMode ? res.qFull : (res.flowSeries[currentTimeStep]?.value ?? 0);
                    const absFlow = Math.abs(rawFlow);
                    const velocity = isMaxMode ? 0 : Math.abs(res.velocitySeries[currentTimeStep]?.value ?? 0);
                    const ratio = res.capacity > 0 ? absFlow / res.capacity : 0;
                    const pct = (ratio * 100).toFixed(1);
                    const direction = rawFlow < -0.00001 ? ' ←' : rawFlow > 0.00001 ? ' →' : '';
                    const statusColor = ratio > 0.9 ? '#ef4444' : ratio > 0.7 ? '#f59e0b' : absFlow > 0.00001 ? '#10b981' : '#64748b';
                    const statusLabel = ratio > 0.9 ? 'SURCHARGED' : ratio > 0.7 ? 'HIGH' : absFlow > 0.00001 ? 'FLOWING' : 'DRY';
                    return (
                      <div style={{ marginTop: '4px', borderTop: '1px solid #334155', paddingTop: '4px' }}>
                        <div>Flow: <b style={{ color: statusColor }}>{absFlow.toFixed(3)} m³/s{direction}</b></div>
                        {!isMaxMode && <div>Velocity: <b>{velocity.toFixed(3)} m/s</b></div>}
                        <div>Fill: <b style={{ color: statusColor }}>{pct}%</b> — <span style={{ color: statusColor, fontWeight: 'bold' }}>{statusLabel}</span></div>
                        {isMaxMode && <div style={{ fontSize: '10px', color: '#64748b' }}>Hydraulic capacity: {res.capacity.toFixed(3)} m³/s</div>}
                      </div>
                    );
                  })()}
                </div>
              </Tooltip>
            </Polyline>
            {N > 1 && (
              <Marker
                position={[midLat, midLng]}
                icon={L.divIcon({
                  className: '',
                  html: `<div style="background:#6366f1;color:#fff;border-radius:10px;padding:1px 6px;font-size:10px;font-weight:700;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.4)">×${N}</div>`,
                  iconSize: [28, 16],
                  iconAnchor: [14, 8],
                })}
              />
            )}
          </React.Fragment>
          );
        })}

        {/* Subcatchment vertex editing — shown when a subcatchment is selected in Select mode */}
        {activeTool === 'Select' && selectedElementType === 'Subcatchment' && (() => {
          const editSub = subcatchments.find(s => s.id === selectedElementId);
          if (!editSub) return null;
          return editSub.polygon.map((pt, idx) => (
            <Marker
              key={`vertex-${editSub.id}-${idx}`}
              position={pt}
              icon={vertexIcon}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const { lat, lng } = e.target.getLatLng();
                  const newPolygon = editSub.polygon.map((p, i) =>
                    i === idx ? [lat, lng] as [number, number] : p
                  );
                  const newArea = Number((polygonAreaM2(newPolygon) / 10000).toFixed(4));
                  useStore.getState().updateSubcatchment(editSub.id, { polygon: newPolygon, area: Math.max(newArea, 0.0001) });
                },
              }}
            />
          ));
        })()}

        {/* Conduit endpoint handles — shown when a conduit is selected in Select mode */}
        {activeTool === 'Select' && selectedElementType === 'Conduit' && (() => {
          const sel = conduits.find(c => c.id === selectedElementId);
          if (!sel) return null;
          const fn = nodes.find(n => n.id === sel.fromNode);
          const tn = nodes.find(n => n.id === sel.toNode);
          if (!fn || !tn) return null;

          const makeHandle = (node: Node, endpoint: 'fromNode' | 'toNode') => (
            <Marker
              key={`handle-${sel.id}-${endpoint}`}
              position={[node.lat, node.lng]}
              icon={conduitHandleIcon}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const { lat, lng } = e.target.getLatLng();
                  // Snap to nearest node (excluding current endpoints)
                  const SNAP_M = 80;
                  const candidates = nodes
                    .filter(n => n.id !== sel.fromNode && n.id !== sel.toNode)
                    .map(n => ({ n, d: haversineM([lat, lng], [n.lat, n.lng]) }))
                    .sort((a, b) => a.d - b.d);
                  if (candidates.length > 0 && candidates[0].d < SNAP_M) {
                    useStore.getState().updateConduit(sel.id, { [endpoint]: candidates[0].n.id });
                  }
                },
              }}
            />
          );

          return (
            <React.Fragment key={`handles-${sel.id}`}>
              {makeHandle(fn, 'fromNode')}
              {makeHandle(tn, 'toNode')}
            </React.Fragment>
          );
        })()}

        {/* Render Nodes */}
        {mapLayers.drainageNetwork && nodes.map(node => (
          <Marker
            key={node.id}
            position={[node.lat, node.lng]}
            icon={createNodeIcon(node)}
            draggable={activeTool === 'Select'}
            eventHandlers={{
              click: (e) => handleNodeClick(e, node),
              dragend: (e) => {
                const marker = e.target;
                const position = marker.getLatLng();
                useStore.getState().updateNode(node.id, { lat: position.lat, lng: position.lng });
              }
            }}
          >
            <Tooltip direction="top" offset={[0, -10]}>
              <div style={{ fontSize: '12px', lineHeight: '1.5' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>{node.name}</div>
                <div style={{ color: '#94a3b8', fontSize: '10px', marginBottom: '4px' }}>{node.type}</div>
                <div>Invert elev.: <b>{node.invertElevation} m</b></div>
                <div>Max depth: <b>{node.maxDepth} m</b></div>
                {mapLayers.simulationResults && simulationResults?.nodes[node.id] && (() => {
                  const res = simulationResults.nodes[node.id];
                  const depth = isMaxMode ? res.depth : (res.depthSeries[currentTimeStep]?.value ?? 0);
                  const flooding = isMaxMode ? res.flooding : (res.floodingSeries[currentTimeStep]?.value ?? 0);
                  const head = node.invertElevation + depth;
                  const fillPct = node.maxDepth > 0 ? Math.min((depth / node.maxDepth) * 100, 100) : 0;
                  const isSurcharged = depth >= node.maxDepth;
                  const isFlooding = flooding > 0.00001;
                  const statusColor = isFlooding ? '#ef4444' : isSurcharged ? '#f97316' : depth > node.maxDepth * 0.75 ? '#f59e0b' : depth > 0.0001 ? '#3b82f6' : '#64748b';
                  const statusLabel = isFlooding ? 'FLOODED' : isSurcharged ? 'SURCHARGED' : depth > node.maxDepth * 0.75 ? '>75% FULL' : depth > 0.0001 ? 'FLOWING' : 'DRY';
                  return (
                    <div style={{ marginTop: '4px', borderTop: '1px solid #334155', paddingTop: '4px' }}>
                      <div>Depth: <b style={{ color: statusColor }}>{depth.toFixed(2)} m</b> ({fillPct.toFixed(0)}%)</div>
                      <div>Head: <b>{head.toFixed(2)} m</b></div>
                      {isFlooding && <div style={{ color: '#ef4444', fontWeight: 'bold' }}>Overflow: {flooding.toFixed(3)} m³/s</div>}
                      <div style={{ color: statusColor, fontWeight: 'bold', marginTop: '2px' }}>● {statusLabel}</div>
                    </div>
                  );
                })()}
              </div>
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>

      {/* Measure Panel — floats over map, outside MapContainer */}
      {activeTool === 'Measure' && (
        <MeasurePanel
          mode={measureMode}
          onModeChange={m => { setMeasureMode(m); clearMeasure(); }}
          points={measurePoints}
          elevs={measureElevs}
          fetchingIdx={fetchingElevIdx}
          onClear={clearMeasure}
        />
      )}

      {/* Conduit Capacity Legend */}
      {mapLayers.simulationResults && simulationResults && (
        <div className="absolute bottom-6 right-6 bg-black/75 text-[#F0F0F0] p-3 rounded-lg border border-white/10 shadow-xl z-[1000] text-[10px] pointer-events-none min-w-[140px]">
          <div className="font-semibold mb-2 border-b border-white/10 pb-1 text-xs">Map Legend</div>
          
          <div className="mb-3">
            <div className="text-[#818181] font-medium mb-1 uppercase tracking-wider">Conduits (Q/Qfull)</div>
            <div className="flex items-center gap-2 mb-1"><div className="w-3 h-1 bg-red-500"></div> &gt; 90% (Surcharge)</div>
            <div className="flex items-center gap-2 mb-1"><div className="w-3 h-1 bg-amber-500"></div> 70% - 90% (High)</div>
            <div className="flex items-center gap-2 mb-1"><div className="w-3 h-1 bg-emerald-500"></div> &lt; 70% (Flowing)</div>
            <div className="flex items-center gap-2 mb-1"><div className="w-3 h-1 bg-slate-600"></div> Dry</div>
          </div>

          <div>
            <div className="text-[#818181] font-medium mb-1 uppercase tracking-wider">Nodes (Depth)</div>
            <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full bg-red-500"></div> Flooding</div>
            <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full bg-orange-500"></div> Surcharged</div>
            <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full bg-amber-500"></div> &gt; 75% Full</div>
            <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Flowing</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-600"></div> Dry</div>
          </div>
        </div>
      )}
      
      {/* Tooltip for current action */}
      {activeTool !== 'Select' && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/75 text-[#F0F0F0] px-4 py-2 rounded-full text-sm font-medium border border-white/10 shadow-lg z-[1000] pointer-events-none">
          {activeTool === 'AddNode' && 'Click on map to add a node'}
          {activeTool === 'AddConduit' && !drawingConduitFrom && 'Click on a start node'}
          {activeTool === 'AddConduit' && drawingConduitFrom && 'Click on an end node'}
          {activeTool === 'AddSubcatchment' && 'Click on map to draw polygon, right-click to finish'}
          {activeTool === 'Measure' && 'Click to measure distance/area, right-click to clear'}
        </div>
      )}

      {/* Coordinate Status Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-6 bg-black/75 border-t border-white/10 flex items-center px-3 gap-4 z-[1000] pointer-events-none text-[10px] text-[#818181] font-mono">
        {mousePos ? (
          <span>{formatCoordinates(mousePos[1], mousePos[0], displayCRS)}</span>
        ) : (
          <span>Move cursor over map...</span>
        )}
        <span className="text-[#636363]">|</span>
        <span className="text-[#636363]">{displayCRS}</span>
        {rasterSampleValue && (
          <>
            <span className="text-[#636363]">|</span>
            <span className="text-[#a78bfa]">{rasterSampleValue.name}: <b style={{ color: '#c4b5fd' }}>{rasterSampleValue.value.toFixed(2)}</b></span>
          </>
        )}
      </div>
    </div>
  );
};
