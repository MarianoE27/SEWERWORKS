import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';
import { Download, Globe } from 'lucide-react';
import { Modal } from './ui/Modal';
import { PROJECTIONS, formatCoordinates } from '../lib/projections';
import { toLatLon, toXY } from '../lib/proj';
import { generateDXF } from '../lib/exportDXF';
import { generateLandXML } from '../lib/exportLandXML';
import { generateSCR } from '../lib/exportSCR';

export function ExportModal() {
  const { t } = useTranslation();
  const { isExportModalOpen, exportFormat, closeExportModal, crs, nodes, conduits, addLog } = useStore();
  const [selectedCRS, setSelectedCRS] = useState(crs);

  useEffect(() => {
    if (isExportModalOpen) {
      setSelectedCRS(crs);
    }
  }, [isExportModalOpen, crs]);

  if (!isExportModalOpen) return null;

  const handleExport = () => {
    let exportNodes = nodes;

    // Reproject nodes if the selected CRS is different from the project CRS
    if (selectedCRS !== crs) {
      exportNodes = {};
      Object.values(nodes).forEach(node => {
        const [lat, lon] = toLatLon(node.x, node.y, crs);
        const [newX, newY] = toXY(lat, lon, selectedCRS);
        exportNodes[node.id] = { ...node, x: newX, y: newY };
      });
    }

    let fileContent = '';
    let fileName = '';
    let mimeType = '';

    if (exportFormat === 'dxf') {
      fileContent = generateDXF(exportNodes, conduits);
      fileName = 'sewerworks_export.dxf';
      mimeType = 'text/plain';
    } else if (exportFormat === 'landxml') {
      fileContent = generateLandXML(exportNodes, conduits);
      fileName = 'sewerworks_export.xml';
      mimeType = 'text/xml';
    } else if (exportFormat === 'scr') {
      fileContent = generateSCR(exportNodes, conduits);
      fileName = 'sewerworks_draw.scr';
      mimeType = 'text/plain';
    }

    if (fileContent) {
      const blob = new Blob([fileContent], { type: `${mimeType};charset=utf-8;` });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute("href", url);
      a.setAttribute("download", fileName);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      addLog(`Exportado a ${exportFormat?.toUpperCase()} en CRS ${selectedCRS}.`);
    }

    closeExportModal();
  };

  const currentDef = PROJECTIONS.find(p => p.code === selectedCRS);

  return (
    <Modal
      isOpen={isExportModalOpen}
      onClose={closeExportModal}
      title={`Opciones de Exportación (${exportFormat?.toUpperCase()})`}
      icon={<Globe size={18} className="text-accent" />}
      maxWidth="max-w-md"
    >
      <div className="space-y-6">
        <p className="text-sm text-text-secondary">
          Seleccione el Sistema de Coordenadas (CRS) a utilizar en el archivo exportado. Esto asegura que el archivo se dibuje en la ubicación y escala correctas en su programa CAD/GIS.
        </p>

        <div className="space-y-1.5">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-text-secondary select-none">
            Sistema de Coordenadas (CRS)
          </label>
          <select
            value={selectedCRS}
            onChange={(e) => setSelectedCRS(e.target.value)}
            className="w-full bg-bg-input border border-border-subtle text-text-primary text-sm rounded focus:ring-1 focus:ring-accent focus:border-accent p-2 outline-none transition-colors"
          >
            <optgroup label="Global">
              {PROJECTIONS.filter(p => p.region === 'Global').map(p => (
                <option key={p.code} value={p.code}>{p.name} ({p.code})</option>
              ))}
            </optgroup>
            <optgroup label="Argentina (Fajas)">
              {PROJECTIONS.filter(p => p.region === 'Argentina' && !p.name.includes('GK')).map(p => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </optgroup>
            <optgroup label="Argentina (GK)">
              {PROJECTIONS.filter(p => p.region === 'Argentina' && p.name.includes('GK')).map(p => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </optgroup>
            <optgroup label="UTM">
              {PROJECTIONS.filter(p => p.region === 'UTM').map(p => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </optgroup>
            <optgroup label="Europa">
              {PROJECTIONS.filter(p => p.region === 'Europa').map(p => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </optgroup>
          </select>
        </div>

        <div className="bg-bg-input p-3 rounded-lg border border-border-subtle/50 text-xs shadow-inner">
          <div className="flex justify-between items-center mb-1">
            <span className="text-text-secondary">CRS del Proyecto:</span>
            <span className="text-text-primary font-mono font-medium">{crs}</span>
          </div>
          {selectedCRS !== crs && (
            <div className="flex justify-between items-center text-yellow-400/90 mt-2">
              <span>Transformación:</span>
              <span className="font-mono">{crs} &rarr; {selectedCRS}</span>
            </div>
          )}
          {currentDef && currentDef.unit === 'degree' && (
            <div className="mt-3 text-status-error">
              Atención: Exportar en coordenadas geográficas (Lat/Lon) a CAD puede deformar las longitudes debido a que no es un sistema métrico proyectado.
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={closeExportModal}
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded transition-colors shadow shadow-accent/20"
          >
            <Download size={16} />
            Exportar
          </button>
        </div>
      </div>
    </Modal>
  );
}
