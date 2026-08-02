import proj4 from 'proj4';

export interface ProjectionDef {
  code: string;
  name: string;
  proj4def: string;
  unit: 'degree' | 'metre';
  region?: string;
}

export const PROJECTIONS: ProjectionDef[] = [
  // --- Global ---
  {
    code: 'EPSG:4326',
    name: 'WGS 84 (Geographic)',
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
  {
    code: 'EPSG:5343',
    name: 'POSGAR 2007 / Argentina 1',
    proj4def: '+proj=tmerc +lat_0=-90 +lon_0=-72 +k=1 +x_0=1500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
    unit: 'metre',
    region: 'Argentina',
  },
  {
    code: 'EPSG:5344',
    name: 'POSGAR 2007 / Argentina 2',
    proj4def: '+proj=tmerc +lat_0=-90 +lon_0=-69 +k=1 +x_0=2500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
    unit: 'metre',
    region: 'Argentina',
  },
  {
    code: 'EPSG:5345',
    name: 'POSGAR 2007 / Argentina 3',
    proj4def: '+proj=tmerc +lat_0=-90 +lon_0=-66 +k=1 +x_0=3500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
    unit: 'metre',
    region: 'Argentina',
  },
  {
    code: 'EPSG:5346',
    name: 'POSGAR 2007 / Argentina 4',
    proj4def: '+proj=tmerc +lat_0=-90 +lon_0=-63 +k=1 +x_0=4500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
    unit: 'metre',
    region: 'Argentina',
  },
  {
    code: 'EPSG:5347',
    name: 'POSGAR 2007 / Argentina 5',
    proj4def: '+proj=tmerc +lat_0=-90 +lon_0=-60 +k=1 +x_0=5500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
    unit: 'metre',
    region: 'Argentina',
  },
  {
    code: 'EPSG:5348',
    name: 'POSGAR 2007 / Argentina 6',
    proj4def: '+proj=tmerc +lat_0=-90 +lon_0=-57 +k=1 +x_0=6500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
    unit: 'metre',
    region: 'Argentina',
  },
  {
    code: 'EPSG:5349',
    name: 'POSGAR 2007 / Argentina 7',
    proj4def: '+proj=tmerc +lat_0=-90 +lon_0=-54 +k=1 +x_0=7500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
    unit: 'metre',
    region: 'Argentina',
  },

  // --- Argentina: POSGAR 94 / Gauss-Krüger ---
  {
    code: 'EPSG:22181',
    name: 'POSGAR 94 / Argentina 1 (GK)',
    proj4def: '+proj=tmerc +lat_0=-90 +lon_0=-72 +k=1 +x_0=1500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
    unit: 'metre',
    region: 'Argentina',
  },
  {
    code: 'EPSG:22182',
    name: 'POSGAR 94 / Argentina 2 (GK)',
    proj4def: '+proj=tmerc +lat_0=-90 +lon_0=-69 +k=1 +x_0=2500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
    unit: 'metre',
    region: 'Argentina',
  },
  {
    code: 'EPSG:22183',
    name: 'POSGAR 94 / Argentina 3 (GK)',
    proj4def: '+proj=tmerc +lat_0=-90 +lon_0=-66 +k=1 +x_0=3500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
    unit: 'metre',
    region: 'Argentina',
  },
  {
    code: 'EPSG:22184',
    name: 'POSGAR 94 / Argentina 4 (GK)',
    proj4def: '+proj=tmerc +lat_0=-90 +lon_0=-63 +k=1 +x_0=4500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
    unit: 'metre',
    region: 'Argentina',
  },
  {
    code: 'EPSG:22185',
    name: 'POSGAR 94 / Argentina 5 (GK)',
    proj4def: '+proj=tmerc +lat_0=-90 +lon_0=-60 +k=1 +x_0=5500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
    unit: 'metre',
    region: 'Argentina',
  },
  {
    code: 'EPSG:22186',
    name: 'POSGAR 94 / Argentina 6 (GK)',
    proj4def: '+proj=tmerc +lat_0=-90 +lon_0=-57 +k=1 +x_0=6500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
    unit: 'metre',
    region: 'Argentina',
  },
  {
    code: 'EPSG:22187',
    name: 'POSGAR 94 / Argentina 7 (GK)',
    proj4def: '+proj=tmerc +lat_0=-90 +lon_0=-54 +k=1 +x_0=7500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
    unit: 'metre',
    region: 'Argentina',
  },

  // --- UTM zones (South America) ---
  {
    code: 'EPSG:32717',
    name: 'WGS 84 / UTM zone 17S',
    proj4def: '+proj=utm +zone=17 +south +datum=WGS84 +units=m +no_defs',
    unit: 'metre',
    region: 'UTM',
  },
  {
    code: 'EPSG:32718',
    name: 'WGS 84 / UTM zone 18S',
    proj4def: '+proj=utm +zone=18 +south +datum=WGS84 +units=m +no_defs',
    unit: 'metre',
    region: 'UTM',
  },
  {
    code: 'EPSG:32719',
    name: 'WGS 84 / UTM zone 19S',
    proj4def: '+proj=utm +zone=19 +south +datum=WGS84 +units=m +no_defs',
    unit: 'metre',
    region: 'UTM',
  },
  {
    code: 'EPSG:32720',
    name: 'WGS 84 / UTM zone 20S',
    proj4def: '+proj=utm +zone=20 +south +datum=WGS84 +units=m +no_defs',
    unit: 'metre',
    region: 'UTM',
  },
  {
    code: 'EPSG:32721',
    name: 'WGS 84 / UTM zone 21S',
    proj4def: '+proj=utm +zone=21 +south +datum=WGS84 +units=m +no_defs',
    unit: 'metre',
    region: 'UTM',
  },
  {
    code: 'EPSG:32722',
    name: 'WGS 84 / UTM zone 22S',
    proj4def: '+proj=utm +zone=22 +south +datum=WGS84 +units=m +no_defs',
    unit: 'metre',
    region: 'UTM',
  },

  // --- Europe ---
  {
    code: 'EPSG:25830',
    name: 'ETRS89 / UTM zone 30N',
    proj4def: '+proj=utm +zone=30 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
    unit: 'metre',
    region: 'Europa',
  },
  {
    code: 'EPSG:25831',
    name: 'ETRS89 / UTM zone 31N',
    proj4def: '+proj=utm +zone=31 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
    unit: 'metre',
    region: 'Europa',
  },
];

/**
 * Register all projections with proj4 so they can be used for transforms.
 * Call this once at app startup.
 */
export function registerAllProjections(): void {
  PROJECTIONS.forEach(({ code, proj4def }) => {
    proj4.defs(code, proj4def);
  });
}

/**
 * Transform a coordinate pair from any registered CRS to WGS84 [lng, lat].
 * For EPSG:4326 input, x=longitude, y=latitude.
 * For projected CRS, x=easting, y=northing.
 * Returns [longitude, latitude] in WGS84.
 */
export function toWGS84(x: number, y: number, fromCode: string): [number, number] {
  if (fromCode === 'EPSG:4326') return [x, y];
  const result = proj4(fromCode, 'EPSG:4326', [x, y]);
  return [result[0], result[1]];
}

/**
 * Transform a WGS84 [lng, lat] coordinate to any registered CRS.
 * Returns [x, y] in the target CRS (easting/northing for projected, lon/lat for geographic).
 */
export function fromWGS84(lng: number, lat: number, toCode: string): [number, number] {
  if (toCode === 'EPSG:4326') return [lng, lat];
  const result = proj4('EPSG:4326', toCode, [lng, lat]);
  return [result[0], result[1]];
}

/**
 * Format a WGS84 [lng, lat] coordinate for display in the given CRS.
 */
export function formatCoordinates(lng: number, lat: number, crsCode: string): string {
  try {
    const def = PROJECTIONS.find(p => p.code === crsCode);
    if (!def) return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

    if (def.unit === 'degree') {
      return `${lat.toFixed(6)}°N, ${lng.toFixed(6)}°E`;
    }

    const [x, y] = fromWGS84(lng, lat, crsCode);
    return `E: ${x.toFixed(1)} m, N: ${y.toFixed(1)} m`;
  } catch {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}

/**
 * Attempt to identify a CRS from a .prj file content (WKT string).
 * Returns the EPSG code string or null if not recognized.
 */
export function detectCRSFromPrj(prjContent: string): string | null {
  const wkt = prjContent.trim();

  // Map of known WKT signatures to EPSG codes
  const signatures: [RegExp, string][] = [
    [/POSGAR.*2007.*1|Argentina.*1.*GRS80.*-72/i, 'EPSG:5343'],
    [/POSGAR.*2007.*2|Argentina.*2.*GRS80.*-69/i, 'EPSG:5344'],
    [/POSGAR.*2007.*3|Argentina.*3.*GRS80.*-66/i, 'EPSG:5345'],
    [/POSGAR.*2007.*4|Argentina.*4.*GRS80.*-63/i, 'EPSG:5346'],
    [/POSGAR.*2007.*5|Argentina.*5.*GRS80.*-60/i, 'EPSG:5347'],
    [/POSGAR.*2007.*6|Argentina.*6.*GRS80.*-57/i, 'EPSG:5348'],
    [/POSGAR.*2007.*7|Argentina.*7.*GRS80.*-54/i, 'EPSG:5349'],
    [/POSGAR.*94.*1|Argentina.*1.*GRS80.*1500000/i, 'EPSG:22181'],
    [/POSGAR.*94.*2|Argentina.*2.*GRS80.*2500000/i, 'EPSG:22182'],
    [/POSGAR.*94.*3|Argentina.*3.*GRS80.*3500000/i, 'EPSG:22183'],
    [/POSGAR.*94.*4|Argentina.*4.*GRS80.*4500000/i, 'EPSG:22184'],
    [/POSGAR.*94.*5|Argentina.*5.*GRS80.*5500000/i, 'EPSG:22185'],
    [/POSGAR.*94.*6|Argentina.*6.*GRS80.*6500000/i, 'EPSG:22186'],
    [/POSGAR.*94.*7|Argentina.*7.*GRS80.*7500000/i, 'EPSG:22187'],
    [/UTM.*Zone.*17.*South|zone=17.*south/i, 'EPSG:32717'],
    [/UTM.*Zone.*18.*South|zone=18.*south/i, 'EPSG:32718'],
    [/UTM.*Zone.*19.*South|zone=19.*south/i, 'EPSG:32719'],
    [/UTM.*Zone.*20.*South|zone=20.*south/i, 'EPSG:32720'],
    [/UTM.*Zone.*21.*South|zone=21.*south/i, 'EPSG:32721'],
    [/UTM.*Zone.*22.*South|zone=22.*south/i, 'EPSG:32722'],
    [/GCS_WGS_1984|WGS.*1984.*degree|GEOGCS.*WGS.*84/i, 'EPSG:4326'],
    [/Web_Mercator|Pseudo.*Mercator|Popular.*Mercator/i, 'EPSG:3857'],
  ];

  for (const [pattern, code] of signatures) {
    if (pattern.test(wkt)) return code;
  }

  // Try to extract AUTHORITY node from WKT: AUTHORITY["EPSG","XXXX"]
  const authorityMatch = wkt.match(/AUTHORITY\s*\[\s*["']EPSG["']\s*,\s*["'](\d+)["']\s*\]/i);
  if (authorityMatch) {
    const code = `EPSG:${authorityMatch[1]}`;
    // Check if we know this code
    if (PROJECTIONS.some(p => p.code === code)) return code;
    // Still return it so user can see it, even if we don't have a def
    return code;
  }

  return null;
}

/**
 * Transform a GeoJSON geometry's coordinates from one CRS to WGS84.
 * Modifies coordinates in-place and returns the geometry.
 */
export function transformGeometryToWGS84(geometry: any, fromCode: string): any {
  if (fromCode === 'EPSG:4326') return geometry;

  const transformCoord = (coord: number[]): number[] => {
    const [lng, lat] = toWGS84(coord[0], coord[1], fromCode);
    return coord.length > 2 ? [lng, lat, coord[2]] : [lng, lat];
  };

  const transformRing = (ring: number[][]): number[][] => ring.map(transformCoord);

  switch (geometry.type) {
    case 'Point':
      return { ...geometry, coordinates: transformCoord(geometry.coordinates) };
    case 'LineString':
    case 'MultiPoint':
      return { ...geometry, coordinates: geometry.coordinates.map(transformCoord) };
    case 'Polygon':
    case 'MultiLineString':
      return { ...geometry, coordinates: geometry.coordinates.map(transformRing) };
    case 'MultiPolygon':
      return { ...geometry, coordinates: geometry.coordinates.map((poly: number[][][]) => poly.map(transformRing)) };
    case 'GeometryCollection':
      return { ...geometry, geometries: geometry.geometries.map((g: any) => transformGeometryToWGS84(g, fromCode)) };
    default:
      return geometry;
  }
}

/**
 * Get the ProjectionDef for a given EPSG code, or undefined if not found.
 */
export function getProjectionDef(code: string): ProjectionDef | undefined {
  return PROJECTIONS.find(p => p.code === code);
}

/**
 * Get projections grouped by region.
 */
export function getProjectionsByRegion(): Record<string, ProjectionDef[]> {
  const groups: Record<string, ProjectionDef[]> = {};
  PROJECTIONS.forEach(p => {
    const region = p.region ?? 'Other';
    if (!groups[region]) groups[region] = [];
    groups[region].push(p);
  });
  return groups;
}
