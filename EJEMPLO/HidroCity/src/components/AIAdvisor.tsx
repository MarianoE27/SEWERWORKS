import React from 'react';
import { useStore } from '../store';
import { Bot, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export const AIAdvisor: React.FC = () => {
  const { aiAnalysis, isAnalyzing, runAIAnalysis, simulationResults } = useStore();

  return (
    <div className="flex flex-col h-full bg-slate-900 overflow-hidden">
      {!aiAnalysis && !isAnalyzing ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4 text-emerald-400">
            <Bot size={32} />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Hydraulic AI Advisor</h3>
          <p className="text-slate-400 text-sm max-w-sm mb-6">
            Get intelligent insights and engineering recommendations based on your simulation results.
          </p>
          <button
            onClick={runAIAnalysis}
            disabled={!simulationResults}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${
              simulationResults 
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20' 
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Sparkles size={18} />
            Generate Analysis
          </button>
          {!simulationResults && (
            <p className="mt-3 text-xs text-amber-500 flex items-center gap-1">
              <AlertCircle size={12} />
              Run a simulation first to enable analysis
            </p>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/20">
            <div className="flex items-center gap-2 text-emerald-400 font-medium tracking-wide text-sm uppercase">
              <Sparkles size={16} />
              AI Analysis Report
            </div>
            <button 
              onClick={runAIAnalysis}
              disabled={isAnalyzing}
              className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1"
            >
              {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              Regenerate
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 prose prose-invert prose-emerald prose-sm max-w-none">
            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center h-full space-y-4 py-12">
                <div className="relative">
                  <div className="w-12 h-12 border-2 border-emerald-500/20 rounded-full animate-ping absolute inset-0" />
                  <div className="w-12 h-12 border-2 border-emerald-500/50 border-t-emerald-500 rounded-full animate-spin" />
                </div>
                <div className="text-slate-400 text-sm animate-pulse">
                  Consulting generative models for engineering insights...
                </div>
              </div>
            ) : (
              <div className="animate-in">
                <ReactMarkdown>{aiAnalysis || ''}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
