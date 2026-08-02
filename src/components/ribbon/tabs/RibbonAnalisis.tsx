import React from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../../store/useStore';
import {
  Droplets, Calculator, BookOpen, Database, Layers, Play, ShieldCheck, RefreshCw, CloudDownload
} from 'lucide-react';
import { RibbonGroup } from '../RibbonGroup';
import { RibbonButton } from '../RibbonButton';
import { RibbonDropdownSelect } from '../RibbonDropdownSelect';

export function RibbonAnalisis() {
  const { t } = useTranslation();
  const {
    nodes, conduits, parameters, updateParameters, addLog, calculateNetwork,
    isFetchingElevation, fetchMissingElevations,
    setIsAnalysisPanelOpen, setActiveAnalysisTab
  } = useStore();

  const handleValidateNetwork = () => {
    const errors: string[] = [];
    const nodeIds = Object.keys(nodes);
    const conduitList = Object.values(conduits);
    
    if (nodeIds.length === 0) errors.push("No hay nodos en la red.");
    if (conduitList.length === 0) errors.push("No hay tuberías en la red.");
    
    // Disconnected nodes check
    nodeIds.forEach(id => {
      const hasConduit = conduitList.some(c => c.from === id || c.to === id);
      if (!hasConduit) errors.push(`Cámara ${nodes[id].name} desconectada.`);
    });

    if (errors.length === 0) {
      addLog("[Validación] La red es topológicamente correcta. Lista para calcular.");
      alert("La red es topológicamente correcta y está lista para calcular.");
    } else {
      addLog(`[Validación] Encontrados ${errors.length} problemas.`);
      errors.forEach(e => addLog(`  [Problema] ${e}`));
      alert(`Validación fallida: Encontrados ${errors.length} problemas. Ver consola de registro para más detalles.`);
    }
  };

  return (
    <div className="flex items-center h-full gap-0.5 min-w-max">
      {/* Configuración Group */}
      <RibbonGroup label={t('ribbon.groups.config_red')}>
        <RibbonButton
          icon={Droplets}
          label={t('ribbon.buttons.hidrologia')}
          onClick={() => { setIsAnalysisPanelOpen(true); setActiveAnalysisTab('hydrology'); }}
          subtitle={t('ribbon.subtitles.hidrologia')}
        />
        <RibbonButton
          icon={Calculator}
          label={t('ribbon.buttons.aportes')}
          onClick={() => { setIsAnalysisPanelOpen(true); setActiveAnalysisTab('aportes'); }}
          subtitle={t('ribbon.subtitles.aportes')}
        />
        <RibbonButton
          icon={BookOpen}
          label={t('ribbon.buttons.normativa')}
          onClick={() => { setIsAnalysisPanelOpen(true); setActiveAnalysisTab('norms'); }}
          subtitle={t('ribbon.subtitles.normativa')}
        />
        <RibbonButton
          icon={Database}
          label={t('ribbon.buttons.catalogo')}
          onClick={() => { setIsAnalysisPanelOpen(true); setActiveAnalysisTab('catalog'); }}
          subtitle={t('ribbon.subtitles.catalogo')}
        />
        <RibbonButton
          icon={Layers}
          label={t('ribbon.buttons.colectores')}
          onClick={() => { setIsAnalysisPanelOpen(true); setActiveAnalysisTab('collectors'); }}
          subtitle={t('ribbon.subtitles.colectores')}
        />
      </RibbonGroup>

      {/* Cálculo Group */}
      <RibbonGroup label={t('ribbon.groups.calculo')}>
        <RibbonButton
          icon={Play}
          label={t('ribbon.buttons.calcular')}
          onClick={calculateNetwork}
          subtitle={t('ribbon.subtitles.calcular')}
        />
        <RibbonButton
          icon={ShieldCheck}
          label={t('ribbon.buttons.validar')}
          onClick={handleValidateNetwork}
          subtitle={t('ribbon.subtitles.validar')}
        />
        <RibbonButton
          icon={RefreshCw}
          label={t('ribbon.buttons.recalcular')}
          onClick={() => {
            calculateNetwork();
            addLog("[Recálculo] Forzado recálculo completo de la red.");
          }}
          subtitle={t('ribbon.subtitles.recalcular')}
        />
      </RibbonGroup>

      {/* Altimetría Group */}
      <RibbonGroup label={t('ribbon.groups.altimetria')}>
        <div className="flex items-center gap-1.5 px-1.5 h-7 bg-bg-surface border border-border-subtle/30 rounded focus-within:border-accent/40 transition-colors">
          <span className="text-[8px] uppercase tracking-wider text-text-secondary/60 font-bold whitespace-nowrap pl-1 select-none">
            Proveedor:
          </span>
          <RibbonDropdownSelect
            value={parameters.elevationProvider || 'none'}
            onChange={(val) => updateParameters({ elevationProvider: val as any })}
            options={[
              { value: 'none', label: 'Desactivado' },
              { value: 'open_meteo', label: 'Open-Meteo' },
              { value: 'opentopodata_srtm30m', label: 'OpenTopoData SRTM 30m' },
              { value: 'opentopodata_eudem25m', label: 'OpenTopoData EU-DEM 25m' },
              { value: 'opentopodata_aster30m', label: 'OpenTopoData ASTER 30m' },
              { value: 'opentopodata_mapzen', label: 'OpenTopoData Mapzen' },
              { value: 'open_elevation', label: 'Open-Elevation' },
              { value: 'custom', label: 'API Custom' }
            ]}
            className="h-full w-40"
          />
        </div>
        <div className="w-px h-6 bg-border-subtle/30 mx-1"></div>
        <RibbonButton
          icon={CloudDownload}
          label={t('ribbon.buttons.obtener_cotas')}
          onClick={fetchMissingElevations}
          disabled={parameters.elevationProvider === 'none' || isFetchingElevation}
          subtitle={t('ribbon.subtitles.obtener_cotas')}
        />
      </RibbonGroup>
    </div>
  );
}

export default RibbonAnalisis;
