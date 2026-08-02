import { StateCreator } from 'zustand';
import { ShapefileLayer, DEMData, LayerVisibility, ConduitVisualizationMode, ContourConfig, DEFAULT_CONTOUR_CONFIG, LODConfig, DEFAULT_LOD_CONFIG } from '../../types';
import { toLatLon, toXY } from '../../lib/proj';
import { getElevations } from '../../lib/elevationService';
import { pushHistory, scheduleSave, loadFromStorage } from './createNetworkSlice';
import type { AppState } from '../useStore';

function loadLODFromStorage(): LODConfig {
  try {
    const raw = localStorage.getItem('SEWERCAD_LOD_CONFIG');
    if (!raw) return DEFAULT_LOD_CONFIG;
    const config = JSON.parse(raw) as LODConfig;
    if (config.thresholds && config.thresholds[0] === 15) {
      return DEFAULT_LOD_CONFIG;
    }
    return config;
  } catch {
    return DEFAULT_LOD_CONFIG;
  }
}

function saveLODToStorage(config: LODConfig) {
  try {
    localStorage.setItem('SEWERCAD_LOD_CONFIG', JSON.stringify(config));
  } catch {}
}

export interface GISSlice {
  // Data / State
  shapefiles: ShapefileLayer[];
  dem: DEMData | null;
  baseMap: 'cartodb' | 'satellite' | 'osm';
  layers: LayerVisibility;
  crs: string;
  zoomBounds: any | null;
  zoomToFitTrigger: number;
  measureToolActive: boolean;
  measureMode: 'Distance' | 'Area';
  conduitVisualizationMode: ConduitVisualizationMode;
  demHoverValue: number | null;
  contourConfig: ContourConfig;
  isFetchingElevation: boolean;
  lodConfig: LODConfig;
  currentZoom: number;

  // Actions
  triggerZoomToFit: () => void;
  addShapefile: (layer: ShapefileLayer) => void;
  removeShapefile: (id: string) => void;
  setDEM: (dem: DEMData | null) => void;
  setBaseMap: (map: 'cartodb' | 'satellite' | 'osm') => void;
  setLayerVisibility: (layer: keyof LayerVisibility, visible: boolean) => void;
  setCRS: (crs: string) => void;
  updateShapefile: (id: string, updates: Partial<ShapefileLayer>) => void;
  reorderShapefiles: (startIndex: number, endIndex: number) => void;
  updateDEM: (updates: Partial<DEMData>) => void;
  removeDEM: () => void;
  setZoomBounds: (bounds: any) => void;
  setMeasureToolActive: (active: boolean) => void;
  setMeasureMode: (mode: 'Distance' | 'Area') => void;
  setConduitVisualizationMode: (mode: ConduitVisualizationMode) => void;
  setDemHoverValue: (value: number | null) => void;
  updateContourConfig: (updates: Partial<ContourConfig>) => void;
  fetchMissingElevations: () => Promise<void>;
  fetchNodeElevation: (id: string, lat: number, lon: number) => Promise<void>;
  setLodConfig: (config: Partial<LODConfig>) => void;
  setCurrentZoom: (zoom: number) => void;
}

