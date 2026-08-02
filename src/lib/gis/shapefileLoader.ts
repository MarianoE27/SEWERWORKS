import shp from 'shpjs';
import proj4 from 'proj4';
import { useStore } from '../../store/useStore';
import { loadCRS } from '../proj';
import { detectCRSFromPrj } from '../projections';
import { dxfToGeoJSON, DXFData } from './dxfParser';

// ── Shapefile multi-file bundler & parser ─────────────────────────

export async function bundleShpFiles(files: File[]): Promise<ArrayBuffer> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  for (const f of files) {
    zip.file(f.name, await f.arrayBuffer());
  }
  return zip.generateAsync({ type: 'arraybuffer' });
}

export async function parseShapefile(input: File | ArrayBuffer): Promise<{ geojson: any; prjWkt: string | null }> {
  const buf = input instanceof File ? await input.arrayBuffer() : input;
  let prjWkt: string | null = null;
  let cleanBuf = buf;
  try {
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(buf.slice(0));
    const prjEntry = Object.values(zip.files).find(f => f.name.toLowerCase().endsWith('.prj'));
    if (prjEntry) {
      prjWkt = await prjEntry.async('text');
      zip.remove(prjEntry.name); // Remove .prj so shpjs outputs raw exact coordinates
      cleanBuf = await zip.generateAsync({ type: 'arraybuffer' });
    }
  } catch { /* not a zip, or no .prj */ }

  const geojson = await shp(cleanBuf);
  return { geojson, prjWkt };
}

// ── GeoJSON reprojection ─────────────────────────────────────────

/** Returns true if the GeoJSON coordinates look projected (not WGS84). */
export function looksProjected(geojson: any): boolean {
  const coords = firstCoordinates(geojson);
  if (!coords) return false;
  const [x, y] = coords;
  return Math.abs(x) > 180 || Math.abs(y) > 90;
}

export function firstCoordinates(obj: any): number[] | null {
  if (!obj) return null;
  if (obj.type === 'FeatureCollection') {
    for (const f of obj.features ?? []) {
      const c = firstCoordinates(f);
      if (c) return c;
    }
  } else if (obj.type === 'Feature') {
    return firstCoordinates(obj.geometry);
  } else if (obj.coordinates) {
    return flatFirst(obj.coordinates);
  }
  return null;
}

export function flatFirst(coords: any): number[] | null {
  if (!Array.isArray(coords) || coords.length === 0) return null;
  if (typeof coords[0] === 'number') return coords as number[];
  return flatFirst(coords[0]);
}

/** Returns true if a coordinate pair is valid WGS84. */
export function isValidWGS84(lon: number, lat: number): boolean {
  return isFinite(lon) && isFinite(lat) && lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90;
}

/** Reproject all coordinates in a GeoJSON from sourceCRS to WGS84. */
export function reprojectGeoJSONWith(geojson: any, sourceCRS: string): any {
  const transform = (coords: any): any => {
    if (!Array.isArray(coords)) return coords;
    if (typeof coords[0] === 'number') {
      try {
        const [lon, lat] = proj4(sourceCRS, 'EPSG:4326', [coords[0], coords[1]]);
        if (!isValidWGS84(lon, lat)) return null; // signal invalid
        return [lon, lat];
      } catch {
        return null;
      }
    }
    return coords.map(transform).filter((c: any) => c !== null);
  };

  const transformGeometry = (geom: any): any => {
    if (!geom) return geom;
    const coords = transform(geom.coordinates);
    // Validate that the geometry still has enough coordinates after filtering
    if (!coords || (Array.isArray(coords) && coords.length === 0)) return null;
    if (geom.type === 'LineString' && coords.length < 2) return null;
    if (geom.type === 'Polygon' && (coords.length === 0 || coords[0].length < 4)) return null;
    if (geom.type === 'MultiPolygon' && coords.length === 0) return null;
    return { ...geom, coordinates: coords };
  };

  if (geojson.type === 'FeatureCollection') {
    return {
      ...geojson,
      features: geojson.features
        .map((f: any) => {
          const geometry = transformGeometry(f.geometry);
          if (!geometry) return null;
          return { ...f, geometry };
        })
        .filter(Boolean),
    };
  }
  if (geojson.type === 'Feature') {
    const geometry = transformGeometry(geojson.geometry);
    if (!geometry) return null;
    return { ...geojson, geometry };
  }
  return transformGeometry(geojson);
}

