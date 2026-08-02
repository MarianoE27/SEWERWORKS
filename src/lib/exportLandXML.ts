import { Node, Conduit } from '../types';
import { sanitizeExportString } from './utils';

export function generateLandXML(nodes: Record<string, Node>, conduits: Record<string, Conduit>): string {
  const currentDate = new Date();
  const dateStr = currentDate.toISOString().split('T')[0];
  const timeStr = currentDate.toTimeString().split(' ')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<LandXML xmlns="http://www.landxml.org/schema/LandXML-1.2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.landxml.org/schema/LandXML-1.2 http://www.landxml.org/schema/LandXML-1.2/LandXML-1.2.xsd" version="1.2" date="${dateStr}" time="${timeStr}">\n`;
  xml += `  <Project name="SewerWorks_Export" />\n`;
  xml += `  <Application name="SewerWorks" version="1.0" />\n`;
  xml += `  <Units>\n`;
  xml += `    <Metric linearUnit="meter" areaUnit="squareMeter" volumeUnit="cubicMeter" temperatureUnit="celsius" pressureUnit="HPA" />\n`;
  xml += `  </Units>\n`;
  xml += `  <PipeNetworks>\n`;
  xml += `    <PipeNetwork name="SewerNetwork" pipeNetType="sanitary">\n`;

  // Pre-process names to ensure uniqueness and validity
  const usedStructNames = new Set<string>();
  const structNameMap = new Map<string, string>();
  Object.values(nodes).forEach(n => {
    let name = sanitizeExportString(n.name, 'xml').replace(/[^a-zA-Z0-9_-]/g, '_');
    if (usedStructNames.has(name) || !name) {
      if (!name) name = 'Node';
      let i = 2;
      while (usedStructNames.has(`${name}_${i}`)) i++;
      name = `${name}_${i}`;
    }
    usedStructNames.add(name);
    structNameMap.set(n.id, name);
  });

  const usedPipeNames = new Set<string>();
  const pipeNameMap = new Map<string, string>();
  Object.values(conduits).forEach(c => {
    let name = sanitizeExportString(c.name, 'xml').replace(/[^a-zA-Z0-9_-]/g, '_');
    if (usedPipeNames.has(name) || !name) {
      if (!name) name = 'Pipe';
      let i = 2;
      while (usedPipeNames.has(`${name}_${i}`)) i++;
      name = `${name}_${i}`;
    }
    usedPipeNames.add(name);
    pipeNameMap.set(c.id, name);
  });
  
  // Structures (Nodes)
  xml += `      <Structs>\n`;
  Object.values(nodes).forEach(n => {
    const safeName = sanitizeExportString(structNameMap.get(n.id)!, 'xml');
    const rimElev = n.ctn != null ? n.ctn.toFixed(3) : '0.000';
    
    xml += `        <Struct name="${safeName}" elev="${rimElev}">\n`;
    // LandXML coordinates are Northing Easting Elevation (Y X Z)
    xml += `          <Center>${n.y.toFixed(4)} ${n.x.toFixed(4)} ${rimElev}</Center>\n`;
    
    // Invert elevations connected to this structure
    if (n.invert != null) {
      const inPipes = Object.values(conduits).filter(c => c.to === n.id);
      const outPipes = Object.values(conduits).filter(c => c.from === n.id);
      
      outPipes.forEach(c => {
        if (c.invertIn != null) {
          const safePipeName = sanitizeExportString(pipeNameMap.get(c.id)!, 'xml');
          xml += `          <Invert elev="${c.invertIn.toFixed(4)}" flowDir="out" pipeRef="${safePipeName}" />\n`;
        }
      });
      inPipes.forEach(c => {
        if (c.invertOut != null) {
          const safePipeName = sanitizeExportString(pipeNameMap.get(c.id)!, 'xml');
          xml += `          <Invert elev="${c.invertOut.toFixed(4)}" flowDir="in" pipeRef="${safePipeName}" />\n`;
        }
      });
    }
    xml += `        </Struct>\n`;
  });
  xml += `      </Structs>\n`;

  // Pipes (Conduits)
  xml += `      <Pipes>\n`;
  Object.values(conduits).forEach(c => {
    const n1 = nodes[c.from];
    const n2 = nodes[c.to];
    if (!n1 || !n2) return;
    
    const safeName = sanitizeExportString(pipeNameMap.get(c.id)!, 'xml');
    const safeStartNode = sanitizeExportString(structNameMap.get(n1.id)!, 'xml');
    const safeEndNode = sanitizeExportString(structNameMap.get(n2.id)!, 'xml');
    
    const length = c.length || 0;
    const slope = c.slope ? (c.slope / 1000).toFixed(6) : '0.000000';
    // Diameter in meters (LandXML standard assumption for metric)
    const diamM = (c.dn || 160) / 1000;
    const material = sanitizeExportString((c as any).material || 'PVC', 'xml');
    
    xml += `        <Pipe name="${safeName}" refStart="${safeStartNode}" refEnd="${safeEndNode}" length="${length.toFixed(3)}" slope="${slope}">\n`;
    xml += `          <CircPipe diameter="${diamM.toFixed(4)}" material="${material}" />\n`;
    xml += `        </Pipe>\n`;
  });
  xml += `      </Pipes>\n`;

  xml += `    </PipeNetwork>\n`;
  xml += `  </PipeNetworks>\n`;
  xml += `</LandXML>`;

  return xml;
}
