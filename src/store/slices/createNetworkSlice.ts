import { StateCreator } from 'zustand';
import { Node, Conduit, DesignParameters, Project, DEFAULT_DN_TABLE } from '../../types';
import { calculateNetwork as runHydraulicCalculation } from '../../lib/hydraulicEngine';
import { v4 as uuidv4 } from 'uuid';
import { AUTOSAVE_LS_KEY, AUTOSAVE_DEBOUNCE_MS, MAX_HISTORY_SNAPSHOTS, MAX_CONSOLE_LOGS, DEM_NODATA_THRESHOLD } from '../../lib/constants';
import { calculateDistance } from '../../lib/utils';
import { toLatLon } from '../../lib/proj';
import { defaultNetworkNodes, defaultNetworkConduits } from '../../lib/defaultNetwork';
import type { AppState } from '../useStore';

export interface ProjectSnapshot {
  nodes: Record<string, Node>;
  conduits: Record<string, Conduit>;
  parameters: DesignParameters;
  crs?: string;
}

export interface NetworkSlice {
  // Data
  nodes: Record<string, Node>;
  conduits: Record<string, Conduit>;
  parameters: DesignParameters;

  // Undo/Redo
  history: ProjectSnapshot[];
  future: ProjectSnapshot[];
  
  calculationVersion: number;

  // Actions
  addNode: (x: number, y: number) => void;
  updateNode: (id: string, data: Partial<Node>) => void;
  deleteNode: (id: string) => void;
  addConduit: (from: string, to: string) => void;
  updateConduit: (id: string, data: Partial<Conduit>) => void;
  deleteConduit: (id: string) => void;
  updateParameters: (data: Partial<DesignParameters>) => void;
  loadProject: (project: Project) => void;
  clearProject: () => void;
  setNetworkData: (nodes: Record<string, Node>, conduits: Record<string, Conduit>) => void;
  calculateNetwork: () => void;
  undo: () => void;
  redo: () => void;
}

export const defaultParameters: DesignParameters = {
  projectName: 'Nuevo Proyecto',
  location: 'Ciudad',
  date: new Date().toISOString().split('T')[0],
  population0: 1000,
  population10: 1500,
  population20: 2000,
  dotation: 200,
  returnRate: 0.8,
  industrialCoefficient: 1.1,
  alpha1: 1.2,
  alpha2: 1.5,
  alpha3: 1.0,
  beta1: 0.8,
  beta2: 0.5,
  babbittCoefficient: 1.8,
  manningN: 0.013,
  infiltrationRate: 0.1,
  minCover: 1.0,
  maxCover: 5.0,
  maxManholeDistance: 120,
  minDropForBackdrop: 0.5,
  maxHRatio: 0.80,
  minVelocity: 0.6,
  maxVelocity: 5.0,
  minTractiveForce: 0.1,
  conduitRepository: DEFAULT_DN_TABLE,
  collectorMinDN: 315,
  collectorMinCover: 1.5,
  collectorMaxCover: 5.0,
  elevationProvider: 'open_meteo',
  elevationProviderUrl: '',
};

export function cleanSnapshot(state: { nodes?: Record<string, Node>; conduits?: Record<string, Conduit>; parameters?: DesignParameters; crs?: string }): ProjectSnapshot {
  const cleanNodes: Record<string, Node> = {};
  for (const [id, node] of Object.entries(state.nodes || {})) {
    const cleanNode: any = {};
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith('_')) continue;
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null || v === undefined) {
        cleanNode[k] = v;
      }
    }
    cleanNodes[id] = cleanNode as Node;
  }

  const cleanConduits: Record<string, Conduit> = {};
  for (const [id, conduit] of Object.entries(state.conduits || {})) {
    const cleanConduit: any = {};
    for (const [k, v] of Object.entries(conduit)) {
      if (k.startsWith('_')) continue;
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null || v === undefined) {
        cleanConduit[k] = v;
      }
    }
    cleanConduits[id] = cleanConduit as Conduit;
  }

  const cleanParameters: any = {};
  for (const [k, v] of Object.entries(state.parameters || {})) {
    if (k.startsWith('_')) continue;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null || v === undefined) {
      cleanParameters[k] = v;
    } else if (Array.isArray(v)) {
      cleanParameters[k] = v.map((item: any) => typeof item === 'object' && item !== null ? { ...item } : item);
    }
  }

  return {
    nodes: cleanNodes,
    conduits: cleanConduits,
    parameters: cleanParameters as DesignParameters,
    crs: state.crs,
  };
}