/**
 * Returns true if ALL sampled coordinates in a GeoJSON appear valid WGS84.
 * Used to verify reprojection succeeded.
 */
export function isWGS84Valid(geojson: any): boolean {
  let checked = 0;
  let invalid = 0;
  const check = (coords: any) => {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === 'number') {
      checked++;
      if (!isValidWGS84(coords[0], coords[1])) invalid++;
      return;
    }
    for (const c of coords) {
      check(c);
      if (checked >= 20) return; // sample enough, stop early
    }
  };
  const walkFeature = (f: any) => {
    if (!f?.geometry?.coordinates) return;
    check(f.geometry.coordinates);
  };
  if (geojson?.type === 'FeatureCollection') geojson.features?.forEach(walkFeature);
  else if (geojson?.type === 'Feature') walkFeature(geojson);
  else if (geojson?.coordinates) check(geojson.coordinates);
  return checked === 0 || invalid === 0;
}

/**
 * Reproyecta una capa vectorial a WGS84 si está en coordenadas proyectadas.
 * 1. Intenta detectar el EPSG o CRS desde el WKT del archivo .prj.
 * 2. Si no hay EPSG o falla, intenta usar el string WKT con proj4.
 * 3. Si no hay .prj o es desconocido, ¡utiliza automáticamente el sistema de proyección del PROYECTO actual!
 */
export async function reprojectVectorIfNeeded(geojson: any, prjWkt: string | null, layerName: string): Promise<any> {
  if (!looksProjected(geojson) && isWGS84Valid(geojson)) {
    return geojson;
  }

  let reprojected: any = null;

  if (prjWkt) {
    const epsgCode = detectCRSFromPrj(prjWkt);
    if (epsgCode) {
      await loadCRS(epsgCode);
      if (proj4.defs(epsgCode)) {
        useStore.getState().addLog(`Reproyectando ${layerName}: ${epsgCode} → WGS84.`);
        reprojected = reprojectGeoJSONWith(geojson, epsgCode);
      }
    }

    if (!reprojected || !isWGS84Valid(reprojected)) {
      try {
        useStore.getState().addLog(`Reproyectando ${layerName}: WKT → WGS84.`);
        reprojected = reprojectGeoJSONWith(geojson, prjWkt);
      } catch { /* ignorable */ }
    }
  }

  // Respaldo definitivo: usar el sistema de proyección del proyecto (ej. POSGAR, UTM)
  if (!reprojected || !isWGS84Valid(reprojected)) {
    const projectCRS = useStore.getState().crs;
    await loadCRS(projectCRS);
    if (proj4.defs(projectCRS)) {
      useStore.getState().addLog(`Capa "${layerName}" georreferenciada utilizando el sistema de proyección del proyecto (${projectCRS}).`);
      reprojected = reprojectGeoJSONWith(geojson, projectCRS);
    }
  }

  if (reprojected && isWGS84Valid(reprojected)) {
    return reprojected;
  }

  if (!isWGS84Valid(geojson)) {
    useStore.getState().addLog(`Advertencia: No se pudo verificar la georreferenciación de ${layerName}. Verifique el archivo .prj o el CRS del proyecto.`);
  }

  return geojson;
}

// ── Add layer helper ─────────────────────────────────────────────

export function addLayer(name: string, geojson: any) {
  useStore.getState().addShapefile({
    id: `${name}-${Date.now()}`,
    name,
    data: geojson,
    visible: true,
    opacity: 1,
    color: '#8b5cf6',
    weight: 2,
    fillOpacity: 0.1,
  });
  useStore.getState().addLog(`Archivo ${name} cargado exitosamente.`);
}

// ── Public entry points ──────────────────────────────────────────

/**
 * Load one or more vector files. Supports:
 *   - .shp (+ optional companion .dbf / .prj in the same FileList)
 *   - .dxf
 *   - .zip (shapefile bundle)
 *   - .geojson / .json
 *   - .kml / .kmz / .gpx
 */
