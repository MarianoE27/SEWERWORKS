import React, { useState, useMemo } from 'react';
import { Globe, Search, X, Check } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Modal } from './ui/Modal';
import { PROJECTIONS, ProjectionDef } from '../lib/projections';
import { loadCRS } from '../lib/proj';
import { useTranslation } from 'react-i18next';

interface ProjectionPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectionPanel: React.FC<ProjectionPanelProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { crs, setCRS, addLog } = useStore();
  const [search, setSearch] = useState('');
  const [customEpsg, setCustomEpsg] = useState('');
  const [loadingCrs, setLoadingCrs] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return PROJECTIONS;
    return PROJECTIONS.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      (p.region ?? '').toLowerCase().includes(q)
    );
  }, [search]);

  const byRegion = useMemo(() => {
    const groups: Record<string, ProjectionDef[]> = {};
    filtered.forEach(p => {
      const r = p.region ?? 'Otros';
      if (!groups[r]) groups[r] = [];
      groups[r].push(p);
    });
    return groups;
  }, [filtered]);

  const handleSelect = (code: string) => {
    setCRS(code);
    addLog(`${t('crs.changed', '[CRS] Sistema de coordenadas cambiado a ')}${code}`);
    onClose();
  };

  const handleLoadCustomCRS = async () => {
    if (!customEpsg) return;
    const code = customEpsg.toUpperCase().startsWith('EPSG:') ? customEpsg.toUpperCase() : `EPSG:${customEpsg}`;
    setLoadingCrs(true);
    const success = await loadCRS(code);
    setLoadingCrs(false);
    if (success) {
      setCRS(code);
      setCustomEpsg('');
      addLog(`${t('crs.loaded_custom', '[CRS] Sistema de coordenadas personalizado cargado: ')}${code}`);
      onClose();
    } else {
      addLog(t('crs.load_error', { code, defaultValue: `[CRS] Error: No se pudo cargar ${code}. Verifique el código EPSG.` }));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('crs.title', 'Sistema de Coordenadas (CRS)')}
      icon={<Globe size={18} className="text-accent" />}
      maxWidth="max-w-[560px]"
    >
      <div className="flex flex-col max-h-[60vh]">
        {/* Description */}
        <div className="px-4 py-2 text-[10px] text-text-secondary bg-bg-primary/30 border-b border-border-subtle leading-relaxed">
          {t('crs.desc', 'Seleccione el sistema de referencia de coordenadas del proyecto. Las coordenadas de todos los elementos se almacenan en este CRS.')}
        </div>

        {/* Current CRS badge */}
        <div className="px-4 py-2 border-b border-border-subtle bg-bg-surface/20">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-text-secondary text-[11px]">{t('crs.current', 'CRS actual:')}</span>
            <span className="px-2 py-0.5 bg-accent/15 text-accent border border-accent/20 rounded font-mono text-[10px] font-bold tracking-wide">{crs}</span>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b border-border-subtle bg-bg-surface/10">
          <div className="flex items-center gap-2 bg-bg-primary border border-border-subtle rounded px-2 h-7">
            <Search size={12} className="text-text-secondary shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('crs.search_placeholder', 'Buscar por nombre o código EPSG...')}
              className="bg-transparent text-xs text-text-primary flex-1 outline-none placeholder:text-text-secondary"
              autoFocus
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-text-secondary hover:text-text-primary">
                <X size={10} />
              </button>
            )}
          </div>
        </div>

        {/* Projection List */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {Object.entries(byRegion).map(([region, projs]) => (
            <div key={region} className="mb-3">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-text-secondary px-2 mb-1">
                {region}
              </div>
              {(projs as ProjectionDef[]).map(proj => {
                const isSelected = proj.code === crs;
                return (
                  <button
                    key={proj.code}
                    onClick={() => handleSelect(proj.code)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded text-left transition-colors text-xs mb-0.5 ${
                      isSelected
                        ? 'bg-accent/15 text-accent border border-accent/20'
                        : 'text-text-primary hover:bg-bg-hover hover:text-text-primary border border-transparent'
                    }`}
                  >
                    <div>
                      <span className="font-medium text-[11px]">{proj.name}</span>
                      <span className="ml-2 text-text-secondary font-mono text-[9px]">{proj.code}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${proj.unit === 'metre' ? 'bg-accent/10 text-accent border border-accent/10' : 'bg-sky-500/10 text-sky-400 border border-sky-500/10'}`}>
                        {proj.unit === 'metre' ? 'm' : '°'}
                      </span>
                      {isSelected && <Check size={12} className="text-accent" />}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center text-text-secondary py-8 text-xs">
              {t('crs.no_results', 'No se encontraron proyecciones.')}
            </div>
          )}
        </div>

        {/* Custom EPSG */}
        <div className="px-4 py-3 border-t border-border-subtle bg-bg-surface/30">
          <div className="text-[9px] text-text-secondary mb-1 font-semibold uppercase tracking-wider">{t('crs.custom_title', 'Código EPSG personalizado')}</div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder={t('crs.custom_placeholder', 'Ej: 32722')}
              value={customEpsg}
              onChange={(e) => setCustomEpsg(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLoadCustomCRS()}
              className="flex-1 h-7 bg-bg-primary border border-border-subtle rounded px-2.5 text-xs text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
            />
            <button
              onClick={handleLoadCustomCRS}
              disabled={loadingCrs || !customEpsg}
              className="h-7 px-3.5 bg-accent hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs rounded font-bold uppercase tracking-wider transition-all"
            >
              {loadingCrs ? '...' : t('crs.load', 'Cargar')}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
