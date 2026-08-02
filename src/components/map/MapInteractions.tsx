import React, { useEffect, useCallback } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useStore } from '../../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { toXY, toLatLon } from '../../lib/proj';

export function RightClickPan() {
  const map = useMap();
  const activeTool = useStore(s => s.activeTool);

  useEffect(() => {
    if (activeTool === 'pan') {
      map.dragging.enable();
      return;
    }

    // Disable default left-button drag (pan)
    map.dragging.disable();

    const container = map.getContainer();

    // Suppress browser context menu on the map
    const onContextMenu = (e: Event) => e.preventDefault();
    container.addEventListener('contextmenu', onContextMenu);

    let panning = false;
    let lastX = 0;
    let lastY = 0;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 2) return;
      panning = true;
      lastX = e.clientX;
      lastY = e.clientY;
      container.style.cursor = 'grabbing';
      e.preventDefault();
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!panning) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      map.panBy([-dx, -dy], { animate: false });
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button !== 2) return;
      panning = false;
      container.style.cursor = '';
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      container.removeEventListener('contextmenu', onContextMenu);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.style.cursor = '';
    };
  }, [map, activeTool]);

  return null;
}

export function NetworkPanes() {
  const map = useMap();
  useEffect(() => {
    if (!map.getPane('network-lines')) {
      const linesPane = map.createPane('network-lines');
      linesPane.style.zIndex = '500';
    }
    if (!map.getPane('network-nodes')) {
      const nodesPane = map.createPane('network-nodes');
      nodesPane.style.zIndex = '610';
    }
    if (!map.getPane('network-arrows')) {
      const arrowsPane = map.createPane('network-arrows');
      arrowsPane.style.zIndex = '505';
    }
  }, [map]);
  return null;
}

