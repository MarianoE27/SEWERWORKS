import React from 'react';
import { useStore } from '../store';
import { MousePointer2, CircleDot, Minus, Play, Square, Trash2, Hexagon, Ruler, Activity, ChevronDown } from 'lucide-react';
import { Dropdown, DropdownItem } from './ui/Dropdown';

export const Toolbar: React.FC = () => {
  const { activeTool, setActiveTool, runSimulation, isSimulating, clearResults, selectedElementId, selectedElementType, deleteElement, setIsProfileViewerOpen } = useStore();

  const isAddingElement = ['AddNode', 'AddConduit', 'AddSubcatchment'].includes(activeTool);

  return (
    <div className="h-14 glass-panel border-b border-border-subtle flex items-center px-4 justify-between text-text-primary bg-bg-surface z-20 transition-colors">
      <div className="flex items-center space-x-6">
        <div className="font-bold text-lg text-accent flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          HydroCity Pro
        </div>
        
        <div className="h-6 w-px bg-border-subtle mx-2" />
        
        <div className="flex items-center space-x-2 bg-bg-hover p-1 rounded-lg">
          <ToolButton 
            icon={<MousePointer2 size={18} />} 
            label="Select" 
            active={activeTool === 'Select'} 
            onClick={() => setActiveTool('Select')} 
          />
          
          <Dropdown
            trigger={
              <button
                title="Add Element"
                className={`flex items-center gap-1 p-2 rounded transition-colors ${
                  isAddingElement 
                    ? 'bg-accent/20 text-accent' 
                    : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                }`}
              >
                {activeTool === 'AddNode' ? <CircleDot size={18} /> : 
                 activeTool === 'AddConduit' ? <Minus size={18} /> : 
                 activeTool === 'AddSubcatchment' ? <Hexagon size={18} /> : 
                 <CircleDot size={18} />}
                <ChevronDown size={14} />
              </button>
            }
          >
            <DropdownItem 
              icon={<CircleDot size={14} />} 
              label="Add Node" 
              onClick={() => setActiveTool('AddNode')} 
              checked={activeTool === 'AddNode'} 
            />
            <DropdownItem 
              icon={<Minus size={14} />} 
              label="Add Conduit" 
              onClick={() => setActiveTool('AddConduit')} 
              checked={activeTool === 'AddConduit'} 
            />
            <DropdownItem 
              icon={<Hexagon size={14} />} 
              label="Add Subcatchment" 
              onClick={() => setActiveTool('AddSubcatchment')} 
              checked={activeTool === 'AddSubcatchment'} 
            />
          </Dropdown>

          <div className="w-px h-6 bg-border-subtle mx-1" />
          <ToolButton 
            icon={<Ruler size={18} />} 
            label="Measure Distance/Area" 
            active={activeTool === 'Measure'} 
            onClick={() => setActiveTool('Measure')} 
          />
          <ToolButton 
            icon={<Activity size={18} />} 
            label="Hydraulic Profile" 
            active={false} 
            onClick={() => setIsProfileViewerOpen(true)} 
          />
        </div>

        {selectedElementId && selectedElementType && (
          <div className="flex items-center ml-4">
            <button
              onClick={() => deleteElement(selectedElementId, selectedElementType)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:bg-red-400/10 rounded transition-colors"
            >
              <Trash2 size={16} />
              Delete Selected
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-3">
        <button
          onClick={clearResults}
          className="px-4 py-1.5 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          Clear Results
        </button>
        <button
          onClick={runSimulation}
          disabled={isSimulating}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            isSimulating 
              ? 'bg-bg-hover text-text-secondary cursor-not-allowed' 
              : 'bg-accent hover:bg-accent-hover text-bg-primary shadow-sm'
          }`}
        >
          {isSimulating ? <Square size={16} className="animate-pulse" /> : <Play size={16} />}
          {isSimulating ? 'Simulating...' : 'Run Simulation'}
        </button>
      </div>
    </div>
  );
};

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

const ToolButton: React.FC<ToolButtonProps> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    title={label}
    className={`p-2 rounded transition-colors ${
      active 
        ? 'bg-accent/20 text-accent font-medium' 
        : 'text-text-secondary hover:bg-bg-surface hover:text-text-primary'
    }`}
  >
    {icon}
  </button>
);
