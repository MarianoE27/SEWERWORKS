import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { useTranslation } from 'react-i18next';

function validateField(field: string, value: number, t: any): string {
  switch (field) {
    case 'population0': return value < 0 ? t('hydrology.validation.positive', 'Debe ser >= 0') : '';
    case 'population10': return value < 0 ? t('hydrology.validation.positive', 'Debe ser >= 0') : '';
    case 'population20': return value < 0 ? t('hydrology.validation.positive', 'Debe ser >= 0') : '';
    case 'dotation': return value <= 0 ? t('hydrology.validation.positive', 'Debe ser > 0') : '';
    case 'returnRate': return value <= 0 || value > 1 ? t('hydrology.validation.range_0_1', 'Rango: 0–1') : '';
    case 'alpha1': return value < 1 || value > 3 ? t('hydrology.validation.range_enohsa', 'Rango ENOHSA: 1–3') : '';
    case 'alpha2': return value < 1 || value > 3 ? t('hydrology.validation.range_enohsa', 'Rango ENOHSA: 1–3') : '';
    case 'alpha3': return value < 1 || value > 3 ? t('hydrology.validation.range_enohsa', 'Rango ENOHSA: 1–3') : '';
    case 'beta1': return value <= 0 || value > 1 ? t('hydrology.validation.range_0_1', 'Rango: 0–1') : '';
    case 'beta2': return value <= 0 || value > 1 ? t('hydrology.validation.range_0_1', 'Rango: 0–1') : '';
    case 'infiltrationRate': return value < 0 ? t('hydrology.validation.non_negative', 'Debe ser ≥ 0') : '';
    default: return '';
  }
}

interface DesignPanelProps {
  mode?: 'docked' | 'floating' | 'popout';
}

