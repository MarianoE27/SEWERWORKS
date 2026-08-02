import React, { useEffect, useRef, useMemo } from 'react';
import { Marker, Polyline, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { useStore } from '../../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { toLatLon, toXY } from '../../lib/proj';
import { Conduit, Node } from '../../types';
import { useLOD } from '../../hooks/useLOD';
import { haversineM, fmtDist } from './MapUIOverlay';

export type NodeRole = 'headwater' | 'outlet' | 'intermediate' | 'bifurcation';

const nodeIconCache: Record<string, L.DivIcon> = {};

export function clearNodeIconCache() {
  for (const key of Object.keys(nodeIconCache)) {
    delete nodeIconCache[key];
  }
}

export const createNodeIcon = (color: string, isSelected: boolean, role: NodeRole = 'intermediate', size: number = 14, theme: string = 'dark') => {
  if (Object.keys(nodeIconCache).length > 300) {
    clearNodeIconCache();
  }
  const key = `${color}-${isSelected}-${role}-${theme}-${size}`;
  if (!nodeIconCache[key]) {
    const border = isSelected ? '2px solid white' : '1px solid rgba(0,0,0,0.4)';
    let html: string;
    if (role === 'headwater') {
      html = `<svg width="${size}" height="${size}" viewBox="0 0 14 14" style="display:block;">
        <polygon points="7,1 13,13 1,13"
          fill="${color}" stroke="${isSelected ? 'white' : 'rgba(0,0,0,0.4)'}"
          stroke-width="${isSelected ? 2 : 1}"/>
      </svg>`;
    } else if (role === 'outlet') {
      html = `<svg width="${size}" height="${size}" viewBox="0 0 14 14" style="display:block;">
        <polygon points="7,1 13,7 7,13 1,7"
          fill="${color}" stroke="${isSelected ? 'white' : 'rgba(0,0,0,0.4)'}"
          stroke-width="${isSelected ? 2 : 1}"/>
      </svg>`;
    } else if (role === 'bifurcation') {
      html = `<svg width="${size}" height="${size}" viewBox="0 0 16 16" style="display:block;">
        <circle cx="8" cy="8" r="7"
          fill="${color}" stroke="${isSelected ? 'white' : 'rgba(0,0,0,0.4)'}"
          stroke-width="${isSelected ? 2 : 1}"/>
        <text x="8" y="12" text-anchor="middle" font-size="9" font-weight="bold"
          fill="white" font-family="monospace">Y</text>
      </svg>`;
    } else {
      html = `<div style="width:${size}px;height:${size}px;background-color:${color};border:${border};border-radius:50%;"></div>`;
    }
    nodeIconCache[key] = L.divIcon({
      className: 'custom-node-icon',
      html,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  }
  return nodeIconCache[key];
};

export const createArrowIcon = (angle: number, isCollector: boolean = false, state: string = 'ok', size: number = 16, showBadges: boolean = true) => {
  const arrowColor = '#52525b';
  
  let stateBadge = '';
  if (showBadges) {
    if (state === 'error') {
      stateBadge = `<div style="background:#ef4444;color:white;border-radius:50%;width:12px;height:12px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;box-shadow:0 0 0 1.5px rgba(255,255,255,0.9); flex-shrink:0;" title="Error">!</div>`;
    } else if (state === 'warning') {
      stateBadge = `<div style="background:#eab308;color:white;border-radius:50%;width:12px;height:12px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;box-shadow:0 0 0 1.5px rgba(255,255,255,0.9); flex-shrink:0;" title="Advertencia">!</div>`;
    }
  }

  const collectorBadge = (showBadges && isCollector) ? `<div style="background:#FF5A09;border-radius:50%;width:12px;height:12px;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:800;color:white;border:1px solid #E64F00; flex-shrink:0;">C</div>` : '';

  return L.divIcon({
    className: 'custom-arrow-icon',
    html: `<div style="display:flex;align-items:center;gap:3px;width:max-content;opacity:${size===0?0:1}">
             <div style="transform: rotate(${angle}deg); display: flex; align-items: center; justify-content: center; width: ${size}px; height: ${size}px; flex-shrink:0;">
               <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${arrowColor}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
                 <path d="M5 12h14M12 5l7 7-7 7"/>
               </svg>
             </div>
             ${stateBadge}
             ${collectorBadge}
           </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
};

export const createStartCapIcon = (color: string, angle: number, size: number = 28) => L.divIcon({
  className: 'custom-startcap-icon',
  html: `<div style="transform: rotate(${angle}deg); display:flex; align-items:center; justify-content:center; width:${size}px; height:${size}px; opacity:${size===0?0:1};">
           <svg width="${size}" height="${size}" viewBox="0 0 28 28" fill="none">
             <line x1="14" y1="2" x2="14" y2="26" stroke="${color}" stroke-width="2.45" stroke-linecap="round"/>
           </svg>
         </div>`,
  iconSize: [size, size],
  iconAnchor: [size / 2, size / 2],
});

export const createDiameterLabel = (dn: number, color: string) => L.divIcon({
  className: 'diameter-label',
  html: `<div style="background:${color};color:white;padding:2px 6px;border-radius:3px;font-size:11px;font-weight:700;border:1px solid rgba(0,0,0,0.3);">${dn}</div>`,
  iconSize: [35, 18],
  iconAnchor: [17, 9]
});

export const getNodeColor = (depth?: number) => {
  if (depth === undefined) return '#71717a';
  if (depth < 1.5) return '#10b981';
  if (depth < 2.5) return '#eab308';
  if (depth < 4.0) return '#f97316';
  return '#ef4444';
};

export const getConduitColorByMode = (conduit: Conduit, conduitVisualizationMode: string, parameters: any, isSelected?: boolean): string => {
  if (isSelected) return '#3b82f6';

  switch(conduitVisualizationMode) {
    case 'hRatio': {
      const hRatio = conduit.hRatio ?? 0;
      if (hRatio < 0.6) return '#10b981';
      if (hRatio < 0.8) return '#eab308';
      if (hRatio < 0.94) return '#f97316';
      return '#ef4444';
    }
    case 'diameter': {
      const dn = conduit.dn ?? 0;
      return dn >= parameters.collectorMinDN ? '#ef4444' : '#eab308';
    }
    case 'cover': {
      const coverMax = Math.max(conduit.coverIn ?? 0, conduit.coverOut ?? 0);
      if (coverMax < 2) return '#10b981';
      if (coverMax < parameters.collectorMaxCover) return '#eab308';
      return '#ef4444';
    }
    case 'state':
    default: {
      switch(conduit.state) {
        case 'ok': return '#10b981';
        case 'warning': return '#eab308';
        case 'error': return '#ef4444';
        default: return '#71717a';
      }
    }
  }
};

interface NodeMarkerProps {
  node: Node;
  role: NodeRole;
  crs: string;
  isSelected: boolean;
  activeTool: string;
  lod: ReturnType<typeof useLOD>;
  theme: string;
  showLabels: boolean;
  drawingConduitFrom: string | null;
  setDrawingConduitFrom: (id: string | null) => void;
  draggingNodeRef: React.MutableRefObject<boolean>;
  setRubberBandStart: (pos: [number, number] | null) => void;
  setRubberBandEnd: (pos: [number, number] | null) => void;
  calcDebounceRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
}

export const NodeMarker = React.memo(function NodeMarker({
  node,
  role,
  crs,
  isSelected,
  activeTool,
  lod,
  theme,
  showLabels,
  drawingConduitFrom,
  setDrawingConduitFrom,
  draggingNodeRef,
  setRubberBandStart,
  setRubberBandEnd,
  calcDebounceRef,
}: NodeMarkerProps) {
  const pos = useMemo(() => toLatLon(node.x, node.y, crs), [node.x, node.y, crs]);
  const color = useMemo(() => getNodeColor(node.depth), [node.depth]);
  const icon = useMemo(
    () => createNodeIcon(color, isSelected, role, lod.nodeSize, theme),
    [color, isSelected, role, lod.nodeSize, theme]
  );

  const eventHandlers = useMemo(() => ({
    mousedown: () => {
      draggingNodeRef.current = true;
      setTimeout(() => { draggingNodeRef.current = false; }, 300);
    },
    dragstart: () => {
      draggingNodeRef.current = true;
      setRubberBandStart(null);
      setRubberBandEnd(null);
    },
    click: (e: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(e);
      const { activeTool: tool, selectElement, addToSelection, deleteNode, addConduit } = useStore.getState();
      if (tool === 'select') {
        if ((e.originalEvent as MouseEvent).shiftKey) {
          addToSelection(node.id, 'node');
        } else {
          selectElement(node.id, 'node');
        }
      } else if (tool === 'delete') {
        deleteNode(node.id);
      } else if (tool === 'conduit') {
        if (!drawingConduitFrom) {
          setDrawingConduitFrom(node.id);
        } else {
          if (drawingConduitFrom !== node.id) {
            addConduit(drawingConduitFrom, node.id);
          }
          setDrawingConduitFrom(null);
        }
      }
    },
    dragend: (e: L.LeafletEvent) => {
      draggingNodeRef.current = false;
      const marker = e.target as L.Marker;
      const position = marker.getLatLng();
      const [newX, newY] = toXY(position.lat, position.lng, useStore.getState().crs);
      const { selectedElementIds: selIds, selectedElementTypes: selTypes, updateNode, moveSelectedNodes, calculateNetwork } = useStore.getState();
      const isMulti = selIds.includes(node.id) && selIds.filter(id => selTypes[id] === 'node').length > 1;
      if (isMulti) {
        const dx = newX - node.x;
        const dy = newY - node.y;
        moveSelectedNodes(dx, dy);
      } else {
        updateNode(node.id, { x: newX, y: newY, state: 'uncalculated' });
      }
      if (calcDebounceRef.current) clearTimeout(calcDebounceRef.current);
      calcDebounceRef.current = setTimeout(() => {
        calculateNetwork();
      }, 300);
    }
  }), [node.id, node.x, node.y, drawingConduitFrom, setDrawingConduitFrom, draggingNodeRef, setRubberBandStart, setRubberBandEnd, calcDebounceRef]);

  return (
    <Marker
      position={pos}
      icon={icon}
      draggable={activeTool === 'select' || activeTool === 'edit'}
      autoPan={true}
      pane="network-nodes"
      eventHandlers={eventHandlers}
    >
      {showLabels && (
        <Tooltip direction="top" offset={[0, -10]} className="border-border bg-background text-text">
          <div className="text-xs">
            <strong>{node.name}</strong>
            {lod.tooltipContent !== 'minimal' && (
              <>
                <br />CTN: {node.ctn != null ? node.ctn.toFixed(2) + ' m' : 'N/A'}
                <br />Prof: {node.depth != null ? node.depth.toFixed(2) + ' m' : '?'}
              </>
            )}
          </div>
        </Tooltip>
      )}
    </Marker>
  );
});

interface ConduitPolylineProps {
  conduit: Conduit;
  node1: Node;
  node2: Node;
  crs: string;
  isSelected: boolean;
  isProfile: boolean;
  color: string;
  weight: number;
  lod: ReturnType<typeof useLOD>;
  showLabels: boolean;
  showFlowArrows: boolean;
  showStartCaps: boolean;
  showDiameterLabels: boolean;
  esSecundarioBifurcacion: boolean;
  conduitVisualizationMode: string;
  parameters: any;
}

export const ConduitPolyline = React.memo(function ConduitPolyline({
  conduit,
  node1,
  node2,
  crs,
  isSelected,
  isProfile,
  color,
  weight,
  lod,
  showLabels,
  showFlowArrows,
  showStartCaps,
  showDiameterLabels,
  esSecundarioBifurcacion,
  conduitVisualizationMode,
  parameters,
}: ConduitPolylineProps) {
  const pos1 = useMemo(() => toLatLon(node1.x, node1.y, crs), [node1.x, node1.y, crs]);
  const pos2 = useMemo(() => toLatLon(node2.x, node2.y, crs), [node2.x, node2.y, crs]);

  const midLat = (pos1[0] + pos2[0]) / 2;
  const midLon = (pos1[1] + pos2[1]) / 2;
  const dy = pos2[0] - pos1[0];
  const dx = pos2[1] - pos1[1];
  const angle = Math.atan2(-dy, dx * Math.cos(pos1[0] * Math.PI / 180)) * 180 / Math.PI;

  const isCollector = (conduit.dn !== undefined && conduit.dn >= parameters.collectorMinDN) ||
    (conduit.coverIn !== undefined && conduit.coverIn > parameters.collectorMaxCover) ||
    (conduit.coverOut !== undefined && conduit.coverOut > parameters.collectorMaxCover);

  const eventHandlers = useMemo(() => ({
    click: (e: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(e);
      const { activeTool: tool, selectElement, addToSelection, deleteConduit } = useStore.getState();
      if (tool === 'select') {
        if ((e.originalEvent as MouseEvent).shiftKey) {
          addToSelection(conduit.id, 'conduit');
        } else {
          selectElement(conduit.id, 'conduit');
        }
      } else if (tool === 'delete') {
        deleteConduit(conduit.id);
      }
    }
  }), [conduit.id]);

  const arrowIcon = useMemo(
    () => createArrowIcon(angle, isCollector, conduit.state, lod.arrowSize, lod.showBadges),
    [angle, isCollector, conduit.state, lod.arrowSize, lod.showBadges]
  );

  const startCapIcon = useMemo(
    () => createStartCapIcon(color, angle, lod.arrowSize > 0 ? lod.arrowSize * 1.75 : 0),
    [color, angle, lod.arrowSize]
  );

  const diameterIcon = useMemo(
    () => (conduit.dn ? createDiameterLabel(conduit.dn, color) : null),
    [conduit.dn, color]
  );

  const finalWeight = lod.conduitWeight(weight);
  const profileWeight = lod.conduitWeight(weight + 8);

  return (
    <React.Fragment>
      {isProfile && (
        <Polyline
          positions={[pos1, pos2]}
          pathOptions={{ color: "#06b6d4", weight: profileWeight, opacity: 0.4 }}
          pane="network-lines"
          interactive={false}
        />
      )}
      <Polyline
        positions={[pos1, pos2]}
        pathOptions={{ color, weight: finalWeight }}
        pane="network-lines"
        eventHandlers={eventHandlers}
      >
        {showLabels && (
          <Tooltip sticky className="border-border bg-background text-text">
            <div className="text-xs">
              <strong>{conduit.name}</strong><br/>
              L: {conduit.length?.toFixed(2) || '?'} m
              {lod.tooltipContent === 'full' && conduit.slope !== undefined && conduit.slope !== null && (
                <><br />Pendiente: {conduit.slope.toFixed(2)}‰</>
              )}
              {lod.tooltipContent === 'full' && conduit.dn && (
                <><br />DN: {conduit.dn} mm</>
              )}
              {lod.tooltipContent === 'full' && (
                <><br />Veredas: {conduit.contributingSidewalks !== undefined ? conduit.contributingSidewalks : 2}</>
              )}
              {lod.tooltipContent === 'full' && conduit.qDesign !== undefined && (
                <><br />Q: {conduit.qDesign.toFixed(2)} l/s</>
              )}
              {lod.tooltipContent === 'full' && (
                <><br />{node1.name} → {node2.name}</>
              )}
            </div>
          </Tooltip>
        )}
      </Polyline>
      {showFlowArrows && lod.showFlowArrows && (
        <Marker
          position={[midLat, midLon]}
          icon={arrowIcon}
          interactive={false}
          pane="network-arrows"
        />
      )}
      {esSecundarioBifurcacion && lod.showStartCaps && (
        <Marker
          position={[pos1[0] + (pos2[0] - pos1[0]) * 0.05, pos1[1] + (pos2[1] - pos1[1]) * 0.05]}
          icon={startCapIcon}
          interactive={false}
          pane="network-arrows"
        />
      )}
      {conduitVisualizationMode === 'diameter' && conduit.dn && lod.showDiameterLabels && diameterIcon && (
        <Marker
          position={[midLat, midLon]}
          icon={diameterIcon}
          interactive={false}
          pane="network-arrows"
        />
      )}
    </React.Fragment>
  );
});

export interface NetworkLayersComponentProps {
  drawingConduitFrom: string | null;
  setDrawingConduitFrom: React.Dispatch<React.SetStateAction<string | null>>;
  mousePos: [number, number] | null;
  draggingNodeRef: React.MutableRefObject<boolean>;
  setRubberBandStart: React.Dispatch<React.SetStateAction<[number, number] | null>>;
  setRubberBandEnd: React.Dispatch<React.SetStateAction<[number, number] | null>>;
}

export function NetworkLayersComponent({
  drawingConduitFrom,
  setDrawingConduitFrom,
  mousePos,
  draggingNodeRef,
  setRubberBandStart,
  setRubberBandEnd,
}: NetworkLayersComponentProps) {
  const { nodes, conduits, parameters, activeTool, selectedElementIds, profileConduitIds, layers, crs, conduitVisualizationMode, theme, calculationVersion } = useStore(
    useShallow(s => ({
      nodes: s.nodes,
      conduits: s.conduits,
      parameters: s.parameters,
      activeTool: s.activeTool,
      selectedElementIds: s.selectedElementIds,
      profileConduitIds: s.profileConduitIds,
      layers: s.layers,
      crs: s.crs,
      conduitVisualizationMode: s.conduitVisualizationMode,
      theme: s.theme,
      calculationVersion: s.calculationVersion,
    }))
  );
  const lod = useLOD();
  const calcDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nodeRoles = useMemo((): Record<string, NodeRole> => {
    const fromSet = new Set<string>();
    const toSet = new Set<string>();
    const outgoingCount: Record<string, number> = {};
    Object.values(conduits).forEach(c => {
      fromSet.add(c.from);
      toSet.add(c.to);
      outgoingCount[c.from] = (outgoingCount[c.from] || 0) + 1;
    });
    const roles: Record<string, NodeRole> = {};
    Object.keys(nodes).forEach(id => {
      const isSource = !toSet.has(id);
      const isSink   = !fromSet.has(id);
      const isBifurcation = (outgoingCount[id] || 0) > 1;
      if (isSource && isSink)   roles[id] = 'intermediate';
      else if (isBifurcation)   roles[id] = 'bifurcation';
      else if (isSource)        roles[id] = 'headwater';
      else if (isSink)          roles[id] = 'outlet';
      else                      roles[id] = 'intermediate';
    });
    return roles;
  }, [nodes, conduits]);

  const outgoingCountMap = useMemo((): Record<string, number> => {
    const map: Record<string, number> = {};
    Object.values(conduits).forEach(c => {
      map[c.from] = (map[c.from] || 0) + 1;
    });
    return map;
  }, [conduits]);

  return (
    <>
      {layers.conduits && Object.values(conduits).map(c => {
        const n1 = nodes[c.from];
        const n2 = nodes[c.to];
        if (!n1 || !n2) return null;

        const isSelected = selectedElementIds.includes(c.id);
        const weight = c.dn ? Math.max(3, c.dn / 100) : 3;

        const nodoFromData = nodes[c.from];
        const esSecundarioBifurcacion =
          (outgoingCountMap[c.from] || 0) > 1 &&
          nodoFromData?.primaryOutletConduitId !== undefined &&
          c.id !== nodoFromData.primaryOutletConduitId;

        const color = getConduitColorByMode(c, conduitVisualizationMode, parameters, isSelected);

        return (
          <ConduitPolyline
            key={`${c.id}-${calculationVersion}`}
            conduit={c}
            node1={n1}
            node2={n2}
            crs={crs}
            isSelected={isSelected}
            isProfile={profileConduitIds.includes(c.id)}
            color={color}
            weight={weight}
            lod={lod}
            showLabels={!!layers.labels}
            showFlowArrows={!!layers.flowArrows}
            showStartCaps={true}
            showDiameterLabels={true}
            esSecundarioBifurcacion={esSecundarioBifurcacion}
            conduitVisualizationMode={conduitVisualizationMode}
            parameters={parameters}
          />
        );
      })}

      {drawingConduitFrom && nodes[drawingConduitFrom] && mousePos && (() => {
        const fromPos = toLatLon(nodes[drawingConduitFrom].x, nodes[drawingConduitFrom].y, crs);
        const distM = haversineM(fromPos, mousePos);
        const midPos: [number, number] = [
          (fromPos[0] + mousePos[0]) / 2,
          (fromPos[1] + mousePos[1]) / 2,
        ];
        return (
          <>
            <Polyline
              positions={[fromPos, mousePos]}
              color="#3b82f6"
              weight={2}
              dashArray="5, 5"
              pane="network-lines"
            />
            <Marker
              position={midPos}
              interactive={false}
              pane="network-arrows"
              icon={L.divIcon({
                className: '',
                html: `<div style="background:rgba(15,23,42,0.85);border:1px solid #3b82f6;color:#93c5fd;font-size:11px;font-weight:600;font-family:monospace;padding:2px 7px;border-radius:4px;white-space:nowrap;pointer-events:none">${fmtDist(distM)}</div>`,
                iconAnchor: [0, 10],
              })}
            />
          </>
        );
      })()}

      {layers.nodes && Object.values(nodes).map(n => (
        <NodeMarker
          key={`${n.id}-${calculationVersion}`}
          node={n}
          role={nodeRoles[n.id] ?? 'intermediate'}
          crs={crs}
          isSelected={selectedElementIds.includes(n.id)}
          activeTool={activeTool}
          lod={lod}
          theme={theme}
          showLabels={!!layers.labels}
          drawingConduitFrom={drawingConduitFrom}
          setDrawingConduitFrom={setDrawingConduitFrom}
          draggingNodeRef={draggingNodeRef}
          setRubberBandStart={setRubberBandStart}
          setRubberBandEnd={setRubberBandEnd}
          calcDebounceRef={calcDebounceRef}
        />
      ))}
    </>
  );
}
