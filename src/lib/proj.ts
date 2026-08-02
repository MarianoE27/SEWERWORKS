import proj4 from 'proj4';
import { PROJECTIONS_CATALOG } from './projections';

// georaster-layer-for-leaflet requires proj4 on window to reproject rasters
if (typeof window !== 'undefined') {
  (window as unknown as { proj4: typeof proj4 }).proj4 = proj4;
}

// Register all projection definitions from catalog
PROJECTIONS_CATALOG.forEach(({ code, proj4def }) => {
  proj4.defs(code, proj4def);
});

export async function loadCRS(epsgCode: string): Promise<boolean> {
  if (proj4.defs(epsgCode)) return true;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const code = epsgCode.replace('EPSG:', '');
    const response = await fetch(`https://epsg.io/${code}.proj4`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error('CRS not found');
    const proj4String = await response.text();
    proj4.defs(epsgCode, proj4String);
    return true;
  } catch (e: any) {
    clearTimeout(timeoutId);
    const msg = e?.name === 'AbortError'
      ? `Tiempo de espera agotado al cargar el sistema de coordenadas ${epsgCode}.`
      : `No se pudo cargar el sistema de coordenadas ${epsgCode}.`;
    // Log to console; UI logging avoided to prevent circular import with store
    console.warn(`[CRS] ${msg}`);
    return false;
  }
}

export function toLatLon(x: number, y: number, crs: string = "EPSG:3857"): [number, number] {
  if (crs === "EPSG:4326") return [y, x]; // x=lon, y=lat -> returns [lat, lon]
  try {
    const [lon, lat] = proj4(crs, "EPSG:4326", [x, y]);
    return [lat, lon];
  } catch (e) {
    console.error("Projection error:", e);
    return [0, 0];
  }
}

export function toXY(lat: number, lon: number, crs: string = "EPSG:3857"): [number, number] {
  if (crs === "EPSG:4326") return [lon, lat];
  try {
    const [x, y] = proj4("EPSG:4326", crs, [lon, lat]);
    return [x, y];
  } catch (e) {
    console.error("Projection error:", e);
    return [0, 0];
  }
}