export function makeSnapshot(state: { nodes?: Record<string, Node>; conduits?: Record<string, Conduit>; parameters?: DesignParameters; crs?: string }): ProjectSnapshot {
  return cleanSnapshot(state);
}

export function pushHistory(state: { history: ProjectSnapshot[]; nodes?: Record<string, Node>; conduits?: Record<string, Conduit>; parameters?: DesignParameters; crs?: string }): ProjectSnapshot[] {
  let newHistory = [...state.history, cleanSnapshot(state)];
  if (newHistory.length > MAX_HISTORY_SNAPSHOTS) {
    newHistory = newHistory.slice(-MAX_HISTORY_SNAPSHOTS);
  }
  return newHistory;
}

export function loadFromStorage(): Partial<ProjectSnapshot> {
  try {
    const raw = localStorage.getItem(AUTOSAVE_LS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ProjectSnapshot;
  } catch {
    return {};
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
export function scheduleSave(snapshot: { nodes?: Record<string, Node>; conduits?: Record<string, Conduit>; parameters?: DesignParameters; crs?: string }) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const currentCrs = (() => {
        try {
          return JSON.parse(localStorage.getItem(AUTOSAVE_LS_KEY) || '{}').crs;
        } catch { return undefined; }
      })();
      const crsToSave = snapshot.crs || currentCrs || 'EPSG:3857';
      const clean = cleanSnapshot(snapshot);
      clean.crs = crsToSave;
      localStorage.setItem(AUTOSAVE_LS_KEY, JSON.stringify(clean));
    } catch {
      // localStorage might be full or unavailable — fail silently
    }
  }, AUTOSAVE_DEBOUNCE_MS);
}

const persisted = loadFromStorage();

