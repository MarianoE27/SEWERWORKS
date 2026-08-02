export interface DXFPoint {
  x: number;
  y: number;
  z?: number;
}

export interface DXFHeader {
  $EXTMIN?: DXFPoint;
  $EXTMAX?: DXFPoint;
  [key: string]: unknown;
}

export interface DXFEntity {
  type: string;
  layer?: string;
  handle?: string | number;
  position?: DXFPoint;
  vertices?: DXFPoint[];
  center?: DXFPoint;
  radius?: number;
  startAngle?: number;
  endAngle?: number;
  shape?: boolean;
  closed?: boolean;
  controlPoints?: DXFPoint[];
  fitPoints?: DXFPoint[];
  [key: string]: unknown;
}

export interface DXFData {
  header?: DXFHeader;
  entities?: DXFEntity[];
  tables?: unknown;
  blocks?: unknown;
  [key: string]: unknown;
}

export interface GeoJSONGeometry {
  type: 'Point' | 'LineString' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | 'MultiPolygon';
  coordinates: unknown;
}

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: GeoJSONGeometry;
  properties: Record<string, unknown>;
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

/**
 * Transforms parsed DXF entity data into a standard GeoJSON FeatureCollection.
 */
export function dxfToGeoJSON(dxf: DXFData): GeoJSONFeatureCollection {
  const features: GeoJSONFeature[] = [];
  const entities: DXFEntity[] = dxf.entities ?? [];

  for (const entity of entities) {
    try {
      let geometry: GeoJSONGeometry | null = null;

      if (entity.type === 'POINT' && entity.position) {
        geometry = { type: 'Point', coordinates: [entity.position.x, entity.position.y] };

      } else if (entity.type === 'LINE' && entity.vertices && entity.vertices.length >= 2) {
        geometry = {
          type: 'LineString',
          coordinates: [
            [entity.vertices[0].x, entity.vertices[0].y],
            [entity.vertices[1].x, entity.vertices[1].y],
          ],
        };

      } else if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
        const coords = (entity.vertices ?? []).map((v: DXFPoint) => [v.x, v.y]);
        if (coords.length < 2) continue;
        const closed = entity.shape || entity.closed;
        if (closed && coords.length >= 3) {
          if (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1]) {
            coords.push(coords[0]);
          }
          geometry = { type: 'Polygon', coordinates: [coords] };
        } else {
          geometry = { type: 'LineString', coordinates: coords };
        }

      } else if (entity.type === 'ARC' && entity.center && typeof entity.radius === 'number') {
        const { x, y } = entity.center;
        const r = entity.radius;
        const startAngle = (entity.startAngle ?? 0) * (Math.PI / 180);
        const endAngle = (entity.endAngle ?? 360) * (Math.PI / 180);
        const segments = 36;
        let angle = startAngle;
        const step = (endAngle > startAngle ? endAngle - startAngle : endAngle - startAngle + 2 * Math.PI) / segments;
        const coords: number[][] = [];
        for (let i = 0; i <= segments; i++) {
          coords.push([x + r * Math.cos(angle), y + r * Math.sin(angle)]);
          angle += step;
        }
        geometry = { type: 'LineString', coordinates: coords };

      } else if (entity.type === 'CIRCLE' && entity.center && typeof entity.radius === 'number') {
        const { x, y } = entity.center;
        const r = entity.radius;
        const coords: number[][] = [];
        for (let i = 0; i <= 36; i++) {
          const a = (i / 36) * 2 * Math.PI;
          coords.push([x + r * Math.cos(a), y + r * Math.sin(a)]);
        }
        geometry = { type: 'Polygon', coordinates: [coords] };

      } else if (entity.type === 'SPLINE') {
        const coords = (entity.controlPoints ?? entity.fitPoints ?? []).map((v: DXFPoint) => [v.x, v.y]);
        if (coords.length >= 2) geometry = { type: 'LineString', coordinates: coords };

      } else if (entity.type === 'INSERT') {
        // skip block inserts
        continue;
      } else {
        continue;
      }

      if (geometry) {
        features.push({
          type: 'Feature',
          geometry,
          properties: {
            layer: entity.layer ?? '0',
            type: entity.type,
            ...(entity.handle !== undefined && entity.handle !== null ? { handle: String(entity.handle) } : {}),
          },
        });
      }
    } catch {
      // skip malformed entity
    }
  }

  return { type: 'FeatureCollection', features };
}
