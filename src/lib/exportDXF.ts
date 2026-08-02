import { Node, Conduit } from '../types';
import { sanitizeExportString } from './utils';

/**
 * Generates a DXF file (ASCII R12) that is robust and compatible with AutoCAD/Civil 3D.
 * Group codes are strictly followed.
 */
export function generateDXF(nodes: Record<string, Node>, conduits: Record<string, Conduit>): string {
  const lines: string[] = [];

  const add = (code: number, value: string | number) => {
    lines.push(code.toString());
    lines.push(value.toString());
  };

  // --- HEADER ---
  add(0, 'SECTION');
  add(2, 'HEADER');
  add(9, '$ACADVER');
  add(1, 'AC1009'); // R12
  add(9, '$INSUNITS');
  add(70, 6); // Meters
  add(0, 'ENDSEC');

  // --- TABLES ---
  add(0, 'SECTION');
  add(2, 'TABLES');
  
  add(0, 'TABLE');
  add(2, 'LTYPE');
  add(70, 1); // Number of linetype entries
  add(0, 'LTYPE');
  add(2, 'CONTINUOUS');
  add(70, 0);
  add(3, 'Solid line');
  add(72, 65); // 'A'
  add(73, 0);
  add(40, 0.0);
  add(0, 'ENDTAB');

  add(0, 'TABLE');
  add(2, 'LAYER');
  add(70, 3); // Number of layer entries
  
  const addLayer = (name: string, color: number) => {
    add(0, 'LAYER');
    add(2, name);
    add(70, 0); // Standard flags
    add(62, color);
    add(6, 'CONTINUOUS');
  };

  addLayer('SEWER_CAMARAS', 1); // Red
  addLayer('SEWER_TUBERIAS', 3); // Green
  addLayer('SEWER_TEXTOS', 7);   // White/Black

  add(0, 'ENDTAB');
  add(0, 'ENDSEC');

  // --- BLOCKS ---
  add(0, 'SECTION');
  add(2, 'BLOCKS');
  add(0, 'ENDSEC');

  // --- ENTITIES ---
  add(0, 'SECTION');
  add(2, 'ENTITIES');

  // Draw Chambers (Nodes)
  Object.values(nodes).forEach(n => {
    const nodeZ = n.ctn ?? 0;

    add(0, 'CIRCLE');
    add(8, 'SEWER_CAMARAS');
    add(10, n.x);
    add(20, n.y);
    add(30, nodeZ);
    add(40, 0.6); // Radius

    add(0, 'POINT');
    add(8, 'SEWER_CAMARAS');
    add(10, n.x);
    add(20, n.y);
    add(30, nodeZ);

    // Main name label
    addText(add, 'SEWER_TEXTOS', n.x + 1.0, n.y + 1.5, nodeZ, sanitizeExportString(n.name, 'cad'), 0.5, 0);

    // CTN Label
    if (n.ctn != null) {
      addText(add, 'SEWER_TEXTOS', n.x + 1.0, n.y + 0.5, nodeZ, `CTN: ${n.ctn.toFixed(2)}m`, 0.4, 0);
    }

    // Invert Label
    if (n.invert != null) {
      addText(add, 'SEWER_TEXTOS', n.x + 1.0, n.y - 0.5, nodeZ, `INV: ${n.invert.toFixed(2)}m`, 0.4, 0);
    }
  });

  // Draw Pipes (Conduits)
  Object.values(conduits).forEach(c => {
    const n1 = nodes[c.from];
    const n2 = nodes[c.to];
    if (!n1 || !n2) return;

    const startZ = c.invertIn ?? 0;
    const endZ = c.invertOut ?? 0;

    add(0, 'LINE');
    add(8, 'SEWER_TUBERIAS');
    add(10, n1.x);
    add(20, n1.y);
    add(30, startZ);
    add(11, n2.x);
    add(21, n2.y);
    add(31, endZ);

    // Label
    const midX = (n1.x + n2.x) / 2;
    const midY = (n1.y + n2.y) / 2;
    const midZ = (startZ + endZ) / 2;
    const dx = n2.x - n1.x;
    const dy = n2.y - n1.y;
    let angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
    
    // Upright text
    if (angleDeg > 90 || angleDeg < -90) {
      angleDeg += 180;
    }

    const offsetDist = 0.5;
    const offsetAngle = (angleDeg + 90) * (Math.PI / 180);
    const textX = midX + Math.cos(offsetAngle) * offsetDist;
    const textY = midY + Math.sin(offsetAngle) * offsetDist;

    const slopeText = c.slope !== undefined ? c.slope.toFixed(2) : '?';
    const dnText = c.dn !== undefined ? c.dn.toString() : '?';
    const label = `DN ${dnText} - S: ${slopeText}o/oo`;

    addText(add, 'SEWER_TEXTOS', textX, textY, midZ, label, 0.5, angleDeg, 1); // Centered
  });

  add(0, 'ENDSEC');
  add(0, 'EOF');

  return lines.join('\n') + '\n';
}

function addText(
  add: (code: number, value: string | number) => void,
  layer: string,
  x: number,
  y: number,
  z: number,
  content: string,
  height: number,
  rotation: number,
  justification: number = 0 // 0 = Left, 1 = Center
) {
  add(0, 'TEXT');
  add(8, layer);
  add(10, x);
  add(20, y);
  add(30, z);
  add(40, height);
  add(1, content);
  if (rotation !== 0) add(50, rotation);
  
  if (justification === 1) {
    add(72, 1); // Center
    add(73, 2); // Center vertical (Middle)
    add(11, x); // Middle point X
    add(21, y); // Middle point Y
    add(31, z);
  }
}