export const createNetworkSlice: StateCreator<AppState, [], [], NetworkSlice> = (set, get) => ({
  nodes: persisted.nodes ?? defaultNetworkNodes,
  conduits: persisted.conduits ?? defaultNetworkConduits,
  parameters: { ...defaultParameters, ...(persisted.parameters || {}) },

  history: [],
  future: [],
  calculationVersion: 0,

  addNode: (x, y) => {
    const id = uuidv4();
    set((state) => {
      const history = pushHistory(state);
      const nodeCount = Object.keys(state.nodes).length + 1;
      const nodes = {
        ...state.nodes,
        [id]: { id, name: `C-${nodeCount}`, x, y, ctn: 100, state: 'uncalculated' as const }
      };
      scheduleSave({ nodes, conduits: state.conduits, parameters: state.parameters });
      return { nodes, history, future: [] };
    });

    const state = get();
    if (!state.dem && state.parameters.elevationProvider && state.parameters.elevationProvider !== 'none') {
      const [lat, lon] = toLatLon(x, y, state.crs);
      get().fetchNodeElevation(id, lat, lon);
    }
  },

  updateNode: (id, data) => {
    set((state) => {
      const newNodes = { ...state.nodes, [id]: { ...state.nodes[id], ...data } };

      let newConduits = state.conduits;
      if (data.x !== undefined || data.y !== undefined) {
        const node = newNodes[id];

        if (state.dem) {
          const { bbox, width, height, data: demData } = state.dem;
          const [minX, minY, maxX, maxY] = bbox;
          if (node.x >= minX && node.x <= maxX && node.y >= minY && node.y <= maxY) {
            const pixelX = Math.floor(((node.x - minX) / (maxX - minX)) * width);
            const pixelY = Math.floor(((maxY - node.y) / (maxY - minY)) * height);
            if (pixelX >= 0 && pixelX < width && pixelY >= 0 && pixelY < height) {
              const value = demData[pixelY * width + pixelX];
              if (value !== undefined && value > DEM_NODATA_THRESHOLD) {
                node.ctn = value;
              }
            }
          }
        }

        newConduits = { ...state.conduits };
        Object.values(newConduits).forEach(c => {
          if (c.from === id || c.to === id) {
            const n1 = newNodes[c.from];
            const n2 = newNodes[c.to];
            if (n1 && n2) {
              const length = calculateDistance(n1.x, n1.y, n2.x, n2.y, state.crs);
              newConduits[c.id] = { ...c, length, state: 'uncalculated' };
            }
          }
        });
      }

      scheduleSave({ nodes: newNodes, conduits: newConduits, parameters: state.parameters });
      return { nodes: newNodes, conduits: newConduits };
    });

    if (data.x !== undefined || data.y !== undefined) {
      const state = get();
      if (!state.dem && state.parameters.elevationProvider && state.parameters.elevationProvider !== 'none') {
        const node = state.nodes[id];
        if (node) {
          const [lat, lon] = toLatLon(node.x, node.y, state.crs);
          get().fetchNodeElevation(id, lat, lon);
        }
      }
    }
  },

  deleteNode: (id) => set((state) => {
    const history = pushHistory(state);
    const newNodes = { ...state.nodes };
    delete newNodes[id];
    const newConduits = { ...state.conduits };
    Object.keys(newConduits).forEach(cId => {
      if (newConduits[cId].from === id || newConduits[cId].to === id) delete newConduits[cId];
    });
    scheduleSave({ nodes: newNodes, conduits: newConduits, parameters: state.parameters });
    return {
      nodes: newNodes,
      conduits: newConduits,
      history,
      future: [],
      selectedElementId: state.selectedElementId === id ? null : state.selectedElementId,
      selectedElementType: state.selectedElementId === id ? null : state.selectedElementType,
    };
  }),

  addConduit: (from, to) => set((state) => {
    if (from === to) return state;
    const exists = Object.values(state.conduits).some(c =>
      (c.from === from && c.to === to) || (c.from === to && c.to === from)
    );
    if (exists) return state;
    const history = pushHistory(state);
    const id = uuidv4();
    const conduitCount = Object.keys(state.conduits).length + 1;
    const n1 = state.nodes[from];
    const n2 = state.nodes[to];
    const length = calculateDistance(n1.x, n1.y, n2.x, n2.y, state.crs);
    const conduits = {
      ...state.conduits,
      [id]: { id, name: `T-${conduitCount}`, from, to, length, state: 'uncalculated' as const }
    };
    scheduleSave({ nodes: state.nodes, conduits, parameters: state.parameters });
    return { conduits, history, future: [] };
  }),

  updateConduit: (id, data) => set((state) => {
    const conduits = { ...state.conduits, [id]: { ...state.conduits[id], ...data } };
    scheduleSave({ nodes: state.nodes, conduits, parameters: state.parameters });
    return { conduits };
  }),

  deleteConduit: (id) => set((state) => {
    const history = pushHistory(state);
    const newConduits = { ...state.conduits };
    delete newConduits[id];
    scheduleSave({ nodes: state.nodes, conduits: newConduits, parameters: state.parameters });
    return {
      conduits: newConduits,
      history,
      future: [],
      selectedElementId: state.selectedElementId === id ? null : state.selectedElementId,
      selectedElementType: state.selectedElementId === id ? null : state.selectedElementType,
    };
  }),

  updateParameters: (data) => set((state) => {
    const parameters = { ...state.parameters, ...data };
    scheduleSave({ nodes: state.nodes, conduits: state.conduits, parameters });
    return { parameters };
  }),

  loadProject: (project) => set((state) => {
    scheduleSave({ nodes: project.nodes, conduits: project.conduits, parameters: project.parameters, crs: project.crs });
    return {
      nodes: project.nodes,
      conduits: project.conduits,
      parameters: project.parameters,
      shapefiles: project.shapefiles || [],
      selectedElementId: null,
      selectedElementType: null,
      history: pushHistory(state),
      future: [],
    };
  }),

  clearProject: () => set((state) => {
    localStorage.removeItem(AUTOSAVE_LS_KEY);
    return {
      nodes: defaultNetworkNodes,
      conduits: defaultNetworkConduits,
      parameters: defaultParameters,
      shapefiles: [],
      selectedElementId: null,
      selectedElementType: null,
      consoleLogs: ['[Sistema] Proyecto limpiado. Listo para empezar.'],
      history: pushHistory(state),
      future: [],
    };
  }),

  setNetworkData: (nodes, conduits) => set({ nodes, conduits }),

  calculateNetwork: () => set((state) => {
    const history = pushHistory(state);
    const logEntry = '[Cálculo] Iniciando simulación hidráulica...';
    const result = runHydraulicCalculation(state.nodes, state.conduits, state.parameters, state.crs);
    const baseLog = [...state.consoleLogs, logEntry];

    if (result.success) {
      const detailedLogs = Object.values(result.conduits)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
        .map(c => 
          `[Cálculo] - ${c.name}: DN ${c.dn}mm | Pendiente: ${(c.slope ?? 0).toFixed(2)}‰ | Q: ${(c.qDesign ?? 0).toFixed(2)} L/s | Vel: ${(c.velocity ?? 0).toFixed(2)} m/s | Estado: ${(c.state ?? 'OK').toUpperCase()}`
        );
      
      const totalExcavation = Object.values(result.conduits).reduce((sum, c) => sum + (c.excavationVol || 0), 0);
      const summaryLog = `[Cálculo] Resumen: Excavación Total = ${totalExcavation.toFixed(2)} m³`;

      const logs = [...baseLog, ...detailedLogs, summaryLog, '[Cálculo] Simulación completada con éxito.'];
      scheduleSave({ nodes: result.nodes, conduits: result.conduits, parameters: state.parameters });
      return {
        nodes: result.nodes,
        conduits: result.conduits,
        consoleLogs: logs.length > MAX_CONSOLE_LOGS ? logs.slice(-MAX_CONSOLE_LOGS) : logs,
        history,
        future: [],
        calculationVersion: state.calculationVersion + 1,
        isBottomPanelOpen: true,
      };
    } else {
      const errorLines = result.errors.map(e => `[Error] ${e}`);
      const logs = [...baseLog, '[Error] La simulación falló.', ...errorLines];
      scheduleSave({ nodes: result.nodes, conduits: result.conduits, parameters: state.parameters });
      return {
        nodes: result.nodes,
        conduits: result.conduits,
        consoleLogs: logs.length > MAX_CONSOLE_LOGS ? logs.slice(-MAX_CONSOLE_LOGS) : logs,
        history,
        future: [],
        calculationVersion: state.calculationVersion + 1,
        isBottomPanelOpen: true,
      };
    }
  }),

  undo: () => set((state) => {
    if (state.history.length === 0) return state;
    const prev = state.history[state.history.length - 1];
    let future = [cleanSnapshot(state), ...state.future];
    if (future.length > MAX_HISTORY_SNAPSHOTS) {
      future = future.slice(-MAX_HISTORY_SNAPSHOTS);
    }
    scheduleSave(prev);
    return {
      nodes: prev.nodes,
      conduits: prev.conduits,
      parameters: prev.parameters,
      history: state.history.slice(0, -1),
      future,
    };
  }),

  redo: () => set((state) => {
    if (state.future.length === 0) return state;
    const next = state.future[0];
    const history = pushHistory(state);
    scheduleSave(next);
    return {
      nodes: next.nodes,
      conduits: next.conduits,
      parameters: next.parameters,
      history,
      future: state.future.slice(1),
    };
  }),
});
