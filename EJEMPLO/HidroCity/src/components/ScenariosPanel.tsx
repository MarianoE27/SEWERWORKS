import React from 'react';
import { useStore } from '../store';
import {
  X, Play, PlaySquare, Trash2, RadioIcon, CheckCircle2, Clock,
  TrendingUp, Droplets, AlertTriangle, BarChart3, Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function fmt(n: number, dec = 3) {
  return n.toFixed(dec);
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export const ScenariosPanel: React.FC = () => {
  const {
    scenarios,
    activeScenarioId,
    setActiveScenario,
    removeScenario,
    clearScenarios,
    isScenariosOpen,
    setScenariosOpen,
    runSimulation,
    runAllScenarios,
    isSimulating,
    isRunningBatch,
    batchProgress,
    rainfallEvents,
  } = useStore();

  if (!isScenariosOpen) return null;

  const metrics = [
    { key: 'peakFlow',       label: 'Peak Q',         unit: 'm³/s', decimals: 3, icon: <TrendingUp size={12} /> },
    { key: 'totalFlooding',  label: 'Total Flooding', unit: 'm³/s', decimals: 3, icon: <Droplets size={12} /> },
    { key: 'floodedNodes',   label: 'Flooded Nodes',  unit: '',     decimals: 0, icon: <AlertTriangle size={12} /> },
    { key: 'maxNodeDepth',   label: 'Max Depth',      unit: 'm',    decimals: 2, icon: <BarChart3 size={12} /> },
  ] as const;

  return (
    <div className="fixed inset-0 z-[8000] flex items-end justify-center pointer-events-none">
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="pointer-events-auto w-full max-w-6xl mx-4 mb-4 bg-bg-surface border border-border-subtle rounded-xl shadow-2xl overflow-hidden"
        style={{ maxHeight: '75vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border-subtle bg-bg-primary/40">
          <div className="flex items-center gap-3">
            <BarChart3 size={16} className="text-accent" />
            <span className="text-sm font-semibold text-text-primary">Simulation Scenarios</span>
            {scenarios.length > 0 && (
              <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                {scenarios.length} scenario{scenarios.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Run current */}
            <button
              onClick={runSimulation}
              disabled={isSimulating}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-accent text-bg-primary hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
            >
              {isSimulating && !isRunningBatch ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
              Run Current
            </button>
            {/* Run all */}
            <button
              onClick={runAllScenarios}
              disabled={isSimulating || rainfallEvents.length === 0}
              title={rainfallEvents.length === 0 ? 'No rainfall events defined' : `Run ${rainfallEvents.length} events`}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-accent text-accent hover:bg-accent/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
            >
              {isRunningBatch ? <Loader2 size={12} className="animate-spin" /> : <PlaySquare size={12} />}
              Run All ({rainfallEvents.length})
            </button>
            {/* Clear all */}
            {scenarios.length > 0 && (
              <button
                onClick={() => { if (window.confirm('Delete all scenarios?')) clearScenarios(); }}
                disabled={isSimulating}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-subtle/60 transition-colors disabled:opacity-40"
              >
                <Trash2 size={12} />
                Clear All
              </button>
            )}
            <button
              onClick={() => setScenariosOpen(false)}
              className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
              title="Close scenarios panel"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Batch progress bar */}
        <AnimatePresence>
          {isRunningBatch && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden border-b border-border-subtle"
            >
              <div className="px-5 py-2 bg-accent/5">
                <div className="flex items-center justify-between text-xs text-text-secondary mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Loader2 size={11} className="animate-spin text-accent" />
                    Running scenario {batchProgress.current} of {batchProgress.total}...
                  </span>
                  <span className="text-accent font-medium">
                    {Math.round((batchProgress.current / batchProgress.total) * 100)}%
                  </span>
                </div>
                <div className="h-1 bg-bg-hover rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-accent rounded-full"
                    animate={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(75vh - 56px)' }}>
          {/* Empty state */}
          {scenarios.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-text-secondary">
              <BarChart3 size={32} className="mb-3 opacity-30" />
              <p className="text-sm font-medium">No scenarios</p>
              <p className="text-xs mt-1 opacity-70">Run a simulation to save results</p>
            </div>
          )}

          {/* Scenario list */}
          {scenarios.length > 0 && (
            <div className="p-4">
              <div className="text-[10px] uppercase tracking-wider text-text-secondary font-medium mb-2 px-1">
                Saved Results
              </div>
              <div className="space-y-2">
                {scenarios.map(scenario => {
                  const isActive = scenario.id === activeScenarioId;
                  return (
                    <div
                      key={scenario.id}
                      onClick={() => setActiveScenario(scenario.id)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
                        isActive
                          ? 'border-accent/40 bg-accent/5'
                          : 'border-border-subtle hover:border-border-subtle/60 hover:bg-bg-hover'
                      }`}
                    >
                      {/* Radio indicator */}
                      <div className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        isActive ? 'border-accent' : 'border-text-secondary/30'
                      }`}>
                        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-accent" />}
                      </div>

                      {/* Name + date */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium truncate ${isActive ? 'text-accent' : 'text-text-primary'}`}>
                            {scenario.name}
                          </span>
                          {isActive && (
                            <span className="text-[9px] bg-accent/10 text-accent px-1.5 py-0.5 rounded shrink-0">ON MAP</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 text-[10px] text-text-secondary">
                          <Clock size={9} />
                          {fmtDate(scenario.createdAt)}
                        </div>
                      </div>

                      {/* Summary stats */}
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <div className="text-[10px] text-text-secondary">Peak Q</div>
                          <div className="text-xs font-mono font-medium text-text-primary">
                            {fmt(scenario.summary.peakFlow)} m³/s
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-text-secondary">Flooded</div>
                          <div className={`text-xs font-mono font-medium ${scenario.summary.floodedNodes > 0 ? 'text-red-400' : 'text-text-primary'}`}>
                            {scenario.summary.floodedNodes} node{scenario.summary.floodedNodes !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-text-secondary">Overflow</div>
                          <div className="text-xs font-mono font-medium text-text-primary">
                            {fmt(scenario.summary.totalFlooding)} m³/s
                          </div>
                        </div>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={e => { e.stopPropagation(); removeScenario(scenario.id); }}
                        className="shrink-0 p-1 rounded text-text-secondary hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        title="Delete scenario"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Comparison table */}
          {scenarios.length >= 2 && (
            <div className="px-4 pb-4">
              <div className="text-[10px] uppercase tracking-wider text-text-secondary font-medium mb-2 px-1">
                Comparison Table
              </div>
              <div className="border border-border-subtle rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border-subtle bg-bg-primary/40">
                      <th className="text-left px-3 py-2 text-text-secondary font-medium w-36">Metric</th>
                      {scenarios.map(s => (
                        <th key={s.id} className={`px-3 py-2 text-center font-medium ${s.id === activeScenarioId ? 'text-accent' : 'text-text-primary'}`}>
                          <div className="truncate max-w-[120px] mx-auto">{s.name}</div>
                          {s.id === activeScenarioId && (
                            <div className="text-[9px] text-accent/70 font-normal">ON MAP</div>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map((metric, mi) => {
                      const values = scenarios.map(s => s.summary[metric.key] as number);
                      const maxVal = Math.max(...values);
                      return (
                        <tr key={metric.key} className={`border-b border-border-subtle last:border-0 ${mi % 2 === 0 ? '' : 'bg-bg-primary/20'}`}>
                          <td className="px-3 py-2 text-text-secondary flex items-center gap-1.5">
                            <span className="text-text-secondary/50">{metric.icon}</span>
                            {metric.label}
                            {metric.unit && <span className="text-[9px]">({metric.unit})</span>}
                          </td>
                          {scenarios.map(s => {
                            const val = s.summary[metric.key] as number;
                            const isMax = val === maxVal && maxVal > 0;
                            const isActive = s.id === activeScenarioId;
                            return (
                              <td key={s.id} className={`px-3 py-2 text-center font-mono ${isActive ? 'bg-accent/5' : ''}`}>
                                <span className={`${isMax && metric.key !== 'floodedNodes' ? 'text-amber-400 font-semibold' : isMax && metric.key === 'floodedNodes' && val > 0 ? 'text-red-400 font-semibold' : 'text-text-primary'}`}>
                                  {metric.decimals === 0 ? val.toString() : fmt(val, metric.decimals)}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-text-secondary mt-1.5 px-1">
                * Values in yellow indicate the maximum across scenarios.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
