export type Tool = 'select' | 'node' | 'conduit' | 'edit' | 'delete' | 'pan';

export type ConduitVisualizationMode = 'state' | 'hRatio' | 'diameter' | 'cover';

export interface LayerVisibility {
  nodes: boolean;
  conduits: boolean;
  backgroundMap: boolean;
  labels: boolean;
  flowArrows: boolean;
}

export type LODLevel = 0 | 1 | 2 | 3;

export interface LODConfig {
  enabled: boolean;
  thresholds: [number, number, number];
}

export const DEFAULT_LOD_CONFIG: LODConfig = {
  enabled: true,
  thresholds: [18, 16, 14], // LOD1 a zoom<18, LOD2 a zoom<16, LOD3 a zoom<14
};

export interface Node {
  id: string;
  name: string;
  x: number;
  y: number;
  ctn: number; // Cota Terreno Natural
  pointFlow?: number; // Caudal puntual (L/s)
  invert?: number; // Cota fondo cámara
  depth?: number; // Profundidad cámara
  inflow?: number; // Caudal total ingresando al nodo (L/s)
  drop?: number; // Salto en la cámara (m)
  hasDropPipe?: boolean; // Requiere cañería de salto
  primaryOutletConduitId?: string; // ID del conduit principal de salida en bifurcaciones
  outletDiversionRatios?: Record<string, number>; // conduitId -> diversion fraction (0.0 to 1.0) or percentage (0 to 100)
  state?: 'ok' | 'warning' | 'error' | 'uncalculated';
  errorMessage?: string;
}

export interface Conduit {
  id: string;
  name: string;
  from: string; // Node ID
  to: string; // Node ID
  length?: number; // Calculated or imposed
  slopeImposed?: number; // Pendiente impuesta (‰)
  dnImposed?: number; // Diámetro impuesto (mm)
  contributingSidewalks?: 0 | 1 | 2; // Veredas de aporte (0, 1, o 2)
  
  // Calculated properties
  dn?: number; // Diámetro nominal (mm)
  slope?: number; // Pendiente adoptada (‰)
  qAporte?: number; // Caudal de aporte propio del tramo (l/s)
  qInfiltration?: number; // Caudal de infiltración del tramo (l/s)
  qUpstream?: number; // Caudal acumulado de aguas arriba (l/s)
  qDesign?: number; // Caudal total de diseño (l/s) = qUpstream + qAporte + qInfiltration
  qFull?: number; // Caudal a sección llena (l/s)
  ql0?: number; // Caudal inicial (L/s)
  qe10?: number; // Caudal a 10 años (L/s)
  qe20?: number; // Caudal a 20 años (L/s)
  velocity0?: number; // Velocidad al año 0 (m/s)
  tractiveForce0?: number; // Fuerza tractiva al año 0 (kg/m²)
  hRatio0?: number; // h/D al año 0
  qRatio?: number; // Q/Qll (basado en QE20)
  hRatio?: number; // h/D
  flowDepth?: number; // Tirante (m)
  velocity?: number; // Velocidad (m/s)
  tractiveForce?: number; // Fuerza tractiva (kg/m²)
  invertIn?: number; // Invertido inicio
  invertOut?: number; // Invertido fin
  coverIn?: number; // Tapada inicio
  coverOut?: number; // Tapada fin
  excavationVol?: number; // Volumen de excavación (m³)
  excavationClass?: '<2.5m' | '2.5-4m' | '>4m';
  state?: 'ok' | 'warning' | 'error' | 'uncalculated';
  errorMessage?: string;
}

