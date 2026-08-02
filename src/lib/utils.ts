import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { toLatLon } from './proj';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number | undefined, decimals: number = 2): string {
  if (num === undefined || isNaN(num)) return '-';
  return num.toFixed(decimals);
}

/**
 * Distance in metres between two projected points.
 * For metric/projected coordinate systems (flat X/Y where Math.abs(x1) > 180 and crs !== 'EPSG:4326'),
 * directly computes flat Euclidean distance.
 * Only converts to lat/lng and applies Haversine when crs is explicitly geographic degrees ('EPSG:4326' or Math.abs(x1) <= 180).
 */
export function calculateDistance(x1: number, y1: number, x2: number, y2: number, crs: string = 'EPSG:3857'): number {
  if (crs !== 'EPSG:4326' && Math.abs(x1) > 180) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }
  const [lat1, lon1] = toLatLon(x1, y1, crs);
  const [lat2, lon2] = toLatLon(x2, y2, crs);
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getStateColor(state: string | undefined): string {
  if (state === 'ok') return 'text-green-400';
  if (state === 'warning') return 'text-yellow-400';
  if (state === 'error') return 'text-red-400';
  return 'text-faint';
}

export function sanitizeExportString(str: string, type: 'cad' | 'xml'): string {
  if (!str) return '';
  if (type === 'cad') {
    return str.replace(/[\r\n]+/g, ' ').replace(/[;^C]+/g, '').trim();
  } else if (type === 'xml') {
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&apos;');
  }
  return str;
}
