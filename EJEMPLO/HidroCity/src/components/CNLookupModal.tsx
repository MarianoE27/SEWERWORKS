import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Search } from 'lucide-react';

interface CNEntry {
  landUse: string;
  category: string;
  A: number; B: number; C: number; D: number;
}

const CN_TABLE: CNEntry[] = [
  // Fully developed urban areas
  { category: 'Urban', landUse: 'Lawns – poor condition (<50% grass)', A: 68, B: 79, C: 86, D: 89 },
  { category: 'Urban', landUse: 'Lawns – fair condition (50–75% grass)', A: 49, B: 69, C: 79, D: 84 },
  { category: 'Urban', landUse: 'Lawns – good condition (>75% grass)', A: 39, B: 61, C: 74, D: 80 },
  { category: 'Urban', landUse: 'Paved parking lots, roofs, driveways', A: 98, B: 98, C: 98, D: 98 },
  { category: 'Urban', landUse: 'Streets and roads – paved, open ditches', A: 83, B: 89, C: 92, D: 93 },
  { category: 'Urban', landUse: 'Streets and roads – gravel', A: 76, B: 85, C: 89, D: 91 },
  { category: 'Urban', landUse: 'Streets and roads – dirt', A: 72, B: 82, C: 87, D: 89 },
  { category: 'Urban', landUse: 'Commercial and business (85% imp.)', A: 89, B: 92, C: 94, D: 95 },
  { category: 'Urban', landUse: 'Industrial (72% imp.)', A: 81, B: 88, C: 91, D: 93 },
  { category: 'Urban', landUse: 'Residential 1/8 ac (65% imp.)', A: 77, B: 85, C: 90, D: 92 },
  { category: 'Urban', landUse: 'Residential 1/4 ac (38% imp.)', A: 61, B: 75, C: 83, D: 87 },
  { category: 'Urban', landUse: 'Residential 1/2 ac (25% imp.)', A: 54, B: 70, C: 80, D: 85 },
  { category: 'Urban', landUse: 'Residential 1 ac (20% imp.)', A: 51, B: 68, C: 79, D: 84 },
  // Agricultural
  { category: 'Agricultural', landUse: 'Fallow – bare soil', A: 77, B: 86, C: 91, D: 94 },
  { category: 'Agricultural', landUse: 'Row crops – straight rows, poor', A: 72, B: 81, C: 88, D: 91 },
  { category: 'Agricultural', landUse: 'Row crops – straight rows, good', A: 67, B: 78, C: 85, D: 89 },
  { category: 'Agricultural', landUse: 'Small grain – straight rows, poor', A: 65, B: 76, C: 84, D: 88 },
  { category: 'Agricultural', landUse: 'Small grain – straight rows, good', A: 63, B: 75, C: 83, D: 87 },
  { category: 'Agricultural', landUse: 'Pasture – poor condition', A: 68, B: 79, C: 86, D: 89 },
  { category: 'Agricultural', landUse: 'Pasture – fair condition', A: 49, B: 69, C: 79, D: 84 },
  { category: 'Agricultural', landUse: 'Pasture – good condition', A: 39, B: 61, C: 74, D: 80 },
  { category: 'Agricultural', landUse: 'Meadow – good condition', A: 30, B: 58, C: 71, D: 78 },
  // Forest / brush
  { category: 'Forest', landUse: 'Woods – poor (heavily grazed, litter removed)', A: 45, B: 66, C: 77, D: 83 },
  { category: 'Forest', landUse: 'Woods – fair', A: 36, B: 60, C: 73, D: 79 },
  { category: 'Forest', landUse: 'Woods – good (litter / understory present)', A: 25, B: 55, C: 70, D: 77 },
  { category: 'Forest', landUse: 'Brush – fair condition', A: 35, B: 56, C: 70, D: 77 },
  { category: 'Forest', landUse: 'Brush – good condition', A: 30, B: 48, C: 65, D: 73 },
  // Water / wetlands
  { category: 'Water', landUse: 'Water bodies / lakes / ponds', A: 100, B: 100, C: 100, D: 100 },
  { category: 'Water', landUse: 'Wetlands / marshes', A: 100, B: 100, C: 100, D: 100 },
];

