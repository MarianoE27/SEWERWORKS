import { Node, Conduit } from '../types';
import { formatNumber } from './utils';

// Semicolon separator for Latin American regional Excel compatibility
const SEP = ';';

// Add UTF-8 Byte Order Mark (BOM) to ensure Excel opens the file with correct character encoding
export const UTF8_BOM = '\uFEFF';

export function exportConduitsCSV(conduits: Record<string, Conduit>, nodes: Record<string, Node>): string {
  const headers = [
    'Nombre',
    'Desde',
    'Hasta',
    'Longitud (m)',
    'DN (mm)',
    'Pendiente (‰)',
    'Cota In (m)',
    'Cota Out (m)',
    'Tapada In (m)',
    'Tapada Out (m)',
    'Q Aporte (L/s)',
    'Q Infiltración (L/s)',
    'Q Ag.Arriba (L/s)',
    'Ql0 (Ini) (L/s)',
    'QE10 (10a) (L/s)',
    'QE20 (20a) (L/s)',
    'Q Total (L/s)',
    'Q Lleno (L/s)',
    'Q/Qll',
    'h/D0 (Ini)',
    'Velocidad0 (Ini) (m/s)',
    'Fuerza Tractiva0 (Ini) (kg/m2)',
    'h/D (20a)',
    'Tirante (20a) (m)',
    'Velocidad (20a) (m/s)',
    'Fuerza Tractiva (kg/m2)',
    'Vol. Exc (m3)',
    'Estado',
    'Mensaje de Error'
  ];

  let csv = UTF8_BOM + headers.join(SEP) + '\r\n';

  Object.values(conduits).sort((a, b) => a.name.localeCompare(b.name)).forEach(c => {
    const row = [
      c.name,
      nodes[c.from]?.name || c.from,
      nodes[c.to]?.name || c.to,
      formatNumber(c.length, 2),
      c.dn || '-',
      formatNumber(c.slope, 2),
      formatNumber(c.invertIn, 3),
      formatNumber(c.invertOut, 3),
      formatNumber(c.coverIn, 2),
      formatNumber(c.coverOut, 2),
      formatNumber(c.qAporte, 2),
      formatNumber(c.qInfiltration, 2),
      formatNumber(c.qUpstream, 2),
      formatNumber(c.ql0, 2),
      formatNumber(c.qe10, 2),
      formatNumber(c.qe20, 2),
      formatNumber(c.qDesign, 2),
      formatNumber(c.qFull, 2),
      formatNumber(c.qRatio, 2),
      formatNumber(c.hRatio0, 3),
      formatNumber(c.velocity0, 2),
      formatNumber(c.tractiveForce0, 3),
      formatNumber(c.hRatio, 3),
      formatNumber(c.flowDepth, 3),
      formatNumber(c.velocity, 2),
      formatNumber(c.tractiveForce, 3),
      formatNumber(c.excavationVol, 2),
      c.state || 'uncalculated',
      c.errorMessage ? `"${c.errorMessage.replace(/"/g, '""')}"` : ''
    ].join(SEP);
    csv += row + '\r\n';
  });

  return csv;
}

export function exportNodesCSV(nodes: Record<string, Node>): string {
  const headers = [
    'Nombre',
    'X',
    'Y',
    'CTN (m)',
    'Cota Fondo (m)',
    'Profundidad (m)',
    'Salto (m)',
    'Tubo Salto',
    'Q Ingreso (L/s)',
    'Estado',
    'Mensaje de Error'
  ];

  let csv = UTF8_BOM + headers.join(SEP) + '\r\n';

  Object.values(nodes).sort((a, b) => a.name.localeCompare(b.name)).forEach(n => {
    const row = [
      n.name,
      formatNumber(n.x, 2),
      formatNumber(n.y, 2),
      formatNumber(n.ctn, 3),
      formatNumber(n.invert, 3),
      formatNumber(n.depth, 2),
      formatNumber(n.drop, 3),
      n.hasDropPipe ? 'SI' : 'NO',
      formatNumber(n.inflow, 2),
      n.state || 'uncalculated',
      n.errorMessage ? `"${n.errorMessage.replace(/"/g, '""')}"` : ''
    ].join(SEP);
    csv += row + '\r\n';
  });

  return csv;
}
