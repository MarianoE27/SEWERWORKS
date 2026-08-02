import { contours as d3contours } from 'd3-contour';
import { toLatLon } from '../proj';
import { DEM_NODATA_THRESHOLD } from '../constants';
import { DEMData, ContourConfig } from '../../types';

const NODATA_THRESHOLD = DEM_NODATA_THRESHOLD;
const MAX_THRESHOLDS = 500;

self.onmessage = (event: MessageEvent<{ demData: DEMData; config: ContourConfig; crs?: string }>) => {
  try {
    const { demData, config, crs = "EPSG:3857" } = event.data;
    if (!demData || !config) {
      self.postMessage({ contours: { type: 'FeatureCollection', features: [] } });
      return;
    }

    const { data, width, height, bbox } = demData;
    if (!data || width === 0 || height === 0) {
      self.postMessage({ contours: { type: 'FeatureCollection', features: [] } });
      return;
    }

    const { interval, majorMultiplier, minElev, maxElev } = config;
    const lo = minElev ?? demData.minVal ?? 0;
    const hi = maxElev ?? demData.maxVal ?? 100;

    if (interval <= 0 || hi <= lo) {
      self.postMessage({ contours: { type: 'FeatureCollection', features: [] } });
      return;
    }

    const firstThreshold = Math.ceil(lo / interval) * interval;
    const thresholds: number[] = [];
    for (let t = firstThreshold; t <= hi; t += interval) {
      thresholds.push(parseFloat(t.toFixed(6)));
      if (thresholds.length >= MAX_THRESHOLDS) break;
    }
    if (thresholds.length === 0) {
      self.postMessage({ contours: { type: 'FeatureCollection', features: [] } });
      return;
    }

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

    const pixelContours = d3contours().size([dsWidth, dsHeight]).thresholds(thresholds)(flat);

    const [minX, minY, maxX, maxY] = bbox;

    function pixelToLatLon(px: number, py: number): [number, number] {
      const x = minX + (px / dsWidth) * (maxX - minX);
      const y = maxY - (py / dsHeight) * (maxY - minY);
      const [lat, lng] = toLatLon(x, y, crs);
      return [lng, lat]; // GeoJSON order
    }

    const features: GeoJSON.Feature[] = [];

    for (const pc of pixelContours) {
      const elevation = pc.value;
      const isMajor = Math.round(elevation / interval) % majorMultiplier === 0;

      const coordinates: number[][][][] = [];
      for (const polygon of pc.coordinates) {
        const polyCoords: number[][][] = [];
        for (const ring of polygon) {
          if (ring.length < 2) continue;
          polyCoords.push(ring.map(([px, py]) => pixelToLatLon(px, py)));
        }
        if (polyCoords.length > 0) {
          coordinates.push(polyCoords);
        }
      }

      if (coordinates.length > 0) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'MultiPolygon',
            coordinates,
          },
          properties: {
            elevation,
            isMajor,
          },
        });
      }
    }

    const contours: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features,
    };

    self.postMessage({ contours });
  } catch (error: any) {
    self.postMessage({ error: error?.message || 'Error generating contours in worker' });
  }
};
