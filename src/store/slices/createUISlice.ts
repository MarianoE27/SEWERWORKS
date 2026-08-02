import { StateCreator } from 'zustand';
import { Tool } from '../../types';
import { MAX_CONSOLE_LOGS } from '../../lib/constants';
import { calculateDistance } from '../../lib/utils';
import { pushHistory, scheduleSave } from './createNetworkSlice';
import type { AppState } from '../useStore';

export interface UISlice {
  // UI State
  activeMainTab: 'inicio' | 'dibujo' | 'analisis' | 'resultados' | 'ayuda';
  isRibbonOpen: boolean;
  activeTool: Tool;
  selectedElementId: string | null;
  selectedElementType: 'node' | 'conduit' | null;
  // Multi-selection
  selectedElementIds: string[];
  selectedElementTypes: Record<string, 'node' | 'conduit'>;
  isBottomPanelOpen: boolean;
  isLayerManagerOpen: boolean;
  isProjectInfoOpen: boolean;
  isReportOpen: boolean;
  isProjectionPanelOpen: boolean;
  isExportModalOpen: boolean;
  exportFormat: 'dxf' | 'landxml' | 'scr' | null;
  activeBottomTab: 'console' | 'profile' | 'advisor' | 'results' | 'design';
  resultsMode: 'docked' | 'floating' | 'popout';
  isResultsFloatingOpen: boolean;
  profileMode: 'docked' | 'floating' | 'popout';
  isProfileFloatingOpen: boolean;
  profileConduitIds: string[];
  designMode: 'docked' | 'floating';
  isHydrologyOpen: boolean;
  isAportesOpen: boolean;
  isNormsOpen: boolean;
  isCatalogOpen: boolean;
  isCollectorsOpen: boolean;
  isAnalysisPanelOpen: boolean;
  activeAnalysisTab: 'hydrology' | 'aportes' | 'norms' | 'catalog' | 'collectors';
  analysisMode: 'docked' | 'floating' | 'popout';
  consoleLogs: string[];
  theme: 'dark' | 'light';
  language?: 'es' | 'en';
  unitSystem?: 'metric' | 'imperial';

  // Actions
  setActiveMainTab: (tab: 'inicio' | 'dibujo' | 'analisis' | 'resultados' | 'ayuda') => void;
  setIsRibbonOpen: (open: boolean) => void;
  setTool: (tool: Tool) => void;
  selectElement: (id: string | null, type: 'node' | 'conduit' | null) => void;
  selectMultiple: (ids: string[], types: Record<string, 'node' | 'conduit'>) => void;
  selectElements: (ids: string[], types?: Record<string, 'node' | 'conduit'>) => void;
  addToSelection: (id: string, type: 'node' | 'conduit') => void;
  removeFromSelection: (id: string) => void;
  clearMultiSelection: () => void;
  deleteSelected: () => void;
  moveSelectedNodes: (dx: number, dy: number) => void;
  setBottomPanelOpen: (open: boolean) => void;
  setIsLayerManagerOpen: (open: boolean) => void;
  setProjectInfoOpen: (open: boolean) => void;
  setReportOpen: (open: boolean) => void;
  setProjectionPanelOpen: (open: boolean) => void;
  openExportModal: (format: 'dxf' | 'landxml' | 'scr') => void;
  closeExportModal: () => void;
  setActiveBottomTab: (tab: 'console' | 'profile' | 'advisor' | 'results' | 'design') => void;
  setResultsMode: (mode: 'docked' | 'floating' | 'popout') => void;
  setIsResultsFloatingOpen: (open: boolean) => void;
  setProfileMode: (mode: 'docked' | 'floating' | 'popout') => void;
  setIsProfileFloatingOpen: (open: boolean) => void;
  setProfileConduitIds: (ids: string[]) => void;
  setDesignMode: (mode: 'docked' | 'floating') => void;
  setIsHydrologyOpen: (open: boolean) => void;
  setIsAportesOpen: (open: boolean) => void;
  setIsNormsOpen: (open: boolean) => void;
  setIsCatalogOpen: (open: boolean) => void;
  setIsCollectorsOpen: (open: boolean) => void;
  setIsAnalysisPanelOpen: (open: boolean) => void;
  setActiveAnalysisTab: (tab: 'hydrology' | 'aportes' | 'norms' | 'catalog' | 'collectors') => void;
  setAnalysisMode: (mode: 'docked' | 'floating' | 'popout') => void;
  addLog: (msg: string) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setLanguage?: (language: 'es' | 'en') => void;
  setUnitSystem?: (unitSystem: 'metric' | 'imperial') => void;
}

