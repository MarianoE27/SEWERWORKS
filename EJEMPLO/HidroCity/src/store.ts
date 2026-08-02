import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Node, Conduit, Subcatchment, ProjectState, SimulationResult, SimulationScenario, Rainfall, MapLayers, RainfallEvent, SimulationSettings, ExternalLayer, RasterLayer, InfiltrationMethod, RunoffTransformMethod } from './types';
import { registerAllProjections, transformGeometryToWGS84, detectCRSFromPrj, PROJECTIONS } from './utils/projections';

interface Store extends ProjectState {
  addNode: (lat: number, lng: number, conduitIdToSplit?: string) => void;
  addConduit: (fromNode: string, toNode: string) => void;
  addSubcatchment: (polygon: [number, number][], outlet: string) => void;
  updateNode: (id: string, data: Partial<Node>) => void;
  updateConduit: (id: string, data: Partial<Conduit>) => void;
  updateSubcatchment: (id: string, data: Partial<Subcatchment>) => void;
  updateRainfall: (data: Partial<Rainfall>) => void;
  deleteElement: (id: string, type: 'Node' | 'Conduit' | 'Subcatchment') => void;
  selectElement: (id: string | null, type: 'Node' | 'Conduit' | 'Subcatchment' | null) => void;
  setActiveTool: (tool: ProjectState['activeTool']) => void;
  toggleMapLayer: (layer: keyof MapLayers) => void;
  fitMapToBounds: () => void;
  runSimulation: () => Promise<void>;
  clearResults: () => void;
  setActiveScenario: (id: string | null) => void;
  removeScenario: (id: string) => void;
  clearScenarios: () => void;
  setScenariosOpen: (open: boolean) => void;
  runAllScenarios: () => Promise<void>;
  resetProject: () => void;
  exportGeoJSON: () => void;
  importGISData: (file: File) => Promise<void>;
  currentTimeStep: number;
  isPlaying: boolean;
  isMaxMode: boolean;
  setIsMaxMode: (isMax: boolean) => void;
  setCurrentTimeStep: (step: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setIsProfileViewerOpen: (isOpen: boolean) => void;
  setReportViewerOpen: (isOpen: boolean) => void;
  autoDelineateSubcatchment: (nodeId: string) => void;
  setCrs: (crs: string) => void;
  setProjectCRS: (crs: string) => void;
  setDisplayCRS: (crs: string) => void;
  aiAnalysis: string | null;
  isAnalyzing: boolean;
  runAIAnalysis: () => Promise<void>;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isSidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  isBottomPanelOpen: boolean;
  setBottomPanelOpen: (open: boolean) => void;
  activeRibbonTab: 'Draw' | 'Hydrology' | 'Maps' | 'Simulation' | 'Results' | 'Settings';
  setActiveRibbonTab: (tab: 'Draw' | 'Hydrology' | 'Maps' | 'Simulation' | 'Results' | 'Settings') => void;

  // Hydrology Actions
  addRainfallEvent: (event: Partial<RainfallEvent>) => void;
  updateRainfallEvent: (id: string, data: Partial<RainfallEvent>) => void;
  deleteRainfallEvent: (id: string) => void;
  setActiveRainfallEvent: (id: string | null) => void;
  setRainfallManagerOpen: (open: boolean) => void;

  // Hydraulic actions
  // Hydraulic actions
  updateSimulationSettings: (data: Partial<SimulationSettings>) => void;
  setSimulationSettingsOpen: (open: boolean) => void;
  defaultInfilMethod: InfiltrationMethod;
  defaultTransformMethod: RunoffTransformMethod;
  setDefaultInfilMethod: (method: InfiltrationMethod) => void;
  setDefaultTransformMethod: (method: RunoffTransformMethod) => void;
  applyGlobalInfilMethod: (method: InfiltrationMethod) => void;
  applyGlobalTransformMethod: (method: RunoffTransformMethod) => void;
  validateProject: () => string[];

  // Layer management
  layerOpacity: Record<string, number>;
  externalLayers: ExternalLayer[];
  isLayerManagerOpen: boolean;
  setLayerManagerOpen: (open: boolean) => void;
  isProjectionPanelOpen: boolean;
  setProjectionPanelOpen: (open: boolean) => void;
  isCNLookupOpen: boolean;
  setCNLookupOpen: (open: boolean) => void;
  applyGlobalCN: (cn: number) => void;
  setLayerOpacity: (layerKey: string, opacity: number) => void;
  addExternalLayer: (layer: Omit<ExternalLayer, 'id'>) => void;
  removeExternalLayer: (id: string) => void;
  updateExternalLayer: (id: string, data: Partial<ExternalLayer>) => void;
  rasterLayers: RasterLayer[];
  addRasterLayer: (layer: Omit<RasterLayer, 'id'>) => void;
  removeRasterLayer: (id: string) => void;
  updateRasterLayer: (id: string, data: Partial<RasterLayer>) => void;
  setElevationSource: (id: string | null) => void;

  // Project Persistence
  saveProject: () => void;
  loadProject: (file: File) => Promise<void>;

  // Console Log
  simulationLog: string[];
  simulationSummary: {
    peakFlow: number;
    totalFlooding: number;
    floodedNodes: number;
    totalRunoff?: number;
  } | null;
  addLogMessage: (msg: string) => void;
  clearLog: () => void;

  // History Actions
  saveHistory: () => void;
  undo: () => void;
  redo: () => void;

  // Results Viewer
  isResultsViewerOpen: boolean;
  setResultsViewerOpen: (open: boolean) => void;
}

const initialNodes: Node[] = [
  { id: 'n1', name: 'Node-1', type: 'Junction', lat: 37.7749, lng: -122.4194, invertElevation: 100, maxDepth: 5, initialDepth: 0, surchargeDepth: 0, pondedArea: 0 },
  { id: 'n2', name: 'Node-2', type: 'Junction', lat: 37.7739, lng: -122.4184, invertElevation: 98, maxDepth: 5, initialDepth: 0, surchargeDepth: 0, pondedArea: 0 },
  { id: 'n3', name: 'Node-3', type: 'Outfall', lat: 37.7729, lng: -122.4174, invertElevation: 95, maxDepth: 5, initialDepth: 0, surchargeDepth: 0, pondedArea: 0 },
];

const initialConduits: Conduit[] = [
  { id: 'c1', name: 'Conduit-1', fromNode: 'n1', toNode: 'n2', length: 150, roughness: 0.013, shape: 'Circular', diameter: 1.0, width: 1.0, height: 1.0, entryLoss: 0, exitLoss: 0, avgLoss: 0, inletOffset: 0, outletOffset: 0, flapGate: false, slope: 1.33 },
  { id: 'c2', name: 'Conduit-2', fromNode: 'n2', toNode: 'n3', length: 150, roughness: 0.013, shape: 'Circular', diameter: 1.2, width: 1.2, height: 1.2, entryLoss: 0, exitLoss: 0, avgLoss: 0, inletOffset: 0, outletOffset: 0, flapGate: false, slope: 2.0 },
];

const initialSubcatchments: Subcatchment[] = [
  { 
    id: 's1', name: 'Subcatchment-1', area: 5, width: 100, slope: 1.5, imperv: 40, outlet: 'n1', 
    polygon: [[37.7760, -122.4210], [37.7760, -122.4180], [37.7745, -122.4180], [37.7745, -122.4210]], 
    infilMethod: 'Horton',
    maxInfilRate: 75, minInfilRate: 12.5, decayConst: 4,
    suctionHead: 90, conductivity: 12.5, initialDeficit: 0.25,
    curveNumber: 85,
    destoreImperv: 2.0, destorePerv: 5.0
  }
];

const initialRainfallEvent: RainfallEvent = {
  id: 're1',
  name: 'Standard Rain',
  type: 'Constant',
  data: [
    { time: 0, value: 50 },
    { time: 2, value: 50 },
    { time: 2.1, value: 0 }
  ],
  timeStep: 5,
  totalDepth: 100,
  peakIntensity: 50
};

const initialSimulationSettings: SimulationSettings = {
  routingMethod: 'Kinematic_Wave',
  duration: 6,
  routingStep: 30,
  runoffStep: 300,
  reportingStep: 300,
  allowSurcharge: true,
  inertialDamping: 'Partial'
};

// Helper to calculate distance between two lat/lng points in meters
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // metres
  const p1 = lat1 * Math.PI/180;
  const p2 = lat2 * Math.PI/180;
  const dp = (lat2-lat1) * Math.PI/180;
  const dl = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Helper to calculate approximate area of a polygon in hectares
const calculateArea = (polygon: [number, number][]) => {
  if (polygon.length < 3) return 0;
  const refLat = polygon[0][0];
  const refLng = polygon[0][1];
  const pts = polygon.map(p => {
    const x = calculateDistance(refLat, refLng, refLat, p[1]) * (p[1] > refLng ? 1 : -1);
    const y = calculateDistance(refLat, refLng, p[0], refLng) * (p[0] > refLat ? 1 : -1);
    return [x, y];
  });
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1];
  }
  return Math.abs(area / 2) / 10000;
};

