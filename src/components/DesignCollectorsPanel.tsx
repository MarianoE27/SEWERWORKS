import React, { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Layers } from 'lucide-react';
import { formatNumber } from '../lib/utils';
import { ColumnDef } from '@tanstack/react-table';
import { ProTable } from './ui/ProTable';
import { useTranslation } from 'react-i18next';

interface DesignPanelProps {
  mode?: 'docked' | 'floating' | 'popout';
}

export function DesignCollectorsPanel({ mode = 'docked' }: DesignPanelProps) {
  const { t } = useTranslation();
  const { parameters, updateParameters, conduits } = useStore();
  const conduitList = Object.values(conduits);

  const handleChange = (field: string, value: any) => {
    updateParameters({ [field]: value } as any);
  };

  const collectorsColumns = useMemo<ColumnDef<any>[]>(() => [
    { accessorKey: 'name', header: t('collectors.cols.conduit', 'Conducto'), size: 130, cell: info => <span className="font-semibold text-accent">{info.getValue() as string}</span> },
    { accessorKey: 'dn', header: t('collectors.cols.dn', 'DN (mm)'), size: 100, cell: info => <span className="font-mono text-text-primary">{info.getValue() ?? '-'}</span> },
    { 
      accessorKey: 'coverIn', 
      header: t('collectors.cols.cover_in', 'Tapada Ini (m)'), 
      size: 120, 
      cell: info => <span className="font-mono text-text-secondary">{info.getValue() !== undefined ? formatNumber(info.getValue() as number, 2) : '-'}</span> 
    },
    { 
      accessorKey: 'coverOut', 
      header: t('collectors.cols.cover_out', 'Tapada Fin (m)'), 
      size: 120, 
      cell: info => <span className="font-mono text-text-secondary">{info.getValue() !== undefined ? formatNumber(info.getValue() as number, 2) : '-'}</span> 
    },
    {
      id: 'motivo',
      header: t('collectors.cols.reason', 'Motivo'),
      size: 200,
      cell: info => {
        const c = info.row.original;
        const byDN = c.dn !== undefined && c.dn >= parameters.collectorMinDN;
        const byCover = (c.coverIn !== undefined && c.coverIn > parameters.collectorMaxCover) ||
                        (c.coverOut !== undefined && c.coverOut > parameters.collectorMaxCover);
        const motivos = [];
        if (byDN) motivos.push(`DN ≥ ${parameters.collectorMinDN} mm`);
        if (byCover) motivos.push(`${t('results.conduits.coverIn', 'Tapada')} > ${parameters.collectorMaxCover} m`);
        return <span className="text-[10px] text-text-secondary">{motivos.join(' / ')}</span>;
      }
    }
  ], [parameters.collectorMinDN, parameters.collectorMaxCover, t]);

  const collectorList = conduitList.filter(c =>
    (c.dn !== undefined && c.dn >= parameters.collectorMinDN) ||
    (c.coverIn !== undefined && c.coverIn > parameters.collectorMaxCover) ||
    (c.coverOut !== undefined && c.coverOut > parameters.collectorMaxCover)
  );

  const renderCADField = (field: string, label: string, value: any, step: string = "5") => (
    <div className="flex items-center justify-between gap-2 py-0.5 min-w-0">
      <span className="text-[10px] tracking-tight font-medium truncate text-text-secondary/90">
        {label}
      </span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => handleChange(field, Number(e.target.value))}
        className="w-20 h-6 bg-black/50 border border-white/10 rounded px-1.5 text-[11px] text-right font-mono text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
      />
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden select-none">
      <div className="flex-1 overflow-y-auto p-2.5 custom-scrollbar flex flex-col gap-2.5">
        
        {/* Criterios — CAD style 1 row */}
        <section className="bg-white/[0.015] border border-white/[0.06] rounded-md p-2.5 shrink-0 relative">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-accent/40 via-accent/10 to-transparent" />
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5 mb-1.5 pb-1 border-b border-white/5">
            <span className="w-1 h-2.5 rounded-full bg-accent inline-block" />
            {t('collectors.title', 'Criterios de Colector')}
          </h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {renderCADField('collectorMinDN', t('collectors.min_dn', 'DN Mínimo (mm)'), parameters.collectorMinDN, "5")}
            {renderCADField('collectorMaxCover', t('collectors.max_cover_label', 'Tapada Máx (m)'), parameters.collectorMaxCover, "0.1")}
          </div>
        </section>

        {/* Lista de colectores */}
        <div className="bg-white/[0.015] border border-white/[0.06] rounded-md flex flex-col flex-1 min-h-[160px] relative overflow-hidden">
          <div className="p-2 border-b border-white/5 shrink-0 flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-text-primary flex items-center gap-1.5 tracking-wider uppercase">
              <Layers size={13} className="text-accent" />
              {t('collectors.table_header', 'Conductos Clasificados')}
            </h3>
            <span className="text-[9px] bg-accent/10 text-accent border border-accent/20 rounded px-1.5 py-0.5 font-bold uppercase tracking-wider">
              {t(collectorList.length === 1 ? 'collectors.kpi_unit' : 'collectors.kpi_unit_plural', { count: collectorList.length })}
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <ProTable data={collectorList} columns={collectorsColumns} stickyFirstColumn={true} />
          </div>
        </div>

      </div>
    </div>
  );
}
