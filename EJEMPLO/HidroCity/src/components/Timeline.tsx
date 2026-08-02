import React, { useEffect } from 'react';
import { useStore } from '../store';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';

export const Timeline: React.FC = () => {
  const { 
    simulationResults, currentTimeStep, setCurrentTimeStep, 
    isPlaying, setIsPlaying, isMaxMode, setIsMaxMode 
  } = useStore();

  // Assuming simulation results have a fixed number of time steps (e.g., 61 for 6 hours with 0.1h dt)
  // Let's find the max time steps from the first node
  const maxSteps = simulationResults && Object.values(simulationResults.nodes).length > 0 
    ? Object.values(simulationResults.nodes)[0].depthSeries.length - 1 
    : 0;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && maxSteps > 0) {
      interval = setInterval(() => {
        const currentStep = useStore.getState().currentTimeStep;
        if (currentStep >= maxSteps) {
          setIsPlaying(false);
        } else {
          setCurrentTimeStep(currentStep + 1);
        }
      }, 500); // 500ms per step
    }
    return () => clearInterval(interval);
  }, [isPlaying, maxSteps, setCurrentTimeStep, setIsPlaying]);

  if (!simulationResults) return null;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTimeStep(parseInt(e.target.value, 10));
  };

  // Format time (assuming each step is 1 hour based on server.ts logic)
  const formatTime = (step: number) => {
    const hours = Math.floor(step);
    const minutes = Math.round((step - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-bg-surface/90 backdrop-blur-md border border-border-subtle rounded-xl shadow-2xl p-3 flex items-center gap-4 z-[1000] w-[600px]">
      <div className="flex items-center gap-2">
        <button 
          onClick={() => setCurrentTimeStep(0)}
          className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-md transition-colors"
          title="Reset"
        >
          <SkipBack size={18} />
        </button>
        <button 
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-2 bg-accent hover:bg-accent-hover text-bg-primary rounded-full transition-colors shadow-lg shadow-accent/20"
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
        </button>
        <button 
          onClick={() => setIsMaxMode(!isMaxMode)}
          className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
            isMaxMode 
              ? 'bg-accent text-bg-primary shadow-lg shadow-accent/20 animate-pulse' 
              : 'bg-bg-hover text-text-secondary hover:text-text-primary'
          }`}
          title="Show Peak Envelopes (Worst Case)"
        >
          MAX
        </button>
        <button 
          onClick={() => setCurrentTimeStep(maxSteps)}
          className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-md transition-colors"
          title="Go to end"
        >
          <SkipForward size={18} />
        </button>
      </div>

      <div className="flex-1 flex flex-col gap-1">
        <div className="flex justify-between text-xs font-medium text-text-secondary px-1">
          <span>{formatTime(0)}</span>
          <span className="text-accent font-bold">{formatTime(currentTimeStep)}</span>
          <span>{formatTime(maxSteps)}</span>
        </div>
        <input 
          type="range" 
          min="0" 
          max={maxSteps} 
          value={currentTimeStep} 
          title="Timeline Position"
          onChange={handleSliderChange}
          className="w-full h-2 bg-bg-hover rounded-lg appearance-none cursor-pointer accent-[var(--color-accent)]"
        />
      </div>
    </div>
  );
};
