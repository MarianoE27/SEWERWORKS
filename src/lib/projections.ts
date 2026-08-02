import proj4 from 'proj4';

export interface ProjectionDef {
  code: string;
  name: string;
  proj4def: string;
  unit: 'degree' | 'metre';
  region?: string;
}

export const PROJECTIONS_CATALOG: ProjectionDef[] = [
  // --- Global ---
  {
    code: 'EPSG:4326',
    name: 'WGS 84 (Geográfico)',
    proj4def: '+proj=longlat +datum=WGS84 +no_defs',
    unit: 'degree',
    region: 'Global',
  },
  {
    code: 'EPSG:3857',
    name: 'WGS 84 / Web Mercator',
    proj4def: '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs',
    unit: 'metre',
    region: 'Global',
  },

  // --- Argentina: POSGAR 2007 (fajas) ---
  { code: 'EPSG:5343', name: 'POSGAR 2007 / Argentina 1', proj4def: '+proj=tmerc +lat_0=-90 +lon_0=-72 +k=1 +x_0=1500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs', unit: 'metre', region: 'Argentina' },
  { code: 'EPSG:5344', name: 'POSGAR 2007 / Argentina 2', proj4def: '+proj=tmerc +lat_0=-90 +lon_0=-69 +k=1 +x_0=2500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs', unit: 'metre', region: 'Argentina' },
  { code: 'EPSG:5345', name: 'POSGAR 2007 / Argentina 3', proj4def: '+proj=tmerc +lat_0=-90 +lon_0=-66 +k=1 +x_0=3500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs', unit: 'metre', region: 'Argentina' },
  { code: 'EPSG:5346', name: 'POSGAR 2007 / Argentina 4', proj4def: '+proj=tmerc +lat_0=-90 +lon_0=-63 +k=1 +x_0=4500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs', unit: 'metre', region: 'Argentina' },
  { code: 'EPSG:5347', name: 'POSGAR 2007 / Argentina 5', proj4def: '+proj=tmerc +lat_0=-90 +lon_0=-60 +k=1 +x_0=5500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs', unit: 'metre', region: 'Argentina' },
  { code: 'EPSG:5348', name: 'POSGAR 2007 / Argentina 6', proj4def: '+proj=tmerc +lat_0=-90 +lon_0=-57 +k=1 +x_0=6500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs', unit: 'metre', region: 'Argentina' },
  { code: 'EPSG:5349', name: 'POSGAR 2007 / Argentina 7', proj4def: '+proj=tmerc +lat_0=-90 +lon_0=-54 +k=1 +x_0=7500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs', unit: 'metre', region: 'Argentina' },

  // --- Argentina: POSGAR 94 / Gauss-Krüger ---
  { code: 'EPSG:22181', name: 'POSGAR 94 / Argentina 1 (GK)', proj4def: '+proj=tmerc +lat_0=-90 +lon_0=-72 +k=1 +x_0=1500000 +y_0=0 +ellps=WGS84 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs', unit: 'metre', region: 'Argentina' },
  { code: 'EPSG:22182', name: 'POSGAR 94 / Argentina 2 (GK)', proj4def: '+proj=tmerc +lat_0=-90 +lon_0=-69 +k=1 +x_0=2500000 +y_0=0 +ellps=WGS84 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs', unit: 'metre', region: 'Argentina' },
  { code: 'EPSG:22183', name: 'POSGAR 94 / Argentina 3 (GK)', proj4def: '+proj=tmerc +lat_0=-90 +lon_0=-66 +k=1 +x_0=3500000 +y_0=0 +ellps=WGS84 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs', unit: 'metre', region: 'Argentina' },
  { code: 'EPSG:22184', name: 'POSGAR 94 / Argentina 4 (GK)', proj4def: '+proj=tmerc +lat_0=-90 +lon_0=-63 +k=1 +x_0=4500000 +y_0=0 +ellps=WGS84 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs', unit: 'metre', region: 'Argentina' },
  { code: 'EPSG:22185', name: 'POSGAR 94 / Argentina 5 (GK)', proj4def: '+proj=tmerc +lat_0=-90 +lon_0=-60 +k=1 +x_0=5500000 +y_0=0 +ellps=WGS84 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs', unit: 'metre', region: 'Argentina' },
  { code: 'EPSG:22186', name: 'POSGAR 94 / Argentina 6 (GK)', proj4def: '+proj=tmerc +lat_0=-90 +lon_0=-57 +k=1 +x_0=6500000 +y_0=0 +ellps=WGS84 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs', unit: 'metre', region: 'Argentina' },
  { code: 'EPSG:22187', name: 'POSGAR 94 / Argentina 7 (GK)', proj4def: '+proj=tmerc +lat_0=-90 +lon_0=-54 +k=1 +x_0=7500000 +y_0=0 +ellps=WGS84 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs', unit: 'metre', region: 'Argentina' },

  // --- Argentina: Campo Inchauspe ---
  { code: 'EPSG:22171', name: 'Campo Inchauspe / Argentina 1', proj4def: '+proj=tmerc +lat_0=-90 +lon_0=-72 +k=1 +x_0=1500000 +y_0=0 +ellps=intl +towgs84=-148,136,90,0,0,0,0 +units=m +no_defs', unit: 'metre', region: 'Argentina' },
  { code: 'EPSG:22172', name: 'Campo Inchauspe / Argentina 2', proj4def: '+proj=tmerc +lat_0=-90 +lon_0=-69 +k=1 +x_0=2500000 +y_0=0 +ellps=intl +towgs84=-148,136,90,0,0,0,0 +units=m +no_defs', unit: 'metre', region: 'Argentina' },
  { code: 'EPSG:22173', name: 'Campo Inchauspe / Argentina 3', proj4def: '+proj=tmerc +lat_0=-90 +lon_0=-66 +k=1 +x_0=3500000 +y_0=0 +ellps=intl +towgs84=-148,136,90,0,0,0,0 +units=m +no_defs', unit: 'metre', region: 'Argentina' },
  { code: 'EPSG:22174', name: 'Campo Inchauspe / Argentina 4', proj4def: '+proj=tmerc +lat_0=-90 +lon_0=-63 +k=1 +x_0=4500000 +y_0=0 +ellps=intl +towgs84=-148,136,90,0,0,0,0 +units=m +no_defs', unit: 'metre', region: 'Argentina' },
  { code: 'EPSG:22175', name: 'Campo Inchauspe / Argentina 5', proj4def: '+proj=tmerc +lat_0=-90 +lon_0=-60 +k=1 +x_0=5500000 +y_0=0 +ellps=intl +towgs84=-148,136,90,0,0,0,0 +units=m +no_defs', unit: 'metre', region: 'Argentina' },
  { code: 'EPSG:22176', name: 'Campo Inchauspe / Argentina 6', proj4def: '+proj=tmerc +lat_0=-90 +lon_0=-57 +k=1 +x_0=6500000 +y_0=0 +ellps=intl +towgs84=-148,136,90,0,0,0,0 +units=m +no_defs', unit: 'metre', region: 'Argentina' },
  { code: 'EPSG:22177', name: 'Campo Inchauspe / Argentina 7', proj4def: '+proj=tmerc +lat_0=-90 +lon_0=-54 +k=1 +x_0=7500000 +y_0=0 +ellps=intl +towgs84=-148,136,90,0,0,0,0 +units=m +no_defs', unit: 'metre', region: 'Argentina' },

  // --- UTM zones (South America) ---
  { code: 'EPSG:32717', name: 'WGS 84 / UTM zona 17S', proj4def: '+proj=utm +zone=17 +south +datum=WGS84 +units=m +no_defs', unit: 'metre', region: 'UTM' },
  { code: 'EPSG:32718', name: 'WGS 84 / UTM zona 18S', proj4def: '+proj=utm +zone=18 +south +datum=WGS84 +units=m +no_defs', unit: 'metre', region: 'UTM' },
  { code: 'EPSG:32719', name: 'WGS 84 / UTM zona 19S', proj4def: '+proj=utm +zone=19 +south +datum=WGS84 +units=m +no_defs', unit: 'metre', region: 'UTM' },
  { code: 'EPSG:32720', name: 'WGS 84 / UTM zona 20S', proj4def: '+proj=utm +zone=20 +south +datum=WGS84 +units=m +no_defs', unit: 'metre', region: 'UTM' },
  { code: 'EPSG:32721', name: 'WGS 84 / UTM zona 21S', proj4def: '+proj=utm +zone=21 +south +datum=WGS84 +units=m +no_defs', unit: 'metre', region: 'UTM' },
  { code: 'EPSG:32722', name: 'WGS 84 / UTM zona 22S', proj4def: '+proj=utm +zone=22 +south +datum=WGS84 +units=m +no_defs', unit: 'metre', region: 'UTM' },

  // --- Europe ---
  { code: 'EPSG:25830', name: 'ETRS89 / UTM zona 30N', proj4def: '+proj=utm +zone=30 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs', unit: 'metre', region: 'Europa' },
  { code: 'EPSG:25831', name: 'ETRS89 / UTM zona 31N', proj4def: '+proj=utm +zone=31 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs', unit: 'metre', region: 'Europa' },
];

