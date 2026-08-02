import React from 'react';
import { useStore } from '../store';
import { Settings2, Trash2, RefreshCw, Map, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Section } from './ui/Section';
import { Select } from './ui/Select';
import { Input } from './ui/Input';

// Helper to calculate distance between two lat/lng points in meters
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // metres
  const p1 = lat1 * Math.PI/180;
  const p2 = lat2 * Math.PI/180;
  const dp = (lat2-lat1) * Math.PI/180;
  const dl = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Helper to calculate approximate area of a polygon in hectares
const calculateArea = (polygon: [number, number][]) => {
  if (polygon.length < 3) return 0;
  
  // Convert to local cartesian coordinates (meters) relative to first point
  const refLat = polygon[0][0];
  const refLng = polygon[0][1];
  
  const pts = polygon.map(p => {
    const x = calculateDistance(refLat, refLng, refLat, p[1]) * (p[1] > refLng ? 1 : -1);
    const y = calculateDistance(refLat, refLng, p[0], refLng) * (p[0] > refLat ? 1 : -1);
    return [x, y];
  });

  // Shoelace formula
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1];
  }
  
  return Math.abs(area / 2) / 10000; // Convert m^2 to hectares
};

export const PropertiesPanel: React.FC = () => {
  const { nodes, conduits, subcatchments, selectedElementId, selectedElementType, updateNode, updateConduit, updateSubcatchment, deleteElement, simulationResults, simulationSettings, autoDelineateSubcatchment } = useStore();

  const formatTimeAxis = (t: number) => {
    const hours = (t * (simulationSettings?.reportingStep || 300)) / 3600;
    return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`;
  };

  if (!selectedElementId || !selectedElementType) {
    return (
      <div className="w-80 bg-bg-surface border-l border-border-subtle flex flex-col h-full text-text-secondary items-center justify-center p-6 text-center">
        <Settings2 size={48} className="text-border-subtle mb-4" />
        <p>Select an element on the map to view and edit its properties.</p>
      </div>
    );
  }

  const renderNodeProperties = () => {
    const node = nodes.find(n => n.id === selectedElementId);
    if (!node) return null;

    const results = simulationResults?.nodes[node.id];

    const autoCalculateElevation = async () => {
      try {
        const response = await fetch(`https://api.opentopodata.org/v1/srtm30m?locations=${node.lat},${node.lng}`);
        const data = await response.json();
        if (data.results && data.results[0] && data.results[0].elevation !== null) {
          updateNode(node.id, { invertElevation: Number(data.results[0].elevation.toFixed(2)) });
        } else {
          alert('Could not retrieve elevation data for this location.');
        }
      } catch (error) {
        console.error('Error fetching elevation:', error);
        alert('Error fetching elevation data. The API might be rate-limited.');
      }
    };

    return (
      <div className="space-y-1">
        <Section title="General">
          <PropertyField label="Name" value={node.name} onChange={(v) => updateNode(node.id, { name: v })} />
          <PropertyField label="Type" value={node.type} onChange={(v) => updateNode(node.id, { type: v as any })} type="select" options={['Junction', 'Outfall', 'Storage']} />
        </Section>
        
        <Section title="Physical">
          <Input
            label="Invert Elevation (m)"
            type="number"
            value={node.invertElevation.toString()}
            onChange={(e) => updateNode(node.id, { invertElevation: parseFloat(e.target.value) })}
            action={
              <button 
                onClick={autoCalculateElevation}
                className="text-accent hover:text-accent-hover flex items-center gap-1"
                title="Auto-calculate from DEM (OpenTopoData)"
              >
                <RefreshCw size={12} />
                <span className="text-[10px]">Auto</span>
              </button>
            }
          />
          <PropertyField label="Max Depth (m)" value={node.maxDepth?.toString() || '0'} onChange={(v) => updateNode(node.id, { maxDepth: parseFloat(v) })} type="number" />
          <PropertyField label="Initial Depth (m)" value={node.initialDepth?.toString() || '0'} onChange={(v) => updateNode(node.id, { initialDepth: parseFloat(v) })} type="number" />
          <PropertyField label="Surcharge Depth (m)" value={node.surchargeDepth?.toString() || '0'} onChange={(v) => updateNode(node.id, { surchargeDepth: parseFloat(v) })} type="number" />
          <PropertyField label="Ponded Area (m²)" value={node.pondedArea?.toString() || '0'} onChange={(v) => updateNode(node.id, { pondedArea: parseFloat(v) })} type="number" />
        </Section>
        {node.type === 'Storage' && (
          <Section title="Storage Properties" defaultOpen={true}>
            <PropertyField 
              label="Constant Area (m²)" 
              value={node.storageArea?.toString() || '1000'} 
              onChange={(v) => updateNode(node.id, { storageArea: parseFloat(v) })} 
              type="number" 
            />
            
            <div className="mt-4 border-t border-border-subtle pt-3">
              <label className="text-[10px] text-text-secondary font-medium uppercase mb-2 block">Storage Curve (Depth vs Area)</label>
              <div className="space-y-1">
                <div className="grid grid-cols-2 gap-2 text-[10px] text-text-secondary px-1">
                  <span>Depth (m)</span>
                  <span>Area (m²)</span>
                </div>
                {(node.storageCurve || []).map((row, idx) => (
                  <div key={idx} className="grid grid-cols-2 gap-2">
                    <input 
                      type="number" 
                      value={row.depth} 
                      title="Depth (m)"
                      onChange={(e) => {
                        const newCurve = [...(node.storageCurve || [])];
                        newCurve[idx] = { ...row, depth: parseFloat(e.target.value) };
                        updateNode(node.id, { storageCurve: newCurve });
                      }}
                      className="bg-bg-primary border border-border-subtle rounded px-2 py-1 text-xs text-text-primary"
                    />
                    <div className="flex gap-1">
                      <input 
                        type="number" 
                        value={row.area} 
                        title="Area (m²)"
                        onChange={(e) => {
                          const newCurve = [...(node.storageCurve || [])];
                          newCurve[idx] = { ...row, area: parseFloat(e.target.value) };
                          updateNode(node.id, { storageCurve: newCurve });
                        }}
                        className="bg-bg-primary border border-border-subtle rounded px-2 py-1 text-xs text-text-primary flex-1"
                      />
                      <button 
                        onClick={() => {
                          const newCurve = (node.storageCurve || []).filter((_, i) => i !== idx);
                          updateNode(node.id, { storageCurve: newCurve });
                        }}
                        className="p-1 text-red-500 hover:text-red-400"
                        title="Remove row"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
                <button 
                  onClick={() => {
                    const newCurve = [...(node.storageCurve || [])];
                    const lastDepth = newCurve.length > 0 ? newCurve[newCurve.length - 1].depth : 0;
                    newCurve.push({ depth: lastDepth + 1, area: node.storageArea || 1000 });
                    updateNode(node.id, { storageCurve: newCurve });
                  }}
                  className="w-full mt-2 py-1 text-[10px] bg-accent/10 text-accent hover:bg-accent/20 rounded border border-dashed border-accent/30"
                >
                  + Add Curve Point
                </button>
              </div>
            </div>
          </Section>
        )}
        
        <Section title="Actions" defaultOpen={false}>
          <div className="space-y-2">
            <button
              onClick={() => autoDelineateSubcatchment(node.id)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-accent/10 text-accent hover:bg-accent/20 rounded-md transition-colors text-sm font-medium"
              title="Simulates DEM watershed delineation"
            >
              <Map size={16} />
              Auto-Delineate
            </button>
            <button
              onClick={() => deleteElement(node.id, 'Node')}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-md transition-colors text-sm font-medium"
            >
              <Trash2 size={16} />
              Delete Node
            </button>
          </div>
        </Section>

        {results && (
          <Section title="Results">
            <ResultField label="Max Depth" value={`${results.depth.toFixed(2)} m`} />
            <ResultField label="Max Head" value={`${results.head.toFixed(2)} m`} />
            
            {results.inflowSeries && results.inflowSeries.length > 0 && (
              <div className="mt-4 h-32">
                <p className="text-xs text-text-secondary mb-1">Inflow Hydrograph (m³/s)</p>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={results.inflowSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize={10} tickFormatter={formatTimeAxis} />
                    <YAxis stroke="var(--text-secondary)" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', fontSize: '12px' }} />
                    <Line type="monotone" dataKey="value" stroke="var(--accent)" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Section>
        )}
      </div>
    );
  };

  const renderConduitProperties = () => {
    const conduit = conduits.find(c => c.id === selectedElementId);
    if (!conduit) return null;

    const results = simulationResults?.conduits[conduit.id];
    if (results) console.log('Conduit Results:', results);

    const recalculateLength = () => {
      const n1 = nodes.find(n => n.id === conduit.fromNode);
      const n2 = nodes.find(n => n.id === conduit.toNode);
      if (n1 && n2) {
        const length = Math.max(Math.round(calculateDistance(n1.lat, n1.lng, n2.lat, n2.lng)), 1);
        updateConduit(conduit.id, { length });
      }
    };

    return (
      <div className="space-y-1">
        <Section title="General">
          <PropertyField label="Name" value={conduit.name} onChange={(v) => updateConduit(conduit.id, { name: v })} />
          <PropertyField 
            label="From Node" 
            value={conduit.fromNode} 
            onChange={(v) => updateConduit(conduit.id, { fromNode: v })} 
            type="select" 
            options={nodes.map(n => n.id)}
            optionLabels={nodes.map(n => n.name)}
          />
          <PropertyField 
            label="To Node" 
            value={conduit.toNode} 
            onChange={(v) => updateConduit(conduit.id, { toNode: v })} 
            type="select" 
            options={nodes.map(n => n.id)}
            optionLabels={nodes.map(n => n.name)}
          />
        </Section>
        
        <Section title="Physical">
          <Input
            label="Length (m)"
            type="number"
            value={conduit.length.toString()}
            onChange={(e) => updateConduit(conduit.id, { length: parseFloat(e.target.value) })}
            action={
              <button 
                onClick={recalculateLength}
                className="text-accent hover:text-accent-hover flex items-center gap-1"
                title="Recalculate from map coordinates"
              >
                <RefreshCw size={12} />
                <span className="text-[10px]">Auto</span>
              </button>
            }
          />
          <Input
            label="Slope (%)"
            type="number"
            value={conduit.slope.toString()}
            onChange={(e) => updateConduit(conduit.id, { slope: parseFloat(e.target.value) })}
            action={
              <button 
                onClick={() => {
                  const n1 = nodes.find(n => n.id === conduit.fromNode);
                  const n2 = nodes.find(n => n.id === conduit.toNode);
                  if (n1 && n2) {
                    const drop = (n1.invertElevation + conduit.inletOffset) - (n2.invertElevation + conduit.outletOffset);
                    const slope = Number((drop / conduit.length * 100).toFixed(2));
                    updateConduit(conduit.id, { slope });
                  }
                }}
                className="text-accent hover:text-accent-hover flex items-center gap-1"
                title="Recalculate from node elevations + offsets"
              >
                <RefreshCw size={12} />
                <span className="text-[10px]">Auto</span>
              </button>
            }
          />
          <PropertyField label="Roughness (n)" value={conduit.roughness.toString()} onChange={(v) => updateConduit(conduit.id, { roughness: parseFloat(v) })} type="number" step="0.001" />
          <PropertyField label="Shape" value={conduit.shape} onChange={(v) => updateConduit(conduit.id, { shape: v as any })} type="select" options={['Circular', 'Rectangular', 'Trapezoidal', 'Irregular']} />
          {conduit.shape === 'Circular' ? (
            <PropertyField label="Diameter (m)" value={conduit.diameter.toString()} onChange={(v) => updateConduit(conduit.id, { diameter: parseFloat(v) })} type="number" />
          ) : (
            <>
              <PropertyField label="Width (m)" value={conduit.width.toString()} onChange={(v) => updateConduit(conduit.id, { width: parseFloat(v) })} type="number" />
              <PropertyField label="Height (m)" value={conduit.height.toString()} onChange={(v) => updateConduit(conduit.id, { height: parseFloat(v) })} type="number" />
            </>
          )}
          <div className="mt-2 p-2 bg-bg-primary/50 rounded border border-border-subtle">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold text-text-primary">Conductos en paralelo</div>
                <div className="text-[10px] text-text-secondary">Tuberías idénticas entre estos nodos</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button type="button"
                  onClick={() => updateConduit(conduit.id, { parallelCount: Math.max(1, (conduit.parallelCount ?? 1) - 1) })}
                  className="w-5 h-5 rounded bg-bg-hover text-text-primary hover:bg-bg-primary text-xs font-bold flex items-center justify-center"
                >−</button>
                <span className="text-sm font-bold text-accent w-5 text-center">{conduit.parallelCount ?? 1}</span>
                <button type="button"
                  onClick={() => updateConduit(conduit.id, { parallelCount: Math.min(20, (conduit.parallelCount ?? 1) + 1) })}
                  className="w-5 h-5 rounded bg-bg-hover text-text-primary hover:bg-bg-primary text-xs font-bold flex items-center justify-center"
                >+</button>
              </div>
            </div>
          </div>
        </Section>
        
        <Section title="Losses & Offsets" defaultOpen={false}>
          <div className="grid grid-cols-2 gap-2">
            <PropertyField label="Entry Loss" value={conduit.entryLoss?.toString() || '0'} onChange={(v) => updateConduit(conduit.id, { entryLoss: parseFloat(v) })} type="number" step="0.1" />
            <PropertyField label="Exit Loss" value={conduit.exitLoss?.toString() || '0'} onChange={(v) => updateConduit(conduit.id, { exitLoss: parseFloat(v) })} type="number" step="0.1" />
          </div>
          <PropertyField label="Avg. Loss" value={conduit.avgLoss?.toString() || '0'} onChange={(v) => updateConduit(conduit.id, { avgLoss: parseFloat(v) })} type="number" step="0.1" />
          <div className="grid grid-cols-2 gap-2 mt-2">
            <PropertyField label="Inlet Off (m)" value={conduit.inletOffset?.toString() || '0'} onChange={(v) => updateConduit(conduit.id, { inletOffset: parseFloat(v) })} type="number" step="0.01" />
            <PropertyField label="Outlet Off (m)" value={conduit.outletOffset?.toString() || '0'} onChange={(v) => updateConduit(conduit.id, { outletOffset: parseFloat(v) })} type="number" step="0.01" />
          </div>
          
          <div className="mt-3 p-2 bg-bg-primary/50 rounded border border-border-subtle text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-text-secondary">Upstream Invert:</span>
              <span className="font-medium text-text-primary">
                {(() => {
                  const n1 = nodes.find(n => n.id === conduit.fromNode);
                  return n1 ? (n1.invertElevation + conduit.inletOffset).toFixed(2) + ' m' : 'N/A';
                })()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Downstream Invert:</span>
              <span className="font-medium text-text-primary">
                {(() => {
                  const n2 = nodes.find(n => n.id === conduit.toNode);
                  return n2 ? (n2.invertElevation + conduit.outletOffset).toFixed(2) + ' m' : 'N/A';
                })()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Total Drop:</span>
              <span className="font-medium text-accent">
                {(() => {
                  const n1 = nodes.find(n => n.id === conduit.fromNode);
                  const n2 = nodes.find(n => n.id === conduit.toNode);
                  if (n1 && n2) {
                    return ((n1.invertElevation + conduit.inletOffset) - (n2.invertElevation + conduit.outletOffset)).toFixed(2) + ' m';
                  }
                  return 'N/A';
                })()}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-3 p-2 bg-bg-primary/50 rounded border border-border-subtle">
            <input
              type="checkbox"
              id="flap-gate"
              checked={conduit.flapGate}
              onChange={(e) => updateConduit(conduit.id, { flapGate: e.target.checked })}
              className="w-3 h-3 rounded bg-bg-primary border-border-subtle text-accent"
            />
            <label htmlFor="flap-gate" className="text-[10px] text-text-secondary font-medium">Flap Gate</label>
          </div>
        </Section>

        <Section title="Actions" defaultOpen={false}>
          <button
            onClick={() => deleteElement(conduit.id, 'Conduit')}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-md transition-colors text-sm font-medium"
          >
            <Trash2 size={16} />
            Delete Conduit
          </button>
        </Section>

        {results && (
          <Section title="Results">
            <ResultField label="Max Flow" value={`${results.qFull.toFixed(3)} m³/s`} />
            <ResultField label="Capacity" value={`${results.capacity.toFixed(3)} m³/s`} />
            <ResultField label="Slope" value={`${(results.slope * 100).toFixed(2)} %`} />
            {(conduit.parallelCount ?? 1) > 1 && (
              <div className="text-[10px] text-accent bg-accent/10 rounded px-2 py-1.5 mt-1 space-y-0.5">
                <div className="font-semibold">{conduit.parallelCount}× conductos en paralelo</div>
                <div className="text-text-secondary">Capacidad c/u: {(results.capacity / conduit.parallelCount!).toFixed(3)} m³/s</div>
                <div className="text-text-secondary">Q c/u: {(results.qFull / conduit.parallelCount!).toFixed(3)} m³/s</div>
              </div>
            )}

            {results.flowSeries && results.flowSeries.length > 0 && (
              <div className="mt-4 h-32">
                <p className="text-xs text-text-secondary mb-1">Flow Hydrograph (m³/s)</p>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={results.flowSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize={10} tickFormatter={formatTimeAxis} />
                    <YAxis stroke="var(--text-secondary)" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', fontSize: '12px' }} />
                    <Line type="monotone" dataKey="value" stroke="var(--accent)" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Section>
        )}
      </div>
    );
  };

  const renderSubcatchmentProperties = () => {
    const sub = subcatchments.find(s => s.id === selectedElementId);
    if (!sub) return null;

    const results = simulationResults?.subcatchments[sub.id];

    const recalculateArea = () => {
      if (sub.polygon.length >= 3) {
        const calculatedArea = calculateArea(sub.polygon);
        const area = Math.max(Number(calculatedArea.toFixed(2)), 0.01);
        updateSubcatchment(sub.id, { area });
      }
    };

    const autoCalculateSlope = async () => {
      if (sub.polygon.length < 2) return;
      try {
        // Get elevation for all points in the polygon
        const locations = sub.polygon.map(p => `${p[0]},${p[1]}`).join('|');
        const response = await fetch(`https://api.opentopodata.org/v1/srtm30m?locations=${locations}`);
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const elevations = data.results.map((r: any) => r.elevation).filter((e: number | null) => e !== null);
          if (elevations.length > 1) {
            const maxElev = Math.max(...elevations);
            const minElev = Math.min(...elevations);
            
            // Find max distance between any two points
            let maxDist = 0;
            for (let i = 0; i < sub.polygon.length; i++) {
              for (let j = i + 1; j < sub.polygon.length; j++) {
                const p1 = sub.polygon[i];
                const p2 = sub.polygon[j];
                const dist = calculateDistance(p1[0], p1[1], p2[0], p2[1]);
                if (dist > maxDist) maxDist = dist;
              }
            }
            
            if (maxDist > 0) {
              const slope = ((maxElev - minElev) / maxDist) * 100; // Percentage
              updateSubcatchment(sub.id, { slope: Number(slope.toFixed(2)) });
            }
          } else {
            alert('Not enough elevation data points retrieved.');
          }
        }
      } catch (error) {
        console.error('Error fetching elevation for slope:', error);
        alert('Error calculating slope. The API might be rate-limited.');
      }
    };

    return (
      <div className="space-y-1">
        <Section title="General">
          <PropertyField label="Name" value={sub.name} onChange={(v) => updateSubcatchment(sub.id, { name: v })} />
          <PropertyField 
            label="Outlet Node" 
            value={sub.outlet} 
            onChange={(v) => updateSubcatchment(sub.id, { outlet: v })} 
            type="select" 
            options={['', ...nodes.map(n => n.id)]}
            optionLabels={['None', ...nodes.map(n => n.name)]}
          />
        </Section>
        
        <Section title="Physical">
          <Input
            label="Area (ha)"
            type="number"
            value={sub.area.toString()}
            onChange={(e) => updateSubcatchment(sub.id, { area: parseFloat(e.target.value) })}
            action={
              <button 
                onClick={recalculateArea}
                className="text-accent hover:text-accent-hover flex items-center gap-1"
                title="Recalculate from map polygon"
              >
                <RefreshCw size={12} />
                <span className="text-[10px]">Auto</span>
              </button>
            }
          />
          <PropertyField label="Width (m)" value={sub.width.toString()} onChange={(v) => updateSubcatchment(sub.id, { width: parseFloat(v) })} type="number" />
          <Input
            label="Slope (%)"
            type="number"
            value={sub.slope.toString()}
            onChange={(e) => updateSubcatchment(sub.id, { slope: parseFloat(e.target.value) })}
            action={
              <button 
                onClick={autoCalculateSlope}
                className="text-accent hover:text-accent-hover flex items-center gap-1"
                title="Auto-calculate from DEM (OpenTopoData)"
              >
                <RefreshCw size={12} />
                <span className="text-[10px]">Auto</span>
              </button>
            }
          />
          <PropertyField label="Imperv (%)" value={sub.imperv.toString()} onChange={(v) => updateSubcatchment(sub.id, { imperv: parseFloat(v) })} type="number" />
        </Section>
        
        <Section title="Depression Storage" defaultOpen={false}>
          <PropertyField label="Imperv Area (mm)" value={sub.destoreImperv?.toString() || '0'} onChange={(v) => updateSubcatchment(sub.id, { destoreImperv: parseFloat(v) })} type="number" />
          <PropertyField label="Perv Area (mm)" value={sub.destorePerv?.toString() || '0'} onChange={(v) => updateSubcatchment(sub.id, { destorePerv: parseFloat(v) })} type="number" />
        </Section>

        <Section title="Transform Method" defaultOpen={true}>
          <PropertyField 
            label="Model" 
            value={sub.transformMethod || 'SCS_Unit_Hydrograph'} 
            onChange={(v) => updateSubcatchment(sub.id, { transformMethod: v as any })} 
            type="select" 
            options={['SCS_Unit_Hydrograph', 'SWMM_NonLinear_Reservoir', 'Clark_Unit_Hydrograph']} 
            optionLabels={['SCS Unit Hydrograph', 'SWMM Non-Linear Reservoir', 'Clark Unit Hydrograph']}
          />
        </Section>

        <Section title="Infiltration" defaultOpen={false}>
          <PropertyField 
            label="Method" 
            value={sub.infilMethod || 'Horton'} 
            onChange={(v) => updateSubcatchment(sub.id, { infilMethod: v as any })} 
            type="select" 
            options={['Horton', 'Green_Ampt', 'Curve_Number']} 
            optionLabels={['Horton', 'Green-Ampt', 'SCS Curve Number']}
          />

          {(!sub.infilMethod || sub.infilMethod === 'Horton') && (
            <>
              <PropertyField label="Max Rate (mm/hr)" value={sub.maxInfilRate?.toString() || '0'} onChange={(v) => updateSubcatchment(sub.id, { maxInfilRate: parseFloat(v) })} type="number" />
              <PropertyField label="Min Rate (mm/hr)" value={sub.minInfilRate?.toString() || '0'} onChange={(v) => updateSubcatchment(sub.id, { minInfilRate: parseFloat(v) })} type="number" />
              <PropertyField label="Decay Const (1/hr)" value={sub.decayConst?.toString() || '0'} onChange={(v) => updateSubcatchment(sub.id, { decayConst: parseFloat(v) })} type="number" />
            </>
          )}

          {sub.infilMethod === 'Green_Ampt' && (
            <>
              <PropertyField label="Suction Head (mm)" value={sub.suctionHead?.toString() || '0'} onChange={(v) => updateSubcatchment(sub.id, { suctionHead: parseFloat(v) })} type="number" />
              <PropertyField label="Conductivity (mm/hr)" value={sub.conductivity?.toString() || '0'} onChange={(v) => updateSubcatchment(sub.id, { conductivity: parseFloat(v) })} type="number" />
              <PropertyField label="Initial Deficit (frac)" value={sub.initialDeficit?.toString() || '0'} onChange={(v) => updateSubcatchment(sub.id, { initialDeficit: parseFloat(v) })} type="number" step="0.01" />
            </>
          )}

          {sub.infilMethod === 'Curve_Number' && (
            <>
              <PropertyField label="Curve Number" value={sub.curveNumber?.toString() || '0'} onChange={(v) => updateSubcatchment(sub.id, { curveNumber: parseFloat(v) })} type="number" />
            </>
          )}
        </Section>

        <TcCalculator sub={sub} updateSubcatchment={updateSubcatchment} />

        <Section title="Actions" defaultOpen={false}>
          <button
            onClick={() => deleteElement(sub.id, 'Subcatchment')}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-md transition-colors text-sm font-medium"
          >
            <Trash2 size={16} />
            Delete Subcatchment
          </button>
        </Section>

        {results && (
          <Section title="Results">
            <ResultField label="Peak Runoff" value={`${results.peakRunoff.toFixed(3)} m³/s`} />

            {results.runoffSeries && results.runoffSeries.length > 0 && (
              <div className="mt-4 h-32">
                <p className="text-xs text-text-secondary mb-1">Runoff Hydrograph (m³/s)</p>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={results.runoffSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize={10} tickFormatter={formatTimeAxis} />
                    <YAxis stroke="var(--text-secondary)" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', fontSize: '12px' }} />
                    <Line type="monotone" dataKey="value" stroke="var(--accent)" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Section>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full text-text-primary bg-bg-surface overflow-y-auto">
      <div className="p-4 border-b border-border-subtle sticky top-0 bg-bg-surface/80 backdrop-blur-md z-10">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
          <Settings2 size={16} />
          Properties: {selectedElementType}
        </h2>
      </div>
      <div className="p-4 flex-1">
        {selectedElementType === 'Node' && renderNodeProperties()}
        {selectedElementType === 'Conduit' && renderConduitProperties()}
        {selectedElementType === 'Subcatchment' && renderSubcatchmentProperties()}
      </div>
    </div>
  );
};

interface PropertyFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'number' | 'select';
  options?: string[];
  optionLabels?: string[];
  step?: string;
}

const PropertyField: React.FC<PropertyFieldProps> = ({ label, value, onChange, type = 'text', options, optionLabels, step }) => (
  <div className="mb-2">
    {type === 'select' ? (
      <Select
        label={label}
        value={value}
        onChange={onChange}
        options={options || []}
        optionLabels={optionLabels}
      />
    ) : (
      <Input
        label={label}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        step={step}
      />
    )}
  </div>
);

const ResultField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between items-center py-1 border-b border-border-subtle last:border-0">
    <span className="text-xs text-text-secondary">{label}</span>
    <span className="text-sm font-mono text-text-primary">{value}</span>
  </div>
);

// ── Tc Calculator ─────────────────────────────────────────────

type TcMethod = 'Kirpich' | 'Temez' | 'SCS_Lag' | 'Chow' | 'Bransby_Williams';

const TC_METHODS: { value: TcMethod; label: string; ref: string }[] = [
  { value: 'Kirpich',          label: 'Kirpich (1940)',            ref: 'Channel/gully flow' },
  { value: 'Temez',            label: 'Témez (1978)',              ref: 'Spain / Latin America' },
  { value: 'SCS_Lag',         label: 'SCS Lag — TR-55 (NRCS)',    ref: 'Pairs with CN method' },
  { value: 'Chow',            label: 'Ven Te Chow (1962)',         ref: 'General watershed' },
  { value: 'Bransby_Williams', label: 'Bransby-Williams (1942)',   ref: 'General watershed' },
];

function calcTc(method: TcMethod, L: number, H: number, slope_pct: number, CN: number, area_ha: number): number | null {
  // Common derived values
  const S = slope_pct / 100;          // m/m
  const L_km = L / 1000;             // km
  const A_km2 = area_ha / 100;       // km²
  const L_ft = L * 3.28084;          // feet

  switch (method) {
    case 'Kirpich': {
      // Tc (min) = 0.0195 · L^0.77 · S^(-0.385)
      // where L in m, S in m/m
      if (L <= 0 || S <= 0) return null;
      return 0.0195 * Math.pow(L, 0.77) * Math.pow(S, -0.385);
    }
    case 'Temez': {
      // Source: Témez (1978), MOPU Spain "Instrucción de Carreteras 5.2-IC"
      // Tc (h) = 0.3 · (L_km / J^0.25)^0.76
      // L in km, J = slope in m/m (dimensionless)
      // CRITICAL: exponent on J is 0.25, NOT 0.5. Many secondary sources wrongly use √J.
      if (L_km <= 0 || S <= 0) return null;
      return 0.3 * Math.pow(L_km / Math.pow(S, 0.25), 0.76) * 60; // × 60 → minutes
    }
    case 'SCS_Lag': {
      // TR-55 metric: Tc(h) = L_ft^0.8 · (1000/CN - 9)^0.7 / (1140 · √Y)
      // Tc (min) = Tc(h) * 60
      const Y = slope_pct; // slope in %
      if (L_ft <= 0 || Y <= 0 || CN <= 0 || CN >= 100) return null;
      const S_scs = (1000 / CN) - 9;
      if (S_scs <= 0) return null;
      return (Math.pow(L_ft, 0.8) * Math.pow(S_scs, 0.7) / (1140 * Math.sqrt(Y))) * 60;
    }
    case 'Chow': {
      // Source: Monsalve-Sáenz (1999) "Hidrología en la Ingeniería", 2nd ed.
      // Widely used in Latin America, derived from SCS dimensionless hydrograph.
      // Tc (h) = (0.87 · L³ / H)^0.385
      // L in km, H = total elevation difference in m
      // CRITICAL: 0.87 is INSIDE the power. Common error: placing it as an external multiplier.
      if (L_km <= 0 || H <= 0) return null;
      return Math.pow(0.87 * Math.pow(L_km, 3) / H, 0.385) * 60; // × 60 → minutes
    }
    case 'Bransby_Williams': {
      // Source: Australian Rainfall and Runoff (ARR, 1977/1987), Book 4.
      // Tc (min) = 58.5 · L / (A^0.1 · e^0.2)
      // L in km, A in km², e = slope in m/km (per-mille)
      // CRITICAL: e must be in m/km, NOT m/m. Conversion: e = slope_% × 10
      // Using m/m instead of m/km produces results ~4× too high.
      const e = slope_pct * 10; // % → m/km
      if (L_km <= 0 || A_km2 <= 0 || e <= 0) return null;
      return 58.5 * L_km / (Math.pow(A_km2, 0.1) * Math.pow(e, 0.2));
    }
    default:
      return null;
  }
}

interface TcCalculatorProps {
  sub: import('../types').Subcatchment;
  updateSubcatchment: (id: string, data: any) => void;
}

const TcCalculator: React.FC<TcCalculatorProps> = ({ sub, updateSubcatchment }) => {
  const method: TcMethod = (sub.tcMethod as TcMethod) ?? 'Kirpich';
  const L = sub.tcL ?? 0;
  const H = sub.tcH ?? 0;

  const autoFillL = () => {
    // Max distance between any two polygon vertices
    let maxDist = 0;
    for (let i = 0; i < sub.polygon.length; i++) {
      for (let j = i + 1; j < sub.polygon.length; j++) {
        const [lat1, lng1] = sub.polygon[i];
        const [lat2, lng2] = sub.polygon[j];
        const R = 6371e3;
        const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
        const dφ = (lat2 - lat1) * Math.PI / 180, dλ = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(dλ/2)**2;
        const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        if (d > maxDist) maxDist = d;
      }
    }
    if (maxDist > 0) updateSubcatchment(sub.id, { tcL: Math.round(maxDist) });
  };

  const calculate = () => {
    const result = calcTc(method, L, H, sub.slope, sub.curveNumber ?? 75, sub.area);
    if (result !== null && result > 0) {
      updateSubcatchment(sub.id, { tc: Math.round(result * 10) / 10 });
    }
  };

  const methodInfo = TC_METHODS.find(m => m.value === method)!;
  const needsH  = method === 'Kirpich' || method === 'Chow';
  const needsCN = method === 'SCS_Lag';

  return (
    <Section title="Time of Concentration" defaultOpen={false}>
      {/* Result badge */}
      {sub.tc != null && (
        <div className="flex items-center justify-between mb-3 px-3 py-2 bg-accent/10 border border-accent/30 rounded-lg">
          <div className="flex items-center gap-2 text-accent">
            <Clock size={14} />
            <span className="text-xs font-medium">Tc Result</span>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold font-mono text-accent">{sub.tc.toFixed(1)}</span>
            <span className="text-xs text-accent/70 ml-1">min</span>
          </div>
        </div>
      )}

      {/* Method selector */}
      <div className="mb-3">
        <label className="block text-[10px] text-text-secondary font-medium uppercase mb-1">Method</label>
        <select
          title="Time of Concentration method"
          value={method}
          onChange={e => updateSubcatchment(sub.id, { tcMethod: e.target.value, tc: undefined })}
          className="w-full bg-bg-primary border border-border-subtle rounded px-2 py-1.5 text-xs text-text-primary outline-none hover:border-accent/50 transition-colors cursor-pointer"
        >
          {TC_METHODS.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <p className="text-[10px] text-text-secondary mt-1 italic">{methodInfo.ref}</p>
      </div>

      {/* Formula display */}
      <div className="mb-3 px-2 py-1.5 bg-bg-primary/60 rounded border border-border-subtle text-[10px] font-mono text-text-secondary">
        {method === 'Kirpich'          && 'Tc = 0.0195·L⁰·⁷⁷·S⁻⁰·³⁸⁵  [min] — L(m), S(m/m)'}
        {method === 'Temez'            && 'Tc = 0.3·(L/J⁰·²⁵)⁰·⁷⁶·60  [min] — L(km), J(m/m)'}
        {method === 'SCS_Lag'         && 'Tc = L_ft⁰·⁸·(1000/CN−9)⁰·⁷/(1140·√Y)·60  [min] — L(ft), Y(%)'}
        {method === 'Chow'            && 'Tc = (0.87·L³/H)⁰·³⁸⁵·60  [min] — L(km), H(m)'}
        {method === 'Bransby_Williams' && 'Tc = 58.5·L/(A⁰·¹·e⁰·²)  [min] — L(km), A(km²), e(m/km)'}
      </div>

      {/* Inputs */}
      <div className="space-y-2">
        {/* L — all methods */}
        <Input
          label={method === 'Bransby_Williams' || method === 'Temez' || method === 'Chow'
            ? 'Basin length L (m)' : 'Channel length L (m)'}
          type="number"
          value={L.toString()}
          onChange={e => updateSubcatchment(sub.id, { tcL: parseFloat(e.target.value) || 0 })}
          action={
            sub.polygon.length >= 2
              ? <button type="button" onClick={autoFillL} className="text-accent hover:text-accent-hover flex items-center gap-1" title="Auto-fill from polygon extent">
                  <RefreshCw size={12} /><span className="text-[10px]">Auto</span>
                </button>
              : undefined
          }
        />

        {/* H — Kirpich and Chow */}
        {needsH && (
          <Input
            label="Elevation difference ΔH (m)"
            type="number"
            value={H.toString()}
            onChange={e => updateSubcatchment(sub.id, { tcH: parseFloat(e.target.value) || 0 })}
          />
        )}

        {/* Slope — shown as read-only derived from sub.slope */}
        {(method === 'Kirpich' || method === 'Temez') && (
          <div className="flex justify-between items-center text-[11px] px-1">
            <span className="text-text-secondary">Slope J (from subcatchment)</span>
            <span className="font-mono text-text-primary">{sub.slope}% = {(sub.slope/100).toFixed(4)} m/m</span>
          </div>
        )}
        {method === 'Bransby_Williams' && (
          <div className="flex justify-between items-center text-[11px] px-1">
            <span className="text-text-secondary">Slope e (from subcatchment)</span>
            <span className="font-mono text-text-primary">{sub.slope}% = {(sub.slope * 10).toFixed(1)} m/km</span>
          </div>
        )}

        {/* Y (slope %) — SCS Lag uses it directly */}
        {method === 'SCS_Lag' && (
          <div className="flex justify-between items-center text-[11px] px-1">
            <span className="text-text-secondary">Slope Y (from subcatchment)</span>
            <span className="font-mono text-text-primary">{sub.slope} %</span>
          </div>
        )}

        {/* CN — SCS Lag */}
        {needsCN && (
          <div className="flex justify-between items-center text-[11px] px-1">
            <span className="text-text-secondary">Curve Number CN</span>
            <span className={`font-mono ${!sub.curveNumber ? 'text-amber-400' : 'text-text-primary'}`}>
              {sub.curveNumber ? sub.curveNumber : '⚠ Set CN in Infiltration'}
            </span>
          </div>
        )}

        {/* Area — Bransby-Williams */}
        {method === 'Bransby_Williams' && (
          <div className="flex justify-between items-center text-[11px] px-1">
            <span className="text-text-secondary">Area A (from subcatchment)</span>
            <span className="font-mono text-text-primary">{sub.area} ha → {(sub.area/100).toFixed(4)} km²</span>
          </div>
        )}
      </div>

      {/* Calculate button */}
      <button
        type="button"
        onClick={calculate}
        className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-accent text-bg-primary hover:bg-accent-hover rounded-md transition-colors text-xs font-semibold"
      >
        <Clock size={14} />
        Calculate Tc
      </button>
    </Section>
  );
};