const CATEGORIES = ['All', 'Urban', 'Agricultural', 'Forest', 'Water'];
const SOIL_GROUPS = ['A', 'B', 'C', 'D'] as const;

interface Props {
  onClose: () => void;
  onApply: (cn: number) => void;
}

export const CNLookupModal: React.FC<Props> = ({ onClose, onApply }) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedSoilGroup, setSelectedSoilGroup] = useState<'A'|'B'|'C'|'D'>('B');

  const filtered = CN_TABLE.filter(row => {
    const matchCat = activeCategory === 'All' || row.category === activeCategory;
    const matchSearch = row.landUse.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="bg-bg-surface border border-border-subtle rounded-xl shadow-2xl w-[700px] max-h-[80vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">NRCS Curve Number Reference</h2>
            <p className="text-xs text-text-secondary mt-0.5">Select a land use and soil group, then click Use to apply the CN.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Controls */}
        <div className="px-5 py-3 border-b border-border-subtle flex items-center gap-4 flex-wrap">
          {/* Search */}
          <div className="flex items-center gap-2 bg-bg-primary border border-border-subtle rounded-lg px-3 py-1.5 flex-1 min-w-[180px]">
            <Search size={13} className="text-text-secondary shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter land use..."
              className="bg-transparent text-xs text-text-primary placeholder-text-secondary outline-none w-full"
            />
          </div>

          {/* Category filter */}
          <div className="flex gap-1">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  activeCategory === cat
                    ? 'bg-accent/10 text-accent border border-accent/30'
                    : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary border border-transparent'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Soil group selector */}
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <span>Soil Group:</span>
            {SOIL_GROUPS.map(g => (
              <button
                key={g}
                onClick={() => setSelectedSoilGroup(g)}
                className={`w-7 h-7 rounded font-bold text-xs transition-colors ${
                  selectedSoilGroup === g
                    ? 'bg-accent text-bg-primary'
                    : 'bg-bg-hover text-text-secondary hover:text-text-primary'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-bg-surface border-b border-border-subtle">
              <tr>
                <th className="text-left px-5 py-2 text-text-secondary font-medium">Land Use / Cover</th>
                <th className="text-center px-3 py-2 text-text-secondary font-medium w-12">A</th>
                <th className="text-center px-3 py-2 text-text-secondary font-medium w-12">B</th>
                <th className="text-center px-3 py-2 text-text-secondary font-medium w-12">C</th>
                <th className="text-center px-3 py-2 text-text-secondary font-medium w-12">D</th>
                <th className="w-20 px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={i} className="border-b border-border-subtle/50 hover:bg-bg-hover transition-colors">
                  <td className="px-5 py-2 text-text-primary">{row.landUse}</td>
                  {SOIL_GROUPS.map(g => (
                    <td
                      key={g}
                      className={`text-center px-3 py-2 font-mono ${
                        g === selectedSoilGroup ? 'text-accent font-bold' : 'text-text-secondary'
                      }`}
                    >
                      {row[g]}
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <button
                      onClick={() => { onApply(row[selectedSoilGroup]); onClose(); }}
                      className="w-full px-2 py-1 bg-accent/10 hover:bg-accent/20 text-accent text-xs rounded font-medium transition-colors border border-accent/20"
                    >
                      Use {row[selectedSoilGroup]}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-text-secondary">No results match your filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border-subtle text-[10px] text-text-secondary">
          Source: USDA-NRCS TR-55, Urban Hydrology for Small Watersheds (1986). CN values are for Antecedent Moisture Condition II.
        </div>
      </motion.div>
    </motion.div>
  );
};
