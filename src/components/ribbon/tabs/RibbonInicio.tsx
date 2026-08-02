import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../../store/useStore';
import {
  FilePlus2, FolderOpen, Save, Share, ClipboardList,
  Shapes, Mountain, Layers, ArrowDownToLine, FileBox, FileImage, Terminal
} from 'lucide-react';
import { RibbonGroup } from '../RibbonGroup';
import { RibbonButton } from '../RibbonButton';
import { RibbonFileInput } from '../RibbonFileInput';
import { RibbonDropdownSelect } from '../RibbonDropdownSelect';
import { useExportHandlers } from '../useExportHandlers';
import { loadVectorFiles, loadDEM, assignElevationsFromDEM } from '../../../lib/gis';

interface RibbonInicioProps {
  setIsConfirmNewProjectOpen: (open: boolean) => void;
}

export function RibbonInicio({ setIsConfirmNewProjectOpen }: RibbonInicioProps) {
  const { t } = useTranslation();
  const {
    baseMap, setBaseMap, isLayerManagerOpen, setIsLayerManagerOpen,
    crs, setProjectionPanelOpen, setProjectInfoOpen, loadProject, addLog
  } = useStore();

  const {
    handleExportDXF,
    handleExportLandXML,
    handleExportSCR,
    handleExportProject
  } = useExportHandlers();

  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Close export dropdown on outside click
  useEffect(() => {
    if (!isExportDropdownOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setIsExportDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExportDropdownOpen]);

  const handleImportShapefile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) loadVectorFiles(e.target.files);
    e.target.value = '';
  };

  const handleImportDEM = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadDEM(file);
  };

  const handleLoadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (data.nodes && data.conduits) {
            loadProject(data);
            addLog('Proyecto cargado desde archivo JSON.');
          } else {
            alert('Formato de archivo inválido.');
          }
        } catch {
          alert('Error al leer el archivo.');
        }
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  return (
    <div className="flex items-center h-full gap-0.5 min-w-max">
      {/* Proyecto Group */}
      <RibbonGroup label={t('ribbon.groups.proyecto')}>
        <RibbonButton
          icon={FilePlus2}
          label={t('ribbon.buttons.nuevo')}
          onClick={() => setIsConfirmNewProjectOpen(true)}
          isDanger
          subtitle={t('ribbon.subtitles.nuevo')}
        />
        <RibbonFileInput
          icon={FolderOpen}
          label={t('ribbon.buttons.abrir')}
          accept=".json"
          onChange={handleLoadProject}
        />
        <RibbonButton
          icon={Save}
          label={t('ribbon.buttons.guardar')}
          onClick={handleExportProject}
          subtitle={t('ribbon.subtitles.guardar')}
        />
        <div className="relative" ref={exportDropdownRef}>
          <RibbonButton
            icon={Share}
            label={t('ribbon.buttons.exportar')}
            onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
            isActive={isExportDropdownOpen}
            subtitle={t('ribbon.subtitles.exportar')}
          />
          {isExportDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-48 glass-panel rounded-lg py-1 z-50 shadow-xl border border-border-subtle/60 ribbon-dropdown animate-fade-in">
              <button
                className="w-full text-left px-3 py-2 text-[10px] font-semibold hover:bg-bg-hover hover:text-accent flex items-center gap-2 text-text-secondary transition-colors"
                onClick={() => {
                  handleExportDXF();
                  setIsExportDropdownOpen(false);
                }}
              >
                <FileBox size={13} className="opacity-60" /> Exportar DXF (CAD)
              </button>
              <button
                className="w-full text-left px-3 py-2 text-[10px] font-semibold hover:bg-bg-hover hover:text-accent flex items-center gap-2 text-text-secondary transition-colors"
                onClick={() => {
                  handleExportLandXML();
                  setIsExportDropdownOpen(false);
                }}
              >
                <FileImage size={13} className="opacity-60" /> Exportar LandXML
              </button>
              <button
                className="w-full text-left px-3 py-2 text-[10px] font-semibold hover:bg-bg-hover hover:text-accent flex items-center gap-2 text-text-secondary transition-colors"
                onClick={() => {
                  handleExportSCR();
                  setIsExportDropdownOpen(false);
                }}
              >
                <Terminal size={13} className="opacity-60" /> AutoCAD Script (.scr)
              </button>
            </div>
          )}
        </div>
        <div className="w-px h-6 bg-border-subtle/30 mx-1"></div>
        <RibbonButton
          icon={ClipboardList}
          label={t('ribbon.buttons.propiedades')}
          onClick={() => setProjectInfoOpen(true)}
          subtitle={t('ribbon.subtitles.propiedades')}
        />
      </RibbonGroup>

      {/* Mapa Base Group */}
      <RibbonGroup label={t('ribbon.groups.mapa_base')}>
        <div className="flex items-center px-1">
          <RibbonDropdownSelect
            value={baseMap}
            onChange={(val) => setBaseMap(val as any)}
            options={[
              { value: 'cartodb', label: 'CartoDB' },
              { value: 'satellite', label: 'Satélite' },
              { value: 'osm', label: 'OSM' }
            ]}
            className="w-24 h-7"
          />
        </div>
      </RibbonGroup>

      {/* Datos GIS Group */}
      <RibbonGroup label={t('ribbon.groups.datos_gis')}>
        <RibbonFileInput
          icon={Shapes}
          label={t('ribbon.buttons.vectorial')}
          accept=".shp,.dbf,.prj,.shx,.cpg,.dxf,.zip,.geojson,.json,.kml,.kmz"
          onChange={handleImportShapefile}
          multiple
        />
        <RibbonFileInput
          icon={Mountain}
          label="DEM"
          accept=".tif,.tiff,.asc,.dem"
          onChange={handleImportDEM}
        />
        <RibbonButton
          icon={Layers}
          label={t('ribbon.buttons.capas')}
          isActive={isLayerManagerOpen}
          onClick={() => setIsLayerManagerOpen(!isLayerManagerOpen)}
          subtitle={t('ribbon.subtitles.capas')}
        />
        <RibbonButton
          icon={ArrowDownToLine}
          label={t('ribbon.buttons.asignar_ctn')}
          onClick={assignElevationsFromDEM}
          subtitle={t('ribbon.subtitles.asignar_ctn')}
        />
      </RibbonGroup>

      {/* Coordenadas Group */}
      <RibbonGroup label={t('ribbon.groups.crs')}>
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] font-bold text-accent tracking-widest px-2.5 py-1 bg-accent/15 rounded border border-accent/25 h-7 flex items-center justify-center select-none uppercase">
            {crs}
          </span>
          <button
            type="button"
            className="text-[9px] font-bold text-text-secondary hover:text-accent hover:bg-bg-hover px-2 py-1 rounded transition-colors uppercase tracking-wider cursor-pointer border border-border-subtle/30 h-7 flex items-center"
            onClick={() => setProjectionPanelOpen(true)}
          >
            {t('ribbon.buttons.cambiar_crs')}
          </button>
        </div>
      </RibbonGroup>
    </div>
  );
}

export default RibbonInicio;
