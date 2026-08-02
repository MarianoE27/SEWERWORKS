import React from 'react';
import { useStore } from '../store';
import { Database, Maximize, ChevronRight, BarChart2, AlertTriangle } from 'lucide-react';
import { Section } from './ui/Section';

// Helper: total length of conduits in meters
const totalConduitLength = (conduits: { length: number }[]) =>
  conduits.reduce((acc, c) => acc + (c.length || 0), 0);

// Helper: total area of subcatchments in hectares
const totalSubcatchmentArea = (subcatchments: { area: number }[]) =>
  subcatchments.reduce((acc, s) => acc + (s.area || 0), 0);

export const Sidebar: React.FC = () => {
  const { 
    nodes, conduits, subcatchments, 
    selectElement, selectedElementId, 
    fitMapToBounds, isSidebarCollapsed,
    simulationResults, simulationSummary
  } = useStore();

  if (isSidebarCollapsed) {
    return (
      <div className="w-16 glass-panel border-r border-border-subtle flex flex-col h-full items-center py-4 gap-4 text-text-secondary bg-bg-surface z-10 transition-all duration-300">
        <button onClick={fitMapToBounds} className="p-2 hover:bg-bg-hover rounded-lg transition-colors" title="Fit Map">
          <Maximize size={20} />
        </button>
        <div className="w-8 h-px bg-bg-hover" />
        <div className="flex flex-col gap-4">
          <div className="relative group cursor-pointer" title="Nodes" onClick={fitMapToBounds}>
            <div className="p-2 bg-accent/10 text-accent rounded-lg">
              <Database size={20} />
            </div>
            <span className="absolute -top-1 -right-1 bg-accent text-bg-primary text-[10px] font-bold px-1 rounded-full">{nodes.length}</span>
          </div>
          <div className="relative group cursor-pointer" title="Conduits" onClick={fitMapToBounds}>
             <div className="p-2 bg-bg-hover text-text-secondary rounded-lg">
              <ActivityIcon size={20} />
            </div>
            <span className="absolute -top-1 -right-1 bg-accent text-white text-[10px] font-bold px-1 rounded-full">{conduits.length}</span>
          </div>
        </div>
      </div>
    );
  }

  // Compute statistics
  const netLength = totalConduitLength(conduits);
  const netArea   = totalSubcatchmentArea(subcatchments);

  // Post-simulation: count flooded nodes
  const floodedNodes = simulationResults
    ? nodes.filter(n => {
        const r = simulationResults.nodes[n.id];
        return r && r.flooding > 0;
      })
    : [];

  // Conduit capacity warnings
  const overloadedConduits = simulationResults
    ? conduits.filter(c => {
        const r = simulationResults.conduits[c.id];
        return r && r.capacity > 0 && Math.abs(r.qFull) / r.capacity > 0.9;
      })
    : [];

  return (
    <div className="w-64 glass-panel border-r border-border-subtle flex flex-col h-full text-text-primary bg-bg-surface z-10 transition-all duration-300">
      <div className="flex-1 overflow-y-auto p-3 space-y-1">

        {/* ── Network Summary ─────────────────────────────── */}
        <Section 
          title="Network Summary" 
          icon={<BarChart2 size={16} />}
          defaultOpen={true}
        >
          <div className="grid grid-cols-2 gap-x-2 gap-y-2 pb-1">
            <StatCard label="Nodes" value={nodes.length} color="accent" />
            <StatCard label="Conduits" value={conduits.length} color="blue" />
            <StatCard label="Catchments" value={subcatchments.length} color="green" />
            <StatCard
              label="Net Length"
              value={netLength >= 1000 ? `${(netLength / 1000).toFixed(2)} km` : `${netLength.toFixed(0)} m`}
              color="purple"
            />
          </div>

          {netArea > 0 && (
            <div className="mt-1 flex items-center justify-between px-2 py-1.5 rounded-md bg-bg-primary/60 text-xs">
              <span className="text-text-secondary">Total Area</span>
              <span className="font-semibold text-text-primary">{netArea.toFixed(2)} ha</span>
            </div>
          )}

          {/* Post-simulation alerts & Summary */}
          {simulationResults && simulationSummary && (
            <div className="mt-4 pt-3 border-t border-border-subtle">
              <label className="text-[10px] text-text-secondary font-medium uppercase mb-2 block">Simulation Summary</label>
              
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-bg-primary/40 rounded p-2 border border-border-subtle/50">
                  <div className="text-[10px] text-text-secondary">Peak Flow</div>
                  <div className="text-xs font-bold text-accent">{simulationSummary.peakFlow.toFixed(3)} <span className="text-[8px] font-normal opacity-70 text-text-secondary">m³/s</span></div>
                </div>
                <div className="bg-bg-primary/40 rounded p-2 border border-border-subtle/50">
                  <div className="text-[10px] text-text-secondary">Total Flood</div>
                  <div className="text-xs font-bold text-red-400">{simulationSummary.totalFlooding.toFixed(3)} <span className="text-[8px] font-normal opacity-70 text-text-secondary">m³/s</span></div>
                </div>
              </div>

              <div className="space-y-1">
                <div className={`flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-medium ${
                  floodedNodes.length > 0 
                    ? 'bg-red-500/10 text-red-400 border border-border-subtle'
                    : 'bg-bg-hover text-text-secondary border border-border-subtle'
                }`}>
                  {floodedNodes.length > 0 ? (
                    <>
                      <span className="flex items-center gap-1"><AlertTriangle size={12} /> Flooded Nodes</span>
                      <span>{floodedNodes.length}</span>
                    </>
                  ) : (
                    <span className="flex items-center gap-1 w-full justify-center">✓ No flooding detected</span>
                  )}
                </div>

                {overloadedConduits.length > 0 && (
                  <div className="flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-medium bg-bg-hover text-text-secondary border border-border-subtle">
                    <span className="flex items-center gap-1"><AlertTriangle size={12} /> Overloaded Pipes</span>
                    <span>{overloadedConduits.length}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </Section>

        {/* ── Project Explorer ─────────────────────────────── */}
        <Section 
          title="Project Explorer" 
          icon={<Database size={16} />}
          defaultOpen={true}
          action={
            <button 
              onClick={(e) => { e.stopPropagation(); fitMapToBounds(); }}
              className="p-1 text-text-secondary hover:text-accent hover:bg-bg-hover rounded transition-colors"
              title="Fit Map to Bounds"
            >
              <Maximize size={14} />
            </button>
          }
        >
          <div className="space-y-4">
            <SubSection title="Nodes" count={nodes.length}>
              {nodes.map(node => (
                <Item 
                  key={node.id} 
                  label={node.name} 
                  active={selectedElementId === node.id}
                  flooded={!!(simulationResults?.nodes[node.id]?.flooding > 0)}
                  onClick={() => selectElement(node.id, 'Node')} 
                />
              ))}
            </SubSection>
            
            <SubSection title="Conduits" count={conduits.length}>
              {conduits.map(conduit => (
                <Item 
                  key={conduit.id} 
                  label={conduit.name} 
                  active={selectedElementId === conduit.id}
                  onClick={() => selectElement(conduit.id, 'Conduit')} 
                />
              ))}
            </SubSection>
            
            <SubSection title="Subcatchments" count={subcatchments.length}>
              {subcatchments.map(sub => (
                <Item 
                  key={sub.id} 
                  label={sub.name} 
                  active={selectedElementId === sub.id}
                  onClick={() => selectElement(sub.id, 'Subcatchment')} 
                />
              ))}
            </SubSection>
          </div>
        </Section>
      </div>
    </div>
  );
};

// ── Internal Sub-components ──────────────────────────────────

const StatCard: React.FC<{ label: string; value: string | number; color: 'accent' | 'blue' | 'green' | 'purple' }> = ({ label, value, color }) => {
  const colorMap = {
    accent:  'bg-accent/10 text-accent',
    blue:    'bg-bg-hover text-text-secondary',
    green:   'bg-bg-hover text-text-secondary',
    purple:  'bg-bg-hover text-text-secondary',
  };
  return (
    <div className={`flex flex-col items-center justify-center rounded-lg px-2 py-2 text-center ${colorMap[color]}`}>
      <span className="text-base font-bold leading-tight">{value}</span>
      <span className="text-[10px] opacity-80 mt-0.5">{label}</span>
    </div>
  );
};

const SubSection: React.FC<{ title: string; count: number; children: React.ReactNode }> = ({ title, count, children }) => {
  const [isOpen, setIsOpen] = React.useState(true);
  return (
    <div>
      <button 
        className="w-full flex items-center justify-between px-2 py-1 text-xs font-medium text-text-secondary uppercase tracking-wider hover:bg-bg-hover rounded transition-colors group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-1">
          <ChevronRight size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
          <span className="group-hover:text-text-primary transition-colors">{title}</span>
        </div>
        <span className="bg-bg-hover px-1.5 py-0.5 rounded-full text-[10px] transition-colors">{count}</span>
      </button>
      {isOpen && (
        <div className="space-y-0.5 pl-4 border-l border-border-subtle ml-2 mt-1">
          {children}
        </div>
      )}
    </div>
  );
};

const Item: React.FC<{ label: string; active: boolean; flooded?: boolean; onClick: () => void }> = ({ label, active, flooded, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors truncate flex items-center gap-1.5 ${
      active 
        ? 'bg-accent/20 text-accent font-medium' 
        : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
    }`}
    title={label}
  >
    {flooded && <span className="w-1.5 h-1.5 bg-red-400 rounded-full flex-shrink-0" title="Flooding detected" />}
    {label}
  </button>
);

const ActivityIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);
