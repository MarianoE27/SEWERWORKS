import React, { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { GitCommit, GitPullRequest, Users, Activity } from 'lucide-react';
import { formatNumber } from '../lib/utils';
import { ColumnDef } from '@tanstack/react-table';
import { ProTable } from './ui/ProTable';
import { useTranslation } from 'react-i18next';

interface DesignPanelProps {
  mode?: 'docked' | 'floating' | 'popout';
}

export function DesignAportesPanel({ mode = 'docked' }: DesignPanelProps) {
  const { t } = useTranslation();
  const { parameters, nodes, conduits, updateNode, updateConduit } = useStore();
  const [activeTab, setActiveTab] = useState<'conductos' | 'camaras'>('conductos');

  const nodeList = Object.values(nodes);
  const conduitList = Object.values(conduits);

  const totalContributingLength = conduitList.reduce((sum, c) => {
    const sidewalks = c.contributingSidewalks !== undefined ? c.contributingSidewalks : 2;
    return sum + (c.length || 0) * sidewalks;
  }, 0);
  const linearDensity = totalContributingLength > 0 ? parameters.population0 / totalContributingLength : 0;

  const conduitAportesColumns = useMemo<ColumnDef<any>[]>(() => [
    { accessorKey: 'name', header: t('aportes.cols_conduits.conduit', 'Conducto'), size: 130, cell: info => <span className="font-semibold text-accent">{info.getValue() as string}</span> },
    { accessorKey: 'length', header: t('aportes.cols_conduits.length_real', 'L real (m)'), size: 120, cell: info => <span className="font-mono text-text-primary">{formatNumber(info.getValue() as number, 2)}</span> },
    { 
      accessorKey: 'contributingSidewalks', 
      header: t('aportes.cols_conduits.sidewalks', 'Veredas Aportantes'), 
      size: 180,
      cell: info => {
        const c = info.row.original;
        const sidewalks = c.contributingSidewalks !== undefined ? c.contributingSidewalks : 2;
        return (
          <select 
            value={sidewalks}
            onChange={(e) => updateConduit(c.id, { contributingSidewalks: Number(e.target.value) as 0|1|2 })}
            className="h-6 w-full bg-black/50 border border-white/10 rounded px-1.5 text-[11px] text-text-primary focus:outline-none focus:border-accent transition-all cursor-pointer font-mono"
          >
            <option value={0}>{t('aportes.cols_conduits.sidewalks_0', '0 Veredas')}</option>
            <option value={1}>{t('aportes.cols_conduits.sidewalks_1', '1 Vereda')}</option>
            <option value={2}>{t('aportes.cols_conduits.sidewalks_2', '2 Veredas (Doble)')}</option>
          </select>
        );
      }
    },
    {
      id: 'lAporte',
      header: t('aportes.cols_conduits.length_aporte', 'L aporte (m)'),
      size: 130,
      cell: info => {
        const c = info.row.original;
        const sidewalks = c.contributingSidewalks !== undefined ? c.contributingSidewalks : 2;
        const lengthReal = c.length || 0;
        return <span className="font-bold text-accent font-mono">{formatNumber(lengthReal * sidewalks, 2)}</span>;
      }
    }
  ], [updateConduit, t]);

  const nodeAportesColumns = useMemo<ColumnDef<any>[]>(() => [
    { accessorKey: 'name', header: t('aportes.cols_nodes.node', 'Cámara'), size: 130, cell: info => <span className="font-semibold text-accent">{info.getValue() as string}</span> },
    { 
      accessorKey: 'pointFlow', 
      header: t('aportes.cols_nodes.point_flow', 'Caudal Puntual (L/s)'), 
      size: 180,
      cell: info => {
        const n = info.row.original;
        return (
          <input 
            type="number"
            step="0.01"
            min="0"
            value={n.pointFlow !== undefined ? n.pointFlow : ''}
            placeholder="0.00"
            onChange={(e) => updateNode(n.id, { pointFlow: e.target.value === '' ? undefined : Number(e.target.value) })}
            className="h-6 w-24 bg-black/50 border border-white/10 rounded px-1.5 text-[11px] text-right text-text-primary font-mono focus:outline-none focus:border-accent transition-all"
          />
        );
      }
    },
    {
      id: 'inflow',
      header: t('aportes.cols_nodes.total_inflow', 'Q Diseño Total (L/s)'),
      size: 180,
      cell: info => {
        const n = info.row.original;
        return <span className="font-bold text-accent font-mono">{n.inflow !== undefined ? formatNumber(n.inflow, 3) : '-'}</span>;
      }
    }
  ], [updateNode, t]);

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden p-2 gap-2 select-none">
      
      {/* Barra de Estado CAD (Reemplazo ultracompacto de las dos tarjetas de KPI gigantes) */}
      <div className="bg-black/40 border border-white/10 rounded-md px-2.5 py-1.5 flex items-center justify-between shrink-0 text-[11px]">
        <div className="flex items-center gap-1.5 min-w-0" title={t('aportes.kpi_pop', 'Población Base Total')}>
          <Users size={13} className="text-blue-400 shrink-0" />
          <span className="text-text-secondary/80 font-medium truncate">{t('aportes.kpi_pop', 'Población')}:</span>
          <span className="font-mono font-bold text-text-primary shrink-0">{formatNumber(parameters.population0, 0)} <span className="text-[9px] font-normal text-text-secondary/60">hab</span></span>
        </div>

        <div className="h-3 w-[1px] bg-white/10 mx-2 shrink-0" />

        <div className="flex items-center gap-1.5 min-w-0" title={t('aportes.kpi_density', 'Densidad Poblacional')}>
          <Activity size={13} className="text-accent shrink-0" />
          <span className="text-text-secondary/80 font-medium truncate">{t('aportes.kpi_density', 'Densidad')}:</span>
          <span className="font-mono font-bold text-accent shrink-0">{formatNumber(linearDensity, 2)} <span className="text-[9px] font-normal text-accent/70">hab/m</span></span>
        </div>
      </div>

      {/* Navegación de Pestañas estilo CAD */}
      <div className="flex items-center gap-1 bg-black/30 border border-white/10 p-0.5 rounded shrink-0">
        <button
          className={`flex-1 py-1 px-2 flex items-center justify-center gap-1.5 rounded text-[10px] uppercase tracking-wider font-bold transition-all ${activeTab === 'conductos' ? 'bg-accent/15 text-accent border border-accent/30 shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}
          onClick={() => setActiveTab('conductos')}
        >
          <GitCommit size={13} />
          <span className="truncate">{t('aportes.conduit_table_header', 'Aporte por Conducto')}</span>
        </button>
        <button
          className={`flex-1 py-1 px-2 flex items-center justify-center gap-1.5 rounded text-[10px] uppercase tracking-wider font-bold transition-all ${activeTab === 'camaras' ? 'bg-accent/15 text-accent border border-accent/30 shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}
          onClick={() => setActiveTab('camaras')}
        >
          <GitPullRequest size={13} />
          <span className="truncate">{t('aportes.node_table_header', 'Caudales Puntuales')}</span>
        </button>
      </div>

      <div className="flex-1 min-h-0 relative">
        {/* Conductos Tab */}
        {activeTab === 'conductos' && (
          <div className="absolute inset-0 bg-white/[0.015] border border-white/[0.06] rounded-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex-1 overflow-hidden">
              <ProTable data={conduitList} columns={conduitAportesColumns} stickyFirstColumn={true} />
            </div>
          </div>
        )}

        {/* Cámaras Tab */}
        {activeTab === 'camaras' && (
          <div className="absolute inset-0 bg-white/[0.015] border border-white/[0.06] rounded-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex-1 overflow-hidden">
              <ProTable data={nodeList} columns={nodeAportesColumns} stickyFirstColumn={true} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
