import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { formatNumber } from '../lib/utils';
import { Download, AlertTriangle, XCircle, Info, Search, Maximize2, Minimize2, X, ExternalLink } from 'lucide-react';
import { exportConduitsCSV, exportNodesCSV } from '../lib/exportCSV';
import { toLatLon } from '../lib/proj';
import L from 'leaflet';
import { ColumnDef } from '@tanstack/react-table';
import { ProTable } from './ui/ProTable';
import { useTranslation } from 'react-i18next';

interface WarningEntry {
  id: string;
  element: string;
  type: string;
  severity: 'warning' | 'error';
  messages: string[];
}

export function ResultsTable() {
  const { t } = useTranslation();
  const { nodes, conduits, activeMainTab, selectElement, setZoomBounds, crs, resultsMode, setResultsMode, setIsResultsFloatingOpen, setBottomPanelOpen, setActiveBottomTab } = useStore(useShallow(s => ({
    nodes: s.nodes, conduits: s.conduits, activeMainTab: s.activeMainTab, selectElement: s.selectElement, setZoomBounds: s.setZoomBounds, crs: s.crs, resultsMode: s.resultsMode, setResultsMode: s.setResultsMode, setIsResultsFloatingOpen: s.setIsResultsFloatingOpen, setBottomPanelOpen: s.setBottomPanelOpen, setActiveBottomTab: s.setActiveBottomTab
  })));
  const [activeTab, setActiveTab] = useState<'conduits' | 'nodes' | 'warnings'>('conduits');
  const [searchQuery, setSearchQuery] = useState('');

  const handleRowClick = (id: string, type: 'node' | 'conduit') => {
    selectElement(id, type);
    
    // Zoom and pan to the element
    if (type === 'conduit') {
      const c = conduits[id];
      if (c) {
        const nFrom = nodes[c.from];
        const nTo = nodes[c.to];
        if (nFrom && nTo) {
          const latLonFrom = toLatLon(nFrom.x, nFrom.y, crs);
          const latLonTo = toLatLon(nTo.x, nTo.y, crs);
          const bounds = L.latLngBounds([latLonFrom, latLonTo]);
          setZoomBounds(bounds);
        }
      }
    } else if (type === 'node') {
      const n = nodes[id];
      if (n) {
        const latLon = toLatLon(n.x, n.y, crs);
        // Zoom closely to the node
        const bounds = L.latLng([latLon[0], latLon[1]]).toBounds(80); // 80 meter radius bounds
        setZoomBounds(bounds);
      }
    }
  };

  const filteredConduitList = useMemo(() => {
    let list = Object.values(conduits);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => 
        c.name.toLowerCase().includes(q) || 
        (nodes[c.from]?.name || '').toLowerCase().includes(q) || 
        (nodes[c.to]?.name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [conduits, nodes, searchQuery]);

  const filteredNodeList = useMemo(() => {
    let list = Object.values(nodes);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(n => n.name.toLowerCase().includes(q));
    }
    return list;
  }, [nodes, searchQuery]);

  const conduitColumns = React.useMemo<ColumnDef<any>[]>(() => [
    { accessorKey: 'name', header: t('results.conduits.name', 'Nombre'), size: 100, cell: info => <span className="font-bold text-text-primary">{info.getValue() as string}</span> },
    { id: 'from', header: t('results.conduits.from', 'Desde'), size: 100, accessorFn: row => nodes[row.from]?.name || row.from, cell: info => <span className="text-text-secondary">{info.getValue() as string}</span> },
    { id: 'to', header: t('results.conduits.to', 'Hasta'), size: 100, accessorFn: row => nodes[row.to]?.name || row.to, cell: info => <span className="text-text-secondary">{info.getValue() as string}</span> },
    { accessorKey: 'length', header: t('results.conduits.length', 'Long (m)'), size: 80, cell: info => <span className="font-mono text-text-secondary">{formatNumber(info.getValue() as number, 2)}</span> },
    { accessorKey: 'dn', header: t('results.conduits.dn', 'DN (mm)'), size: 80, cell: info => <span className="font-mono text-text-secondary">{info.getValue() ?? '-'}</span> },
    { accessorKey: 'slope', header: t('results.conduits.slope', 'Pend (‰)'), size: 80, cell: info => <span className="font-mono text-text-secondary">{formatNumber(info.getValue() as number, 2)}</span> },
    { accessorKey: 'invertIn', header: t('results.conduits.invertIn', 'Cota In (m)'), size: 90, cell: info => <span className="font-mono text-text-secondary">{formatNumber(info.getValue() as number, 3)}</span> },
    { accessorKey: 'invertOut', header: t('results.conduits.invertOut', 'Cota Out (m)'), size: 90, cell: info => <span className="font-mono text-text-secondary">{formatNumber(info.getValue() as number, 3)}</span> },
    { accessorKey: 'coverIn', header: t('results.conduits.coverIn', 'Tap In (m)'), size: 90, cell: info => <span className="font-mono text-text-secondary">{formatNumber(info.getValue() as number, 2)}</span> },
    { accessorKey: 'coverOut', header: t('results.conduits.coverOut', 'Tap Out (m)'), size: 90, cell: info => <span className="font-mono text-text-secondary">{formatNumber(info.getValue() as number, 2)}</span> },
    { accessorKey: 'qAporte', header: t('results.conduits.qAporte', 'Q Aporte (L/s)'), size: 110, cell: info => <span className="font-mono text-text-secondary">{formatNumber(info.getValue() as number, 2)}</span> },
    { accessorKey: 'qInfiltration', header: t('results.conduits.qInfiltration', 'Q Inf'), size: 80, cell: info => <span className="font-mono text-text-secondary">{formatNumber(info.getValue() as number, 2)}</span> },
    { accessorKey: 'qUpstream', header: t('results.conduits.qUpstream', 'Q Ag.Arr'), size: 90, cell: info => <span className="font-mono text-text-secondary">{formatNumber(info.getValue() as number, 2)}</span> },
    { accessorKey: 'ql0', header: t('results.conduits.ql0', 'Ql0 (Ini)'), size: 90, cell: info => <span className="font-mono text-blue-300">{formatNumber(info.getValue() as number, 2)}</span> },
    { accessorKey: 'qe10', header: t('results.conduits.qe10', 'QE10 (10a)'), size: 90, cell: info => <span className="font-mono text-orange-300">{formatNumber(info.getValue() as number, 2)}</span> },
    { accessorKey: 'qe20', header: t('results.conduits.qe20', 'QE20 (20a)'), size: 90, cell: info => <span className="font-mono text-accent">{formatNumber(info.getValue() as number, 2)}</span> },
    { accessorKey: 'velocity0', header: t('results.conduits.velocity0', 'V0 (m/s)'), size: 80, cell: info => <span className="font-mono text-blue-300">{formatNumber(info.getValue() as number, 2)}</span> },
    { accessorKey: 'tractiveForce0', header: t('results.conduits.tractiveForce0', 'T0 (kg/m²)'), size: 90, cell: info => <span className="font-mono text-blue-300">{formatNumber(info.getValue() as number, 3)}</span> },
    { accessorKey: 'hRatio0', header: t('results.conduits.hRatio0', 'h/D0'), size: 80, cell: info => <span className="font-mono text-blue-300">{formatNumber(info.getValue() as number, 3)}</span> },
    { accessorKey: 'velocity', header: t('results.conduits.velocity', 'V (m/s)'), size: 80, cell: info => <span className="font-mono text-text-secondary">{formatNumber(info.getValue() as number, 2)}</span> },
    { accessorKey: 'hRatio', header: t('results.conduits.hRatio', 'h/D'), size: 80, cell: info => <span className="font-mono text-text-secondary">{formatNumber(info.getValue() as number, 3)}</span> },
    { accessorKey: 'flowDepth', header: t('results.conduits.flowDepth', 'Tirante'), size: 90, cell: info => <span className="font-mono text-text-secondary">{formatNumber(info.getValue() as number, 3)}</span> },
    { 
      accessorKey: 'state', 
      header: t('results.conduits.state', 'Estado'), 
      size: 100, 
      cell: info => {
        const state = info.getValue() as string;
        return (
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            state === 'ok' ? 'bg-accent/15 text-accent border border-accent/20' :
            state === 'warning' ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20' :
            state === 'error' ? 'bg-red-400/10 text-red-400 border border-red-400/20' : 'bg-bg-hover text-text-secondary border border-border-subtle'
          }`}>
            {state?.toUpperCase() || 'N/A'}
          </span>
        );
      } 
    }
  ], [nodes, t]);

  const nodeColumns = React.useMemo<ColumnDef<any>[]>(() => [
    { accessorKey: 'name', header: t('results.nodes.name', 'Nombre'), size: 100, cell: info => <span className="font-bold text-text-primary">{info.getValue() as string}</span> },
    { accessorKey: 'x', header: t('results.nodes.x', 'X'), size: 100, cell: info => <span className="font-mono text-text-secondary">{formatNumber(info.getValue() as number, 2)}</span> },
    { accessorKey: 'y', header: t('results.nodes.y', 'Y'), size: 100, cell: info => <span className="font-mono text-text-secondary">{formatNumber(info.getValue() as number, 2)}</span> },
    { accessorKey: 'ctn', header: t('results.nodes.ctn', 'CTN (m)'), size: 90, cell: info => <span className="font-mono text-text-secondary">{formatNumber(info.getValue() as number, 3)}</span> },
    { accessorKey: 'invert', header: t('results.nodes.invert', 'Cota Fondo'), size: 90, cell: info => <span className="font-mono text-text-secondary">{formatNumber(info.getValue() as number, 3)}</span> },
    { accessorKey: 'depth', header: t('results.nodes.depth', 'Prof (m)'), size: 90, cell: info => <span className="font-mono text-text-secondary">{formatNumber(info.getValue() as number, 2)}</span> },
    { accessorKey: 'drop', header: t('results.nodes.drop', 'Salto (m)'), size: 90, cell: info => <span className="font-mono text-text-secondary">{formatNumber(info.getValue() as number, 3)}</span> },
    { 
      accessorKey: 'hasDropPipe', 
      header: t('results.nodes.drop_pipe', 'Tubo Salto'), 
      size: 90, 
      cell: info => info.getValue() ? <span className="px-1.5 py-0.5 bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 rounded text-[10px] font-bold">SI</span> : <span className="text-text-secondary text-[11px] font-medium">-</span>
    },
    { accessorKey: 'inflow', header: t('results.nodes.inflow', 'Q Ingreso'), size: 90, cell: info => <span className="font-mono text-text-secondary">{formatNumber(info.getValue() as number, 2)}</span> },
    { 
      accessorKey: 'state', 
      header: t('results.nodes.state', 'Estado'), 
      size: 100, 
      cell: info => {
        const state = info.getValue() as string;
        return (
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            state === 'ok' ? 'bg-accent/15 text-accent border border-accent/20' :
            state === 'warning' ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20' :
            state === 'error' ? 'bg-red-400/10 text-red-400 border border-red-400/20' : 'bg-bg-hover text-text-secondary border border-border-subtle'
          }`}>
            {state?.toUpperCase() || 'N/A'}
          </span>
        );
      } 
    }
  ], [t]);

  const warningColumns = React.useMemo<ColumnDef<WarningEntry>[]>(() => [
    { 
      id: 'icon', 
      header: '', 
      size: 40, 
      cell: info => info.row.original.severity === 'error' ? <XCircle size={14} className="text-red-400" /> : <AlertTriangle size={14} className="text-yellow-400" />
    },
    { accessorKey: 'element', header: t('results.warnings_cols.element', 'Elemento'), size: 100, cell: info => <span className="font-bold text-text-primary">{info.getValue() as string}</span> },
    { 
      accessorKey: 'type', 
      header: t('results.warnings_cols.type', 'Tipo'), 
      size: 100,
      cell: info => {
        const tVal = info.getValue() as string;
        return <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${tVal === t('results.warnings_types.conduit', 'Conducto') ? 'bg-sky-500/10 text-sky-400 border border-sky-500/15' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/15'}`}>{tVal}</span>;
      }
    },
    { 
      accessorKey: 'severity', 
      header: t('results.warnings_cols.severity', 'Severidad'), 
      size: 100,
      cell: info => {
        const sev = info.getValue() as string;
        return <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${sev === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/15' : 'bg-accent/10 text-accent border border-accent/15'}`}>{sev === 'error' ? 'ERROR' : 'WARNING'}</span>;
      }
    },
    { 
      accessorKey: 'messages', 
      header: t('results.warnings_cols.detail', 'Detalle de advertencias'), 
      size: 400,
      cell: info => {
        const msgs = info.getValue() as string[];
        const sev = info.row.original.severity;
        return (
          <ul className="space-y-1">
            {msgs.map((msg, j) => (
              <li key={j} className="flex items-start gap-1.5 whitespace-normal leading-tight min-w-0 pr-2">
                <span className={`mt-[3px] w-1 h-1 rounded-full shrink-0 ${sev === 'error' ? 'bg-red-400' : 'bg-yellow-400'}`}></span>
                <span className="text-text-secondary text-[11px] font-medium break-words">{msg}</span>
              </li>
            ))}
          </ul>
        );
      }
    }
  ], [t]);

  const warnings = useMemo(() => {
    const entries: WarningEntry[] = [];

    // Conduit warnings/errors
    Object.values(conduits).forEach(c => {
      if (c.state !== 'warning' && c.state !== 'error') return;
      const msgs: string[] = [];

      if (c.errorMessage) {
        c.errorMessage.split(' | ').forEach(m => msgs.push(m));
      }

      if (msgs.length > 0) {
        entries.push({
          id: c.id,
          element: c.name,
          type: t('results.warnings_types.conduit', 'Conducto'),
          severity: c.state as 'warning' | 'error',
          messages: msgs,
        });
      }
    });

    // Node warnings/errors
    Object.values(nodes).forEach(n => {
      if (n.state !== 'warning' && n.state !== 'error') return;
      const msgs: string[] = [];

      if (n.errorMessage) {
        n.errorMessage.split(' | ').forEach(m => msgs.push(m));
      } else {
        msgs.push(n.state === 'error' ? t('results.warnings_types.unknown_error', 'Error desconocido en la cámara') : t('results.warnings_types.design_warning', 'Advertencia de diseño en la cámara'));
      }

      if (msgs.length > 0) {
        entries.push({
          id: n.id,
          element: n.name,
          type: t('results.warnings_types.node', 'Cámara'),
          severity: n.state as 'warning' | 'error',
          messages: msgs,
        });
      }
    });

    // Filter warnings
    let filtered = entries;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = entries.filter(w => 
        w.element.toLowerCase().includes(q) || 
        w.messages.some(m => m.toLowerCase().includes(q))
      );
    }

    // Sort: errors first, then warnings
    filtered.sort((a, b) => {
      if (a.severity === 'error' && b.severity !== 'error') return -1;
      if (a.severity !== 'error' && b.severity === 'error') return 1;
      return a.element.localeCompare(b.element);
    });

    return filtered;
  }, [conduits, nodes, searchQuery, t]);

  const errorCount = useMemo(() => {
    return Object.values(conduits).filter(c => c.state === 'error').length + 
           Object.values(nodes).filter(n => n.state === 'error').length;
  }, [conduits, nodes]);

  const warningCount = useMemo(() => {
    return Object.values(conduits).filter(c => c.state === 'warning').length + 
           Object.values(nodes).filter(n => n.state === 'warning').length;
  }, [conduits, nodes]);

  const exportCSV = () => {
    let csvString = '';

    if (activeTab === 'conduits') {
      csvString = exportConduitsCSV(conduits, nodes);
    } else if (activeTab === 'nodes') {
      csvString = exportNodesCSV(nodes);
    } else {
      const headers = [t('results.warnings_cols.element', 'Elemento'), t('results.warnings_cols.type', 'Tipo'), t('results.warnings_cols.severity', 'Severidad'), t('results.warnings_cols.detail', 'Advertencias')];
      csvString = '\uFEFF' + headers.join(';') + '\r\n';
      warnings.forEach(w => {
        const row = [
          w.element,
          w.type,
          w.severity === 'error' ? 'ERROR' : 'WARNING',
          `"${w.messages.join('; ')}"`
        ].join(';');
        csvString += row + '\r\n';
      });
    }

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `resultados_${activeTab}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full h-full bg-bg-primary flex flex-col font-sans">
      {/* Compact h-11 Header */}
      <div className="h-11 border-b border-border-subtle flex items-center px-4 justify-between bg-bg-primary shadow-sm select-none">
        <div className="flex space-x-4 h-full items-center">
          <button
            className={`h-full flex items-center cursor-pointer border-b-2 font-semibold text-[10px] tracking-wider uppercase transition-colors pt-0.5 focus:outline-none ${activeTab === 'conduits' ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
            onClick={() => { setActiveTab('conduits'); }}
            data-results-tab="conduits"
          >
            {t('results.tab_conduits', 'Conductos')}
          </button>
          <button
            className={`h-full flex items-center cursor-pointer border-b-2 font-semibold text-[10px] tracking-wider uppercase transition-colors pt-0.5 focus:outline-none ${activeTab === 'nodes' ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
            onClick={() => { setActiveTab('nodes'); }}
            data-results-tab="nodes"
          >
            {t('results.tab_nodes', 'Cámaras')}
          </button>
          <button
            className={`h-full flex items-center cursor-pointer border-b-2 font-semibold text-[10px] tracking-wider uppercase transition-colors pt-0.5 gap-1.5 focus:outline-none ${activeTab === 'warnings' ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
            onClick={() => { setActiveTab('warnings'); }}
            data-results-tab="warnings"
          >
            <span>{t('results.tab_warnings', 'Advertencias')}</span>
            {(errorCount + warningCount) > 0 && (
              <span className={`px-1.5 py-0.5 rounded font-bold text-[9px] ${
                errorCount > 0 ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 'bg-accent/20 text-accent border border-accent/20'
              }`}>
                {errorCount + warningCount}
              </span>
            )}
          </button>
        </div>

        {/* Search Input and Export */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center">
            <Search size={12} className="absolute left-2.5 text-text-secondary" />
            <input
              type="text"
              placeholder={t('results.search_placeholder', 'Buscar...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-bg-surface border border-border-subtle focus:border-accent/80 rounded-md pl-7 pr-2.5 py-1 text-[10px] text-text-primary placeholder:text-text-secondary/50 focus:outline-none w-44 transition"
            />
          </div>
          <button
            onClick={exportCSV}
            className="h-7 flex items-center gap-1.5 px-3 bg-accent hover:opacity-90 text-white font-bold text-[10px] tracking-wider uppercase rounded-md transition-all shadow-sm cursor-pointer"
            data-csv-btn="true"
          >
            <Download size={12} className="shrink-0" />
            <span>{t('results.export_csv', 'Exportar CSV')}</span>
          </button>
          
          <div className="w-px h-6 bg-border-subtle mx-1"></div>
          
          {resultsMode === 'docked' ? (
            <>
              <button
                onClick={() => {
                  setResultsMode('floating');
                  setIsResultsFloatingOpen(true);
                  setActiveBottomTab('console');
                }}
                className="p-1.5 text-text-secondary hover:text-accent hover:bg-bg-hover rounded transition-colors"
                title={t('results.floating_title', 'Desacoplar a ventana flotante en el navegador')}
              >
                <Maximize2 size={14} />
              </button>
              <button
                onClick={() => {
                  setResultsMode('popout');
                  setIsResultsFloatingOpen(true);
                  setActiveBottomTab('console');
                }}
                className="p-1.5 text-text-secondary hover:text-accent hover:bg-bg-hover rounded transition-colors"
                title={t('results.popout_title', 'Abrir en una ventana independiente (Multi-Monitor)')}
              >
                <ExternalLink size={14} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setResultsMode('docked');
                  setIsResultsFloatingOpen(false);
                  setBottomPanelOpen(true);
                  setActiveBottomTab('results');
                }}
                className="p-1.5 text-text-secondary hover:text-accent hover:bg-bg-hover rounded transition-colors"
                title={t('results.docked_title', 'Acoplar a la consola inferior')}
              >
                <Minimize2 size={14} />
              </button>
              {resultsMode === 'floating' && (
                <button
                  onClick={() => {
                    setResultsMode('popout');
                    setIsResultsFloatingOpen(true);
                  }}
                  className="p-1.5 text-text-secondary hover:text-accent hover:bg-bg-hover rounded transition-colors"
                  title={t('results.popout_title', 'Abrir en una ventana independiente (Multi-Monitor)')}
                >
                  <ExternalLink size={14} />
                </button>
              )}
              <button
                onClick={() => setIsResultsFloatingOpen(false)}
                className="p-1.5 text-text-secondary hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                title={t('results.close_title', 'Cerrar ventana')}
              >
                <X size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 custom-scrollbar">
        {activeTab === 'warnings' ? (
          <div className="space-y-4">
            {/* Summary cards with subtle borders */}
            <div className="flex gap-4 select-none">
              <div className="flex-1 flex items-center gap-3 bg-bg-surface border border-border-subtle rounded-xl px-4 py-2.5 shadow-sm">
                <XCircle size={18} className="text-red-400 shrink-0" />
                <div>
                  <div className="text-xl font-bold text-red-400 font-mono leading-none">{errorCount}</div>
                  <div className="text-[10px] uppercase font-semibold tracking-wider text-text-secondary mt-1">{t('results.errors', 'Errores')}</div>
                </div>
              </div>
              <div className="flex-1 flex items-center gap-3 bg-bg-surface border border-border-subtle rounded-xl px-4 py-2.5 shadow-sm">
                <AlertTriangle size={18} className="text-yellow-400 shrink-0" />
                <div>
                  <div className="text-xl font-bold text-yellow-400 font-mono leading-none">{warningCount}</div>
                  <div className="text-[10px] uppercase font-semibold tracking-wider text-text-secondary mt-1">{t('results.warnings', 'Advertencias')}</div>
                </div>
              </div>
              <div className="flex-1 flex items-center gap-3 bg-bg-surface border border-border-subtle rounded-xl px-4 py-2.5 shadow-sm">
                <Info size={18} className="text-text-secondary shrink-0" />
                <div>
                  <div className="text-xl font-bold text-text-primary font-mono leading-none">{Object.keys(conduits).length + Object.keys(nodes).length}</div>
                  <div className="text-[10px] uppercase font-semibold tracking-wider text-text-secondary mt-1">{t('results.total_elements', 'Elementos Totales')}</div>
                </div>
              </div>
            </div>

            {warnings.length === 0 ? (
              <div className="bg-bg-surface border border-border-subtle rounded-xl p-8 text-center shadow-sm select-none">
                <div className="text-green-400 text-3xl mb-2">&#10003;</div>
                <h3 className="text-text-primary font-semibold text-sm uppercase tracking-wide">{t('results.no_warnings', 'Sin advertencias ni errores')}</h3>
                <p className="text-text-secondary text-xs mt-1">{t('results.no_warnings_desc', 'Todos los elementos de la red cumplen con los criterios de diseño.')}</p>
              </div>
            ) : (
              <div className="flex-1 overflow-hidden bg-bg-surface border border-border-subtle rounded-xl shadow-sm">
                <ProTable 
                  data={warnings} 
                  columns={warningColumns} 
                  stickyFirstColumn={false}
                  onRowClick={(row: any) => handleRowClick(row.id, row.type === t('results.warnings_types.node', 'Cámara') ? 'node' : 'conduit')}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-hidden bg-bg-surface border border-border-subtle rounded-xl shadow-sm">
            <ProTable 
              data={activeTab === 'conduits' ? filteredConduitList : filteredNodeList} 
              columns={activeTab === 'conduits' ? conduitColumns : nodeColumns} 
              stickyFirstColumn={true}
              onRowClick={(row: any) => handleRowClick(row.id, activeTab === 'conduits' ? 'conduit' : 'node')}
            />
          </div>
        )}
      </div>
    </div>
  );
}
