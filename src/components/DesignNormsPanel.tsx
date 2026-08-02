import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';

function validateField(field: string, value: number, t: any): string {
  switch (field) {
    case 'manningN': return value <= 0 || value > 0.1 ? t('norms.validation.manning_error', 'Rango típico: 0.009–0.05') : '';
    case 'minCover': return value <= 0 ? t('norms.validation.positive', 'Debe ser > 0') : '';
    case 'maxCover': return value <= 0 ? t('norms.validation.positive', 'Debe ser > 0') : '';
    case 'maxManholeDistance': return value <= 0 ? t('norms.validation.positive', 'Debe ser > 0') : '';
    case 'minDropForBackdrop': return value < 0 ? t('norms.validation.non_negative', 'Debe ser ≥ 0') : '';
    case 'maxHRatio': return value <= 0 || value > 1 ? t('norms.validation.range_0_1', 'Rango: 0–1') : '';
    case 'minTractiveForce': return value <= 0 ? t('norms.validation.positive', 'Debe ser > 0') : '';
    case 'minVelocity': return value <= 0 ? t('norms.validation.positive', 'Debe ser > 0') : '';
    case 'maxVelocity': return value <= 0 ? t('norms.validation.positive', 'Debe ser > 0') : '';
    default: return '';
  }
}

interface DesignPanelProps {
  mode?: 'docked' | 'floating' | 'popout';
}

export function DesignNormsPanel({ mode = 'docked' }: DesignPanelProps) {
  const { t } = useTranslation();
  const { parameters, updateParameters } = useStore();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: any) => {
    const err = typeof value === 'number' ? validateField(field, value, t) : '';
    setFieldErrors(prev => ({ ...prev, [field]: err }));
    updateParameters({ [field]: value } as any);
  };

  const isDocked = mode === 'docked';

  const renderCADField = (field: string, label: string, value: any, step: string = "0.1", title?: string) => {
    const hasError = !!fieldErrors[field];
    return (
      <div className="flex items-center justify-between gap-2 py-0.5 min-w-0" title={title || label}>
        <span className="text-[10px] tracking-tight font-medium truncate text-text-secondary/90">
          {label}
        </span>
        <div className="flex flex-col items-end shrink-0">
          <input
            type="number"
            step={step}
            value={value}
            onChange={(e) => handleChange(field, Number(e.target.value))}
            className={`w-20 h-6 bg-black/50 border rounded px-1.5 text-[11px] text-right font-mono focus:outline-none focus:ring-1 transition-all ${
              hasError
                ? 'border-red-500 text-red-400 focus:ring-red-500/30'
                : 'border-white/10 text-text-primary focus:border-accent focus:ring-accent/30 hover:border-white/20'
            }`}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden select-none">
      <div className="flex-1 overflow-y-auto p-2.5 custom-scrollbar">
        <div className={`flex flex-col gap-2.5 ${!isDocked ? 'max-w-4xl mx-auto' : ''}`}>
          
          <section className="bg-white/[0.015] border border-white/[0.06] rounded-md p-2.5 relative">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-accent/40 via-accent/10 to-transparent" />
            <div className="flex items-center justify-between mb-2 pb-1 border-b border-white/5">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                <span className="w-1 h-2.5 rounded-full bg-accent inline-block" />
                {t('norms.title', 'Restricciones y Criterios de Diseño')}
              </h3>
              <span className="text-[8px] font-mono uppercase bg-white/5 text-text-secondary/70 px-1.5 py-0.5 rounded border border-white/10">Normativa ENOHSA</span>
            </div>
            
            <div className={`grid gap-x-4 gap-y-1 ${isDocked ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {renderCADField('minCover', t('norms.min_cover', 'Tapada Mínima (m)'), parameters.minCover, "0.1", t('norms.min_cover_desc', 'Tapada mínima requerida al lomo del tubo'))}
              {renderCADField('maxCover', t('norms.max_cover', 'Tapada Máxima (m)'), parameters.maxCover, "0.1")}
              {renderCADField('maxManholeDistance', t('norms.max_manhole_distance', 'Dist. Máx. Bocas (m)'), parameters.maxManholeDistance, "1")}
              {renderCADField('minDropForBackdrop', t('norms.min_drop', 'Salto Mín. Cañería (m)'), parameters.minDropForBackdrop, "0.1")}
              {renderCADField('maxHRatio', t('norms.max_h_ratio', 'Relación h/D Máxima'), parameters.maxHRatio, "0.05")}
              {renderCADField('minTractiveForce', t('norms.min_tractive_force', 'Fuerza Tractiva Mín (kg/m²)'), parameters.minTractiveForce, "0.01")}
              {renderCADField('minVelocity', t('norms.min_velocity', 'Velocidad Mínima (m/s)'), parameters.minVelocity, "0.1")}
              {renderCADField('maxVelocity', t('norms.max_velocity', 'Velocidad Máxima (m/s)'), parameters.maxVelocity, "0.1")}
              <div className="col-span-2 sm:col-span-1">
                {renderCADField('manningN', t('norms.manning', 'Coef. Manning (n)'), parameters.manningN, "0.001", t('norms.manning_desc', 'Coeficiente de rugosidad de Manning'))}
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