export async function loadVectorFiles(fileList: FileList | File[]) {
  const files = Array.from(fileList);

  // Group .shp bundles (each .shp with its companions)
  const shpFiles = files.filter(f => f.name.toLowerCase().endsWith('.shp'));

  if (shpFiles.length > 0) {
    // Companion extensions that shpjs needs
    const companions = files.filter(f => /\.(dbf|prj|shx|cpg)$/i.test(f.name));
    for (const shpFile of shpFiles) {
      const baseName = shpFile.name.replace(/\.shp$/i, '');
      const related = companions.filter(f =>
        f.name.toLowerCase().startsWith(baseName.toLowerCase() + '.')
      );
      const bundle = [shpFile, ...related];
      try {
        // Read .prj WKT before bundling so we can reproject if shpjs fails
        const prjFile = related.find(f => f.name.toLowerCase().endsWith('.prj'));
        const prjWkt = prjFile ? await prjFile.text() : null;

        // Excluir el .prj del bundle que le pasamos a shpjs para evitar que su proj4 interno obsoleto distorsione las coordenadas
        const bundleWithoutPrj = [shpFile, ...related.filter(f => !f.name.toLowerCase().endsWith('.prj'))];
        const zipBuf = await bundleShpFiles(bundleWithoutPrj);
        let geojson: any = await shp(zipBuf);

        geojson = await reprojectVectorIfNeeded(geojson, prjWkt, shpFile.name);

        addLayer(shpFile.name, geojson);
      } catch (error: any) {
        useStore.getState().addLog(`Error al cargar ${shpFile.name}: ${error.message ?? 'formato no soportado'}.`);
      }
    }
    // Don't process companion files as standalone layers
    const skipNames = new Set(
      shpFiles.flatMap(f => {
        const base = f.name.replace(/\.shp$/i, '');
        return [f.name, `${base}.dbf`, `${base}.prj`, `${base}.shx`, `${base}.cpg`].map(n => n.toLowerCase());
      })
    );
    const remaining = files.filter(f => !skipNames.has(f.name.toLowerCase()));
    if (remaining.length > 0) await loadVectorFiles(remaining);
    return;
  }

  // Process each remaining file individually
  for (const file of files) {
    await loadShapefile(file);
  }
}

/** Load a single vector file (kept for backward-compat). */
export async function loadShapefile(file: File) {
  try {
    let geojson: any;
    let prjWkt: string | null = null;
    const ext = file.name.toLowerCase().split('.').pop();

    if (ext === 'kml') {
      const text = await file.text();
      const dom = new DOMParser().parseFromString(text, 'text/xml');
      const { kml } = await import('@tmcw/togeojson');
      geojson = kml(dom);

    } else if (ext === 'kmz') {
      const JSZip = (await import('jszip')).default;
      const { kml } = await import('@tmcw/togeojson');
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      const kmlEntry = Object.values(zip.files).find(f => f.name.toLowerCase().endsWith('.kml'));
      if (!kmlEntry) throw new Error('No KML found in KMZ');
      const text = await kmlEntry.async('text');
      const dom = new DOMParser().parseFromString(text, 'text/xml');
      geojson = kml(dom);

    } else if (ext === 'gpx') {
      const text = await file.text();
      const dom = new DOMParser().parseFromString(text, 'text/xml');
      const { gpx } = await import('@tmcw/togeojson');
      geojson = gpx(dom);

    } else if (ext === 'geojson' || ext === 'json') {
      geojson = JSON.parse(await file.text());

    } else if (ext === 'dxf') {
      const DxfParser = (await import('dxf-parser')).default;
      const parser = new DxfParser();
      const text = await file.text();
      const dxf = parser.parseSync(text);
      if (!dxf) throw new Error('No se pudo parsear el DXF');
      geojson = dxfToGeoJSON(dxf as unknown as DXFData);
      if (geojson.features.length === 0) throw new Error('No se encontraron entidades geométricas en el DXF');

    } else {
      // ZIP (shapefile bundle) or unknown — try parseShapefile helper
      const result = await parseShapefile(file);
      geojson = result.geojson;
      prjWkt = result.prjWkt;
    }

    geojson = await reprojectVectorIfNeeded(geojson, prjWkt, file.name);

    addLayer(file.name, geojson);
  } catch (error: any) {
    console.error(error);
    if (error.message === 'no layers found') {
      useStore.getState().addLog(`Error: No se encontraron capas válidas en ${file.name}.`);
    } else {
      useStore.getState().addLog(`Error al cargar ${file.name}: ${error.message ?? 'formato no soportado'}.`);
    }
  }
}
