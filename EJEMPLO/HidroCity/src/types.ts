export type NodeType = 'Junction' | 'Outfall' | 'Storage';
export type ConduitShape = 'Circular' | 'Rectangular' | 'Trapezoidal' | 'Irregular';
export type RoutingMethod = 'Steady' | 'Kinematic_Wave' | 'Dynamic_Wave';

export interface SimulationSettings {
  routingMethod: RoutingMethod;
  duration: number; // hours
  routingStep: number; // seconds
  runoffStep: number; // seconds
  reportingStep: number; // seconds
  allowSurcharge: boolean;
  inertialDamping: 'None' | 'Partial' | 'Full';
}
export type InfiltrationMethod = 'Horton' | 'Green_Ampt' | 'Curve_Number';
export type RunoffTransformMethod = 'SCS_Unit_Hydrograph' | 'SWMM_NonLinear_Reservoir' | 'Clark_Unit_Hydrograph';

export interface Node {
  id: string;
  name: string;
  type: NodeType;
  lat: number;
  lng: number;
  invertElevation: number;
  maxDepth: number;
  initialDepth: number;
  surchargeDepth: number;
  pondedArea: number;
  
  // Storage specific properties
  storageArea?: number; // m2 (Constant Storage Area)
  storageCurve?: { depth: number, area: number }[]; // Functional Storage Curve
}

export interface Conduit {
  id: string;
  name: string;
  fromNode: string;
  toNode: string;
  length: number;
  roughness: number;
  shape: ConduitShape;
  diameter: number; // For circular
  width: number; // For rectangular/trapezoidal
  height: number; // For rectangular/trapezoidal
  entryLoss: number;
  exitLoss: number;
  avgLoss: number;
  inletOffset: number;
  outletOffset: number;
  flapGate: boolean;
  slope: number;
  parallelCount?: number; // Number of identical conduits in parallel (default 1)
}

export interface Subcatchment {
  id: string;
  name: string;
  area: number; // hectares
  width: number; // meters
  slope: number; // percentage
  imperv: number; // percentage
  outlet: string; // Node ID
  polygon: [number, number][]; // Array of [lat, lng]
  
  // Transformation Method
  transformMethod?: RunoffTransformMethod;

  // Infiltration Method
  infilMethod: InfiltrationMethod;

  // Hydrology - Horton Infiltration
  maxInfilRate: number; // mm/hr
  minInfilRate: number; // mm/hr
  decayConst: number; // 1/hr

  // Hydrology - Green-Ampt
  suctionHead: number; // mm
  conductivity: number; // mm/hr
  initialDeficit: number; // fraction

  // Hydrology - SCS Curve Number
  curveNumber: number;

  // Depression Storage
  destoreImperv: number; // mm
  destorePerv: number; // mm

  // Time of Concentration
  tcMethod?: 'Kirpich' | 'Temez' | 'SCS_Lag' | 'Chow' | 'Bransby_Williams';
  tc?: number;  // calculated result in minutes
  tcL?: number; // channel/basin length in meters (user input)
  tcH?: number; // elevation difference in meters (user input)
}

export type RainfallType = 'Constant' | 'DesignStorm' | 'TimeSeries';
export type StormMethod = 'Chicago' | 'SCS_Type1' | 'SCS_Type2' | 'SCS_Type3' | 'AlternatingBlock';

export interface Rainfall {
  intensity: number; // mm/hr
  duration: number; // hours
  evaporation: number; // mm/day
}

export interface RainfallEvent {
  id: string;
  name: string;
  type: RainfallType;
  data: TimeSeriesPoint[]; // Hyetograph (mm/hr over time)
  timeStep: number; // minutes
  totalDepth: number; // mm
  peakIntensity: number; // mm/hr
  method?: StormMethod;
  parameters?: {
    returnPeriod?: number;
    duration?: number;
    a?: number; b?: number; c?: number; // Chicago IDF
    r?: number; // Chicago peak ratio
    depth?: number; // for SCS
  };
}

export interface MapLayers {
  baseMap: boolean;
  satelliteLayer: boolean;
  drainageNetwork: boolean;
  subcatchments: boolean;
  simulationResults: boolean;
  wmsLayer: boolean;
}