function syncSelection(
  ids: string[],
  state: { nodes: Record<string, any>; conduits: Record<string, any> },
  explicitTypes?: Record<string, 'node' | 'conduit'>
) {
  const selectedElementIds = ids;
  const selectedElementTypes: Record<string, 'node' | 'conduit'> = {};
  for (const id of ids) {
    if (explicitTypes && explicitTypes[id]) {
      selectedElementTypes[id] = explicitTypes[id];
    } else if (state.nodes && state.nodes[id]) {
      selectedElementTypes[id] = 'node';
    } else if (state.conduits && state.conduits[id]) {
      selectedElementTypes[id] = 'conduit';
    }
  }
  const selectedElementId = ids.length === 1 ? ids[0] : null;
  const selectedElementType = ids.length === 1 ? (selectedElementTypes[ids[0]] || null) : null;
  return {
    selectedElementIds,
    selectedElementTypes,
    selectedElementId,
    selectedElementType,
  };
}

export const createUISlice: StateCreator<AppState, [], [], UISlice> = (set) => ({
  activeMainTab: 'inicio',
  isRibbonOpen: true,
  activeTool: 'select',
  selectedElementId: null,
  selectedElementType: null,
  selectedElementIds: [],
  selectedElementTypes: {},
  isBottomPanelOpen: true,
  isLayerManagerOpen: false,
  isProjectInfoOpen: false,
  isReportOpen: false,
  isProjectionPanelOpen: false,
  isExportModalOpen: false,
  exportFormat: null,
  activeBottomTab: 'console',
  resultsMode: 'docked',
  isResultsFloatingOpen: false,
  profileMode: 'docked',
  isProfileFloatingOpen: false,
  profileConduitIds: [],
  designMode: 'floating',
  isHydrologyOpen: false,
  isAportesOpen: false,
  isNormsOpen: false,
  isCatalogOpen: false,
  isCollectorsOpen: false,
  isAnalysisPanelOpen: false,
  activeAnalysisTab: 'hydrology',
  analysisMode: 'docked',
  consoleLogs: ['[15:40:11] Sistema inicializado. SewerWorks Pro Core v1.0.42 listo.'],
  theme: 'dark',
  language: 'es',
  unitSystem: 'metric',

  setActiveMainTab: (tab) => set({ activeMainTab: tab }),
  setIsRibbonOpen: (open) => set({ isRibbonOpen: open }),
  setTool: (tool) => set({ activeTool: tool }),
  setIsLayerManagerOpen: (open) => set({ isLayerManagerOpen: open }),
  setProjectInfoOpen: (open) => set({ isProjectInfoOpen: open }),
  setReportOpen: (open) => set({ isReportOpen: open }),
  setProjectionPanelOpen: (open) => set({ isProjectionPanelOpen: open }),
  openExportModal: (format) => set({ isExportModalOpen: true, exportFormat: format }),
  closeExportModal: () => set({ isExportModalOpen: false, exportFormat: null }),
  setResultsMode: (mode) => set({ resultsMode: mode }),
  setIsResultsFloatingOpen: (open) => set({ isResultsFloatingOpen: open }),
  setProfileMode: (mode) => set({ profileMode: mode }),
  setIsProfileFloatingOpen: (open) => set({ isProfileFloatingOpen: open }),
  setProfileConduitIds: (ids) => set({ profileConduitIds: ids }),
  setDesignMode: (mode) => set({ designMode: mode }),
  setIsHydrologyOpen: (open) => set({ isHydrologyOpen: open }),
  setIsAportesOpen: (open) => set({ isAportesOpen: open }),
  setIsNormsOpen: (open) => set({ isNormsOpen: open }),
  setIsCatalogOpen: (open) => set({ isCatalogOpen: open }),
  setIsCollectorsOpen: (open) => set({ isCollectorsOpen: open }),
  setIsAnalysisPanelOpen: (open) => set({ isAnalysisPanelOpen: open }),
  setActiveAnalysisTab: (tab) => set({ activeAnalysisTab: tab }),
  setAnalysisMode: (mode) => set({ analysisMode: mode }),
  setBottomPanelOpen: (open) => set({ isBottomPanelOpen: open }),
  setActiveBottomTab: (tab) => set({ activeBottomTab: tab }),
  setTheme: (theme) => set({ theme }),
  setLanguage: (language) => set({ language }),
  setUnitSystem: (unitSystem) => set({ unitSystem }),

  selectElement: (id, type) => set((state) => {
    if (!id) {
      return {
        selectedElementId: null,
        selectedElementType: null,
        selectedElementIds: [],
        selectedElementTypes: {},
      };
    }
    const types = type ? { [id]: type } : undefined;
    return syncSelection([id], state, types);
  }),

  selectMultiple: (ids, types) => set((state) => syncSelection(ids, state, types)),

  selectElements: (ids, types) => set((state) => syncSelection(ids, state, types)),

  addToSelection: (id, type) => set((state) => {
    if (state.selectedElementIds.includes(id)) {
      const newIds = state.selectedElementIds.filter(x => x !== id);
      const newTypes = { ...state.selectedElementTypes };
      delete newTypes[id];
      return syncSelection(newIds, state, newTypes);
    }
    const newIds = [...state.selectedElementIds, id];
    const newTypes = { ...state.selectedElementTypes, [id]: type };
    return syncSelection(newIds, state, newTypes);
  }),

  removeFromSelection: (id) => set((state) => {
    const newIds = state.selectedElementIds.filter(x => x !== id);
    const newTypes = { ...state.selectedElementTypes };
    delete newTypes[id];
    return syncSelection(newIds, state, newTypes);
  }),

  clearMultiSelection: () => set({
    selectedElementIds: [],
    selectedElementTypes: {},
    selectedElementId: null,
    selectedElementType: null,
  }),

  deleteSelected: () => set((state) => {
    if (state.selectedElementIds.length === 0) return state;
    const history = pushHistory(state);
    const nodeIdsToDelete = state.selectedElementIds.filter(id => state.selectedElementTypes[id] === 'node');
    const conduitIdsToDelete = state.selectedElementIds.filter(id => state.selectedElementTypes[id] === 'conduit');

    const newNodes = { ...state.nodes };
    nodeIdsToDelete.forEach(id => delete newNodes[id]);

    const newConduits = { ...state.conduits };
    conduitIdsToDelete.forEach(id => delete newConduits[id]);
    Object.keys(newConduits).forEach(cId => {
      if (nodeIdsToDelete.includes(newConduits[cId].from) || nodeIdsToDelete.includes(newConduits[cId].to)) {
        delete newConduits[cId];
      }
    });

    scheduleSave({ nodes: newNodes, conduits: newConduits, parameters: state.parameters });
    return {
      nodes: newNodes,
      conduits: newConduits,
      history,
      future: [],
      selectedElementId: null,
      selectedElementType: null,
      selectedElementIds: [],
      selectedElementTypes: {},
    };
  }),

  moveSelectedNodes: (dx, dy) => set((state) => {
    const nodeIds = state.selectedElementIds.filter(id => state.selectedElementTypes[id] === 'node');
    if (nodeIds.length === 0) return state;

    const newNodes = { ...state.nodes };
    nodeIds.forEach(id => {
      if (newNodes[id]) {
        newNodes[id] = { ...newNodes[id], x: newNodes[id].x + dx, y: newNodes[id].y + dy, state: 'uncalculated' };
      }
    });

    const newConduits = { ...state.conduits };
    Object.values(newConduits).forEach(c => {
      if (nodeIds.includes(c.from) || nodeIds.includes(c.to)) {
        const n1 = newNodes[c.from];
        const n2 = newNodes[c.to];
        if (n1 && n2) {
          const length = calculateDistance(n1.x, n1.y, n2.x, n2.y, state.crs);
          newConduits[c.id] = { ...c, length, state: 'uncalculated' };
        }
      }
    });

    scheduleSave({ nodes: newNodes, conduits: newConduits, parameters: state.parameters });
    return { nodes: newNodes, conduits: newConduits };
  }),

  addLog: (msg) => set((state) => {
    const hasTimestamp = /^\[\d{2}:\d{2}:\d{2}\]/.test(msg);
    const logEntry = hasTimestamp ? msg : `[${new Date().toTimeString().split(' ')[0]}] ${msg}`;
    const newLogs = [...state.consoleLogs, logEntry];
    return {
      consoleLogs: newLogs.length > MAX_CONSOLE_LOGS ? newLogs.slice(-MAX_CONSOLE_LOGS) : newLogs,
      isBottomPanelOpen: true
    };
  }),
});
