import React, { useMemo } from 'react';
import { useStore } from '../store';
import { X, Printer, FileText, CheckCircle, AlertTriangle } from 'lucide-react';

export const ReportGenerator: React.FC = () => {
  const isReportViewerOpen  = useStore(s => s.isReportViewerOpen);
  const setIsReportViewerOpen = useStore(s => s.setReportViewerOpen);
  const nodes               = useStore(s => s.nodes);
  const conduits            = useStore(s => s.conduits);
  const subcatchments       = useStore(s => s.subcatchments);
  const simulationResults   = useStore(s => s.simulationResults);
  const simulationSettings  = useStore(s => s.simulationSettings);
  const rainfallEvents      = useStore(s => s.rainfallEvents);
  const activeRainfallEventId = useStore(s => s.activeRainfallEventId);

  const activeRainfall = useMemo(() => 
    rainfallEvents.find(e => e.id === activeRainfallEventId),
  [rainfallEvents, activeRainfallEventId]);

  if (!isReportViewerOpen) return null;

  return (
    <div className="fixed inset-0 z-[4000] flex bg-bg-surface flex-col print:absolute print:inset-0 print:bg-white print:text-black print:overflow-visible">
      
      {/* Non-printable Top Bar for UI Controls */}
      <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-bg-primary/50 print:hidden h-16 shrink-0">
        <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
          <FileText className="text-accent" />
          Professional Report Generator
        </h2>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-bg-primary font-medium rounded-md hover:bg-accent-hover transition-colors shadow-lg shadow-accent/20"
          >
            <Printer size={18} />
            Print to PDF
          </button>
          <button 
            onClick={() => setIsReportViewerOpen(false)}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-md transition-colors"
            title="Close Report"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Printable Report Content */}
      <div className="flex-1 overflow-auto p-8 print:p-0 print:overflow-visible bg-[#f8fafc] print:bg-white">
        <div className="max-w-[210mm] mx-auto bg-white print:shadow-none shadow-xl border border-slate-200 print:border-none p-12 min-h-[297mm] text-slate-800">
          
          {/* Report Header */}
          <div className="border-b-2 border-slate-800 pb-6 mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Hydraulic Analysis Report</h1>
              <p className="text-slate-500 mt-2 text-lg">HidroCity Professional</p>
            </div>
            <div className="text-right text-sm text-slate-500">
              <p>Date: {new Date().toLocaleDateString()}</p>
              <p>Time: {new Date().toLocaleTimeString()}</p>
              <p className="font-medium text-slate-700 mt-2">Status: {simulationResults ? 'Simulated' : 'Design Phase'}</p>
            </div>
          </div>

          {/* Project Summary */}
          <section className="mb-10">
            <h3 className="text-xl font-semibold text-slate-800 border-b border-slate-200 pb-2 mb-4">1. Project Summary</h3>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold text-slate-600 mb-2">Network Elements</h4>
                <ul className="space-y-1 text-sm">
                  <li className="flex justify-between border-b border-slate-100 py-1"><span>Junctions & Outfalls:</span> <span className="font-medium">{nodes.length}</span></li>
                  <li className="flex justify-between border-b border-slate-100 py-1"><span>Conduits:</span> <span className="font-medium">{conduits.length}</span></li>
                  <li className="flex justify-between py-1"><span>Subcatchments:</span> <span className="font-medium">{subcatchments.length}</span></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-slate-600 mb-2">Simulation Settings</h4>
                <ul className="space-y-1 text-sm">
                  <li className="flex justify-between border-b border-slate-100 py-1"><span>Routing Method:</span> <span className="font-medium">{simulationSettings.routingMethod.replace('_', ' ')}</span></li>
                  <li className="flex justify-between border-b border-slate-100 py-1"><span>Duration:</span> <span className="font-medium">{simulationSettings.duration} hours</span></li>
                  <li className="flex justify-between py-1"><span>Rainfall Event:</span> <span className="font-medium">{activeRainfall ? activeRainfall.name : 'None'}</span></li>
                </ul>
              </div>
            </div>
          </section>

          {/* Simulation Results (if available) */}
          {simulationResults ? (
            <>
              {/* Nodes Table */}
              <section className="mb-10 page-break-inside-avoid">
                <h3 className="text-xl font-semibold text-slate-800 border-b border-slate-200 pb-2 mb-4">2. Node Results Summary</h3>
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-2 font-semibold border-b">ID</th>
                      <th className="px-4 py-2 font-semibold border-b">Invert (m)</th>
                      <th className="px-4 py-2 font-semibold border-b">Max HGL (m)</th>
                      <th className="px-4 py-2 font-semibold border-b">Max Depth (m)</th>
                      <th className="px-4 py-2 font-semibold border-b">Peak Flooding (m³/s)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nodes.map((node, i) => {
                      const res = simulationResults.nodes[node.id];
                      const maxFlooding = res ? Math.max(...res.floodingSeries.map(s => s.value)) : 0;
                      return (
                        <tr key={node.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="px-4 py-2 border-b text-slate-900 font-medium">{node.name}</td>
                          <td className="px-4 py-2 border-b">{node.invertElevation.toFixed(2)}</td>
                          <td className="px-4 py-2 border-b">{res ? res.head.toFixed(2) : '-'}</td>
                          <td className="px-4 py-2 border-b">{res ? res.depth.toFixed(2) : '-'}</td>
                          <td className={`px-4 py-2 border-b font-medium ${maxFlooding > 0.001 ? 'text-red-600' : 'text-slate-600'}`}>
                            {maxFlooding > 0.001 ? maxFlooding.toFixed(3) : '0.000'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>

              {/* Conduits Table */}
              <section className="mb-10 page-break-inside-avoid print:break-before-auto">
                <h3 className="text-xl font-semibold text-slate-800 border-b border-slate-200 pb-2 mb-4">3. Conduit Results Summary</h3>
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-2 font-semibold border-b">ID</th>
                      <th className="px-4 py-2 font-semibold border-b text-center">N</th>
                      <th className="px-4 py-2 font-semibold border-b">Slope (%)</th>
                      <th className="px-4 py-2 font-semibold border-b">Capacity (m³/s)</th>
                      <th className="px-4 py-2 font-semibold border-b">Max Flow (m³/s)</th>
                      <th className="px-4 py-2 font-semibold border-b">q/Q Ratio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conduits.map((conduit, i) => {
                      const res = simulationResults.conduits[conduit.id];
                      const ratio = res && res.capacity > 0 ? (res.qFull / res.capacity) : 0;
                      let statusColor = "text-slate-600";
                      if (ratio > 0.95) statusColor = "text-red-500 font-bold";
                      else if (ratio > 0.75) statusColor = "text-amber-500 font-bold";

                      return (
                        <tr key={conduit.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="px-4 py-2 border-b text-slate-900 font-medium">{conduit.name}</td>
                          <td className="px-4 py-2 border-b text-center">
                            {(conduit.parallelCount ?? 1) > 1
                              ? <span className="text-indigo-600 font-bold">×{conduit.parallelCount}</span>
                              : '1'}
                          </td>
                          <td className="px-4 py-2 border-b">{(conduit.slope).toFixed(2)}</td>
                          <td className="px-4 py-2 border-b">{res ? res.capacity.toFixed(3) : '-'}</td>
                          <td className="px-4 py-2 border-b">{res ? res.qFull.toFixed(3) : '-'}</td>
                          <td className={`px-4 py-2 border-b ${statusColor}`}>
                            {res ? (res.capacity > 0 ? (ratio * 100).toFixed(1) + '%' : 'N/A') : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="mt-4 flex gap-6 text-xs text-slate-500">
                  <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded-sm"></div> &gt; 95% Surcharged</div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 bg-amber-500 rounded-sm"></div> &gt; 75% High Load</div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 bg-slate-300 rounded-sm"></div> Normal Operation</div>
                </div>
              </section>
            </>
          ) : (
            <div className="p-8 border-2 border-dashed border-slate-300 rounded-lg text-center flex flex-col items-center justify-center text-slate-500">
              <AlertTriangle size={32} className="text-amber-400 mb-3" />
              <h3 className="text-lg font-medium text-slate-700">No Simulation Results</h3>
              <p className="mt-1">Run a simulation first to populate hydraulic results in the report.</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-16 pt-4 border-t border-slate-200 text-center text-xs text-slate-400">
            <p>Generated by HidroCity Professional Edition</p>
          </div>

        </div>
      </div>
    </div>
  );
};
