import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, Search, X, Check } from 'lucide-react';
import { useStore } from '../store';
import { PROJECTIONS, ProjectionDef } from '../utils/projections';

interface ProjectionPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectionPanel: React.FC<ProjectionPanelProps> = ({ isOpen, onClose }) => {
  const { projectCRS, displayCRS, setProjectCRS, setDisplayCRS } = useStore();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'project' | 'display'>('display');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return PROJECTIONS;
    return PROJECTIONS.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      (p.region ?? '').toLowerCase().includes(q)
    );
  }, [search]);

  const byRegion = useMemo(() => {
    const groups: Record<string, ProjectionDef[]> = {};
    filtered.forEach(p => {
      const r = p.region ?? 'Other';
      if (!groups[r]) groups[r] = [];
      groups[r].push(p);
    });
    return groups;
  }, [filtered]);

  const activeCRS = activeTab === 'project' ? projectCRS : displayCRS;
  const setActiveCRS = activeTab === 'project' ? setProjectCRS : setDisplayCRS;

  const handleSelect = (code: string) => {
    setActiveCRS(code);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[3000] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />

          {/* Panel */}
          <motion.div
            className="relative bg-bg-surface border border-border-subtle rounded-lg shadow-2xl w-[560px] max-h-[80vh] flex flex-col"
            initial={{ scale: 0.95, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
              <div className="flex items-center gap-2 text-text-primary font-semibold text-sm">
                <Globe size={16} className="text-accent" />
                Coordinate Reference System
              </div>
              <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors" title="Close CRS panel">
                <X size={16} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border-subtle text-xs">
              <button
                className={`px-4 py-2 font-medium transition-colors ${activeTab === 'display' ? 'text-accent border-b-2 border-accent' : 'text-text-secondary hover:text-text-primary'}`}
                onClick={() => setActiveTab('display')}
              >
                Display CRS
                <span className="ml-2 text-text-secondary font-mono">{displayCRS}</span>
              </button>
              <button
                className={`px-4 py-2 font-medium transition-colors ${activeTab === 'project' ? 'text-accent border-b-2 border-accent' : 'text-text-secondary hover:text-text-primary'}`}
                onClick={() => setActiveTab('project')}
              >
                Project CRS
                <span className="ml-2 text-text-secondary font-mono">{projectCRS}</span>
              </button>
            </div>

            {/* Description */}
            <div className="px-4 py-2 text-[11px] text-text-secondary bg-bg-hover/50">
              {activeTab === 'display'
                ? 'Controls how cursor coordinates are displayed in the status bar at the bottom of the map.'
                : 'Controls the CRS used when importing and exporting data from the project.'
              }
            </div>

            {/* Search */}
            <div className="px-4 py-2 border-b border-border-subtle">
              <div className="flex items-center gap-2 bg-bg-hover rounded px-2 py-1">
                <Search size={12} className="text-text-secondary" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name or EPSG code..."
                  className="bg-transparent text-xs text-text-primary flex-1 outline-none placeholder:text-text-secondary"
                  autoFocus
                />
                {search && (
                  <button onClick={() => setSearch('')} className="text-text-secondary hover:text-text-primary" title="Clear search">
                    <X size={10} />
                  </button>
                )}
              </div>
            </div>

            {/* Projection List */}
            <div className="flex-1 overflow-y-auto px-2 py-2">
              {Object.entries(byRegion).map(([region, projs]) => (
                <div key={region} className="mb-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary px-2 mb-1">
                    {region}
                  </div>
                  {projs.map(proj => {
                    const isSelected = proj.code === activeCRS;
                    return (
                      <button
                        key={proj.code}
                        onClick={() => handleSelect(proj.code)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded text-left transition-colors text-xs mb-0.5 ${
                          isSelected
                            ? 'bg-accent/20 text-accent border border-accent/30'
                            : 'text-text-primary hover:bg-bg-hover border border-transparent'
                        }`}
                      >
                        <div>
                          <span className="font-medium">{proj.name}</span>
                          <span className="ml-2 text-text-secondary font-mono text-[10px]">{proj.code}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${proj.unit === 'metre' ? 'bg-accent/10 text-accent' : 'bg-accent/10 text-accent'}`}>
                            {proj.unit === 'metre' ? 'm' : '°'}
                          </span>
                          {isSelected && <Check size={12} className="text-accent" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="text-center text-text-secondary py-8 text-xs">
                  No projections match your search.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-border-subtle flex items-center justify-between">
              <div className="text-[11px] text-text-secondary">
                {filtered.length} of {PROJECTIONS.length} projections shown
              </div>
              <button
                onClick={onClose}
                className="px-4 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs rounded transition-colors"
              >
                Done
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
