import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Rectangle, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useStore } from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { toLatLon, toXY } from '../lib/proj';
import GeoRasterLayer from 'georaster-layer-for-leaflet';
import { computeContours, ContourLine } from '../lib/contours';
import { MapUIOverlay, MeasurePanel, makeDemColorFn } from './map/MapUIOverlay';
import { NetworkLayersComponent, clearNodeIconCache } from './map/NetworkLayersComponent';
import { MapInteractions } from './map/MapInteractions';

export { clearNodeIconCache } from './map/NetworkLayersComponent';

function DEMLayer() {
  const map = useMap();
  const dem = useStore(state => state.dem);
  const layerRef = useRef<any>(null);
  const colorFnRef = useRef<any>(null);

  useEffect(() => {
    colorFnRef.current = makeDemColorFn(
      dem?.colorScale ?? 'terrain',
      dem?.minVal ?? 0,
      dem?.maxVal ?? 1000,
    );

    if (layerRef.current && dem?.georaster === layerRef.current.options.georaster) {
      const layer = layerRef.current;
      if (layer.setOpacity) {
        layer.setOpacity(dem?.opacity ?? 0.6);
      } else {
        layer.options.opacity = dem?.opacity ?? 0.6;
      }
      
      if (typeof layer.updateColors === 'function') {
        layer.updateColors((values: number[]) => colorFnRef.current ? colorFnRef.current(values) : null);
      } else {
        if (typeof layer.clearCache === 'function') {
          layer.clearCache();
        } else if (layer.cache) {
          layer.cache = {};
        }
        layer.redraw();
      }
    }
  }, [dem?.colorScale, dem?.minVal, dem?.maxVal, dem?.opacity, dem?.georaster]);

  useEffect(() => {
    if (!dem?.georaster || dem.visible === false) {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
      return;
    }

    if (!layerRef.current || layerRef.current.options.georaster !== dem.georaster) {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }

      try {
        // @ts-ignore
        const layer = new GeoRasterLayer({
          georaster: dem.georaster,
          opacity: dem.opacity ?? 0.6,
          resolution: 64,
          zIndex: 300,
          pixelValuesToColorFn: (values: number[]) => {
            if (colorFnRef.current) {
              return colorFnRef.current(values);
            }
            return null;
          },
          updateWhenIdle: true,
          keepBuffer: 4,
        });

        layer.addTo(map);
        layerRef.current = layer;
      } catch (e) {
        console.error("Error creating GeoRasterLayer:", e);
      }
    }
  }, [dem?.georaster, dem?.visible, map]);

  useEffect(() => {
    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map]);

  return null;
}

function ContourLayer() {
  const map = useMap();
  const { dem, contourConfig, crs } = useStore(useShallow(s => ({ dem: s.dem, contourConfig: s.contourConfig, crs: s.crs })));
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const contourLines = useMemo((): ContourLine[] => {
    if (!dem || !contourConfig.visible) return [];
    return computeContours(dem, contourConfig, crs);
  }, [dem, contourConfig, crs]);

  useEffect(() => {
    if (layerGroupRef.current) {
      layerGroupRef.current.clearLayers();
    } else {
      layerGroupRef.current = L.layerGroup().addTo(map);
    }

    if (!contourConfig.visible || contourLines.length === 0) return;

    const canvasRenderer = L.canvas({ padding: 0.1 });
    const { color, majorColor, weight, majorWeight, opacity, labelVisible } = contourConfig;

    for (const cl of contourLines) {
      const lineColor  = cl.isMajor ? majorColor : color;
      const lineWeight = cl.isMajor ? majorWeight : weight;

      for (const ring of cl.rings) {
        const latLngs = ring.map(([lng, lat]) => [lat, lng] as [number, number]);
        L.polyline(latLngs, {
          color: lineColor,
          weight: lineWeight,
          opacity,
          interactive: false,
          smoothFactor: 1.5,
          renderer: canvasRenderer,
        }).addTo(layerGroupRef.current!);
      }

      if (labelVisible && cl.isMajor && cl.rings.length > 0) {
        const longestRing = cl.rings.reduce((a: [number,number][], b: [number,number][]) => a.length >= b.length ? a : b);
        const mid = longestRing[Math.floor(longestRing.length / 2)];
        L.marker([mid[1], mid[0]], {
          interactive: false,
          icon: L.divIcon({
            className: '',
            html: `<span style="color:${majorColor};font-size:10px;font-weight:700;font-family:monospace;text-shadow:0 0 3px #000a,0 0 3px #000a;pointer-events:none">${cl.elevation.toFixed(1)}</span>`,
            iconAnchor: [0, 6],
          }),
        }).addTo(layerGroupRef.current!);
      }
    }

    return () => {
      layerGroupRef.current?.clearLayers();
    };
  }, [map, contourLines, contourConfig]);

  useEffect(() => {
    return () => {
      if (layerGroupRef.current) {
        layerGroupRef.current.remove();
        layerGroupRef.current = null;
      }
    };
  }, []);

  return null;
}