export interface TimeSeriesPoint {
  time: number; // hours (from start of simulation)
  value: number; // flow, depth, or intensity
}

export interface SimulationResult {
  nodes: Record<string, {
    depth: number;
    head: number;
    flooding: number;
    depthSeries: TimeSeriesPoint[];
    inflowSeries: TimeSeriesPoint[];
    floodingSeries: TimeSeriesPoint[];
  }>;
  conduits: Record<string, {
    qFull: number;
    vFull: number;
    slope: number;
    capacity: number;
    flowSeries: TimeSeriesPoint[];
    velocitySeries: TimeSeriesPoint[];
  }>;
  subcatchments: Record<string, {
    runoffSeries: TimeSeriesPoint[];
    precipitationSeries: TimeSeriesPoint[];
    lossesSeries: TimeSeriesPoint[];
    peakRunoff: number;
  }>;
}

export interface SimulationScenario {
  id: string;
  name: string;
  rainfallEventId: string | null;
  rainfallEventName: string;
  createdAt: string;
  results: SimulationResult;
  summary: {
    peakFlow: number;
    totalFlooding: number;
    floodedNodes: number;
    maxNodeDepth: number;
  };
}

export interface HistoryState {
  nodes: Node[];
  conduits: Conduit[];
  subcatchments: Subcatchment[];
}

export interface ProjectState {
  nodes: Node[];
  conduits: Conduit[];
  subcatchments: Subcatchment[];
  past: HistoryState[];
  future: HistoryState[];
  rainfall: Rainfall; // Basic rainfall (legacy/simple)
  rainfallEvents: RainfallEvent[]; // Advanced rainfall management
  activeRainfallEventId: string | null;
  mapLayers: MapLayers;
  selectedElementId: string | null;
  selectedElementType: 'Node' | 'Conduit' | 'Subcatchment' | null;
  isSimulating: boolean;
  simulationResults: SimulationResult | null;
  scenarios: SimulationScenario[];
  activeScenarioId: string | null;
  isScenariosOpen: boolean;
  isRunningBatch: boolean;
  batchProgress: { current: number; total: number };
  activeTool: 'Select' | 'AddNode' | 'AddConduit' | 'AddSubcatchment' | 'Measure';
  triggerFitBounds: number;
  currentTimeStep: number;
  isPlaying: boolean;
  isProfileViewerOpen: boolean;
  isReportViewerOpen: boolean;
  isRainfallManagerOpen: boolean;
  isSimulationSettingsOpen: boolean;
  simulationSettings: SimulationSettings;
  defaultInfilMethod: InfiltrationMethod;
  defaultTransformMethod: RunoffTransformMethod;
  crs: string;
  projectCRS: string;   // CRS used for coordinate input/output (default 'EPSG:4326')
  displayCRS: string;   // CRS used to display cursor coordinates (default 'EPSG:4326')
  isSidebarCollapsed: boolean;
  isBottomPanelOpen: boolean;
  isProjectionPanelOpen: boolean;
  activeRibbonTab: 'Draw' | 'Hydrology' | 'Maps' | 'Simulation' | 'Results' | 'Settings';
  rasterLayers: RasterLayer[];
}

// ── GIS Layer Management ─────────────────────────────────────

export interface ExternalLayerStyle {
  color: string;
  fillColor: string;
  fillOpacity: number;
  weight: number;
  radius: number;
}

export interface ExternalLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  sourceCRS: string;
  geojson: any; // GeoJSON FeatureCollection
  featureCount: number;
  geometryType: 'Point' | 'LineString' | 'Polygon' | 'Mixed';
  style: ExternalLayerStyle;
}

export interface RasterLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  imageUrl: string;        // base64 PNG data URL rendered from the decoded raster
  bounds: [[number, number], [number, number]]; // [[south, west], [north, east]]
  width: number;
  height: number;
  min: number;
  max: number;
  colorMode: 'elevation' | 'grayscale' | 'rgb';
  format: 'geotiff' | 'asc';
  // Downsampled raw float values for cursor sampling (≤256×256, row-major, NaN = nodata)
  // Not serialized to JSON on save/load (user must re-import rasters after loading a project)
  rawValues?: Float32Array;
  rawW?: number;
  rawH?: number;
  isElevationSource?: boolean;
}
