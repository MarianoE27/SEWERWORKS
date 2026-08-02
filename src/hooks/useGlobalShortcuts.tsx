import { useEffect } from 'react';
import { useStore } from '../store/useStore';

export function useGlobalShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input, select, or contenteditable
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (e.key === 'Escape') {
        const state = useStore.getState() as any;
        if (state.isHydrologyOpen) {
          state.setIsHydrologyOpen(false);
          return;
        }
        if (state.isAportesOpen) {
          state.setIsAportesOpen(false);
          return;
        }
        if (state.isNormsOpen) {
          state.setIsNormsOpen(false);
          return;
        }
        if (state.isCatalogOpen) {
          state.setIsCatalogOpen(false);
          return;
        }
        if (state.isCollectorsOpen) {
          state.setIsCollectorsOpen(false);
          return;
        }
        if (state.isResultsFloatingOpen) {
          state.setIsResultsFloatingOpen(false);
          return;
        }
        if (state.isProfileFloatingOpen) {
          state.setIsProfileFloatingOpen(false);
          return;
        }
        if (state.isReportOpen) {
          state.setReportOpen(false);
          return;
        }
        if (state.isProjectInfoOpen) {
          state.setProjectInfoOpen(false);
          return;
        }
        if (state.isProjectionPanelOpen) {
          state.setProjectionPanelOpen(false);
          return;
        }
        if (state.isLayerManagerOpen) {
          state.setIsLayerManagerOpen(false);
          return;
        }
        if (state.isBottomPanelOpen) {
          state.setBottomPanelOpen(false);
          return;
        }

        state.setTool('select');
        state.clearMultiSelection();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const state = useStore.getState() as any;
        if (state.selectedElementIds.length > 1) {
          state.deleteSelected();
        } else if (state.selectedElementId && state.selectedElementType) {
          if (state.selectedElementType === 'node') {
            state.deleteNode(state.selectedElementId);
          } else if (state.selectedElementType === 'conduit') {
            state.deleteConduit(state.selectedElementId);
          }
        }
      }

      // Pro Shortcuts (Tool selection, Panels, Calculation)
      if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        const state = useStore.getState() as any;
        switch (e.key.toLowerCase()) {
          case 'v':
            state.setTool('select');
            break;
          case 'p':
            state.setTool('pan');
            break;
          case 'c':
            state.setTool('node');
            break;
          case 't':
            state.setTool('conduit');
            break;
          case 'm':
            state.setTool('edit');
            break;
          case 'd':
            state.setTool('delete');
            break;
          case 'f':
            state.triggerZoomToFit();
            break;
          case 'b':
            state.setBottomPanelOpen(!state.isBottomPanelOpen);
            break;
          case '1':
            state.setActiveMainTab('inicio');
            break;
          case '2':
            state.setActiveMainTab('dibujo');
            break;
          case '3':
            state.setActiveMainTab('analisis');
            break;
          case '4':
            state.setActiveMainTab('resultados');
            break;
          case '5':
            state.setActiveMainTab('ayuda');
            break;
          case 'enter':
            if (e.target === document.body) {
              state.calculateNetwork();
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
