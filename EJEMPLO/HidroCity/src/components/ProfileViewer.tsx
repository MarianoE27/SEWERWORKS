import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { X, Activity, Download } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Select } from './ui/Select';

export const ProfileViewer: React.FC = () => {
  const { isProfileViewerOpen, setIsProfileViewerOpen, nodes, conduits, simulationResults, currentTimeStep } = useStore();
  const [startNodeId, setStartNodeId] = useState<string>('');
  const [endNodeId, setEndNodeId] = useState<string>('');

  // Simple path finding using BFS
  const findPath = (startId: string, endId: string) => {
    if (!startId || !endId) return null;
    
    const adj: Record<string, { to: string, conduitId: string }[]> = {};
    nodes.forEach(n => adj[n.id] = []);
    conduits.forEach(c => {
      if (adj[c.fromNode]) adj[c.fromNode].push({ to: c.toNode, conduitId: c.id });
    });

    const queue: { id: string, path: { nodeId: string, conduitId: string | null }[] }[] = [];
    queue.push({ id: startId, path: [{ nodeId: startId, conduitId: null }] });
    const visited = new Set<string>();
    visited.add(startId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.id === endId) return current.path;

      for (const neighbor of adj[current.id] || []) {
        if (!visited.has(neighbor.to)) {
          visited.add(neighbor.to);
          queue.push({
            id: neighbor.to,
            path: [...current.path, { nodeId: neighbor.to, conduitId: neighbor.conduitId }]
          });
        }
      }
    }
    return null;
  };

  const path = useMemo(() => findPath(startNodeId, endNodeId), [startNodeId, endNodeId, nodes, conduits]);

  const profileData = useMemo(() => {
    if (!path) return [];
    
    let currentDistance = 0;
    const data = [];

    for (let i = 0; i < path.length; i++) {
      const p = path[i];
      const node = nodes.find(n => n.id === p.nodeId);
      if (!node) continue;

      const invert = node.invertElevation;
      const maxElev = invert + node.maxDepth;
      
      let waterElev = invert;
      if (simulationResults && simulationResults.nodes[node.id]) {
        const depth = simulationResults.nodes[node.id].depthSeries[currentTimeStep]?.value || 0;
        waterElev = invert + depth;
      }

      // 1. Arrival point from the INCOMING conduit
      const incomingConduitId = p.conduitId;
      if (incomingConduitId) {
        const prevC = conduits.find(c => c.id === incomingConduitId);
        if (prevC) {
          const arrivalInvert = invert + (prevC.outletOffset || 0);
          data.push({
            distance: currentDistance,
            nodeId: node.id,
            nodeName: node.name,
            invert: arrivalInvert,
            maxElev: maxElev,
            waterElev: waterElev,
            conduitDiameter: prevC.diameter,
            crownElev: arrivalInvert + prevC.diameter
          });
        }
      }

      // 2. Departure point for the OUTGOING conduit
      const outgoingConduitId = i + 1 < path.length ? path[i + 1].conduitId : null;
      if (outgoingConduitId) {
        const nextC = conduits.find(c => c.id === outgoingConduitId);
        if (nextC) {
          const departureInvert = invert + (nextC.inletOffset || 0);
          data.push({
            distance: currentDistance,
            nodeId: node.id,
            nodeName: node.name,
            invert: departureInvert,
            maxElev: maxElev,
            waterElev: waterElev,
            conduitDiameter: nextC.diameter,
            crownElev: departureInvert + nextC.diameter
          });
          currentDistance += nextC.length;
        }
      }

      // 3. Single isolated node edge case
      if (!incomingConduitId && !outgoingConduitId) {
        data.push({
          distance: currentDistance,
          nodeId: node.id,
          nodeName: node.name,
          invert: invert,
          maxElev: maxElev,
          waterElev: waterElev,
          conduitDiameter: 0,
          crownElev: invert
        });
      }
    }
    return data;
  }, [path, nodes, conduits, simulationResults, currentTimeStep]);

  const handleExport = () => {
    const svgElements = document.querySelectorAll('.recharts-wrapper svg');
    if (svgElements.length === 0) return;
    const svg = svgElements[0] as SVGSVGElement;
    
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.style.backgroundColor = document.documentElement.dataset.theme === 'dark' ? '#0F1417' : '#FFFFFF';
    
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(clone);

    const img = new Image();
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = clone.clientWidth || 900;
      canvas.height = clone.clientHeight || 400;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = document.documentElement.dataset.theme === 'dark' ? '#0F1417' : '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const pngUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.download = `hydro_profile_${startNodeId}_${endNodeId}.png`;
        a.href = pngUrl;
        a.click();
        URL.revokeObjectURL(url);
      }
    };
    img.src = url;
  };

  if (!isProfileViewerOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-bg-surface border border-border-subtle rounded-xl shadow-2xl w-[900px] max-w-[90vw] max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-bg-primary/50">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Activity className="text-accent" />
            Professional Hydraulic Profile
          </h2>
          <div className="flex items-center gap-3">
            {path && (
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-bg-hover text-text-primary rounded-md border border-border-subtle hover:border-accent transition-colors"
                title="Export Image"
              >
                <Download size={16} />
                Export
              </button>
            )}
            <button 
              onClick={() => setIsProfileViewerOpen(false)}
              className="text-text-secondary hover:text-text-primary transition-colors"
              title="Close Profile Viewer"
            >
              <X size={24} />
            </button>
          </div>
        </div>
        
        <div className="p-4 border-b border-border-subtle flex gap-4 bg-bg-hover">
          <div className="flex-1">
            <Select 
              label="Start Node"
              value={startNodeId}
              onChange={setStartNodeId}
              options={['', ...nodes.map(n => n.id)]}
              optionLabels={['Select start node...', ...nodes.map(n => n.name)]}
            />
          </div>
          <div className="flex-1">
            <Select 
              label="End Node"
              value={endNodeId}
              onChange={setEndNodeId}
              options={['', ...nodes.map(n => n.id)]}
              optionLabels={['Select end node...', ...nodes.map(n => n.name)]}
            />
          </div>
        </div>

        <div className="flex-1 p-6 min-h-[400px]">
          {!startNodeId || !endNodeId ? (
            <div className="h-full flex items-center justify-center text-text-secondary">
              Select start and end nodes to view profile
            </div>
          ) : !path ? (
            <div className="h-full flex items-center justify-center text-amber-500">
              No continuous path found between selected nodes
            </div>
          ) : (
            <div className="w-full h-[400px] overflow-visible">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={profileData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5EC2B0" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3A9E8F" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="colorInvert" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3a3a3a" stopOpacity={1}/>
                    <stop offset="95%" stopColor="#141414" stopOpacity={1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis 
                  dataKey="distance" 
                  type="number" 
                  stroke="var(--border-subtle)" 
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                  tickFormatter={(val) => `${val}m`}
                  domain={['dataMin', 'dataMax']}
                  label={{ value: 'Distance (m)', position: 'insideBottom', offset: -10, fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 500 }}
                />
                <YAxis 
                  stroke="var(--border-subtle)" 
                  tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                  domain={['auto', 'auto']}
                  label={{ value: 'Elevation (m)', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 500 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-primary)', 
                    border: '1px solid var(--border-subtle)', 
                    borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(8px)'
                  }}
                  itemStyle={{ fontSize: '12px', fontWeight: 500 }}
                  labelStyle={{ color: 'var(--text-primary)', marginBottom: '4px', fontWeight: 600 }}
                  labelFormatter={(val) => `Chainage: ${val}m`}
                />
                <Legend 
                  verticalAlign="top" 
                  height={40} 
                  iconType="circle"
                  wrapperStyle={{ paddingTop: '0px', fontSize: '12px', fontWeight: 500 }}
                />
                
                {/* Ground Level */}
                <Line 
                  type="linear" 
                  dataKey="maxElev" 
                  name="Ground Surface" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#0f172a' }}
                  activeDot={{ r: 6, stroke: '#ffffff' }}
                  animationDuration={1000}
                />

                {/* Crown Elevation */}
                <Line 
                  type="linear" 
                  dataKey="crownElev" 
                  name="Conduit Crown" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={false}
                  animationDuration={1000}
                />
                
                {/* Water Level */}
                <Area 
                  type="linear" 
                  dataKey="waterElev" 
                  name="HGL (Water Level)" 
                  stroke="#5EC2B0"
                  fill="url(#colorWater)" 
                  fillOpacity={1}
                  animationDuration={1500}
                />
                
                {/* Invert Elevation (Bottom) */}
                <Area 
                  type="linear" 
                  dataKey="invert" 
                  name="Channel Invert" 
                  stroke="#818181"
                  fill="url(#colorInvert)" 
                  fillOpacity={1}
                  animationDuration={1000}
                />
                
              </ComposedChart>
            </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
