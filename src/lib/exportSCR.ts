import { Node, Conduit } from '../types';
import { sanitizeExportString } from './utils';

export function generateSCR(nodes: Record<string, Node>, conduits: Record<string, Conduit>): string {
  let scr = '';

  // Setup layers
  scr += '_.-LAYER _M SEWER_CAMARAS _C 1  \n\n'; // Red
  scr += '_.-LAYER _M SEWER_TUBERIAS _C 3  \n\n'; // Green
  scr += '_.-LAYER _M SEWER_TEXTOS _C 7  \n\n';   // White/Black
  scr += '\n';

  // Draw nodes (chambers)
  Object.values(nodes).forEach(n => {
    // Circle for structure
    scr += '_.-LAYER _S SEWER_CAMARAS \n';
    scr += `_CIRCLE ${n.x.toFixed(4)},${n.y.toFixed(4)} 0.6\n`;

    // Labels
    scr += '_.-LAYER _S SEWER_TEXTOS \n';
    
    // Name label
    scr += `_.-TEXT _J _BL ${ (n.x + 1).toFixed(4) },${ (n.y + 1.5).toFixed(4) } 0.5 0 ${sanitizeExportString(n.name, 'cad')}\n`;
    
    // CTN
    if (n.ctn != null) {
      scr += `_.-TEXT _J _BL ${ (n.x + 1).toFixed(4) },${ (n.y + 0.5).toFixed(4) } 0.4 0 CTN: ${n.ctn.toFixed(2)}m\n`;
    }
    
    // Invert
    if (n.invert != null) {
      scr += `_.-TEXT _J _BL ${ (n.x + 1).toFixed(4) },${ (n.y - 0.5).toFixed(4) } 0.4 0 INV: ${n.invert.toFixed(2)}m\n`;
    }
  });

  // Draw conduits (pipes)
  Object.values(conduits).forEach(c => {
    const n1 = nodes[c.from];
    const n2 = nodes[c.to];
    if (!n1 || !n2) return;

    // Line for pipe
    scr += '_.-LAYER _S SEWER_TUBERIAS \n';
    scr += `_LINE ${n1.x.toFixed(4)},${n1.y.toFixed(4)} ${n2.x.toFixed(4)},${n2.y.toFixed(4)} \n\n`;

    // Midpoint and angle for label
    const midX = (n1.x + n2.x) / 2;
    const midY = (n1.y + n2.y) / 2;
    const dx = n2.x - n1.x;
    const dy = n2.y - n1.y;
    let angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
    
    if (angleDeg > 90 || angleDeg < -90) {
      angleDeg += 180;
    }

    const offsetDist = 0.5;
    const offsetAngle = (angleDeg + 90) * (Math.PI / 180);
    const textX = midX + Math.cos(offsetAngle) * offsetDist;
    const textY = midY + Math.sin(offsetAngle) * offsetDist;

    const slopeText = c.slope !== undefined ? c.slope.toFixed(2) : '?';
    const dnText = c.dn !== undefined ? c.dn.toString() : '?';

    scr += '_.-LAYER _S SEWER_TEXTOS \n';
    scr += `_.-TEXT _J _C ${textX.toFixed(4)},${textY.toFixed(4)} 0.5 ${angleDeg.toFixed(2)} DN ${dnText} - S: ${slopeText}o/oo\n`;
  });

  scr += '_ZOOM _E\n';
  scr += '_REGEN\n';
  return scr;
}