// Helper to calculate conduit slope in percentage
const calculateConduitSlope = (n1: Node, n2: Node, length: number, inletOffset: number = 0, outletOffset: number = 0) => {
  if (length <= 0) return 0;
  const drop = (n1.invertElevation + inletOffset) - (n2.invertElevation + outletOffset);
  return Number((drop / length * 100).toFixed(2));
};

// Register all proj4 projections at module load time
registerAllProjections();

export const useStore = create<Store>((set, get) => ({
  nodes: initialNodes,
  conduits: initialConduits,
  subcatchments: initialSubcatchments,
  rainfall: { intensity: 50, duration: 2, evaporation: 0 },
  rainfallEvents: [initialRainfallEvent],
  activeRainfallEventId: 're1',
  past: [],
  future: [],
  isRainfallManagerOpen: false,
  simulationSettings: initialSimulationSettings,
  defaultInfilMethod: 'Horton' as InfiltrationMethod,
  defaultTransformMethod: 'SCS_Unit_Hydrograph' as RunoffTransformMethod,
  isSimulationSettingsOpen: false,
  mapLayers: {
    baseMap: true,
    satelliteLayer: false,
    drainageNetwork: true,
    subcatchments: true,
    simulationResults: true,
    wmsLayer: false,
  },
  selectedElementId: null,
  selectedElementType: null,
  isSimulating: false,
  simulationResults: null,
  scenarios: [],
  activeScenarioId: null,
  isScenariosOpen: false,
  isRunningBatch: false,
  batchProgress: { current: 0, total: 0 },
  activeTool: 'Select',
  triggerFitBounds: 0,
  currentTimeStep: 0,
  isPlaying: false,
  isMaxMode: false,
  isProfileViewerOpen: false,
  isReportViewerOpen: false,
  isResultsViewerOpen: false,
  crs: 'EPSG:3857',
  layerOpacity: {
    baseMap: 1,
    satelliteLayer: 1,
    wmsLayer: 0.5,
    drainageNetwork: 1,
    subcatchments: 0.8,
    simulationResults: 1,
  },
  externalLayers: [],
  rasterLayers: [],
  isLayerManagerOpen: false,
  isProjectionPanelOpen: false,
  isCNLookupOpen: false,
  projectCRS: 'EPSG:4326',
  displayCRS: 'EPSG:4326',
  aiAnalysis: null,
  isAnalyzing: false,
  simulationLog: [],
  simulationSummary: null,
  theme: 'dark',
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
  isSidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
  isBottomPanelOpen: true,
  setBottomPanelOpen: (open) => set({ isBottomPanelOpen: open }),
  activeRibbonTab: 'Draw',
  setActiveRibbonTab: (tab) => set({ activeRibbonTab: tab }),
  setResultsViewerOpen: (open) => set({ isResultsViewerOpen: open }),

  // Hydrology Actions
  addRainfallEvent: (event) => {
    const id = uuidv4();
    const newEvent = {
      id,
      name: `Rainfall-${get().rainfallEvents.length + 1}`,
      type: 'Constant' as const,
      data: [],
      timeStep: 5,
      totalDepth: 0,
      peakIntensity: 0,
      ...event
    } as RainfallEvent;
    set((state) => ({ rainfallEvents: [...state.rainfallEvents, newEvent] }));
  },
  updateRainfallEvent: (id, data) => set((state) => ({
    rainfallEvents: state.rainfallEvents.map((e) => e.id === id ? { ...e, ...data } : e)
  })),
  deleteRainfallEvent: (id) => set((state) => ({
    rainfallEvents: state.rainfallEvents.filter((e) => e.id !== id),
    activeRainfallEventId: state.activeRainfallEventId === id ? null : state.activeRainfallEventId
  })),
  setActiveRainfallEvent: (id) => set({ activeRainfallEventId: id }),
  setRainfallManagerOpen: (open) => set({ isRainfallManagerOpen: open }),

  // Hydraulic Actions
  updateSimulationSettings: (data) => set((state) => ({
    simulationSettings: { ...state.simulationSettings, ...data }
  })),
  setSimulationSettingsOpen: (open) => set({ isSimulationSettingsOpen: open }),
  setDefaultInfilMethod: (method) => set({ defaultInfilMethod: method }),
  setDefaultTransformMethod: (method) => set({ defaultTransformMethod: method }),
  applyGlobalInfilMethod: (method) => set(state => ({
    subcatchments: state.subcatchments.map(s => ({ ...s, infilMethod: method })),
    defaultInfilMethod: method,
  })),
  applyGlobalTransformMethod: (method) => set(state => ({
    subcatchments: state.subcatchments.map(s => ({ ...s, transformMethod: method })),
    defaultTransformMethod: method,
  })),

  addNode: (lat, lng, conduitIdToSplit) => {
    get().saveHistory();
    const id = uuidv4();
    const newNode: Node = {
      id,
      name: `Node-${get().nodes.length + 1}`,
      type: 'Junction',
      lat,
      lng,
      invertElevation: 100,
      maxDepth: 5,
      initialDepth: 0,
      surchargeDepth: 0,
      pondedArea: 0
    };

    set((state) => {
      let newNodes = [...state.nodes, newNode];
      let newConduits = [...state.conduits];

      if (conduitIdToSplit) {
        const conduitIndex = newConduits.findIndex(c => c.id === conduitIdToSplit);
        if (conduitIndex !== -1) {
          const originalConduit = newConduits[conduitIndex];
          const fromNode = newNodes.find(n => n.id === originalConduit.fromNode);
          const toNode = newNodes.find(n => n.id === originalConduit.toNode);

          if (fromNode && toNode) {
            const length1 = Math.max(Math.round(calculateDistance(fromNode.lat, fromNode.lng, lat, lng)), 1);
            const length2 = Math.max(Math.round(calculateDistance(lat, lng, toNode.lat, toNode.lng)), 1);
            newConduits[conduitIndex] = { ...originalConduit, toNode: id, length: length1 };
            const newConduit: Conduit = { 
              ...originalConduit, 
              id: uuidv4(), 
              name: `Conduit-${state.conduits.length + 2}`, 
              fromNode: id, 
              toNode: originalConduit.toNode, 
              length: length2 
            };
            newConduits.push(newConduit);
            const totalDist = calculateDistance(fromNode.lat, fromNode.lng, toNode.lat, toNode.lng);
            if (totalDist > 0) {
              const fraction = length1 / totalDist;
              newNode.invertElevation = Math.round((fromNode.invertElevation - fraction * (fromNode.invertElevation - toNode.invertElevation)) * 100) / 100;
            }
          }
        }
      }
      return { nodes: newNodes, conduits: newConduits };
    });

    // Auto-fetch elevation
    fetch(`https://api.opentopodata.org/v1/srtm30m?locations=${lat},${lng}`)
      .then(res => res.json())
      .then(data => {
        if (data.results && data.results[0] && data.results[0].elevation !== null && data.results[0].elevation !== undefined) {
          get().updateNode(id, { invertElevation: Number(data.results[0].elevation.toFixed(2)) });
        }
      })
      .catch(err => console.error('Error auto-fetching elevation for new node:', err));
  },

  addConduit: (fromNode, toNode) => {
    get().saveHistory();
    const nodes = get().nodes;
    const n1 = nodes.find(n => n.id === fromNode);
    const n2 = nodes.find(n => n.id === toNode);
    const length = (n1 && n2) ? Math.max(Math.round(calculateDistance(n1.lat, n1.lng, n2.lat, n2.lng)), 1) : 100;
    const slope = (n1 && n2) ? calculateConduitSlope(n1, n2, length, 0, 0) : 0;
    
    const newConduit: Conduit = {
      id: uuidv4(),
      name: `Conduit-${get().conduits.length + 1}`,
      fromNode, toNode, length, roughness: 0.013, shape: 'Circular', 
      diameter: 1.0, width: 1.0, height: 1.0,
      entryLoss: 0, exitLoss: 0, avgLoss: 0,
      inletOffset: 0, outletOffset: 0, flapGate: false,
      slope
    };
    set((state) => ({ conduits: [...state.conduits, newConduit] }));
  },

  addSubcatchment: (polygon, outlet) => {
    get().saveHistory();
    const area = Math.max(Number(calculateArea(polygon).toFixed(2)), 0.01);
    const newSubcatchment: Subcatchment = {
      id: uuidv4(),
      name: `Subcatchment-${get().subcatchments.length + 1}`,
      area, width: 100, slope: 0.5, imperv: 25, outlet, polygon,
      infilMethod: 'Horton', maxInfilRate: 75, minInfilRate: 12.5, decayConst: 4,
      suctionHead: 90, conductivity: 12.5, initialDeficit: 0.25, curveNumber: 85,
      destoreImperv: 2.0, destorePerv: 5.0
    };
    set((state) => ({ subcatchments: [...state.subcatchments, newSubcatchment] }));
  },

  updateNode: (id, data) => {
    get().saveHistory();
    set((state) => {
    const newNodes = state.nodes.map((n) => (n.id === id ? { ...n, ...data } : n));
    // Recalculate slopes for conduits connected to this node
    const positionChanged = data.lat !== undefined || data.lng !== undefined;
    const newConduits = state.conduits.map((c) => {
      if (c.fromNode === id || c.toNode === id) {
        const n1 = newNodes.find(n => n.id === c.fromNode);
        const n2 = newNodes.find(n => n.id === c.toNode);
        if (n1 && n2) {
          const newLength = positionChanged
            ? Math.max(Math.round(calculateDistance(n1.lat, n1.lng, n2.lat, n2.lng)), 1)
            : c.length;
          return { ...c, length: newLength, slope: calculateConduitSlope(n1, n2, newLength, c.inletOffset, c.outletOffset) };
        }
      }
      return c;
    });
    return { nodes: newNodes, conduits: newConduits };
  });
  },

  updateConduit: (id, data) => {
    get().saveHistory();
    set((state) => {
    const newConduits = state.conduits.map((c) => {
      if (c.id === id) {
        const updated = { ...c, ...data };
        const n1 = state.nodes.find(n => n.id === updated.fromNode);
        const n2 = state.nodes.find(n => n.id === updated.toNode);
        if (n1 && n2) {
          // Recalculate length when endpoints change
          if (data.fromNode !== undefined || data.toNode !== undefined) {
            updated.length = Math.max(Math.round(calculateDistance(n1.lat, n1.lng, n2.lat, n2.lng)), 1);
          }
          updated.slope = calculateConduitSlope(n1, n2, updated.length, updated.inletOffset, updated.outletOffset);
        }
        return updated;
      }
      return c;
    });
    return { conduits: newConduits };
  });
  },
  updateSubcatchment: (id, data) => {
    get().saveHistory();
    set((state) => ({ subcatchments: state.subcatchments.map((s) => (s.id === id ? { ...s, ...data } : s)) }));
  },
  updateRainfall: (data) => set((state) => ({ rainfall: { ...state.rainfall, ...data } })),

  deleteElement: (id, type) => {
    get().saveHistory();
    set((state) => {
      if (type === 'Node') {
        return {
          nodes: state.nodes.filter((n) => n.id !== id),
          conduits: state.conduits.filter((c) => c.fromNode !== id && c.toNode !== id),
          subcatchments: state.subcatchments.map(s => s.outlet === id ? { ...s, outlet: '' } : s),
          selectedElementId: state.selectedElementId === id ? null : state.selectedElementId,
          selectedElementType: state.selectedElementId === id ? null : state.selectedElementType,
        };
      } else if (type === 'Conduit') {
        return {
          conduits: state.conduits.filter((c) => c.id !== id),
          selectedElementId: state.selectedElementId === id ? null : state.selectedElementId,
          selectedElementType: state.selectedElementId === id ? null : state.selectedElementType,
        };
      } else if (type === 'Subcatchment') {
        return {
          subcatchments: state.subcatchments.filter((s) => s.id !== id),
          selectedElementId: state.selectedElementId === id ? null : state.selectedElementId,
          selectedElementType: state.selectedElementId === id ? null : state.selectedElementType,
        };
      }
      return state;
    });
  },

  selectElement: (id, type) => set({ selectedElementId: id, selectedElementType: type }),
  setActiveTool: (tool) => set({ activeTool: tool, selectedElementId: null, selectedElementType: null }),
  toggleMapLayer: (layer) => set((state) => {
    const newLayers = { ...state.mapLayers, [layer]: !state.mapLayers[layer] };
    if (layer === 'baseMap' && newLayers.baseMap) newLayers.satelliteLayer = false;
    if (layer === 'satelliteLayer' && newLayers.satelliteLayer) newLayers.baseMap = false;
    return { mapLayers: newLayers };
  }),
  fitMapToBounds: () => set((state) => ({ triggerFitBounds: state.triggerFitBounds + 1 })),

  runSimulation: async () => {
    set({ isSimulating: true, simulationResults: null });
    get().addLogMessage(`Starting simulation: ${get().nodes.length} nodes, ${get().conduits.length} conduits, ${get().subcatchments.length} subcatchments...`);
    
    // Pre-simulation validation
    const validationErrors = get().validateProject();
    if (validationErrors.length > 0) {
      get().addLogMessage('ERROR: Project validation failed before simulation.');
      validationErrors.forEach(err => get().addLogMessage(`  - ${err}`));
      get().setBottomPanelOpen(true);
      set({ isSimulating: false });
      return;
    }

    try {
      const { nodes, conduits, subcatchments, rainfall, rainfallEvents, activeRainfallEventId, simulationSettings } = get();
        console.log('Running simulation with conduits:', conduits.map(c => ({ id: c.id, slope: c.slope })));
      const activeRainfall = rainfallEvents.find(e => e.id === activeRainfallEventId);
      
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, conduits, subcatchments, rainfall, activeRainfall, simulationSettings }),
      });
      const data = await response.json();
      if (data.success) {
        const totalFlooding = Object.values(data.results.nodes as Record<string, any>).reduce((acc: number, n: any) => acc + n.flooding, 0);
        const floodedCount = Object.values(data.results.nodes as Record<string, any>).filter((n: any) => n.flooding > 0).length;
        const peakFlow = Object.values(data.results.conduits as Record<string, any>).length > 0
          ? Math.max(...Object.values(data.results.conduits as Record<string, any>).map((c: any) => c.qFull))
          : 0;
        const maxNodeDepth = Object.values(data.results.nodes as Record<string, any>).reduce((acc: number, n: any) => Math.max(acc, n.depth), 0);

        const { rainfallEvents, activeRainfallEventId } = get();
        const activeRainfall = rainfallEvents.find(e => e.id === activeRainfallEventId);
        const scenario: SimulationScenario = {
          id: uuidv4(),
          name: activeRainfall?.name ?? 'Manual simulation',
          rainfallEventId: activeRainfallEventId,
          rainfallEventName: activeRainfall?.name ?? 'No event',
          createdAt: new Date().toISOString(),
          results: data.results,
          summary: { peakFlow, totalFlooding, floodedNodes: floodedCount, maxNodeDepth },
        };

        get().addLogMessage('SIMULATION SUCCESSFUL');
        get().addLogMessage(`  Peak flow: ${peakFlow.toFixed(3)} m³/s | Total flooding: ${totalFlooding.toFixed(3)} m³/s | Flooded nodes: ${floodedCount}`);
        if (floodedCount > 0) {
          get().addLogMessage(`  WARNING: ${floodedCount} node(s) detected with flooding.`);
        }

        set({
          scenarios: [...get().scenarios, scenario],
          activeScenarioId: scenario.id,
          simulationResults: data.results,
          simulationSummary: { peakFlow, totalFlooding, floodedNodes: floodedCount },
          mapLayers: { ...get().mapLayers, simulationResults: true },
          currentTimeStep: 0,
          isMaxMode: false,
        });
      } else {
        get().addLogMessage(`ERROR: Simulation failed – ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error simulation:', error);
      get().addLogMessage('ERROR: Could not reach simulation server.');
    }
    finally { set({ isSimulating: false }); }
  },

  validateProject: () => {
    const { nodes, conduits, subcatchments } = get();
    const errors: string[] = [];

    if (nodes.length === 0) errors.push('Project has no nodes.');

    conduits.forEach(c => {
      const fromExists = nodes.some(n => n.id === c.fromNode);
      const toExists = nodes.some(n => n.id === c.toNode);
      if (!fromExists) errors.push(`Conduit '${c.name}' is missing 'from' node.`);
      if (!toExists) errors.push(`Conduit '${c.name}' is missing 'to' node.`);
    });

    subcatchments.forEach(s => {
      if (!s.outlet) {
        errors.push(`Subcatchment '${s.name}' has no assigned outlet.`);
      } else {
        const outletExists = nodes.some(n => n.id === s.outlet);
        if (!outletExists) errors.push(`Subcatchment '${s.name}' outlet node is missing.`);
      }
    });

    return errors;
  },

  clearResults: () => set({ simulationResults: null, currentTimeStep: 0, isPlaying: false }),

  setActiveScenario: (id) => {
    if (id === null) {
      set({ activeScenarioId: null, simulationResults: null });
      return;
    }
    const scenario = get().scenarios.find(s => s.id === id);
    if (!scenario) return;
    set({
      activeScenarioId: id,
      simulationResults: scenario.results,
      simulationSummary: scenario.summary,
      currentTimeStep: 0,
      isMaxMode: false,
      mapLayers: { ...get().mapLayers, simulationResults: true },
    });
  },

  removeScenario: (id) => {
    const { scenarios, activeScenarioId } = get();
    const remaining = scenarios.filter(s => s.id !== id);
    if (activeScenarioId === id) {
      const last = remaining[remaining.length - 1];
      set({
        scenarios: remaining,
        activeScenarioId: last?.id ?? null,
        simulationResults: last?.results ?? null,
        simulationSummary: last?.summary ?? null,
      });
    } else {
      set({ scenarios: remaining });
    }
  },

  clearScenarios: () => set({
    scenarios: [],
    activeScenarioId: null,
    simulationResults: null,
    simulationSummary: null,
    currentTimeStep: 0,
    isPlaying: false,
  }),

  setScenariosOpen: (open) => set({ isScenariosOpen: open }),

  runAllScenarios: async () => {
    const { rainfallEvents, nodes, conduits, subcatchments, rainfall, simulationSettings } = get();
    if (rainfallEvents.length === 0) {
      get().addLogMessage('ERROR: No rainfall events defined to run.');
      return;
    }
    const validationErrors = get().validateProject();
    if (validationErrors.length > 0) {
      get().addLogMessage('ERROR: Project validation failed.');
      validationErrors.forEach(err => get().addLogMessage(`  - ${err}`));
      return;
    }

    set({ isRunningBatch: true, isSimulating: true, batchProgress: { current: 0, total: rainfallEvents.length } });
    get().addLogMessage(`Starting batch: ${rainfallEvents.length} scenarios...`);

    const newScenarios: SimulationScenario[] = [];

    for (let i = 0; i < rainfallEvents.length; i++) {
      const event = rainfallEvents[i];
      set({ batchProgress: { current: i + 1, total: rainfallEvents.length } });
      get().addLogMessage(`  [${i + 1}/${rainfallEvents.length}] Running: ${event.name}`);

      try {
        const response = await fetch('/api/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nodes, conduits, subcatchments, rainfall, activeRainfall: event, simulationSettings }),
        });
        const data = await response.json();
        if (data.success) {
          const totalFlooding = Object.values(data.results.nodes as Record<string, any>).reduce((acc: number, n: any) => acc + n.flooding, 0);
          const floodedCount = Object.values(data.results.nodes as Record<string, any>).filter((n: any) => n.flooding > 0).length;
          const peakFlow = Object.values(data.results.conduits as Record<string, any>).length > 0
            ? Math.max(...Object.values(data.results.conduits as Record<string, any>).map((c: any) => c.qFull))
            : 0;
          const maxNodeDepth = Object.values(data.results.nodes as Record<string, any>).reduce((acc: number, n: any) => Math.max(acc, n.depth), 0);
          const scenario: SimulationScenario = {
            id: uuidv4(),
            name: event.name,
            rainfallEventId: event.id,
            rainfallEventName: event.name,
            createdAt: new Date().toISOString(),
            results: data.results,
            summary: { peakFlow, totalFlooding, floodedNodes: floodedCount, maxNodeDepth },
          };
          newScenarios.push(scenario);
          get().addLogMessage(`    ✓ Q pico=${peakFlow.toFixed(3)} m³/s, Inundados=${floodedCount}`);
        } else {
          get().addLogMessage(`    ✗ Error: ${data.error || 'Unknown'}`);
        }
      } catch {
        get().addLogMessage(`    ✗ Network error for scenario: ${event.name}`);
      }
    }

    const allScenarios = [...get().scenarios, ...newScenarios];
    const lastScenario = newScenarios[newScenarios.length - 1];
    get().addLogMessage(`Batch complete: ${newScenarios.length}/${rainfallEvents.length} successful.`);

    set({
      scenarios: allScenarios,
      isRunningBatch: false,
      isSimulating: false,
      batchProgress: { current: 0, total: 0 },
      ...(lastScenario ? {
        activeScenarioId: lastScenario.id,
        simulationResults: lastScenario.results,
        simulationSummary: lastScenario.summary,
        mapLayers: { ...get().mapLayers, simulationResults: true },
        currentTimeStep: 0,
        isMaxMode: false,
        isScenariosOpen: true,
      } : {}),
    });
  },

  addLogMessage: (msg) => set((state) => ({ simulationLog: [...state.simulationLog, `[${new Date().toLocaleTimeString()}] ${msg}`] })),
  clearLog: () => set({ simulationLog: [] }),

  saveProject: () => {
    const state = get();
    const projectData = {
      nodes: state.nodes,
      conduits: state.conduits,
      subcatchments: state.subcatchments,
      rainfall: state.rainfall,
      rainfallEvents: state.rainfallEvents,
      activeRainfallEventId: state.activeRainfallEventId,
      simulationSettings: state.simulationSettings,
      crs: state.crs,
      projectCRS: state.projectCRS,
      displayCRS: state.displayCRS,
      layerOpacity: state.layerOpacity,
      externalLayers: state.externalLayers,
      version: '1.2.0',
      savedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hidrocity_project_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    get().addLogMessage('Project saved successfully');
  },

  loadProject: async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.nodes || !data.conduits) {
        get().addLogMessage('ERROR: Invalid project file format.');
        return;
      }
      get().saveHistory();
      set({
        nodes: data.nodes || [],
        conduits: data.conduits || [],
        subcatchments: data.subcatchments || [],
        rainfall: data.rainfall || get().rainfall,
        rainfallEvents: data.rainfallEvents || [],
        activeRainfallEventId: data.activeRainfallEventId || null,
        simulationSettings: data.simulationSettings || get().simulationSettings,
        crs: data.crs || 'EPSG:4326',
        projectCRS: data.projectCRS || 'EPSG:4326',
        displayCRS: data.displayCRS || 'EPSG:4326',
        layerOpacity: data.layerOpacity || { baseMap: 1, satelliteLayer: 1, wmsLayer: 0.5, drainageNetwork: 1, subcatchments: 0.8, simulationResults: 1 },
        externalLayers: data.externalLayers || [],
        simulationResults: null,
        selectedElementId: null,
        selectedElementType: null,
        currentTimeStep: 0,
        isPlaying: false,
        triggerFitBounds: Date.now()
      });
      get().fitMapToBounds();
      get().addLogMessage(`Project loaded successfully: ${file.name}`);
    } catch (e) {
      console.error(e);
      get().addLogMessage('ERROR: Could not parse project file.');
      alert('Error loading project file.');
    }
  },
  resetProject: () => {
    get().saveHistory();
    set({
      nodes: [],
      conduits: [],
      subcatchments: [],
      simulationResults: null,
      selectedElementId: null,
      selectedElementType: null,
      currentTimeStep: 0,
      isPlaying: false,
    });
  },
  setCurrentTimeStep: (step) => set({ currentTimeStep: step, isMaxMode: false }),
  setIsMaxMode: (isMax) => set({ isMaxMode: isMax, isPlaying: isMax ? false : get().isPlaying }),
  setIsPlaying: (isPlaying) => set({ isPlaying, isMaxMode: isPlaying ? false : get().isMaxMode }),
  setIsProfileViewerOpen: (isOpen) => set({ isProfileViewerOpen: isOpen }),
  setReportViewerOpen: (isOpen) => set({ isReportViewerOpen: isOpen }),
  setCrs: (crs) => set({ crs }),
  setLayerManagerOpen: (open) => set({ isLayerManagerOpen: open }),
  setProjectionPanelOpen: (open) => set({ isProjectionPanelOpen: open }),
  setCNLookupOpen: (open) => set({ isCNLookupOpen: open }),
  applyGlobalCN: (cn) => set(state => ({
    subcatchments: state.subcatchments.map(s => ({ ...s, infilMethod: 'Curve_Number' as const, curveNumber: cn })),
    defaultInfilMethod: 'Curve_Number' as const,
  })),
  setLayerOpacity: (layerKey, opacity) => set((state) => ({
    layerOpacity: { ...state.layerOpacity, [layerKey]: opacity }
  })),
  addExternalLayer: (layer) => set((state) => ({
    externalLayers: [...state.externalLayers, { ...layer, id: uuidv4() }]
  })),
  removeExternalLayer: (id) => set((state) => ({
    externalLayers: state.externalLayers.filter(l => l.id !== id)
  })),
  updateExternalLayer: (id, data) => set((state) => ({
    externalLayers: state.externalLayers.map(l => l.id === id ? { ...l, ...data } : l)
  })),
  addRasterLayer: (layer) => set(state => ({
    rasterLayers: [...state.rasterLayers, { ...layer, id: uuidv4() }],
  })),
  removeRasterLayer: (id) => set(state => ({
    rasterLayers: state.rasterLayers.filter(l => l.id !== id),
  })),
  updateRasterLayer: (id, data) => set(state => ({
    rasterLayers: state.rasterLayers.map(l => l.id === id ? { ...l, ...data } : l),
  })),
  setElevationSource: (id) => set(state => ({
    rasterLayers: state.rasterLayers.map(l => ({ ...l, isElevationSource: l.id === id })),
  })),
  setProjectCRS: (crs) => set({ projectCRS: crs }),
  setDisplayCRS: (crs) => set({ displayCRS: crs }),

  autoDelineateSubcatchment: (nodeId) => {
    const node = get().nodes.find(n => n.id === nodeId);
    if (!node) return;
    const offset = 0.002;
    const polygon: [number, number][] = [
      [node.lat + offset, node.lng - offset],
      [node.lat + offset, node.lng + offset],
      [node.lat - offset, node.lng + offset],
      [node.lat - offset, node.lng - offset]
    ];
    get().addSubcatchment(polygon, nodeId);
  },

  exportGeoJSON: () => {
    const state = get();
    const features: any[] = [];
    state.nodes.forEach(n => features.push({ type: "Feature", geometry: { type: "Point", coordinates: [n.lng, n.lat] }, properties: { ...n, elementType: 'Node' } }));
    state.conduits.forEach(c => {
      const n1 = state.nodes.find(n => n.id === c.fromNode);
      const n2 = state.nodes.find(n => n.id === c.toNode);
      if (n1 && n2) features.push({ type: "Feature", geometry: { type: "LineString", coordinates: [[n1.lng, n1.lat], [n2.lng, n2.lat]] }, properties: { ...c, elementType: 'Conduit' } });
    });
    state.subcatchments.forEach(s => {
      if (s.polygon.length >= 3) {
        const coords = s.polygon.map(p => [p[1], p[0]]);
        coords.push([s.polygon[0][1], s.polygon[0][0]]);
        features.push({ type: "Feature", geometry: { type: "Polygon", coordinates: [coords] }, properties: { ...s, elementType: 'Subcatchment' } });
      }
    });
    const blob = new Blob([JSON.stringify({ type: "FeatureCollection", features }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'hydrocity_project.geojson'; a.click();
    URL.revokeObjectURL(url);
  },

  importGISData: async (file: File) => {
    try {
      let geojson: any = null;
      let detectedCRS = 'EPSG:4326';

      if (file.name.endsWith('.zip')) {
        const buffer = await file.arrayBuffer();

        // Try to extract .prj from ZIP using shpjs internals or DataView
        try {
          // Read ZIP to find .prj file for CRS detection
          const uint8 = new Uint8Array(buffer);
          const textDecoder = new TextDecoder('utf-8');
          // Look for .prj file signature in ZIP central directory
          // Simple heuristic: search for PROJCS or GEOGCS in the raw bytes
          const rawText = textDecoder.decode(uint8);
          const prjMatch = rawText.match(/(?:PROJCS|GEOGCS)\[[\s\S]{10,800}?\]/);
          if (prjMatch) {
            const detected = detectCRSFromPrj(prjMatch[0]);
            if (detected) {
              detectedCRS = detected;
              get().addLogMessage(`Detected CRS from .prj file: ${detected}`);
            }
          }
        } catch (prjErr) {
          console.warn('Could not detect CRS from ZIP:', prjErr);
        }

        const shpjs = (await import('shpjs')).default;
        geojson = await shpjs(buffer);
      } else if (file.name.endsWith('.geojson') || file.name.endsWith('.json')) {
        geojson = JSON.parse(await file.text());

        // Check for CRS in GeoJSON (legacy crs member)
        if (geojson.crs?.properties?.name) {
          const name: string = geojson.crs.properties.name;
          const epsgMatch = name.match(/EPSG[::]+(\d+)/i);
          if (epsgMatch) {
            const code = `EPSG:${epsgMatch[1]}`;
            if (PROJECTIONS.some((p: any) => p.code === code)) {
              detectedCRS = code;
              get().addLogMessage(`Detected CRS from GeoJSON: ${code}`);
            }
          }
        }
      } else {
        get().addLogMessage('ERROR: Unsupported file format. Use .geojson, .json, or .zip (Shapefile).');
        return;
      }

      const features = Array.isArray(geojson) ? geojson.flatMap((g: any) => g.features) : geojson.features;
      if (!features) {
        get().addLogMessage('ERROR: No features found in file.');
        return;
      }

      const newNodes: Node[] = [];
      const newConduits: Conduit[] = [];
      const newSubcatchments: Subcatchment[] = [];

      features.forEach((feature: any) => {
        if (!feature?.geometry) return;

        const geom = detectedCRS !== 'EPSG:4326'
          ? transformGeometryToWGS84(feature.geometry, detectedCRS)
          : feature.geometry;

        const props = feature.properties || {};
        const id = props.id || uuidv4();
        const name = props.name || `Imported-${id.substring(0, 4)}`;

        if (geom.type === 'Point') {
          newNodes.push({
            id, name,
            type: props.type || 'Junction',
            lat: geom.coordinates[1],
            lng: geom.coordinates[0],
            invertElevation: props.invertElevation ?? 100,
            maxDepth: props.maxDepth ?? 5,
            initialDepth: props.initialDepth ?? 0,
            surchargeDepth: 0,
            pondedArea: 0,
          });
        } else if (geom.type === 'LineString') {
          newConduits.push({
            id, name,
            fromNode: props.fromNode || '',
            toNode: props.toNode || '',
            length: props.length ?? 100,
            roughness: props.roughness ?? 0.013,
            shape: props.shape ?? 'Circular',
            diameter: props.diameter ?? 1.0,
            width: props.width ?? 1.0,
            height: props.height ?? 1.0,
            entryLoss: 0, exitLoss: 0, avgLoss: 0,
            inletOffset: 0, outletOffset: 0,
            flapGate: false,
            slope: props.slope ?? 0,
          });
        } else if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
          const coords = geom.type === 'Polygon' ? geom.coordinates[0] : geom.coordinates[0][0];
          const polygon: [number, number][] = coords.map((c: number[]) => [c[1], c[0]] as [number, number]);
          newSubcatchments.push({
            id, name,
            area: props.area ?? calculateArea(polygon),
            width: props.width ?? 100,
            slope: props.slope ?? 1.5,
            imperv: props.imperv ?? 40,
            outlet: props.outlet ?? '',
            polygon,
            infilMethod: props.infilMethod ?? 'Horton',
            maxInfilRate: props.maxInfilRate ?? 75,
            minInfilRate: props.minInfilRate ?? 12.5,
            decayConst: props.decayConst ?? 4,
            suctionHead: props.suctionHead ?? 89,
            conductivity: props.conductivity ?? 12.7,
            initialDeficit: props.initialDeficit ?? 0.25,
            curveNumber: props.curveNumber ?? 80,
            destoreImperv: props.destoreImperv ?? 1.27,
            destorePerv: props.destorePerv ?? 2.54,
          });
        }
      });

      get().saveHistory();
      set((state) => ({
        nodes: [...state.nodes, ...newNodes],
        conduits: [...state.conduits, ...newConduits],
        subcatchments: [...state.subcatchments, ...newSubcatchments],
      }));
      get().fitMapToBounds();
      get().addLogMessage(`Imported: ${newNodes.length} nodes, ${newConduits.length} conduits, ${newSubcatchments.length} subcatchments (CRS: ${detectedCRS})`);
    } catch (error) {
      console.error('Import error:', error);
      get().addLogMessage('ERROR: Failed to import GIS data. Check the browser console for details.');
    }
  },

  saveHistory: () => set((state) => {
    const currentState = {
      nodes: [...state.nodes],
      conduits: [...state.conduits],
      subcatchments: [...state.subcatchments]
    };
    const newPast = [...state.past, currentState].slice(-50); // Keep last 50 states
    return { past: newPast, future: [] };
  }),

  undo: () => set((state) => {
    if (state.past.length === 0) return state;
    const previous = state.past[state.past.length - 1];
    const newPast = state.past.slice(0, state.past.length - 1);
    const current = { nodes: [...state.nodes], conduits: [...state.conduits], subcatchments: [...state.subcatchments] };
    return {
      nodes: previous.nodes,
      conduits: previous.conduits,
      subcatchments: previous.subcatchments,
      past: newPast,
      future: [current, ...state.future].slice(0, 50),
      selectedElementId: null,
      selectedElementType: null,
      simulationResults: null
    };
  }),

  redo: () => set((state) => {
    if (state.future.length === 0) return state;
    const next = state.future[0];
    const newFuture = state.future.slice(1);
    const current = { nodes: [...state.nodes], conduits: [...state.conduits], subcatchments: [...state.subcatchments] };
    return {
      nodes: next.nodes,
      conduits: next.conduits,
      subcatchments: next.subcatchments,
      past: [...state.past, current],
      future: newFuture,
      selectedElementId: null,
      selectedElementType: null,
      simulationResults: null
    };
  }),

  runAIAnalysis: async () => {
    const { nodes, conduits, subcatchments, rainfall, simulationResults } = get();
    if (!simulationResults) { set({ aiAnalysis: "Please run a simulation first." }); return; }
    set({ isAnalyzing: true, aiAnalysis: null });
    try {
      const projectSummary = { nodeCount: nodes.length, conduitCount: conduits.length, subcatchmentCount: subcatchments.length, rainfall, totalFlooding: Object.values(simulationResults.nodes).reduce((acc, n) => acc + n.flooding, 0) };
      const response = await fetch('/api/ai/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(projectSummary) });
      const data = await response.json();
      if (data.success) set({ aiAnalysis: data.analysis });
    } catch (error) { set({ aiAnalysis: "AI advisor error." }); } finally { set({ isAnalyzing: false }); }
  }
}));