// Alias for backward compatibility with existing imports across the project
export const PROJECTIONS: ProjectionDef[] = PROJECTIONS_CATALOG;

/**
 * Register all projections with proj4 so they can be used for transforms.
 */
export function registerAllProjections(): void {
  PROJECTIONS_CATALOG.forEach(({ code, proj4def }) => {
    proj4.defs(code, proj4def);
  });
}

/**
 * Format a WGS84 [lng, lat] coordinate for display in the given CRS.
 */
export function formatCoordinates(lng: number, lat: number, crsCode: string): string {
  try {
    const def = PROJECTIONS_CATALOG.find(p => p.code === crsCode);
    if (!def) return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

    if (def.unit === 'degree') {
      return `${lat.toFixed(6)}°, ${lng.toFixed(6)}°`;
    }

    const [x, y] = proj4('EPSG:4326', crsCode, [lng, lat]);
    return `E: ${x.toFixed(1)} m  N: ${y.toFixed(1)} m`;
  } catch {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}

/**
 * Attempt to identify a CRS from a .prj file content (WKT string).
 */
export function detectCRSFromPrj(prjContent: string): string | null {
  const wkt = prjContent.trim();

  // 1. Buscar todos los identificadores EPSG en el WKT (tomar el último, ya que PROJCS está al final y GEOGCS al principio)
  const matches = [...wkt.matchAll(/(?:AUTHORITY|ID)\s*\[\s*["']EPSG["']\s*,\s*["']?(\d+)["']?\s*\]/gi)];
  if (matches.length > 0) {
    return `EPSG:${matches[matches.length - 1][1]}`;
  }

  // 2. Si no hay etiqueta explícita de EPSG, buscar por firmas conocidas en el texto
  const isProjected = /PROJCS|PROJECTEDCRS|PROJCRS|\+proj=(?!longlat)/i.test(wkt);

  const signatures: [RegExp, string][] = [
    [/POSGAR.*2007.*1|Argentina.*1.*GRS80.*-72/i, 'EPSG:5343'],
    [/POSGAR.*2007.*2|Argentina.*2.*GRS80.*-69/i, 'EPSG:5344'],
    [/POSGAR.*2007.*3|Argentina.*3.*GRS80.*-66/i, 'EPSG:5345'],
    [/POSGAR.*2007.*4|Argentina.*4.*GRS80.*-63/i, 'EPSG:5346'],
    [/POSGAR.*2007.*5|Argentina.*5.*GRS80.*-60/i, 'EPSG:5347'],
    [/POSGAR.*2007.*6|Argentina.*6.*GRS80.*-57/i, 'EPSG:5348'],
    [/POSGAR.*2007.*7|Argentina.*7.*GRS80.*-54/i, 'EPSG:5349'],
    [/POSGAR.*94.*1|Argentina.*1.*(WGS.?84|WGS.*84).*1500000/i, 'EPSG:22181'],
    [/POSGAR.*94.*2|Argentina.*2.*(WGS.?84|WGS.*84).*2500000/i, 'EPSG:22182'],
    [/POSGAR.*94.*3|Argentina.*3.*(WGS.?84|WGS.*84).*3500000/i, 'EPSG:22183'],
    [/POSGAR.*94.*4|Argentina.*4.*(WGS.?84|WGS.*84).*4500000/i, 'EPSG:22184'],
    [/POSGAR.*94.*5|Argentina.*5.*(WGS.?84|WGS.*84).*5500000/i, 'EPSG:22185'],
    [/POSGAR.*94.*6|Argentina.*6.*(WGS.?84|WGS.*84).*6500000/i, 'EPSG:22186'],
    [/POSGAR.*94.*7|Argentina.*7.*(WGS.?84|WGS.*84).*7500000/i, 'EPSG:22187'],
    [/Campo.*Inchauspe.*1|Argentina.*1.*(International|intl).*(-72|1500000)/i, 'EPSG:22171'],
    [/Campo.*Inchauspe.*2|Argentina.*2.*(International|intl).*(-69|2500000)/i, 'EPSG:22172'],
    [/Campo.*Inchauspe.*3|Argentina.*3.*(International|intl).*(-66|3500000)/i, 'EPSG:22173'],
    [/Campo.*Inchauspe.*4|Argentina.*4.*(International|intl).*(-63|4500000)/i, 'EPSG:22174'],
    [/Campo.*Inchauspe.*5|Argentina.*5.*(International|intl).*(-60|5500000)/i, 'EPSG:22175'],
    [/Campo.*Inchauspe.*6|Argentina.*6.*(International|intl).*(-57|6500000)/i, 'EPSG:22176'],
    [/Campo.*Inchauspe.*7|Argentina.*7.*(International|intl).*(-54|7500000)/i, 'EPSG:22177'],
    [/UTM.*Zone.*17.*South|zone=17.*south/i, 'EPSG:32717'],
    [/UTM.*Zone.*18.*South|zone=18.*south/i, 'EPSG:32718'],
    [/UTM.*Zone.*19.*South|zone=19.*south/i, 'EPSG:32719'],
    [/UTM.*Zone.*20.*South|zone=20.*south/i, 'EPSG:32720'],
    [/UTM.*Zone.*21.*South|zone=21.*south/i, 'EPSG:32721'],
    [/UTM.*Zone.*22.*South|zone=22.*south/i, 'EPSG:32722'],
    [/Web_Mercator|Pseudo.*Mercator|Popular.*Mercator/i, 'EPSG:3857'],
  ];

  for (const [pattern, code] of signatures) {
    if (pattern.test(wkt)) return code;
  }

  if (!isProjected && /GCS_WGS_1984|WGS.*1984.*degree|GEOGCS.*WGS.*84/i.test(wkt)) {
    return 'EPSG:4326';
  }

  return null;
}

/**
 * Get the ProjectionDef for a given EPSG code.
 */
export function getProjectionDef(code: string): ProjectionDef | undefined {
  return PROJECTIONS_CATALOG.find(p => p.code === code);
}