export const createGISSlice: StateCreator<AppState, [], [], GISSlice> = (set, get) => ({
  shapefiles: [],
  dem: null,
  baseMap: 'cartodb',
  layers: {
    nodes: true,
    conduits: true,
    backgroundMap: true,
    labels: true,
    flowArrows: true
  },
  crs: loadFromStorage().crs || 'EPSG:3857',
  zoomBounds: null,
  zoomToFitTrigger: 0,
  measureToolActive: false,
  measureMode: 'Distance',
  conduitVisualizationMode: 'state',
  demHoverValue: null,
  contourConfig: { ...DEFAULT_CONTOUR_CONFIG },
  isFetchingElevation: false,
  lodConfig: loadLODFromStorage(),
  currentZoom: 13,

  setConduitVisualizationMode: (mode) => set({ conduitVisualizationMode: mode }),
  setDemHoverValue: (value) => {
    if (get().demHoverValue === value) return;
    set({ demHoverValue: value });
  },
  updateContourConfig: (updates) => set((state) => ({ contourConfig: { ...state.contourConfig, ...updates } })),
  setZoomBounds: (bounds) => set({ zoomBounds: bounds }),
  setMeasureToolActive: (active) => set({ measureToolActive: active }),
  setMeasureMode: (mode) => set({ measureMode: mode }),
  setLodConfig: (config) => set((state) => {
    const newConfig = { ...state.lodConfig, ...config };
    saveLODToStorage(newConfig);
    return { lodConfig: newConfig };
  }),
  setCurrentZoom: (zoom) => set({ currentZoom: zoom }),

  updateShapefile: (id, updates) => set((state) => ({
    shapefiles: state.shapefiles.map(shp => shp.id === id ? { ...shp, ...updates } : shp)
  })),

  reorderShapefiles: (startIndex, endIndex) => set((state) => {
    const result = Array.from(state.shapefiles);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return { shapefiles: result };
  }),

  updateDEM: (updates) => set((state) => ({
    dem: state.dem ? { ...state.dem, ...updates } : null
  })),

  removeDEM: () => set({ dem: null }),

  triggerZoomToFit: () => set((state) => ({ zoomToFitTrigger: state.zoomToFitTrigger + 1 })),

  addShapefile: (layer) => set((state) => ({
    shapefiles: [...state.shapefiles, layer]
  })),

  removeShapefile: (id) => set((state) => ({
    shapefiles: state.shapefiles.filter(s => s.id !== id)
  })),

  setDEM: (dem) => set({ dem }),

  setBaseMap: (map) => set({ baseMap: map }),

  setLayerVisibility: (layer, visible) => set((state) => ({
    layers: { ...state.layers, [layer]: visible }
  })),

  setCRS: (newCrs) => set((state) => {
    if (state.crs === newCrs) return state;

    // Reproject existing nodes
    const newNodes = { ...state.nodes };
    Object.values(newNodes).forEach(n => {
      const [lat, lon] = toLatLon(n.x, n.y, state.crs);
      const [newX, newY] = toXY(lat, lon, newCrs);
      newNodes[n.id] = { ...n, x: newX, y: newY };
    });

    scheduleSave({ nodes: newNodes, conduits: state.conduits, parameters: state.parameters, crs: newCrs });
    return { 
      crs: newCrs, 
      nodes: newNodes, 
      history: pushHistory(state), 
      future: [],
      zoomToFitTrigger: state.zoomToFitTrigger + 1 // Trigger map pan automatically on projection change
    };
  }),

  fetchNodeElevation: async (id, lat, lon) => {
    const state = get();
    const provider = state.parameters.elevationProvider || 'none';
    if (provider === 'none') return;

    set({ isFetchingElevation: true });
    try {
      const results = await getElevations([{ id, lat, lon }], provider, state.parameters.elevationProviderUrl);
      if (results.length > 0) {
        const elevation = results[0].elevation;
        if (elevation === null || results[0].warning) {
          console.warn(`[Elevación] Falló la obtención para el nodo ${id}: ${results[0].warning || 'Error desconocido'}`);
        }
        set((state) => {
          const node = state.nodes[id];
          if (!node) return {};
          const newNodes = { ...state.nodes, [id]: { ...node, ctn: elevation } };
          scheduleSave({ nodes: newNodes, conduits: state.conduits, parameters: state.parameters });
          return { nodes: newNodes };
        });
      }
    } catch (err) {
      console.error("Error fetching node elevation:", err);
    } finally {
      set({ isFetchingElevation: false });
    }
  },

  fetchMissingElevations: async () => {
    const state = get();
    const provider = state.parameters.elevationProvider || 'none';
    if (provider === 'none') {
      get().addLog('[Cota] No se seleccionó proveedor de altitudes.');
      return;
    }

    const nodesToFetch = Object.values(state.nodes).filter(
      (n) => n.ctn === 100
    );

    if (nodesToFetch.length === 0) {
      get().addLog('[Cota] Todos los nodos ya tienen cotas asignadas.');
      return;
    }

    set({ isFetchingElevation: true });
    get().addLog(`[Cota] Obteniendo altitudes para ${nodesToFetch.length} nodos...`);

    const coords = nodesToFetch.map((n) => {
      const [lat, lon] = toLatLon(n.x, n.y, state.crs);
      return { id: n.id, lat, lon };
    });

    try {
      const results = await getElevations(
        coords,
        provider,
        state.parameters.elevationProviderUrl,
        (progress) => {
          get().addLog(`[Cota] Progreso: ${progress}%`);
        }
      );

      set((state) => {
        const newNodes = { ...state.nodes };
        let hasErrors = false;
        results.forEach((r) => {
          if (r.elevation === null || r.warning) {
            hasErrors = true;
            console.warn(`[Elevación] Falló la obtención para el nodo ${r.id}: ${r.warning || 'Error desconocido'}`);
          }
          if (newNodes[r.id]) {
            newNodes[r.id] = { ...newNodes[r.id], ctn: r.elevation };
          }
        });
        if (hasErrors) {
           get().addLog('[Cota] Ocurrieron errores al obtener algunas altitudes. Revisa la consola.');
        } else {
           get().addLog('[Cota] Altitudes actualizadas correctamente.');
        }
        scheduleSave({ nodes: newNodes, conduits: state.conduits, parameters: state.parameters });
        return { nodes: newNodes };
      });

    } catch (err) {
      console.error("Error in bulk elevation fetching:", err);
      get().addLog('[Cota] Error al obtener altitudes.');
    } finally {
      set({ isFetchingElevation: false });
    }
  }
});
