import { contours as d3contours } from 'd3-contour';
import { toLatLon } from './proj';
import { DEMData, ContourConfig } from '../types';
import { DEM_NODATA_THRESHOLD } from './constants';

export interface ContourLine {
  elevation: number;
  isMajor: boolean;
  /** Anillos en [lng, lat] para GeoJSON / react-leaflet */
  rings: [number, number][][];
}

const NODATA_THRESHOLD = DEM_NODATA_THRESHOLD;
const MAX_THRESHOLDS = 500; // límite de seguridad

export function computeContours(
  dem: DEMData,
  config: ContourConfig,
  crs: string
): ContourLine[] {
  const { data, width, height, bbox } = dem;
  if (!data || width === 0 || height === 0) return [];

  const { interval, majorMultiplier, minElev, maxElev } = config;
  const lo = minElev ?? dem.minVal ?? 0;
  const hi = maxElev ?? dem.maxVal ?? 100;

  if (interval <= 0 || hi <= lo) return [];

  // Construir umbrales
  const firstThreshold = Math.ceil(lo / interval) * interval;
  const thresholds: number[] = [];
  for (let t = firstThreshold; t <= hi; t += interval) {
    thresholds.push(parseFloat(t.toFixed(6))); // evitar acumulación float
    if (thresholds.length >= MAX_THRESHOLDS) break;
  }
  if (thresholds.length === 0) return [];

  // Diezmar/submuestrear grids grandes para mantener el cálculo rápido y evitar bloqueos de interfaz
  const step = Math.max(1, Math.ceil(Math.max(width, height) / 1200));
  const dsWidth = Math.ceil(width / step);
  const dsHeight = Math.ceil(height / step);
  const flat = new Float32Array(dsWidth * dsHeight);
  const srcArr = data as Float32Array;

  for (let r = 0; r < dsHeight; r++) {
    const origR = Math.min(height - 1, r * step);
    const rowOffset = origR * width;
    for (let c = 0; c < dsWidth; c++) {
      const origC = Math.min(width - 1, c * step);
      const val = srcArr[rowOffset + origC];
      flat[r * dsWidth + c] = val > NODATA_THRESHOLD ? val : lo - 1;
    }
  }

  // Calcular curvas de nivel en espacio píxel (d3-contour → MultiPolygon)
  const pixelContours = d3contours().size([dsWidth, dsHeight]).thresholds(thresholds)(flat);

  const [minX, minY, maxX, maxY] = bbox;

  // Transformar píxel → CRS proyecto → WGS84 [lng, lat]
  function pixelToLatLon(px: number, py: number): [number, number] {
    const x = minX + (px / dsWidth) * (maxX - minX);
    const y = maxY - (py / dsHeight) * (maxY - minY);
    const [lat, lng] = toLatLon(x, y, crs);
    return [lng, lat]; // GeoJSON order
  }

  const result: ContourLine[] = [];

  for (const pc of pixelContours) {
    const elevation = pc.value;
    const isMajor = Math.round(elevation / interval) % majorMultiplier === 0;

    const rings: [number, number][][] = [];
    // pc.coordinates es MultiPolygon: [ [ [ring] ] ]
    for (const polygon of pc.coordinates) {
      for (const ring of polygon) {
        if (ring.length < 2) continue;
        rings.push(ring.map(([px, py]) => pixelToLatLon(px, py)));
      }
    }
    if (rings.length > 0) result.push({ elevation, isMajor, rings });
  }

  return result;
}

export async function generateContoursAsync(
  demData: any,
  config: ContourConfig,
  crs: string = "EPSG:3857"
): Promise<GeoJSON.FeatureCollection> {
  return new Promise((resolve, reject) => {
    try {
      const worker = new Worker(new URL('./workers/contourWorker.ts', import.meta.url), { type: 'module' });

      worker.onmessage = (event: MessageEvent) => {
        const { contours, error } = event.data;
        worker.terminate();
        if (error) {
          reject(new Error(error));
        } else {
          resolve(contours);
        }
      };

      worker.onerror = (error) => {
        worker.terminate();
        reject(error);
      };

      worker.postMessage({ demData, config, crs });
    } catch (error) {
      reject(error);
    }
  });
}

