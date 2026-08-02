import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { 
  X, BarChart2, Download, Maximize2, Minimize2, 
  Map as MapIcon, CircleDot, Minus, Hexagon, Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer 
} from 'recharts';

export const ResultsViewer: React.FC = () => {
  const { 
    isResultsViewerOpen, 
    setResultsViewerOpen, 
    simulationResults, 
    simulationSettings,
    nodes,
    conduits,
    subcatchments,
    activeRainfallEventId,
    rainfallEvents
  } = useStore();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [filterType, setFilterType] = useState<'All' | 'Nodes' | 'Conduits' | 'Subcatchments'>('All');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // MOVED DOWN: if (!isResultsViewerOpen || !simulationResults) return null;

  const rainfallDurationMinutes = useMemo(() => {
    if (!simulationResults) return simulationSettings.duration * 60;
    const activeRain = rainfallEvents.find(r => r.id === activeRainfallEventId);
    if (!activeRain) return simulationSettings.duration * 60;
    if (activeRain.type === 'TimeSeries') {
       return activeRain.data[activeRain.data.length - 1].time;
    }
    return activeRain.totalDepth > 0 ? (activeRain.timeStep || 60) : simulationSettings.duration * 60;
  }, [activeRainfallEventId, rainfallEvents, simulationSettings, simulationResults]);

  const reportingStepMinutes = (simulationSettings.reportingStep || 60) / 60;

  // MOVED DOWN: filter lists moved after null check

  const handleSelectElement = (id: string) => {
    setSelectedElementId(id);
  };

  const chartData = useMemo(() => {
    if (!selectedElementId || !simulationResults) return [];
    
    // Check which type the selected element is
    const nodeRes = simulationResults.nodes[selectedElementId];
    if (nodeRes) {
       const len = nodeRes.depthSeries?.length || 0;
       return Array.from({ length: len }).map((_, i) => ({
          time: i * reportingStepMinutes,
          timeLabel: (i * reportingStepMinutes / 60).toFixed(2) + 'h',
          Depth: nodeRes.depthSeries[i]?.value || 0,
          Inflow: nodeRes.inflowSeries[i]?.value || 0,
          Flooding: nodeRes.floodingSeries[i]?.value || 0
       }));
    }

    const conduitRes = simulationResults.conduits[selectedElementId];
    if (conduitRes) {
       const len = conduitRes.flowSeries?.length || 0;
       return Array.from({ length: len }).map((_, i) => ({
          time: i * reportingStepMinutes,
          timeLabel: (i * reportingStepMinutes / 60).toFixed(2) + 'h',
          Flow: conduitRes.flowSeries[i]?.value || 0,
          Velocity: conduitRes.velocitySeries?.[i]?.value || 0
       }));
    }

    const subRes = simulationResults.subcatchments[selectedElementId];
    if (subRes) {
       const len = subRes.runoffSeries?.length || 0;
       return Array.from({ length: len }).map((_, i) => ({
          time: i * reportingStepMinutes,
          timeLabel: (i * reportingStepMinutes / 60).toFixed(2) + 'h',
          Runoff: subRes.runoffSeries[i]?.value || 0,
          Precipitation: subRes.precipitationSeries?.[i]?.value || 0,
          Losses: subRes.lossesSeries?.[i]?.value || 0
       }));
    }
    
    return [];
  }, [selectedElementId, simulationResults, reportingStepMinutes, nodes, conduits, subcatchments]) as any[];

  if (!isResultsViewerOpen || !simulationResults) return null;

  // Filter lists
  const availableNodes = nodes.filter(n => simulationResults.nodes[n.id]);
  const availableConduits = conduits.filter(c => simulationResults.conduits[c.id]);
  const availableSubcatchments = subcatchments.filter(s => simulationResults.subcatchments[s.id]);

  const exportCSV = () => {
    if (!selectedElementId || chartData.length === 0) return;
    
    const headers = Object.keys(chartData[0]).filter(k => k !== 'timeLabel');
    const csvRows = [
      headers.join(','), // Header row
      ...chartData.map(row => headers.map(header => row[header as keyof typeof row]).join(','))
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `results_${selectedElementId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderContent = () => {
    if (!selectedElementId) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-text-secondary h-full">
          <BarChart2 size={48} className="mb-4 opacity-20" />
          <h3 className="text-xl font-medium text-text-primary mb-2">Results Dashboard</h3>
          <p>Select an element from the sidebar to view detailed hydrodynamic charts.</p>
        </div>
      );
    }

    const activeElementType = 
      nodes.find(n => n.id === selectedElementId) ? 'Node' :
      conduits.find(c => c.id === selectedElementId) ? 'Conduit' : 'Subcatchment';
    
    return (
      <div className="flex-1 flex flex-col h-full bg-bg-primary overflow-hidden">
        {/* Chart Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-border-subtle shrink-0">
          <div>
            <h2 className="text-lg font-medium text-text-primary">
              {activeElementType} {selectedElementId}
            </h2>
            <p className="text-xs text-text-secondary">
              Hydraulic/Hydrologic routing results over {simulationSettings.duration} hours
            </p>
          </div>
          <button 
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-1.5 bg-accent text-white rounded hover:bg-accent-hover transition-colors text-sm shadow-sm"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
        
        {/* Chart View */}
        <div className="flex-1 p-4 min-h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis 
                dataKey="timeLabel" 
                stroke="#888" 
                tick={{ fill: '#888', fontSize: 11 }}
                minTickGap={30}
              />
              <YAxis 
                yAxisId="left" 
                stroke="#888" 
                tick={{ fill: '#888', fontSize: 11 }} 
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                stroke="#888" 
                tick={{ fill: '#888', fontSize: 11 }} 
              />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #333', borderRadius: '4px' }}
                itemStyle={{ color: '#e0e0e0' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              
              {activeElementType === 'Node' && (
                <>
                  <Line yAxisId="left" type="monotone" dataKey="Depth" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="Depth (m)" />
                  <Line yAxisId="right" type="stepAfter" dataKey="Inflow" stroke="#10b981" strokeWidth={2} dot={false} name="Inflow (m³/s)" />
                  <Line yAxisId="right" type="monotone" dataKey="Flooding" stroke="#ef4444" strokeWidth={2} dot={false} name="Flooding (m³/s)" />
                </>
              )}
              {activeElementType === 'Conduit' && (
                <>
                  <Line yAxisId="left" type="monotone" dataKey="Flow" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="Flow (m³/s)" />
                  <Line yAxisId="right" type="monotone" dataKey="Velocity" stroke="#f59e0b" strokeWidth={2} dot={false} name="Velocity (m/s)" />
                </>
              )}
              {activeElementType === 'Subcatchment' && (
                <>
                  <Line yAxisId="right" type="stepAfter" dataKey="Precipitation" stroke="#6b7280" strokeWidth={2} dot={false} name="Precipitation (mm/hr)" />
                  <Line yAxisId="right" type="monotone" dataKey="Losses" stroke="#f59e0b" strokeWidth={2} dot={false} name="Losses (mm/hr)" />
                  <Line yAxisId="left" type="monotone" dataKey="Runoff" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 4 }} name="Runoff (m³/s)" />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Data Table View */}
        <div className="h-64 border-t border-border-subtle bg-bg-secondary flex flex-col shrink-0">
           <div className="px-4 py-2 border-b border-border-subtle bg-bg-tertiary text-xs font-semibold text-text-secondary flex gap-4">
             <div>Tabular Data ({chartData.length} records)</div>
           </div>
           <div className="flex-1 overflow-auto">
             <table className="w-full text-left text-sm text-text-primary">
               <thead className="sticky top-0 bg-bg-tertiary shadow-sm z-10 text-xs uppercase text-text-secondary">
                 <tr>
                   <th className="px-4 py-2 border-b border-border-subtle">Time (min)</th>
                   <th className="px-4 py-2 border-b border-border-subtle">Time (hr)</th>
                   {Object.keys(chartData[0] || {}).filter(k => k !== 'time' && k !== 'timeLabel').map(key => (
                     <th key={key} className="px-4 py-2 border-b border-border-subtle">{key}</th>
                   ))}
                 </tr>
               </thead>
               <tbody className="divide-y divide-border-subtle">
                 {chartData.map((row, idx) => (
                   <tr key={idx} className="hover:bg-bg-hover">
                     <td className="px-4 py-1.5">{row.time}</td>
                     <td className="px-4 py-1.5 text-text-secondary">{row.timeLabel}</td>
                     {Object.keys(row).filter(k => k !== 'time' && k !== 'timeLabel').map(key => (
                       <td key={key} className="px-4 py-1.5 font-mono text-xs">{(row as any)[key].toFixed(4)}</td>
                     ))}
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={`fixed z-50 flex overflow-hidden shadow-2xl border border-border-strong bg-bg-secondary ${
          isFullscreen 
            ? 'inset-x-0 inset-y-0 mt-[105px] rounded-none' 
            : 'inset-x-12 inset-y-24 rounded-lg'
        }`}
      >
        {/* Left Sidebar - Item Navigator */}
        <div className="w-64 flex flex-col border-r border-border-subtle bg-bg-tertiary shrink-0">
          <div className="p-4 border-b border-border-subtle flex justify-between items-center bg-bg-secondary">
             <div className="flex items-center gap-2">
               <BarChart2 size={18} className="text-accent" />
               <h2 className="font-semibold text-text-primary">Results</h2>
             </div>
             <div className="flex gap-1">
               <button 
                 onClick={() => setIsFullscreen(!isFullscreen)} 
                 title={isFullscreen ? "Minimize" : "Maximize"}
                 className="p-1 hover:bg-bg-hover rounded text-text-secondary hover:text-text-primary transition-colors"
               >
                 {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
               </button>
               <button 
                 onClick={() => setResultsViewerOpen(false)} 
                 title="Close results"
                 className="p-1 hover:bg-red-500/20 rounded text-text-secondary hover:text-red-400 transition-colors"
               >
                 <X size={16} />
               </button>
             </div>
          </div>
          
          <div className="p-2 border-b border-border-subtle">
             <div className="flex bg-bg-primary rounded p-1 gap-1">
                {(['All', 'Nodes', 'Conduits', 'Subcatchments'] as const).map(type => (
                   <button
                     key={type}
                     onClick={() => setFilterType(type)}
                     className={`flex-1 py-1 text-[10px] font-medium rounded transition-colors ${
                       filterType === type ? 'bg-accent text-white shadow-sm' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                     }`}
                   >
                     {type}
                   </button>
                ))}
             </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {(filterType === 'All' || filterType === 'Subcatchments') && availableSubcatchments.map(s => (
              <button
                key={s.id}
                onClick={() => handleSelectElement(s.id)}
                className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 transition-colors ${
                  selectedElementId === s.id ? 'bg-accent/20 text-accent' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                }`}
              >
                <Hexagon size={14} className={selectedElementId === s.id ? 'text-accent' : 'text-text-muted'} />
                <span className="text-sm truncate">{s.name}</span>
              </button>
            ))}
            {(filterType === 'All' || filterType === 'Nodes') && availableNodes.map(n => (
              <button
                key={n.id}
                onClick={() => handleSelectElement(n.id)}
                className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 transition-colors ${
                  selectedElementId === n.id ? 'bg-accent/20 text-accent' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                }`}
              >
                <CircleDot size={14} className={selectedElementId === n.id ? 'text-accent' : 'text-text-muted'} />
                <span className="text-sm truncate">{n.name}</span>
              </button>
            ))}
            {(filterType === 'All' || filterType === 'Conduits') && availableConduits.map(c => (
              <button
                key={c.id}
                onClick={() => handleSelectElement(c.id)}
                className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 transition-colors ${
                  selectedElementId === c.id ? 'bg-accent/20 text-accent' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                }`}
              >
                <Minus size={14} className={selectedElementId === c.id ? 'text-accent' : 'text-text-muted'} />
                <span className="text-sm truncate">{c.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Content Area */}
        {renderContent()}

      </motion.div>
    </AnimatePresence>
  );
};
