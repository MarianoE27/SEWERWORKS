import * as GeoTIFF from 'geotiff';
import parseGeoraster from 'georaster';
import { useStore } from '../../store/useStore';
import { loadCRS } from '../proj';
import { Node } from '../../types';

async function loadASCGrid(file: File) {
  try {
    const text = await file.text();
    const lines = text.trim().split('\n');
    const header: Record<string, number> = {};
    let dataStart = 0;
    for (let i = 0; i < 10 && i < lines.length; i++) {
      const parts = lines[i].trim().split(/\s+/);
      if (parts.length === 2 && isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
        header[parts[0].toLowerCase()] = Number(parts[1]);
        dataStart = i + 1;
      } else {
        break;
      }
    }
    const ncols = header['ncols'] ?? 0;
    const nrows = header['nrows'] ?? 0;
    const xllcorner = header['xllcorner'] ?? header['xllcenter'] ?? 0;
    const yllcorner = header['yllcorner'] ?? header['yllcenter'] ?? 0;
    const cellsize = header['cellsize'] ?? 1;
    const nodata = header['nodata_value'] ?? -9999;

    if (!ncols || !nrows) throw new Error('Cabecera ASC inválida');

    const data = new Float32Array(ncols * nrows);
    let minVal = Infinity, maxVal = -Infinity;
    for (let row = 0; row < nrows; row++) {
      const vals = lines[dataStart + row]?.trim().split(/\s+/) ?? [];
      for (let col = 0; col < ncols; col++) {
        const v = Number(vals[col]);
        data[row * ncols + col] = v;
        if (v !== nodata && v > -9000) {
          if (v < minVal) minVal = v;
          if (v > maxVal) maxVal = v;
        }
      }
    }

    const bbox = [xllcorner, yllcorner, xllcorner + ncols * cellsize, yllcorner + nrows * cellsize];
    useStore.getState().setDEM({
      file: file.name, bbox, width: ncols, height: nrows, data,
      georaster: null as any, visible: true, opacity: 0.6,
      colorScale: 'terrain',
      minVal: isFinite(minVal) ? minVal : 0,
      maxVal: isFinite(maxVal) ? maxVal : 1000,
    });
    useStore.getState().addLog(`DEM ASCII Grid ${file.name} cargado (${ncols}×${nrows}). Solo disponible para asignación de CTN.`);
  } catch (error: any) {
    console.error(error);
    useStore.getState().addLog(`Error al cargar ASCII Grid ${file.name}: ${error.message}.`);
  }
}

export async function loadDEM(file: File) {
  const ext = file.name.toLowerCase().split('.').pop();
  if (ext === 'asc' || ext === 'dem') {
    return loadASCGrid(file);
  }

  if (ext === 'img') {
    useStore.getState().addLog(`El formato ERDAS Imagine (.img) no está soportado nativamente. Por favor, convierta el archivo a GeoTIFF (.tif) o ASCII Grid (.asc) usando un software GIS como QGIS antes de cargarlo.`);
    return;
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Parse for elevation assignment
    const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
    const image = await tiff.getImage();
    const bbox = image.getBoundingBox();
    const width = image.getWidth();
    const height = image.getHeight();
    const rasters = await image.readRasters();
    const data = rasters[0];

    // Parse for map rendering
    const georaster = await parseGeoraster(arrayBuffer.slice(0));

    if (georaster.projection) {
      const epsgCode = `EPSG:${georaster.projection}`;
      await loadCRS(epsgCode);
      useStore.getState().setCRS(epsgCode);
    }

    // Compute min/max elevation (excluding nodata)
    let minVal = georaster.mins && typeof georaster.mins[0] === 'number' && isFinite(georaster.mins[0]) ? georaster.mins[0] : Infinity;
    let maxVal = georaster.maxs && typeof georaster.maxs[0] === 'number' && isFinite(georaster.maxs[0]) ? georaster.maxs[0] : -Infinity;

    if (minVal === Infinity || maxVal === -Infinity) {
      for (let i = 0; i < data.length; i++) {
        const v = data[i];
        if (v !== undefined && v > -9000) {
          if (v < minVal) minVal = v;
          if (v > maxVal) maxVal = v;
        }
      }
    }

    useStore.getState().setDEM({
      file: file.name,
      bbox,
      width,
      height,
      data,
      georaster,
      visible: true,
      opacity: 0.6,
      colorScale: 'terrain',
      minVal: isFinite(minVal) ? minVal : 0,
      maxVal: isFinite(maxVal) ? maxVal : 1000,
    });
    useStore.getState().addLog(`Modelo de Elevación (DEM) ${file.name} cargado exitosamente.`);
  } catch (error) {
    console.error(error);
    useStore.getState().addLog('Error al cargar el archivo GeoTIFF.');
  }
}

/**
 * Assigns elevations to nodes based on DEM data.
 * When called with (nodes, demData), runs purely without hardcoded store dependencies and returns updated nodes.
 * When called with no arguments or a UI event (from components), updates the store state directly.
 */
export function assignElevationsFromDEM(
  nodes?: Record<string, Node> | any,
  demData?: any
): Record<string, Node> | void {
  // Pure function execution when valid dictionary and demData are passed without UI events
  if (
    nodes &&
    typeof nodes === 'object' &&
    !('nativeEvent' in nodes) &&
    !('preventDefault' in nodes) &&
    demData !== undefined &&
    demData !== null
  ) {
    const { bbox, width, height, data } = demData;
    if (!bbox || !data) return nodes as Record<string, Node>;
    const [minX, minY, maxX, maxY] = bbox;

    const updatedNodes: Record<string, Node> = {};
    Object.entries(nodes as Record<string, Node>).forEach(([id, node]) => {
      let updatedNode = node;
      if (node.x >= minX && node.x <= maxX && node.y >= minY && node.y <= maxY) {
        const pixelX = Math.floor(((node.x - minX) / (maxX - minX)) * width);
        const pixelY = Math.floor(((maxY - node.y) / (maxY - minY)) * height);

        if (pixelX >= 0 && pixelX < width && pixelY >= 0 && pixelY < height) {
          const value = data[pixelY * width + pixelX];
          if (value !== undefined && value > -9000) {
            updatedNode = { ...node, ctn: value };
          }
        }
      }
      updatedNodes[id] = updatedNode;
    });
    return updatedNodes;
  }

  // Fallback execution when called with zero arguments or UI click event
  const state = useStore.getState();
  const dem = state.dem;
  if (!dem) {
    state.addLog('Primero debe cargar un archivo GeoTIFF (DEM).');
    return;
  }

  const { bbox, width, height, data } = dem;
  const [minX, minY, maxX, maxY] = bbox;

  let updatedCount = 0;
  Object.values(state.nodes).forEach(node => {
    if (node.x >= minX && node.x <= maxX && node.y >= minY && node.y <= maxY) {
      const pixelX = Math.floor(((node.x - minX) / (maxX - minX)) * width);
      const pixelY = Math.floor(((maxY - node.y) / (maxY - minY)) * height);

      if (pixelX >= 0 && pixelX < width && pixelY >= 0 && pixelY < height) {
        const value = data[pixelY * width + pixelX];
        if (value !== undefined && value > -9000) { // Ignore nodata
          state.updateNode(node.id, { ctn: value });
          updatedCount++;
        }
      }
    }
  });

  state.addLog(`Se actualizaron las cotas (CTN) de ${updatedCount} cámaras usando el DEM.`);
}
