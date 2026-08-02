import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Save, Clock, Activity, Zap } from 'lucide-react';
import { useStore } from '../store';
import { Section } from './ui/Section';
import { Select } from './ui/Select';
import { Input } from './ui/Input';

interface SimulationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SimulationSettingsModal: React.FC<SimulationSettingsModalProps> = ({ isOpen, onClose }) => {
  const { simulationSettings, updateSimulationSettings } = useStore();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-bg-surface border border-border-subtle rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-bg-hover/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 text-accent rounded-lg">
                <Settings size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-text-primary">Simulation Settings</h2>
                <p className="text-xs text-text-secondary">Configure hydraulic routing and simulation parameters</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-bg-hover rounded-lg transition-colors text-text-secondary"
              title="Close Settings"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Routing Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2 text-accent">
                  <Activity size={16} />
                  <h3 className="text-sm font-semibold uppercase tracking-wider">Routing & Method</h3>
                </div>
                
                <Select
                  label="Routing Method"
                  value={simulationSettings.routingMethod}
                  onChange={(v) => updateSimulationSettings({ routingMethod: v as any })}
                  options={['Steady', 'Kinematic_Wave', 'Dynamic_Wave']}
                  optionLabels={['Steady Flow', 'Kinematic Wave', 'Dynamic Wave']}
                />

                <Select
                  label="Inertial Damping"
                  value={simulationSettings.inertialDamping}
                  onChange={(v) => updateSimulationSettings({ inertialDamping: v as any })}
                  options={['None', 'Partial', 'Full']}
                />

                <div className="flex items-center gap-3 p-3 bg-bg-hover rounded-lg border border-border-subtle">
                  <input
                    id="allow-surcharge"
                    type="checkbox"
                    checked={simulationSettings.allowSurcharge}
                    onChange={(e) => updateSimulationSettings({ allowSurcharge: e.target.checked })}
                    className="w-4 h-4 rounded border-border-subtle text-accent focus:ring-accent bg-bg-surface"
                  />
                  <label htmlFor="allow-surcharge" className="text-sm font-medium text-text-primary cursor-pointer">
                    Allow Junction Surcharge
                  </label>
                </div>
              </div>

              {/* Time Steps Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2 text-amber-400">
                  <Clock size={16} />
                  <h3 className="text-sm font-semibold uppercase tracking-wider">Time Steps (Seconds)</h3>
                </div>

                <Input
                  label="Routing Step"
                  type="number"
                  value={simulationSettings.routingStep.toString()}
                  onChange={(e) => updateSimulationSettings({ routingStep: parseInt(e.target.value) || 30 })}
                />

                <Input
                  label="Runoff Step"
                  type="number"
                  value={simulationSettings.runoffStep.toString()}
                  onChange={(e) => updateSimulationSettings({ runoffStep: parseInt(e.target.value) || 300 })}
                />

                <Input
                  label="Reporting Step"
                  type="number"
                  value={simulationSettings.reportingStep.toString()}
                  onChange={(e) => updateSimulationSettings({ reportingStep: parseInt(e.target.value) || 300 })}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border-subtle">
              <div className="flex items-center gap-2 mb-4 text-emerald-400">
                <Zap size={16} />
                <h3 className="text-sm font-semibold uppercase tracking-wider">Simulation Duration</h3>
              </div>
              <div className="max-w-xs">
                <Input
                  label="Duration (Hours)"
                  type="number"
                  value={simulationSettings.duration.toString()}
                  onChange={(e) => updateSimulationSettings({ duration: parseFloat(e.target.value) || 6 })}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border-subtle bg-bg-primary/90 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-6 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-bold shadow-lg shadow-accent/20 transition-all hover:scale-105"
            >
              <Save size={18} />
              Save Configuration
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
