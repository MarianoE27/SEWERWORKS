import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { Search, Command, Play, Download, Trash2, Map, Layers, PlusCircle, Layout } from 'lucide-react';

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { activeTool, setActiveTool, runSimulation, exportGeoJSON, nodes, conduits, subcatchments, selectElement } = useStore();
  const inputRef = useRef<HTMLInputElement>(null);

  interface CommandItem {
    id: string;
    name: string;
    icon: any;
    action: () => void;
    shortcut?: string;
  }

  const commands: CommandItem[] = [
    { id: 'sim', name: 'Run Simulation', icon: Play, action: runSimulation, shortcut: '⌘R' },
    { id: 'export', name: 'Export GeoJSON', icon: Download, action: exportGeoJSON, shortcut: '⌘E' },
    { id: 'node', name: 'Add Node Tool', icon: PlusCircle, action: () => setActiveTool('AddNode'), shortcut: 'A' },
    { id: 'cond', name: 'Add Conduit Tool', icon: PlusCircle, action: () => setActiveTool('AddConduit'), shortcut: 'C' },
    { id: 'sub', name: 'Add Subcatchment Tool', icon: PlusCircle, action: () => setActiveTool('AddSubcatchment'), shortcut: 'S' },
    { id: 'sel', name: 'Select Tool', icon: Command, action: () => setActiveTool('Select'), shortcut: 'V' },
    { id: 'fit', name: 'Fit Map to Bounds', icon: Map, action: () => useStore.getState().fitMapToBounds(), shortcut: 'F' },
  ];

  // Add dynamic element commands
  const elementCommands: CommandItem[] = [
    ...nodes.map(n => ({ id: `node-${n.id}`, name: `Go to Node: ${n.name}`, icon: Layout, action: () => selectElement(n.id, 'Node') })),
    ...conduits.map(c => ({ id: `cond-${c.id}`, name: `Go to Conduit: ${c.name}`, icon: Layout, action: () => selectElement(c.id, 'Conduit') })),
  ];

  const filteredCommands = [...commands, ...elementCommands].filter(c => 
    c.name.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const handleSelect = (command: typeof filteredCommands[0]) => {
    command.action();
    setIsOpen(false);
    setQuery('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[5000] flex items-start justify-center pt-[15vh] px-4 backdrop-blur-md bg-black/50 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-bg-surface border border-border-subtle rounded-2xl shadow-2xl shadow-black/50 overflow-hidden ring-1 ring-white/10">
        <div className="flex items-center px-4 py-3 border-b border-white/5 bg-bg-hover/30">
          <Search className="text-text-secondary mr-3" size={20} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search commands or project elements..."
            className="flex-1 bg-transparent border-none text-text-primary placeholder:text-text-secondary focus:outline-none text-lg"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
              if (e.key === 'ArrowUp') setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
              if (e.key === 'Enter') handleSelect(filteredCommands[selectedIndex]);
            }}
          />
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-bg-hover border border-border-subtle">
            <kbd className="text-[10px] font-sans text-text-secondary">ESC</kbd>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filteredCommands.length > 0 ? (
            filteredCommands.map((command, index) => (
              <div
                key={command.id}
                className={`flex items-center justify-between px-3 py-3 rounded-xl cursor-default transition-all duration-150 ${
                  index === selectedIndex ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                }`}
                onMouseEnter={() => setSelectedIndex(index)}
                onClick={() => handleSelect(command)}
              >
                <div className="flex items-center gap-3 font-medium">
                  <command.icon size={18} className={index === selectedIndex ? 'text-white' : 'text-text-secondary'} />
                  {command.name}
                </div>
                {command.shortcut && (
                  <div className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                    index === selectedIndex ? 'bg-white/20 text-white' : 'bg-bg-hover text-text-secondary border border-border-subtle'
                  }`}>
                    {command.shortcut}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="py-12 text-center">
              <div className="text-text-secondary mb-2">No results found for "{query}"</div>
              <div className="text-xs text-text-secondary">Try searching for nodes, tools, or simulation actions</div>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-white/5 bg-bg-hover/40 flex items-center justify-between text-[11px] text-text-secondary font-medium uppercase tracking-widest">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><kbd className="bg-bg-hover px-1 rounded text-text-primary">↵</kbd> Select</span>
            <span className="flex items-center gap-1"><kbd className="bg-bg-hover px-1 rounded text-text-primary">↑↓</kbd> Navigate</span>
          </div>
          <div>HydroCity Pro Command System</div>
        </div>
      </div>
    </div>
  );
};