const ShapefileLayerComponent = React.memo(function ShapefileLayerComponent({ shp, zIndex }: { shp: any; zIndex: number; key?: React.Key }) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);
  const paneName = `pane-${shp.id}`;

  useEffect(() => {
    let pane = map.getPane(paneName);
    if (!pane) {
      pane = map.createPane(paneName);
    }
    pane.style.zIndex = zIndex.toString();
  }, [map, paneName, zIndex]);

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    const layer = L.geoJSON(shp.data, {
      pane: paneName,
      pointToLayer: (feature, latlng) => L.circleMarker(latlng, { radius: (shp.weight ?? 2) * 2 + 2, className: 'shapefile-feature' }),
      onEachFeature: (feature, l: any) => {
        if (l.options) l.options.className = 'shapefile-feature';
        if (feature.properties && Object.keys(feature.properties).length > 0) {
          const props = Object.entries(feature.properties)
            .map(([key, value]) => `<tr><td style="font-weight:bold; padding-right:10px; color:#a1a1aa;">${key}</td><td style="color:#f4f4f5;">${value}</td></tr>`)
            .join('');
          l.bindPopup(`<div style="font-size:12px; max-height:200px; overflow-y:auto;"><table>${props}</table></div>`);
        }
      }
    });

    layer.setStyle({
      color: shp.color || '#8b5cf6',
      weight: shp.weight ?? 2,
      opacity: shp.opacity ?? 1,
      fillOpacity: shp.fillOpacity ?? 0.1,
      fillColor: shp.color || '#8b5cf6',
      className: 'shapefile-feature'
    });

    if (shp.visible !== false) {
      layer.addTo(map);
    }
    layerRef.current = layer;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [shp.data, map, paneName]);

  useEffect(() => {
    if (!layerRef.current) return;
    if (shp.visible === false) {
      if (map.hasLayer(layerRef.current)) {
        map.removeLayer(layerRef.current);
      }
    } else {
      if (!map.hasLayer(layerRef.current)) {
        layerRef.current.addTo(map);
      }
    }
  }, [shp.visible, map]);

  useEffect(() => {
    if (!layerRef.current) return;
    layerRef.current.setStyle({
      color: shp.color || '#8b5cf6',
      weight: shp.weight ?? 2,
      opacity: shp.opacity ?? 1,
      fillOpacity: shp.fillOpacity ?? 0.1,
      fillColor: shp.color || '#8b5cf6',
      className: 'shapefile-feature'
    });
    layerRef.current.eachLayer((l: any) => {
      if (l.setRadius) {
        l.setRadius((shp.weight ?? 2) * 2 + 2);
      }
    });
  }, [shp.color, shp.weight, shp.opacity, shp.fillOpacity]);

  return null;
}, (prev, next) => prev.shp === next.shp && prev.zIndex === next.zIndex);

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);
  return null;
}