export function DesignHydrologyPanel({ mode = 'docked' }: DesignPanelProps) {
  const { t } = useTranslation();
  const { parameters, updateParameters } = useStore();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: any) => {
    const err = typeof value === 'number' ? validateField(field, value, t) : '';
    setFieldErrors(prev => ({ ...prev, [field]: err }));
    
    const newParams = { [field]: value } as any;
    if (['alpha1', 'alpha2', 'alpha3'].includes(field)) {
      const a1 = field === 'alpha1' ? value : parameters.alpha1;
      const a2 = field === 'alpha2' ? value : parameters.alpha2;
      const a3 = field === 'alpha3' ? value : parameters.alpha3;
      newParams.babbittCoefficient = Number((a1 * a2 * a3).toFixed(2));
    }
    updateParameters(newParams);
  };

  const isDocked = mode === 'docked';

  const renderCADField = (field: string, label: string, value: any, step: string = "1", title?: string, isAccent: boolean = false) => {
    const hasError = !!fieldErrors[field];
    return (
      <div className="flex items-center justify-between gap-2 py-0.5 min-w-0" title={title || label}>
        <span className={`text-[10px] tracking-tight font-medium truncate ${isAccent ? 'text-accent font-semibold' : 'text-text-secondary/90'}`}>
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
                : isAccent
                ? 'border-accent/40 text-accent font-bold focus:border-accent focus:ring-accent/30 bg-accent/5'
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
          
          {/* Variables Hidrológicas */}
          <section className="bg-white/[0.015] border border-white/[0.06] rounded-md p-2.5 relative">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-accent/40 via-accent/10 to-transparent" />
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5 mb-2 pb-1 border-b border-white/5">
              <span className="w-1 h-2.5 rounded-full bg-accent inline-block" />
              {t('hydrology.variables', 'Variables Hidrológicas')}
            </h3>
            
            <div className={`grid gap-x-4 gap-y-1 ${isDocked ? 'grid-cols-2' : 'grid-cols-3 lg:grid-cols-4'}`}>
              {renderCADField('population0', t('hydrology.population0', 'Población Año 0'), parameters.population0, "1")}
              {renderCADField('population10', t('hydrology.population10', 'Población Año 10'), parameters.population10, "1")}
              {renderCADField('population20', t('hydrology.population20', 'Población Año 20'), parameters.population20, "1")}
              {renderCADField('dotation', t('hydrology.dotation', 'Dotación (L/hab/d)'), parameters.dotation, "5")}
              {renderCADField('returnRate', t('hydrology.return_rate', 'Coef. Retorno (C)'), parameters.returnRate, "0.01")}
              {renderCADField('infiltrationRate', t('hydrology.infiltration', 'Infiltración (L/s/km)'), parameters.infiltrationRate, "0.01")}
              {renderCADField('industrialCoefficient', t('hydrology.industrial', 'Coef. Industrial'), parameters.industrialCoefficient, "0.01")}
            </div>
          </section>

          {/* Coeficientes de Pico y Minoración */}
          <section className="bg-white/[0.015] border border-white/[0.06] rounded-md p-2.5 relative">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-accent/40 via-accent/10 to-transparent" />
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5 mb-2 pb-1 border-b border-white/5">
              <span className="w-1 h-2.5 rounded-full bg-accent inline-block" />
              {t('hydrology.peak_title', 'Coeficientes de Pico y Minoración (ENOHSA)')}
            </h3>
            
            <div className={`grid gap-x-4 gap-y-1 ${isDocked ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {renderCADField('alpha1', t('hydrology.alpha1', 'α1 (Pico Diario)'), parameters.alpha1, "0.05", t('hydrology.alpha1_desc', 'Coeficiente de pico diario'))}
              {renderCADField('alpha2', t('hydrology.alpha2', 'α2 (Pico Horario)'), parameters.alpha2, "0.05", t('hydrology.alpha2_desc', 'Coeficiente de pico horario'))}
              {renderCADField('alpha3', t('hydrology.alpha3', 'α3 (Seguridad)'), parameters.alpha3, "0.05", t('hydrology.alpha3_desc', 'Tercer coeficiente de pico'))}
              {renderCADField('beta1', t('hydrology.beta1', 'β1 (Min. Diaria)'), parameters.beta1, "0.05", t('hydrology.beta1_desc', 'Coeficiente de minoración diario'))}
              {renderCADField('beta2', t('hydrology.beta2', 'β2 (Min. Horaria)'), parameters.beta2, "0.05", t('hydrology.beta2_desc', 'Coeficiente de minoración horario'))}
              {renderCADField('babbittCoefficient', t('hydrology.total_peak', 'Pico Total (M)'), parameters.babbittCoefficient, "0.01", t('hydrology.total_peak_desc', 'Coeficiente de Pico Total'), true)}
            </div>
          </section>

          {/* Fórmulas de Caudales — Ultra compact CAD table */}
          <section className="bg-black/30 border border-white/[0.06] rounded-md p-2">
            <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-white/5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-text-secondary">
                {t('hydrology.formulas_title', 'Caudales de Diseño (Fórmulas)')}
              </span>
              <span className="text-[8px] font-mono uppercase bg-white/5 text-text-secondary/70 px-1 rounded border border-white/10">ENOHSA</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[9px]">
              <div className="flex justify-between items-center py-0.5 border-b border-white/[0.02]">
                <span className="text-text-primary/70">{t('hydrology.qa_desc', 'Qa (Mín. Horario)')}</span>
                <span className="text-accent/90 bg-accent/5 px-1 rounded">Qc × β1 × β2 + Qinf</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-white/[0.02]">
                <span className="text-text-primary/70">{t('hydrology.qb_desc', 'Qb (Mín. Diario)')}</span>
                <span className="text-accent/90 bg-accent/5 px-1 rounded">Qc × β1 + Qinf</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-white/[0.02]">
                <span className="text-text-primary/70">{t('hydrology.qc_desc', 'Qc (Medio)')}</span>
                <span className="text-accent/90 bg-accent/5 px-1 rounded">Qc + Qinf</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-white/[0.02]">
                <span className="text-text-primary/70">{t('hydrology.qd_desc', 'Qd (Máx. Diario)')}</span>
                <span className="text-accent/90 bg-accent/5 px-1 rounded">Qc × α1 + Qinf</span>
              </div>
              <div className="col-span-2 flex justify-between items-center pt-0.5 mt-0.5 border-t border-accent/20">
                <span className="text-accent font-bold tracking-tight">{t('hydrology.qe_desc', 'Qe (Máx. Horario de Diseño)')}</span>
                <span className="text-accent bg-accent/15 px-1.5 py-0.5 rounded font-bold border border-accent/30 shadow-sm">Qc × M + Qinf</span>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