export interface DesignParameters {
  projectName: string;
  location: string;
  date: string;
  population0: number; // Población inicial (año 0)
  population10: number; // Población a 10 años
  population20: number; // Población a 20 años
  dotation: number; // l/hab/día
  returnRate: number; // Tasa de vuelco (ej. 0.8)
  industrialCoefficient: number; // (ej. 1.1)
  // Coeficientes ENOHSA
  alpha1: number; // Coeficiente de pico diario
  alpha2: number; // Coeficiente de pico horario
  alpha3: number; // Tercer coeficiente de pico (seguridad/extra)
  beta1: number; // Coeficiente de minoración diario
  beta2: number; // Coeficiente de minoración horario
  babbittCoefficient: number; // Coeficiente de pico total (M) calculable o manual
  manningN: number; // Rugosidad de Manning
  infiltrationRate: number; // l/s/Ha o l/s/km
  minCover: number; // m
  maxCover: number; // m
  maxManholeDistance: number; // m (ENOHSA: 100-120m)
  minDropForBackdrop: number; // m (ENOHSA: 0.50m)
  maxHRatio: number; // h/D (ENOHSA: 0.70 - 0.80)
  minVelocity: number; // m/s
  maxVelocity: number; // m/s
  minTractiveForce: number; // kg/m²
  conduitRepository: DNTableEntry[]; // Repositorio de conductos
  // Colectores
  collectorMinDN: number; // DN mínimo para clasificar como colector (mm)
  collectorMinCover: number; // Tapada mínima para clasificar como colector (m)
  collectorMaxCover: number; // Tapada máxima para clasificar como colector (m)
  elevationProvider?: 'none' | 'opentopodata_srtm30m' | 'open_elevation' | 'open_meteo';
  elevationProviderUrl?: string;
}

export interface ShapefileLayer {
  id: string;
  name: string;
  data: any; // GeoJSON
  visible: boolean;
  opacity: number;
  color: string;
  weight: number;
  fillOpacity: number;
}

export type DemColorScale = 'grayscale' | 'viridis' | 'terrain' | 'elevation' | 'rainbow' | 'hot';

export interface DEMData {
  file: string;
  bbox: number[];
  width: number;
  height: number;
  data: any; // Float32Array or similar
  georaster?: any; // For rendering with georaster-layer-for-leaflet
  visible?: boolean;
  opacity?: number;
  colorScale?: DemColorScale;
  minVal?: number; // Computed min elevation (excluding nodata)
  maxVal?: number; // Computed max elevation (excluding nodata)
}

export interface ContourConfig {
  visible: boolean;
  interval: number;         // intervalo entre curvas (m)
  majorMultiplier: number;  // cada N curvas → curva maestra (e.g. 5)
  color: string;            // color curvas secundarias
  majorColor: string;       // color curvas maestras
  weight: number;           // grosor curvas secundarias
  majorWeight: number;      // grosor curvas maestras
  opacity: number;
  labelVisible: boolean;    // mostrar cotas sobre curvas maestras
  minElev?: number;         // cota mínima a trazar (override DEM minVal)
  maxElev?: number;         // cota máxima a trazar (override DEM maxVal)
}

export const DEFAULT_CONTOUR_CONFIG: ContourConfig = {
  visible: false,
  interval: 1,
  majorMultiplier: 5,
  color: '#6b7280',
  majorColor: '#d97706',
  weight: 1,
  majorWeight: 2,
  opacity: 0.8,
  labelVisible: true,
};

export interface Project {
  nodes: Record<string, Node>;
  conduits: Record<string, Conduit>;
  parameters: DesignParameters;
  shapefiles?: ShapefileLayer[];
  crs?: string;
}

export interface DNTableEntry {
  id: string;
  dn: number; // mm
  iMin: number; // m/m
  di: number; // mm
  trenchWidth: number; // m
}

export const DEFAULT_DN_TABLE: DNTableEntry[] = [
  { id: 'dn-160', dn: 160, iMin: 0.0032, di: 153.6, trenchWidth: 0.50 },
  { id: 'dn-200', dn: 200, iMin: 0.002365, di: 188.2, trenchWidth: 0.50 },
  { id: 'dn-225', dn: 225, iMin: 0.002021, di: 203.4, trenchWidth: 0.50 },
  { id: 'dn-250', dn: 250, iMin: 0.001756, di: 226.2, trenchWidth: 0.50 },
  { id: 'dn-315', dn: 315, iMin: 0.001500, di: 285.0, trenchWidth: 0.60 },
  { id: 'dn-355', dn: 355, iMin: 0.001300, di: 321.2, trenchWidth: 0.70 },
  { id: 'dn-400', dn: 400, iMin: 0.001100, di: 361.8, trenchWidth: 0.80 },
  { id: 'dn-500', dn: 500, iMin: 0.000938, di: 452.4, trenchWidth: 0.90 },
  { id: 'dn-630', dn: 630, iMin: 0.000938, di: 570.0, trenchWidth: 1.20 },
];
