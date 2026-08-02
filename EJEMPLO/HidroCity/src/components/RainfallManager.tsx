import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import {
  CloudRain,
  Plus,
  Trash2,
  Check,
  X,
  BarChart3,
  Settings2,
  FileUp
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { motion } from 'framer-motion';
import { RainfallType, StormMethod } from '../types';
import { generateChicagoStorm, generateSCSStorm, calculateTotalDepth, calculatePeakIntensity } from '../utils/hydrologyUtils';

interface RainfallManagerProps {
  onClose: () => void;
}

export const RainfallManager: React.FC<RainfallManagerProps> = ({ onClose }) => {
  const { 
    rainfallEvents, 
    activeRainfallEventId, 
    addRainfallEvent, 
    updateRainfallEvent, 
    deleteRainfallEvent, 
    setActiveRainfallEvent,
  } = useStore();

  const [selectedEventId, setSelectedEventId] = useState<string | null>(activeRainfallEventId);
  const selectedEvent = rainfallEvents.find(e => e.id === selectedEventId);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<RainfallType>('Constant');
  const [method, setMethod] = useState<StormMethod>('Chicago');
  const [duration, setDuration] = useState(2);
  const [timeStep, setTimeStep] = useState(5);
  const [totalDepth, setTotalDepth] = useState(100);
  const [peakRatio, setPeakRatio] = useState(0.4);
  const [chicagoA, setChicagoA] = useState(1000);
  const [chicagoB, setChicagoB] = useState(10);
  const [chicagoC, setChicagoC] = useState(0.8);

  useEffect(() => {
    if (selectedEvent) {
      setName(selectedEvent.name);
      setType(selectedEvent.type);
      setMethod(selectedEvent.method || 'Chicago');
      setTimeStep(selectedEvent.timeStep);
      setDuration(selectedEvent.parameters?.duration || 2);
      setTotalDepth(selectedEvent.parameters?.depth || 100);
      setPeakRatio(selectedEvent.parameters?.r || 0.4);
      setChicagoA(selectedEvent.parameters?.a || 1000);
      setChicagoB(selectedEvent.parameters?.b || 10);
      setChicagoC(selectedEvent.parameters?.c || 0.8);
    }
  }, [selectedEventId]);

  const handleCreateNew = () => {
    const id = addRainfallEvent({
      name: 'New Rain Event',
      type: 'Constant',
      data: [{ time: 0, value: 50 }, { time: 2, value: 50 }, { time: 2.1, value: 0 }],
      timeStep: 5,
      totalDepth: 100,
      peakIntensity: 50
    });
    // @ts-ignore - store adds id
    setSelectedEventId(id);
  };

  const handleGenerate = () => {
    if (!selectedEventId) return;

    let newData = selectedEvent.data;
    if (type === 'Constant') {
      newData = [
        { time: 0, value: totalDepth / duration },
        { time: duration, value: totalDepth / duration },
        { time: duration + 0.1, value: 0 }
      ];
    } else if (type === 'DesignStorm') {
      if (method === 'Chicago') {
        newData = generateChicagoStorm(chicagoA, chicagoB, chicagoC, peakRatio, duration, timeStep);
      } else if (method.startsWith('SCS_')) {
        const scsType = method.replace('SCS_', '') as 'Type1' | 'Type1A' | 'Type2' | 'Type3';
        newData = generateSCSStorm(scsType, totalDepth, duration, timeStep);
      }
    }

    const calculatedTotal = type === 'TimeSeries' ? calculateTotalDepth(newData, timeStep) : calculateTotalDepth(newData, timeStep);
    const peak = calculatePeakIntensity(newData);

    updateRainfallEvent(selectedEventId, {
      name,
      type,
      method,
      data: newData,
      timeStep,
      totalDepth: calculatedTotal,
      peakIntensity: peak,
      parameters: {
        duration,
        depth: totalDepth,
        r: peakRatio,
        a: chicagoA,
        b: chicagoB,
        c: chicagoC
      }
    });
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedEventId) return;

    const text = await file.text();
    const lines = text.split('\n');
    const newData: { time: number; value: number }[] = [];

    lines.forEach(line => {
      const parts = line.split(',');
      if (parts.length >= 2) {
        const time = parseFloat(parts[0]);
        const value = parseFloat(parts[1]);
        if (!isNaN(time) && !isNaN(value)) {
          newData.push({ time, value });
        }
      }
    });

    if (newData.length > 0) {
      const calculatedTotal = calculateTotalDepth(newData, timeStep);
      const peak = calculatePeakIntensity(newData);
      updateRainfallEvent(selectedEventId, {
        data: newData,
        totalDepth: calculatedTotal,
        peakIntensity: peak,
        type: 'TimeSeries'
      });
      setType('TimeSeries');
    }
    e.target.value = '';
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div className="w-full max-w-5xl h-[85vh] bg-bg-surface border border-border-subtle rounded-xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-bg-primary/40">
          <div className="flex items-center gap-2">
            <CloudRain className="text-accent" size={24} />
            <h2 className="text-xl font-bold">Rainfall Manager</h2>
          </div>
          <button onClick={onClose} title="Close Manager" aria-label="Close Manager" className="p-2 hover:bg-bg-hover rounded-full transition-colors text-text-secondary hover:text-text-primary">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Events List */}
          <div className="w-64 border-r border-border-subtle flex flex-col overflow-hidden bg-bg-primary/30">
            <div className="p-3">
              <button 
                onClick={handleCreateNew}
                title="Create New Rainfall Event"
                className="w-full flex items-center justify-center gap-2 p-2 bg-accent hover:bg-accent-hover rounded-md transition-all text-sm font-medium"
              >
                <Plus size={16} /> New Event
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {rainfallEvents.map(event => (
                <div 
                  key={event.id}
                  onClick={() => setSelectedEventId(event.id)}
                  className={`group relative flex items-center justify-between p-3 rounded-md cursor-pointer transition-all ${
                    selectedEventId === event.id
                    ? 'bg-accent/10 border border-accent/30 text-text-primary'
                    : 'hover:bg-bg-hover border border-transparent text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-medium truncate">{event.name}</span>
                    <span className="text-xs text-text-secondary">{event.type}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {activeRainfallEventId === event.id && <Check size={14} className="text-accent" />}
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteRainfallEvent(event.id); }}
                      title="Delete Event"
                      aria-label="Delete Event"
                      className="p-1 hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Content - Editor & Chart */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedEvent ? (
              <>
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                  {/* Form */}
                  <div className="w-full md:w-80 p-6 overflow-y-auto border-r border-border-subtle">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-4 flex items-center gap-2">
                      <Settings2 size={14} /> Parameters
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label htmlFor="event-name" className="text-xs font-medium text-text-secondary">Event Name</label>
                        <input 
                          id="event-name"
                          type="text" 
                          value={name} 
                          title="Event Name"
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent transition-colors"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="rainfall-type" className="text-xs font-medium text-text-secondary">Rainfall Type</label>
                        <select
                          id="rainfall-type"
                          value={type}
                          title="Rainfall Type"
                          onChange={(e) => setType(e.target.value as RainfallType)}
                          className="w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent transition-colors"
                        >
                          <option value="Constant">Constant Intensity</option>
                          <option value="DesignStorm">Design Storm</option>
                          <option value="TimeSeries">Time Series Import</option>
                        </select>
                      </div>

                      {type === 'TimeSeries' && (
                        <div className="space-y-3 p-4 bg-accent/10 border border-accent/20 rounded-lg animate-in fade-in duration-300">
                          <p className="text-xs opacity-70">
                            Upload a CSV file with "time(hr), intensity(mm/hr)" format.
                          </p>
                          <label className="flex items-center justify-center gap-2 p-2 bg-accent hover:bg-accent-hover rounded cursor-pointer transition-colors text-xs font-bold">
                            <FileUp size={14} /> Import CSV
                            <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
                          </label>
                        </div>
                      )}

                      {type === 'DesignStorm' && (
                        <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                          <label htmlFor="storm-method" className="text-xs font-medium text-text-secondary">Method</label>
                          <select 
                            id="storm-method"
                            value={method} 
                            title="Storm Generation Method"
                            onChange={(e) => setMethod(e.target.value as StormMethod)}
                            className="w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent transition-colors"
                          >
                            <option value="Chicago">Chicago (IDF)</option>
                            <option value="SCS_Type1">SCS Type I</option>
                            <option value="SCS_Type2">SCS Type II</option>
                            <option value="SCS_Type3">SCS Type III</option>
                            <option value="AlternatingBlock">Alternating Block</option>
                          </select>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label htmlFor="duration" className="text-xs font-medium text-text-secondary">Duration (hrs)</label>
                          <input 
                            id="duration"
                            type="number" 
                            step="0.5"
                            value={duration} 
                            title="Duration in hours"
                            onChange={(e) => setDuration(Number(e.target.value))}
                            className="w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-sm text-text-primary"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label htmlFor="total-depth" className="text-xs font-medium text-text-secondary">Total Depth (mm)</label>
                          <input 
                            id="total-depth"
                            type="number" 
                            value={totalDepth} 
                            title="Total depth in mm"
                            onChange={(e) => setTotalDepth(Number(e.target.value))}
                            className="w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-2 text-sm text-text-primary"
                          />
                        </div>
                      </div>

                      {type === 'DesignStorm' && method === 'Chicago' && (
                        <div className="p-3 bg-bg-primary/50 border border-border-subtle rounded-md space-y-3 animate-in fade-in duration-300">
                          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">IDF Coefficients</span>
                          <div className="grid grid-cols-3 gap-2">
                             <div className="space-y-1">
                               <label htmlFor="coeff-a" className="text-[10px] text-text-secondary italic">a</label>
                               <input id="coeff-a" type="number" title="IDF constant a" value={chicagoA} onChange={(e) => setChicagoA(Number(e.target.value))} className="w-full bg-bg-primary border border-border-subtle rounded px-2 py-1 text-xs text-text-primary" />
                             </div>
                             <div className="space-y-1">
                               <label htmlFor="coeff-b" className="text-[10px] text-text-secondary italic">b</label>
                               <input id="coeff-b" type="number" title="IDF constant b" value={chicagoB} onChange={(e) => setChicagoB(Number(e.target.value))} className="w-full bg-bg-primary border border-border-subtle rounded px-2 py-1 text-xs text-text-primary" />
                             </div>
                             <div className="space-y-1">
                               <label htmlFor="coeff-c" className="text-[10px] text-text-secondary italic">c</label>
                               <input id="coeff-c" type="number" title="IDF exponent c" value={chicagoC} onChange={(e) => setChicagoC(Number(e.target.value))} className="w-full bg-bg-primary border border-border-subtle rounded px-2 py-1 text-xs text-text-primary" />
                             </div>
                          </div>
                          <div className="space-y-1">
                             <label htmlFor="peak-ratio" className="text-[10px] opacity-70">Peak Ratio (r)</label>
                             <input id="peak-ratio" type="range" title="Peak ratio r" min="0.1" max="0.9" step="0.05" value={peakRatio} onChange={(e) => setPeakRatio(Number(e.target.value))} className="w-full" />
                             <div className="flex justify-between text-[10px] text-text-secondary">
                               <span>Early</span>
                               <span className="font-bold">{peakRatio}</span>
                               <span>Late</span>
                             </div>
                          </div>
                        </div>
                      )}

                      <button 
                        onClick={handleGenerate}
                        title="Generate Hyetograph"
                        className="w-full flex items-center justify-center gap-2 p-3 bg-accent/10 hover:bg-accent/20 border border-accent/30 rounded-md transition-all text-sm font-semibold text-accent mt-6"
                      >
                        <Settings2 size={16} /> Update Hyetograph
                      </button>
                    </div>
                  </div>

                  {/* Chart and Preview */}
                  <div className="flex-1 flex flex-col p-6 min-h-0">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-2">
                        <BarChart3 size={14} /> Hyetograph Preview
                      </h3>
                      <div className="flex gap-4 text-xs">
                        <div className="flex flex-col">
                          <span className="text-text-secondary">Total Depth</span>
                          <span className="font-bold text-accent">{selectedEvent.totalDepth.toFixed(1)} mm</span>
                        </div>
                        <div className="flex flex-col border-l border-border-subtle pl-4">
                          <span className="text-text-secondary">Peak Intensity</span>
                          <span className="font-bold text-text-primary">{selectedEvent.peakIntensity.toFixed(1)} mm/hr</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 bg-bg-primary/50 border border-border-subtle rounded-xl p-4 min-h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={selectedEvent.data}>
                          <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.5}/>
                              <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                          <XAxis
                            dataKey="time"
                            stroke="var(--color-text-secondary)"
                            fontSize={10}
                            tickFormatter={(v) => `${v.toFixed(1)}h`}
                            label={{ value: 'Time (hours)', position: 'insideBottom', offset: -5, fontSize: 10, fill: 'var(--color-text-secondary)' }}
                          />
                          <YAxis
                            stroke="var(--color-text-secondary)"
                            fontSize={10}
                            label={{ value: 'Intensity (mm/hr)', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'var(--color-text-secondary)' }}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)', borderRadius: '8px', fontSize: '12px' }}
                            itemStyle={{ color: 'var(--color-accent)' }}
                          />
                          <Area
                            type="stepAfter"
                            dataKey="value"
                            stroke="var(--color-accent)"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorValue)"
                            name="Intensity"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-3">
                       <button 
                        onClick={() => setActiveRainfallEvent(selectedEvent.id)}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
                          activeRainfallEventId === selectedEvent.id
                          ? 'bg-accent/10 text-accent border border-accent/30 cursor-default'
                          : 'bg-accent text-bg-primary hover:bg-accent-hover active:scale-95'
                        }`}
                       >
                         {activeRainfallEventId === selectedEvent.id ? (
                           <><Check size={18} /> Active Environment</>
                         ) : (
                           'Set as Active'
                         )}
                       </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center opacity-30">
                <CloudRain size={64} className="mb-4" />
                <p className="text-lg">Select a rainfall event to edit</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
