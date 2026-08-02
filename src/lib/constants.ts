// Centralized constants for SewerWorks

// Map
export const DEFAULT_MAP_CENTER: [number, number] = [-34.9214, -57.9545]; // La Plata, Argentina
export const DEFAULT_MAP_ZOOM = 13;

// Undo/Redo
export const MAX_HISTORY_SNAPSHOTS = 50;

// Auto-save
export const AUTOSAVE_DEBOUNCE_MS = 1000;
export const AUTOSAVE_LS_KEY = 'sewerworks-project';

// Console
export const MAX_CONSOLE_LOGS = 500;

// Drag recalculation debounce
export const DRAG_RECALC_DEBOUNCE_MS = 300;

// Map pane z-indexes
export const ZINDEX_PROPERTIES_PANEL = 500;
export const ZINDEX_DESIGN_PANEL = 30;
export const ZINDEX_REPORT = 1000;

// DEM
export const DEM_NODATA_THRESHOLD = -9000;
