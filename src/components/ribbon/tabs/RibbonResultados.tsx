import React from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../../store/useStore';
import {
  TableProperties, TrendingUp, FileText, FileSpreadsheet
} from 'lucide-react';
import { RibbonGroup } from '../RibbonGroup';
import { RibbonButton } from '../RibbonButton';
import { useExportHandlers } from '../useExportHandlers';
import { RibbonDropdownSelect } from '../RibbonDropdownSelect';

export function RibbonResultados() {
  const { t } = useTranslation();
  const {
    conduitVisualizationMode, setConduitVisualizationMode, layers, setLayerVisibility
  } = useStore();

  const { handleExportCSV } = useExportHandlers();

  return (
    <div className="flex items-center h-full gap-0.5 min-w-max">
      {/* Tablas Group */}
      <RibbonGroup label={t('ribbon.groups.resultados')}>
        <RibbonButton
          icon={TableProperties}
          label={t('ribbon.buttons.tablas')}
          onClick={() => {
            useStore.getState().setBottomPanelOpen(true);
            useStore.getState().setActiveBottomTab('results');
          }}
          subtitle={t('ribbon.subtitles.tablas')}
        />
      </RibbonGroup>

      {/* Visualización / Estilos Group */}
      <RibbonGroup label={t('ribbon.groups.estilos')}>
        <div className="flex items-center gap-1.5 px-1.5 h-7 bg-bg-surface border border-border-subtle/30 rounded focus-within:border-accent/40 transition-colors">
          <span className="text-[8px] uppercase tracking-wider text-text-secondary/60 font-bold whitespace-nowrap pl-1 select-none">
            {t('ribbon.estilos.colorear_por') || "Colorear Por:"}
          </span>
          <RibbonDropdownSelect
            value={conduitVisualizationMode}
            onChange={(val) => setConduitVisualizationMode(val as any)}
            options={[
              { value: 'state', label: t('ribbon.estilos.alertas') || "Alertas" },
              { value: 'hRatio', label: t('ribbon.estilos.llenado') || "Llenado h/D" },
              { value: 'diameter', label: t('ribbon.estilos.diametros') || "Diámetros" },
              { value: 'cover', label: t('ribbon.estilos.tapadas') || "Tapadas" }
            ]}
            className="h-full w-28"
          />
        </div>

        <div className="w-px h-6 bg-border-subtle/30 mx-1"></div>

        <div className="flex items-center gap-4 px-2">
          <label className="flex items-center gap-2 cursor-pointer group select-none">
            <input
              type="checkbox"
              checked={layers.labels}
              onChange={() => setLayerVisibility('labels', !layers.labels)}
              className="ribbon-checkbox"
            />
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary group-hover:text-text-primary transition-colors">
              {t('ribbon.estilos.cotas') || "Cotas"}
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer group select-none">
            <input
              type="checkbox"
              checked={layers.flowArrows}
              onChange={() => setLayerVisibility('flowArrows', !layers.flowArrows)}
              className="ribbon-checkbox"
            />
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary group-hover:text-text-primary transition-colors">
              {t('ribbon.estilos.flechas') || "Flechas"}
            </span>
          </label>
        </div>
      </RibbonGroup>

      {/* Perfil Group */}
      <RibbonGroup label={t('ribbon.groups.perfiles')}>
        <RibbonButton
          icon={TrendingUp}
          label={t('ribbon.buttons.perfil')}
          onClick={() => {
            useStore.getState().setBottomPanelOpen(true);
            useStore.getState().setActiveBottomTab('profile');
            useStore.getState().addLog("[Perfil] Seleccione un tramo o use el explorador de red para generar perfiles.");
          }}
          subtitle={t('ribbon.subtitles.perfil')}
        />
      </RibbonGroup>

      {/* Exportar Group */}
      <RibbonGroup label={t('ribbon.groups.exportar')}>
        <RibbonButton
          icon={FileText}
          label={t('ribbon.buttons.pdf')}
          onClick={() => useStore.getState().setReportOpen(true)}
          subtitle={t('ribbon.subtitles.pdf')}
        />
        <RibbonButton
          icon={FileSpreadsheet}
          label={t('ribbon.buttons.csv')}
          onClick={handleExportCSV}
          subtitle={t('ribbon.subtitles.csv')}
        />
      </RibbonGroup>
    </div>
  );
}

export default RibbonResultados;