export function MapArea() {
  const {
    activeTool,
    shapefiles,
    baseMap,
    layers,
    measureToolActive,
    measureMode,
    theme,
  } = useStore(
    useShallow(s => ({
      activeTool: s.activeTool,
      shapefiles: s.shapefiles,
      baseMap: s.baseMap,
      layers: s.layers,
      measureToolActive: s.measureToolActive,
      measureMode: s.measureMode,
      theme: s.theme,
    }))
  );

  useEffect(() => {
    clearNodeIconCache();
  }, [theme]);

  const [drawingConduitFrom, setDrawingConduitFrom] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<[number, number] | null>(null);
  const [measurePoints, setMeasurePoints] = useState<[number, number][]>([]);

  const [rubberBandStart, setRubberBandStart] = useState<[number, number] | null>(null);
  const [rubberBandEnd, setRubberBandEnd] = useState<[number, number] | null>(null);
  const rubberBandActiveRef = useRef(false);
  const draggingNodeRef = useRef(false);

  const clearMeasure = useCallback(() => {
    setMeasurePoints([]);
  }, []);

  const getTileLayer = () => {
    switch (baseMap) {
      case 'satellite':
        return (
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri"
            maxNativeZoom={18}
            maxZoom={24}
          />
        );
      case 'osm':
        return (
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
            maxNativeZoom={19}
            maxZoom={24}
          />
        );
      case 'cartodb':
      default:
        return (
          <TileLayer
            url={`https://{s}.basemaps.cartocdn.com/${
              theme === 'light' ? 'light_all' : 'dark_all'
            }/{z}/{x}/{y}{r}.png`}
            attribution="&copy; OpenStreetMap contributors &copy; CARTO"
            maxNativeZoom={20}
            maxZoom={24}
          />
        );
    }
  };

  return (
    <div className="flex-1 bg-background relative z-0">
      {measureToolActive && (
        <MeasurePanel
          mode={measureMode}
          points={measurePoints}
          onClear={clearMeasure}
        />
      )}

      <MapContainer
        center={[-34.9214, -57.9545]}
        zoom={13}
        maxZoom={24}
        style={{ height: '100%', width: '100%', background: theme === 'light' ? '#ffffff' : '#111111' }}
        zoomControl={false}
        boxZoom={false}
        preferCanvas={true}
        className={`tool-${activeTool}`}
      >
        <MapResizer />
        <MapUIOverlay />

        {layers.backgroundMap && getTileLayer()}

        {shapefiles.map((shp, index) => (
          <ShapefileLayerComponent
            key={shp.id}
            shp={shp}
            zIndex={450 - index}
          />
        ))}

        <MapInteractions
          setMeasurePoints={setMeasurePoints}
          setMousePos={setMousePos}
          clearMeasure={clearMeasure}
          drawingConduitFrom={drawingConduitFrom}
          setDrawingConduitFrom={setDrawingConduitFrom}
          rubberBandStart={rubberBandStart}
          setRubberBandStart={setRubberBandStart}
          rubberBandEnd={rubberBandEnd}
          setRubberBandEnd={setRubberBandEnd}
          rubberBandActiveRef={rubberBandActiveRef}
          draggingNodeRef={draggingNodeRef}
        />

        <DEMLayer />
        <ContourLayer />

        {measureToolActive && (
          <>
            {measurePoints.length >= 2 && (
              <Polyline positions={measurePoints} color="#f97316" weight={2} />
            )}
            {measurePoints.length >= 1 && mousePos && (
              <Polyline
                positions={[measurePoints[measurePoints.length - 1], mousePos]}
                color="#f97316"
                dashArray="6,6"
                weight={2}
              />
            )}
            {measureMode === 'Area' && measurePoints.length >= 3 && (
              <Polygon
                positions={measurePoints}
                color="#f97316"
                fillColor="#f97316"
                fillOpacity={0.15}
                weight={2}
              />
            )}
            {measurePoints.map((pt, i) => (
              <Marker
                key={i}
                position={pt}
                icon={L.divIcon({
                  className: '',
                  html: `<div style="width:18px;height:18px;border-radius:50%;background:#f97316;border:2px solid var(--background);display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:var(--background);line-height:1">${
                    i + 1
                  }</div>`,
                  iconSize: [18, 18],
                  iconAnchor: [9, 9],
                })}
              />
            ))}
          </>
        )}

        <NetworkLayersComponent
          drawingConduitFrom={drawingConduitFrom}
          setDrawingConduitFrom={setDrawingConduitFrom}
          mousePos={mousePos}
          draggingNodeRef={draggingNodeRef}
          setRubberBandStart={setRubberBandStart}
          setRubberBandEnd={setRubberBandEnd}
        />

        {rubberBandStart && rubberBandEnd && (
          <Rectangle
            bounds={[rubberBandStart, rubberBandEnd]}
            pathOptions={{
              color: '#3b82f6',
              weight: 1,
              dashArray: '4,4',
              fillColor: '#3b82f6',
              fillOpacity: 0.08,
            }}
            interactive={false}
          />
        )}
      </MapContainer>
    </div>
  );
}