export function ZoomToFit() {
  const map = useMap();
  const zoomToFitTrigger = useStore(s => s.zoomToFitTrigger);

  useEffect(() => {
    if (zoomToFitTrigger === 0) return;
    const { nodes, crs } = useStore.getState();
    const nodeList = Object.values(nodes);
    if (nodeList.length > 0) {
      const bounds = L.latLngBounds(nodeList.map(n => toLatLon(n.x, n.y, crs)));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [zoomToFitTrigger, map]);

  return null;
}

export function ZoomToBounds() {
  const map = useMap();
  const { zoomBounds, setZoomBounds } = useStore(useShallow(s => ({ zoomBounds: s.zoomBounds, setZoomBounds: s.setZoomBounds })));

  useEffect(() => {
    if (zoomBounds) {
      map.fitBounds(zoomBounds, { padding: [50, 50] });
      setZoomBounds(null);
    }
  }, [zoomBounds, map, setZoomBounds]);

  return null;
}

export function ZoomTracker() {
  const map = useMap();
  const setCurrentZoom = useStore(s => s.setCurrentZoom);
  
  useEffect(() => {
    setCurrentZoom(map.getZoom());
    const onZoomEnd = () => setCurrentZoom(map.getZoom());
    map.on('zoomend', onZoomEnd);
    return () => { map.off('zoomend', onZoomEnd); };
  }, [map, setCurrentZoom]);
  
  return null;
}

export function MapEvents({ onMapClick, onMouseMove, onRightClick, onMouseDown, onMouseUp }: {
  onMapClick: (e: L.LeafletMouseEvent) => void;
  onMouseMove: (e: L.LeafletMouseEvent) => void;
  onRightClick: (e: L.LeafletMouseEvent) => void;
  onMouseDown: (e: L.LeafletMouseEvent) => void;
  onMouseUp: (e: L.LeafletMouseEvent) => void;
}) {
  useMapEvents({
    click: onMapClick,
    mousemove: onMouseMove,
    contextmenu: onRightClick,
    mousedown: onMouseDown,
    mouseup: onMouseUp,
  });
  return null;
}

export interface MapInteractionsProps {
  setMeasurePoints: React.Dispatch<React.SetStateAction<[number, number][]>>;
  setMousePos: React.Dispatch<React.SetStateAction<[number, number] | null>>;
  clearMeasure: () => void;
  drawingConduitFrom: string | null;
  setDrawingConduitFrom: React.Dispatch<React.SetStateAction<string | null>>;
  rubberBandStart: [number, number] | null;
  setRubberBandStart: React.Dispatch<React.SetStateAction<[number, number] | null>>;
  rubberBandEnd: [number, number] | null;
  setRubberBandEnd: React.Dispatch<React.SetStateAction<[number, number] | null>>;
  rubberBandActiveRef: React.MutableRefObject<boolean>;
  draggingNodeRef: React.MutableRefObject<boolean>;
}

export function MapInteractions({
  setMeasurePoints,
  setMousePos,
  clearMeasure,
  drawingConduitFrom,
  setDrawingConduitFrom,
  rubberBandStart,
  setRubberBandStart,
  rubberBandEnd,
  setRubberBandEnd,
  rubberBandActiveRef,
  draggingNodeRef,
}: MapInteractionsProps) {
  const { activeTool, measureToolActive, crs, addNode, clearMultiSelection, selectMultiple } = useStore(
    useShallow(s => ({
      activeTool: s.activeTool,
      measureToolActive: s.measureToolActive,
      crs: s.crs,
      addNode: s.addNode,
      clearMultiSelection: s.clearMultiSelection,
      selectMultiple: s.selectMultiple,
    }))
  );

  const handleMapClick = useCallback((e: L.LeafletMouseEvent) => {
    if (measureToolActive) {
      setMeasurePoints(prev => [...prev, [e.latlng.lat, e.latlng.lng]]);
    } else if (activeTool === 'node') {
      const [x, y] = toXY(e.latlng.lat, e.latlng.lng, crs);
      addNode(x, y);
    } else if (activeTool === 'select') {
      if (!rubberBandActiveRef.current) {
        clearMultiSelection();
      }
    }
    setDrawingConduitFrom(null);
  }, [measureToolActive, activeTool, crs, setMeasurePoints, addNode, rubberBandActiveRef, clearMultiSelection, setDrawingConduitFrom]);

  const handleMouseMove = useCallback((e: L.LeafletMouseEvent) => {
    if (measureToolActive) {
      setMousePos([e.latlng.lat, e.latlng.lng]);
    } else if (activeTool === 'conduit' && drawingConduitFrom) {
      setMousePos([e.latlng.lat, e.latlng.lng]);
    } else if (activeTool === 'select' && rubberBandStart) {
      setRubberBandEnd([e.latlng.lat, e.latlng.lng]);
    }
  }, [measureToolActive, activeTool, drawingConduitFrom, rubberBandStart, setMousePos, setRubberBandEnd]);

  const handleMapRightClick = useCallback((e: L.LeafletMouseEvent) => {
    if (measureToolActive) {
      clearMeasure();
      setMousePos(null);
    }
  }, [measureToolActive, clearMeasure, setMousePos]);

  const handleMapMouseDown = useCallback((e: L.LeafletMouseEvent) => {
    if (activeTool !== 'select' || measureToolActive) return;
    if ((e.originalEvent as MouseEvent).button !== 0) return;
    if (draggingNodeRef.current) return;
    rubberBandActiveRef.current = false;
    setRubberBandStart([e.latlng.lat, e.latlng.lng]);
    setRubberBandEnd(null);
  }, [activeTool, measureToolActive, draggingNodeRef, rubberBandActiveRef, setRubberBandStart, setRubberBandEnd]);

  const handleMapMouseUp = useCallback((e: L.LeafletMouseEvent) => {
    if (!rubberBandStart || !rubberBandEnd) {
      setRubberBandStart(null);
      setRubberBandEnd(null);
      return;
    }

    const lat1 = Math.min(rubberBandStart[0], rubberBandEnd[0]);
    const lat2 = Math.max(rubberBandStart[0], rubberBandEnd[0]);
    const lng1 = Math.min(rubberBandStart[1], rubberBandEnd[1]);
    const lng2 = Math.max(rubberBandStart[1], rubberBandEnd[1]);

    const dist = Math.abs(lat2 - lat1) + Math.abs(lng2 - lng1);
    if (dist < 0.0001) {
      setRubberBandStart(null);
      setRubberBandEnd(null);
      return;
    }

    rubberBandActiveRef.current = true;

    const { nodes: storeNodes, conduits: storeConduits, crs: storeCrs } = useStore.getState();
    const ids: string[] = [];
    const types: Record<string, 'node' | 'conduit'> = {};

    Object.values(storeNodes).forEach(n => {
      const [nLat, nLng] = toLatLon(n.x, n.y, storeCrs);
      if (nLat >= lat1 && nLat <= lat2 && nLng >= lng1 && nLng <= lng2) {
        ids.push(n.id);
        types[n.id] = 'node';
      }
    });

    Object.values(storeConduits).forEach(c => {
      const n1 = storeNodes[c.from];
      const n2 = storeNodes[c.to];
      if (!n1 || !n2) return;
      const [lat1n, lng1n] = toLatLon(n1.x, n1.y, storeCrs);
      const [lat2n, lng2n] = toLatLon(n2.x, n2.y, storeCrs);
      
      const inBox1 = lat1n >= lat1 && lat1n <= lat2 && lng1n >= lng1 && lng1n <= lng2;
      const inBox2 = lat2n >= lat1 && lat2n <= lat2 && lng2n >= lng1 && lng2n <= lng2;

      if (inBox1 || inBox2) {
        ids.push(c.id);
        types[c.id] = 'conduit';
      }
    });

    if (ids.length > 0) selectMultiple(ids, types);

    setRubberBandStart(null);
    setRubberBandEnd(null);
  }, [rubberBandStart, rubberBandEnd, selectMultiple, rubberBandActiveRef, setRubberBandStart, setRubberBandEnd]);

  return (
    <>
      <RightClickPan />
      <ZoomTracker />
      <ZoomToFit />
      <ZoomToBounds />
      <NetworkPanes />
      <MapEvents
        onMapClick={handleMapClick}
        onMouseMove={handleMouseMove}
        onRightClick={handleMapRightClick}
        onMouseDown={handleMapMouseDown}
        onMouseUp={handleMapMouseUp}
      />
    </>
  );
}
