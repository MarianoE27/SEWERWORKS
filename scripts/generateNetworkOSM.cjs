const fs = require('fs');
const proj4 = require('proj4');
proj4.defs('EPSG:3857', '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext  +no_defs');

const xml = fs.readFileSync('map.osm', 'utf8');

const nodesMap = {};
const nodeRegex = /<node\s+id="(\d+)".*?lat="([^"]+)"\s+lon="([^"]+)"/g;
let match;
while ((match = nodeRegex.exec(xml)) !== null) {
  nodesMap[match[1]] = { lat: parseFloat(match[2]), lon: parseFloat(match[3]) };
}

const streetNodes = {};
const wayRegex = /<way[\s\S]*?<\/way>/g;
while ((match = wayRegex.exec(xml)) !== null) {
  const wayXml = match[0];
  const nameMatch = wayXml.match(/<tag\s+k="name"\s+v="([^"]+)"/);
  if (nameMatch) {
    const name = nameMatch[1];
    if (!streetNodes[name]) streetNodes[name] = new Set();
    
    const ndRegex = /<nd\s+ref="(\d+)"/g;
    let ndMatch;
    while ((ndMatch = ndRegex.exec(wayXml)) !== null) {
      streetNodes[name].add(ndMatch[1]);
    }
  }
}

const v_streets = ['Calle 12', 'Calle 11', 'Calle 10', 'Calle 9', 'Calle 8'];
const h_streets = ['Avenida 51', 'Calle 50', 'Calle 49', 'Calle 48', 'Calle 47'];

let nodesCode = 'export const defaultNetworkNodes: Record<string, any> = {\n';
let conduitsCode = 'export const defaultNetworkConduits: Record<string, any> = {\n';

const grid = [];
let nodeIdx = 1;
let condIdx = 1;

for (let r = 0; r < h_streets.length; r++) {
  const row = [];
  for (let c = 0; c < v_streets.length; c++) {
    const h_name = h_streets[r];
    const v_name = v_streets[c];
    
    const h_set = streetNodes[h_name] || new Set();
    const v_set = streetNodes[v_name] || new Set();
    
    let intersectionNodeId = null;
    for (let nid of h_set) {
      if (v_set.has(nid)) {
        intersectionNodeId = nid;
        break;
      }
    }
    
    let lat, lon;
    if (intersectionNodeId) {
      lat = nodesMap[intersectionNodeId].lat;
      lon = nodesMap[intersectionNodeId].lon;
    } else {
      console.log('Missing intersection for ' + h_name + ' & ' + v_name);
      lat = -34.9214; lon = -57.9545; 
    }
    
    const [x, y] = proj4('EPSG:4326', 'EPSG:3857', [lon, lat]);
    const id = 'node_' + r + '_' + c;
    const ctn = 18 - (c * 0.2) - (r * 0.1);
    
    nodesCode += '  \'' + id + '\': { id: \'' + id + '\', name: \'B.R.-C' + v_name.split(' ')[1] + '-C' + h_name.split(' ')[1] + '\', x: ' + x.toFixed(2) + ', y: ' + y.toFixed(2) + ', ctn: ' + ctn.toFixed(2) + ', state: \'uncalculated\' },\n';
    row.push(id);
    nodeIdx++;
  }
  grid.push(row);
}
nodesCode += '};\n\n';

for (let r = 0; r < h_streets.length; r++) {
  for (let c = 0; c < v_streets.length - 1; c++) {
    const from = grid[r][c];
    const to = grid[r][c+1];
    conduitsCode += '  \'cond-' + condIdx + '\': { id: \'cond-' + condIdx + '\', name: \'P-H' + r + '-' + c + '\', from: \'' + from + '\', to: \'' + to + '\', length: 120, state: \'uncalculated\' },\n';
    condIdx++;
  }
}

for (let c = 0; c < v_streets.length; c++) {
  for (let r = 0; r < h_streets.length - 1; r++) {
    const from = grid[r][c];
    const to = grid[r+1][c];
    conduitsCode += '  \'cond-' + condIdx + '\': { id: \'cond-' + condIdx + '\', name: \'P-V' + r + '-' + c + '\', from: \'' + from + '\', to: \'' + to + '\', length: 120, state: \'uncalculated\' },\n';
    condIdx++;
  }
}

conduitsCode += '};\n';
fs.writeFileSync('src/lib/defaultNetwork.ts', nodesCode + conduitsCode, 'utf8');
console.log('Network extracted from exact OSM geometries and written successfully.');
