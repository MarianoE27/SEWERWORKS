import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Save, FileText } from 'lucide-react';
import { Modal } from './ui/Modal';
import { useTranslation } from 'react-i18next';

interface ProjectInfoModalProps {
  onClose: () => void;
}

export function ProjectInfoModal({ onClose }: ProjectInfoModalProps) {
  const { t } = useTranslation();
  const { parameters, updateParameters, addLog } = useStore();
  const [projectName, setProjectName] = useState(parameters.projectName || '');
  const [location, setLocation] = useState(parameters.location || '');
  const [date, setDate] = useState(parameters.date || '');
  const [elevationProvider, setElevationProvider] = useState(parameters.elevationProvider || 'none');
  const [elevationProviderUrl, setElevationProviderUrl] = useState(parameters.elevationProviderUrl || '');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedName = projectName.trim() || t('header.untitled', 'PROYECTO SIN TÍTULO');
    updateParameters({
      projectName: resolvedName,
      location: location.trim(),
      date: date,
      elevationProvider: elevationProvider,
      elevationProviderUrl: elevationProviderUrl.trim()
    });
    addLog(t('project_info.log_success', { name: resolvedName, location: location.trim(), defaultValue: `[Proyecto] Metadatos actualizados: "${resolvedName}" en ${location}.` }));
    onClose();
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={t('project_info.title', 'Configuración del Proyecto y Entorno')}
      icon={<FileText size={18} className="text-accent" />}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-accent border-b border-border-subtle pb-1">{t('project_info.metadata', 'Metadatos')}</h4>
            
            <div className="flex flex-col gap-1.5">
              <label htmlFor="projectName" className="text-[10px] font-extrabold uppercase tracking-wider text-text-secondary select-none">
                {t('project_info.project_name', 'Nombre del Proyecto')}
              </label>
              <input
                id="projectName"
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="bg-bg-primary/50 border border-border-subtle focus:border-accent rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/50 w-full transition-all duration-200"
                placeholder={t('project_info.project_name_placeholder', 'Ej. Red de Colectores Barrio Norte')}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="location" className="text-[10px] font-extrabold uppercase tracking-wider text-text-secondary select-none">
                {t('project_info.location', 'Ubicación / Localidad')}
              </label>
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="bg-bg-primary/50 border border-border-subtle focus:border-accent rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/50 w-full transition-all duration-200"
                placeholder={t('project_info.location_placeholder', 'Ej. Buenos Aires, Argentina')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="projectDate" className="text-[10px] font-extrabold uppercase tracking-wider text-text-secondary select-none">
                {t('project_info.date', 'Fecha de Creación / Diseño')}
              </label>
              <input
                id="projectDate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-bg-primary/50 border border-border-subtle focus:border-accent rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/50 w-full transition-all duration-200"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-accent border-b border-border-subtle pb-1">{t('project_info.environment', 'Entorno y Topografía')}</h4>
            
            <div className="flex flex-col gap-1.5">
              <label htmlFor="elevationProvider" className="block text-xs font-medium text-text-secondary mb-1">
                {t('project_info.elevation_provider', 'Proveedor de Elevación')}
              </label>
              <select
                id="elevationProvider"
                value={elevationProvider}
                onChange={(e) => setElevationProvider(e.target.value)}
                className="bg-bg-primary/50 border border-border-subtle focus:border-accent rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/50 w-full transition-all duration-200"
              >
                <option value="none">{t('project_info.provider_none', 'Ninguno (Manual / DEM Local)')}</option>
                <option value="open_meteo">Open-Meteo (Global, Rápido y sin CORS errors)</option>
                <option value="opentopodata_srtm30m">OpenTopoData (Global SRTM 30m)</option>
                <option value="opentopodata_eudem25m">OpenTopoData (Europe EU-DEM 25m)</option>
                <option value="opentopodata_aster30m">OpenTopoData (Global ASTER 30m)</option>
                <option value="opentopodata_mapzen">OpenTopoData (Mapzen Global)</option>
                <option value="open_elevation">Open-Elevation API</option>
                <option value="custom">API Personalizada (URL)</option>
              </select>
            </div>

            {elevationProvider === 'custom' && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="elevationProviderUrl" className="text-[10px] font-extrabold uppercase tracking-wider text-text-secondary select-none">
                  {t('project_info.custom_url', 'URL de API Personalizada')}
                </label>
                <input
                  id="elevationProviderUrl"
                  type="text"
                  placeholder={t('project_info.custom_url_placeholder', 'Ej: http://localhost:5000/v1/srtm30m?locations={lat},{lon}')}
                  value={elevationProviderUrl}
                  onChange={(e) => setElevationProviderUrl(e.target.value)}
                  className="bg-bg-primary/50 border border-border-subtle focus:border-accent rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/50 w-full transition-all duration-200"
                />
              </div>
            )}
            
            <div className="mt-2 bg-bg-surface border border-border-subtle/50 rounded-lg p-3">
              <p className="text-[10px] text-text-secondary">
                {t('project_info.elevation_desc', 'Al crear nuevos nodos en el mapa, el sistema utilizará este proveedor para obtener la cota topográfica automáticamente (requiere conexión a internet).')}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-end gap-2.5 pt-4 border-t border-border-subtle/50 mt-6 font-semibold">
          <button
            type="button"
            className="px-4 py-2 rounded-lg text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-all duration-200 text-xs border border-transparent hover:border-border-subtle cursor-pointer"
            onClick={onClose}
          >
            {t('project_info.cancel', 'Cancelar')}
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 transition-all duration-200 text-xs flex items-center gap-1.5 font-bold cursor-pointer"
          >
            <Save size={13} />
            {t('project_info.save', 'Guardar Cambios')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
