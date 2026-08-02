import { useStore } from '../../store/useStore';
import { generateDXF } from '../../lib/exportDXF';
import { generateLandXML } from '../../lib/exportLandXML';
import { generateSCR } from '../../lib/exportSCR';
import { exportConduitsCSV } from '../../lib/exportCSV';

export function useExportHandlers() {
  const { nodes, conduits, parameters, addLog, openExportModal } = useStore();

  const handleExportProject = () => {
    const projectData = { nodes, conduits, parameters, version: '1.0' };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projectData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "sewerworks_project.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    addLog('Proyecto exportado a SewerWorks JSON.');
  };

  const handleExportDXF = () => {
    openExportModal('dxf');
  };

  const handleExportLandXML = () => {
    openExportModal('landxml');
  };

  const handleExportSCR = () => {
    openExportModal('scr');
  };

  const handleExportCSV = () => {
    // Intentar primero con el botón del DOM (si la tabla de resultados está abierta)
    const csvBtn = document.querySelector('[data-csv-btn="true"]') as HTMLButtonElement | null;
    if (csvBtn) {
      csvBtn.click();
      return;
    }
    // Fallback: generar CSV usando el generador principal
    const conduitList = Object.values(conduits);
    if (conduitList.length === 0) {
      addLog("[Exportar] No hay conductos para exportar.");
      alert("No hay datos de conductos para exportar a CSV.");
      return;
    }
    
    const csvString = exportConduitsCSV(conduits, nodes);
    
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute("href", url);
    a.setAttribute("download", "sewerworks_conductos.csv");
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    addLog('[Exportar] Datos exportados a CSV.');
  };

  return {
    handleExportProject,
    handleExportDXF,
    handleExportLandXML,
    handleExportSCR,
    handleExportCSV,
  };
}
