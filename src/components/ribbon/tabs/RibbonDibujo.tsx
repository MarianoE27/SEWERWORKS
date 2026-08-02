import React from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../../store/useStore';
import {
  MousePointer2, Hand, Maximize, CircleDot, Route, Move, Trash2, Undo2, Redo2,
  Ruler, ArrowRightLeft, BoxSelect
} from 'lucide-react';
import { RibbonGroup } from '../RibbonGroup';
import { RibbonButton } from '../RibbonButton';

export function RibbonDibujo() {
  const { t } = useTranslation();
  const {
    activeTool, setTool, triggerZoomToFit, measureToolActive, setMeasureToolActive,
    measureMode, setMeasureMode, undo, redo, history, future
  } = useStore();

  return (
    <div className="flex items-center h-full gap-0.5 min-w-max">
      {/* Selección Group */}
      <RibbonGroup label={t('ribbon.groups.seleccion')}>
        <RibbonButton
          icon={MousePointer2}
          label={t('ribbon.buttons.seleccionar')}
          isActive={activeTool === 'select'}
          onClick={() => setTool('select')}
          subtitle={t('ribbon.subtitles.seleccionar')}
        />
        <RibbonButton
          icon={Hand}
          label={t('ribbon.buttons.pan')}
          isActive={activeTool === 'pan'}
          onClick={() => setTool('pan')}
          subtitle={t('ribbon.subtitles.pan')}
        />
        <RibbonButton
          icon={Maximize}
          label={t('ribbon.buttons.ajustar')}
          onClick={triggerZoomToFit}
          subtitle={t('ribbon.subtitles.ajustar')}
        />
      </RibbonGroup>

      {/* Insertar Group */}
      <RibbonGroup label={t('ribbon.groups.insertar')}>
        <RibbonButton
          icon={CircleDot}
          label={t('ribbon.buttons.camara')}
          isActive={activeTool === 'node'}
          onClick={() => setTool('node')}
          subtitle={t('ribbon.subtitles.camara')}
        />
        <RibbonButton
          icon={Route}
          label={t('ribbon.buttons.tuberia')}
          isActive={activeTool === 'conduit'}
          onClick={() => setTool('conduit')}
          subtitle={t('ribbon.subtitles.tuberia')}
        />
      </RibbonGroup>

      {/* Edición Group */}
      <RibbonGroup label={t('ribbon.groups.edicion')}>
        <RibbonButton
          icon={Move}
          label={t('ribbon.buttons.mover')}
          isActive={activeTool === 'edit'}
          onClick={() => setTool('edit')}
          subtitle={t('ribbon.subtitles.mover')}
        />
        <RibbonButton
          icon={Trash2}
          label={t('ribbon.buttons.eliminar')}
          isActive={activeTool === 'delete'}
          onClick={() => setTool('delete')}
          isDanger
          subtitle={t('ribbon.subtitles.eliminar')}
        />
        <div className="w-px h-6 bg-border-subtle/30 mx-1"></div>
        <RibbonButton
          icon={Undo2}
          label={t('ribbon.buttons.deshacer')}
          onClick={undo}
          disabled={history.length === 0}
          subtitle={t('ribbon.subtitles.deshacer')}
        />
        <RibbonButton
          icon={Redo2}
          label={t('ribbon.buttons.rehacer')}
          onClick={redo}
          disabled={future.length === 0}
          subtitle={t('ribbon.subtitles.rehacer')}
        />
      </RibbonGroup>

      {/* Herramientas de Medición Group */}
      <RibbonGroup label={t('ribbon.groups.medicion')}>
        <RibbonButton
          icon={Ruler}
          label={t('ribbon.buttons.medir')}
          isActive={measureToolActive}
          onClick={() => setMeasureToolActive(!measureToolActive)}
          subtitle={t('ribbon.subtitles.medir')}
        />
        {measureToolActive && (
          <>
            <div className="w-px h-6 bg-border-subtle/30 mx-1"></div>
            <RibbonButton
              icon={ArrowRightLeft}
              label={t('ribbon.buttons.distancia')}
              isActive={measureMode === 'Distance'}
              onClick={() => setMeasureMode('Distance')}
              subtitle={t('ribbon.subtitles.distancia')}
            />
            <RibbonButton
              icon={BoxSelect}
              label={t('ribbon.buttons.area')}
              isActive={measureMode === 'Area'}
              onClick={() => setMeasureMode('Area')}
              subtitle={t('ribbon.subtitles.area')}
            />
          </>
        )}
      </RibbonGroup>
    </div>
  );
}

export default RibbonDibujo;
