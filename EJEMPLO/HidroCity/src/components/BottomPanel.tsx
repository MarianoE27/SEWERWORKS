import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { Terminal, Bot, Activity, X as XIcon, Trash2 } from 'lucide-react';
import { AIAdvisor } from './AIAdvisor';

export const BottomPanel: React.FC = () => {
  const { simulationResults, isSimulating, setBottomPanelOpen, simulationLog, clearLog } = useStore();
  const [activeTab, setActiveTab] = useState<'console' | 'ai'>('console');
  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new log messages
  useEffect(() => {
    if (activeTab === 'console') {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [simulationLog, activeTab]);

  return (
    <div className="h-64 border-t border-border-subtle flex flex-col transition-colors bg-bg-surface text-text-primary">
      <div className="flex items-center px-2 py-1 border-b border-border-subtle bg-bg-primary">
        <button 
          onClick={() => setActiveTab('console')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-medium transition-colors border-b-2 ${
            activeTab === 'console' ? 'border-accent text-accent bg-accent/5' : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <Terminal size={14} />
          CONSOLE
          {simulationLog.length > 0 && activeTab !== 'console' && (
            <span className="w-1.5 h-1.5 bg-accent rounded-full" />
          )}
        </button>
        <button 
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-medium transition-colors border-b-2 ${
            activeTab === 'ai' ? 'border-accent text-accent bg-accent/5' : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          <Bot size={14} />
          AI ADVISOR
          {simulationResults && activeTab !== 'ai' && (
            <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
          )}
        </button>

        <div className="flex-1" />

        {activeTab === 'console' && simulationLog.length > 0 && (
          <button
            onClick={clearLog}
            className="p-2 text-text-secondary hover:text-text-primary transition-colors"
            title="Clear Console"
          >
            <Trash2 size={14} />
          </button>
        )}
        
        <button 
          onClick={() => setBottomPanelOpen(false)}
          className="p-2 text-text-secondary hover:text-text-primary transition-colors"
          title="Close Panel"
        >
          <XIcon size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'console' ? (
          <div className="h-full overflow-y-auto p-4 font-mono text-[11px] space-y-1.5 bg-bg-primary/50">
            {/* Startup message always shown */}
            <div className="text-text-secondary">[{new Date().toLocaleTimeString()}] System initialized. HydroCity Pro Core v1.0.42 ready.</div>
            
            {/* Dynamic log from store */}
            {simulationLog.map((msg, i) => (
              <div 
                key={i} 
                className={`${
                  msg.includes('ERROR') ? 'text-red-400' :
                  msg.includes('WARNING') ? 'text-yellow-400' :
                  msg.includes('SIMULATION SUCCESSFUL') ? 'text-accent font-semibold' :
                  'text-text-secondary'
                }`}
              >
                {msg}
              </div>
            ))}

            {isSimulating && (
              <div className="text-accent flex items-center gap-2">
                <Activity size={14} className="animate-pulse" />
                [{new Date().toLocaleTimeString()}] Running hydraulic simulation (Dynamic Wave Routing)...
              </div>
            )}

            {simulationResults && (
              <div className="border-l-2 border-accent pl-3 mt-2 space-y-1">
                <div className="grid grid-cols-2 gap-4 text-text-secondary">
                  <div>
                    <span className="text-text-secondary uppercase text-[9px] block">Topology</span>
                    {Object.keys(simulationResults.nodes).length} Nodes, {Object.keys(simulationResults.conduits).length} Conduits
                  </div>
                  <div>
                    <span className="text-text-secondary uppercase text-[9px] block">Peak Flow</span>
                    {Object.keys(simulationResults.conduits).length > 0 
                      ? Math.max(...Object.values(simulationResults.conduits).map(c => c.qFull)).toFixed(3) 
                      : 0} m³/s
                  </div>
                  <div className="col-span-2">
                    <span className="text-text-secondary uppercase text-[9px] block">Total Flooding</span>
                    {Object.values(simulationResults.nodes).reduce((acc, n) => acc + n.flooding, 0).toFixed(3)} m³/s
                  </div>
                </div>
              </div>
            )}

            <div ref={logEndRef} />
          </div>
        ) : (
          <AIAdvisor />
        )}
      </div>
    </div>
  );
};
