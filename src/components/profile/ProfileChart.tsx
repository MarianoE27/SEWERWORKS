import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ProfileChainData } from './useProfileData';
import { formatNumber } from '../../lib/utils';

interface Props {
  data: ProfileChainData;
  exaggeration: number;
  zoom: number;
  isDocked?: boolean;
}

export function ProfileChart({ data, exaggeration, zoom, isDocked = false }: Props) {
  const { t } = useTranslation();
  const { conduits: conds, nodes: nds, dists, totalLength, minElev, maxElev } = data;
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);

  const [chartSize, setChartSize] = useState({ width: 800, height: 250 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setChartSize(prev => {
            const newW = entry.contentRect.width;
            const newH = entry.contentRect.height > 0 ? entry.contentRect.height : prev.height;
            if (prev.width === newW && prev.height === newH) return prev;
            return { width: newW, height: newH };
          });
        }
      }
    });
    const target = containerRef.current.parentElement || containerRef.current;
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const { width: chartWidth, height: chartHeight } = chartSize;

  // Geometry
  const padLeft = isDocked ? 60 : 240; // Reduced padding when docked to maximize space
  const padRight = 40;
  const padTop = 30;
  const padBottom = 20;

  // Real elevation range with 10% padding
  const elevPadding = Math.max(1, (maxElev - minElev) * 0.1);
  const renderMinElev = minElev - elevPadding;
  const renderMaxElev = maxElev + elevPadding;
  const elevRange = renderMaxElev - renderMinElev || 1;

  // Horizontal Scale: Fits window by default (zoom=1)
  const minPlotWidth = Math.max(1, chartWidth - padLeft - padRight);
  const actualPlotWidth = minPlotWidth * zoom;
  const svgWidth = Math.max(actualPlotWidth + padLeft + padRight, chartWidth);

  // Vertical Scale: Fits window by default (exaggeration=1)
  const basePlotHeight = Math.max(1, chartHeight - padTop - padBottom);
  const plotHeight = basePlotHeight * exaggeration;
  const svgHeight = plotHeight + padTop + padBottom;

  // Summary Data
  const summary = useMemo(() => {
    const numManholes = nds.length;
    const numPipes = conds.length;
    const drop = Math.abs((conds[conds.length - 1]?.invertOut ?? 0) - (conds[0]?.invertIn ?? 0)) || (maxElev - minElev);
    const avgSlope = totalLength > 0 ? (drop / totalLength) * 1000 : 0;
    
    let minCover = Infinity;
    let totalExcavation = 0;
    let maxFlow = 0;
    let maxHRatio = 0;
    let maxDn = 0;

    conds.forEach(c => {
      if (c.coverIn !== undefined && c.coverIn < minCover) minCover = c.coverIn;
      if (c.coverOut !== undefined && c.coverOut < minCover) minCover = c.coverOut;
      if (c.excavationVol) totalExcavation += c.excavationVol;
      if (c.qDesign && c.qDesign > maxFlow) maxFlow = c.qDesign;
      if (c.hRatio && c.hRatio > maxHRatio) maxHRatio = c.hRatio;
      if (c.dn && c.dn > maxDn) maxDn = c.dn;
    });

    if (minCover === Infinity) minCover = 0;

    return { numManholes, numPipes, drop, avgSlope, minCover, totalExcavation, maxFlow, maxHRatio, maxDn };
  }, [nds.length, conds.length, maxElev, minElev, totalLength, conds]);

  const getX = (dist: number) => padLeft + (totalLength > 0 ? (dist / totalLength) : 0) * actualPlotWidth;
  const getY = (elev: number) => padTop + plotHeight - ((elev - renderMinElev) / elevRange) * plotHeight;

  // Handle Mouse Move for Tooltip
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    // Use scrollLeft to account for horizontal scrolling
    const scrollLeft = containerRef.current.scrollLeft || 0;
    const x = e.clientX - rect.left + scrollLeft;
    if (x >= padLeft && x <= padLeft + actualPlotWidth) {
      setHoverX(x);
    } else {
      setHoverX(null);
    }
  };

  // Build Geometry
  let terrainPoints = '';
  let pipePolygons: React.ReactNode[] = [];
  let manholes: React.ReactNode[] = [];

  nds.forEach((n, i) => {
    if (!n) return;
    const x = getX(dists[i]);
    const yCtn = getY(n.ctn);
    
    let yInvert = yCtn;
    if (i === 0) {
      yInvert = getY(conds[0]?.invertIn ?? (n.ctn - 1.5));
    } else if (i === nds.length - 1) {
      yInvert = getY(conds[i - 1]?.invertOut ?? (n.ctn - 1.5));
    } else {
      const invOut = conds[i - 1]?.invertOut;
      const invIn = conds[i]?.invertIn;
      if (invOut !== undefined && invIn !== undefined) {
        yInvert = getY(Math.min(invOut, invIn));
      } else {
        yInvert = getY(invOut ?? invIn ?? (n.ctn - 1.5));
      }
    }

    terrainPoints += `${i === 0 ? 'M' : 'L'} ${x} ${yCtn} `;

    // Manhole shaft
    const shaftWidth = Math.max(4, 6 * zoom);
    manholes.push(
      <g key={`mh-${n.id}-${i}`}>
        <rect
          x={x - shaftWidth / 2}
          y={yCtn}
          width={shaftWidth}
          height={Math.max(2, yInvert - yCtn)}
          fill="var(--color-text-secondary, #6b7280)"
          opacity="0.35"
        />
        <line
          x1={x - shaftWidth}
          x2={x + shaftWidth}
          y1={yCtn}
          y2={yCtn}
          stroke="var(--color-text-primary, #ffffff)"
          strokeWidth="1.5"
          opacity="0.8"
        />
        <line
          x1={x - shaftWidth}
          x2={x + shaftWidth}
          y1={yInvert}
          y2={yInvert}
          stroke="#FF5A09"
          strokeWidth="2"
        />
        <line
          x1={x}
          x2={x}
          y1={padTop}
          y2={svgHeight - padBottom}
          stroke="rgba(255,255,255,0.04)"
          strokeDasharray="2 2"
          strokeWidth="1"
        />
      </g>
    );
  });

  conds.forEach((c, i) => {
    const xStart = getX(dists[i]);
    const xEnd = getX(dists[i + 1]);
    const invIn = c.invertIn || 0;
    const invOut = c.invertOut || 0;
    const diM = (c.dn || 200) / 1000;

    const yInvIn = getY(invIn);
    const yInvOut = getY(invOut);
    const yCrownIn = getY(invIn + diM);
    const yCrownOut = getY(invOut + diM);

    const pointsStr = `${xStart},${yInvIn} ${xEnd},${yInvOut} ${xEnd},${yCrownOut} ${xStart},${yCrownIn}`;
    pipePolygons.push(
      <g key={`conduit-${c.id}-${i}`}>
        <polygon
          points={`${xStart},${yInvIn} ${xEnd},${yInvOut} ${xEnd},${padTop + plotHeight} ${xStart},${padTop + plotHeight}`}
          fill="rgba(139,92,26,0.15)"
        />
        <polygon
          points={pointsStr}
          fill="rgba(255, 90, 9, 0.2)"
          stroke="none"
        />
        <line x1={xStart} y1={yInvIn} x2={xEnd} y2={yInvOut} stroke="#FF7A39" strokeWidth="1.5" />
        <line x1={xStart} y1={yCrownIn} x2={xEnd} y2={yCrownOut} stroke="#FF5A09" strokeWidth="1.5" />
      </g>
    );
  });

  // Calculate nice ticks for Y axis
  const targetTicks = Math.max(10, Math.floor(plotHeight / 25));
  const roughStep = elevRange / targetTicks;
  
  const niceSteps = [0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];
  let step = niceSteps[niceSteps.length - 1];
  for (const s of niceSteps) {
    if (roughStep <= s) {
      step = s;
      break;
    }
  }

  const firstTick = Math.ceil(renderMinElev / step) * step;
  const ticks: number[] = [];
  for (let t = firstTick; t <= renderMaxElev; t += step) {
    ticks.push(t);
  }

  // Calculate nice ticks for X axis
  const targetXTicks = Math.max(10, Math.floor(actualPlotWidth / 60));
  const roughXStep = totalLength / targetXTicks;
  const niceXSteps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500, 1000];
  let xStep = niceXSteps[niceXSteps.length - 1];
  for (const s of niceXSteps) {
    if (roughXStep <= s) {
      xStep = s;
      break;
    }
  }
  const xTicks: number[] = [];
  for (let d = 0; d <= totalLength; d += xStep) {
    xTicks.push(d);
  }

  // Interpolate for hover tooltip
  let hoverData = null;
  if (hoverX !== null) {
    const distRatio = (hoverX - padLeft) / actualPlotWidth;
    const currentDist = distRatio * totalLength;
    
    // Find which conduit we are hovering
    let activeIdx = dists.findIndex(d => d >= currentDist) - 1;
    if (activeIdx < 0) activeIdx = 0;
    if (activeIdx >= conds.length) activeIdx = conds.length - 1;
    
    const c = conds[activeIdx];
    const nFrom = nds[activeIdx];
    const nTo = nds[activeIdx + 1];
    
    if (c && nFrom && nTo) {
      const localDist = currentDist - dists[activeIdx];
      const ratio = localDist / (c.length || 1);
      
      const interpCtn = nFrom.ctn + (nTo.ctn - nFrom.ctn) * ratio;
      const interpInv = (c.invertIn || 0) + ((c.invertOut || 0) - (c.invertIn || 0)) * ratio;
      const depth = interpCtn - interpInv;

      hoverData = {
        dist: currentDist,
        ctn: interpCtn,
        inv: interpInv,
        depth
      };
    }
  }

  return (
    <div 
      ref={containerRef}
      className="w-full h-full relative"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverX(null)}
    >
      <svg
        width={svgWidth}
        height={svgHeight}
        className="cursor-crosshair block"
        style={{ minWidth: '100%', minHeight: '100%' }}
      >
        <defs>
          <linearGradient id="terrainGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-text-primary)" stopOpacity="0.08" />
            <stop offset="100%" stopColor="var(--color-text-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <rect x={padLeft} y={padTop} width={Math.max(actualPlotWidth, chartWidth - padLeft - padRight)} height={plotHeight} fill="var(--color-bg-surface, #18181b)" opacity="0.5" rx="4" />

        {/* X Axis Grid (Progressive) */}
        {xTicks.map((d, i) => (
          <g key={`xgrid-${i}`}>
            <line 
              x1={getX(d)} 
              x2={getX(d)} 
              y1={padTop} 
              y2={padTop + plotHeight} 
              stroke="var(--color-text-primary)" 
              strokeOpacity="0.05"
              strokeWidth="1" 
              strokeDasharray="4 4"
            />
            <text 
              x={getX(d)} 
              y={padTop - 8} 
              textAnchor="middle" 
              fontSize="9" 
              fill="var(--color-text-secondary, #a1a1aa)" 
              className="font-mono"
            >
              {d.toFixed(0)}m
            </text>
          </g>
        ))}

        {/* Y Axis Grid */}
        {ticks.map((t, i) => {
          const isMajor = Math.abs(t - Math.round(t)) < 0.001;
          return (
            <g key={`grid-${i}`}>
              <line 
                x1={padLeft} 
                x2={padLeft + actualPlotWidth} 
                y1={getY(t)} 
                y2={getY(t)} 
                stroke="var(--color-text-primary)" 
                strokeOpacity={isMajor ? 0.12 : 0.04}
                strokeWidth={isMajor ? "1" : "0.5"} 
                strokeDasharray={isMajor ? "none" : "4 4"}
              />
              <text 
                x={padLeft - 8} 
                y={getY(t) + 1} 
                textAnchor="end" 
                fontSize="10" 
                fontWeight={isMajor ? "bold" : "normal"}
                fill={isMajor ? "var(--color-text-primary, #f4f4f5)" : "var(--color-text-secondary, #a1a1aa)"} 
                className="font-mono" 
                dominantBaseline="middle"
              >
                {t.toFixed(1)}
              </text>
            </g>
          );
        })}

      {nds.length > 1 && (
        <polygon
          points={`${getX(0)},${getY(nds[0].ctn)} ${conds.map((_, i) => `${getX(dists[i+1])},${getY(nds[i+1].ctn)}`).join(' ')} ${getX(totalLength)},${padTop + plotHeight} ${getX(0)},${padTop + plotHeight}`}
          fill="url(#terrainGradient)"
        />
      )}

      {pipePolygons}
      {manholes}

      {terrainPoints && (
        <path d={terrainPoints} stroke="#10b981" strokeWidth="2" fill="none" />
      )}

      {/* Hover Crosshair and Tooltip */}
      {hoverX !== null && hoverData && (
        <g>
          <line x1={hoverX} x2={hoverX} y1={padTop} y2={padTop + plotHeight} stroke="var(--color-accent, #3b82f6)" strokeWidth="1" strokeDasharray="4 2" />
          
          <circle cx={hoverX} cy={getY(hoverData.ctn)} r={3} fill="#10b981" />
          <circle cx={hoverX} cy={getY(hoverData.inv)} r={3} fill="#FF7A39" />

          {/* Tooltip Background */}
          <rect 
            x={hoverX + 10} 
            y={padTop + 10} 
            width={120} 
            height={65} 
            fill="var(--color-bg-primary, #09090b)" 
            stroke="var(--color-border-subtle, #27272a)"
            rx="4"
            opacity="0.95"
          />
          <text x={hoverX + 18} y={padTop + 25} fontSize="9" fill="var(--color-text-secondary, #a1a1aa)" className="font-mono">
            {t('profile.chart.prog', 'Prog:')} {formatNumber(hoverData.dist, 2)}m
          </text>
          <text x={hoverX + 18} y={padTop + 40} fontSize="9" fill="#10b981" className="font-mono font-bold">
            {t('profile.chart.terrain', 'Terreno:')} {formatNumber(hoverData.ctn, 2)}
          </text>
          <text x={hoverX + 18} y={padTop + 55} fontSize="9" fill="#FF7A39" className="font-mono font-bold">
            {t('profile.chart.invert', 'Solera:')} {formatNumber(hoverData.inv, 2)}
          </text>
          <text x={hoverX + 18} y={padTop + 70} fontSize="9" fill="var(--color-text-primary, #f4f4f5)" className="font-mono">
            {t('profile.chart.cover', 'Tapada:')} {formatNumber(hoverData.depth, 2)}m
          </text>
        </g>
      )}

      {/* Terrain line outline */}
      <polyline
        points={`${getX(0)},${getY(nds[0].ctn)} ${conds.map((_, i) => `${getX(dists[i+1])},${getY(nds[i+1].ctn)}`).join(' ')}`}
        fill="none"
        stroke="var(--color-text-primary)"
        strokeOpacity="0.1"
        strokeWidth="1"
      />

      <line x1={padLeft} x2={padLeft + actualPlotWidth} y1={padTop + plotHeight} y2={padTop + plotHeight} stroke="var(--color-border-subtle)" strokeWidth="1" />
      </svg>

      {/* HTML Info Box Overlay */}
      {!isDocked && (
        <div 
          style={{
            position: 'absolute',
            top: padTop,
            left: 16,
            width: 170, // narrower to avoid overlapping the Y axis labels
            background: 'var(--color-bg-primary, #09090b)',
            border: '1px solid var(--color-border-subtle, #27272a)',
            borderRadius: '8px',
            padding: '12px 16px',
            opacity: 0.95,
            color: 'var(--color-text-primary, #f4f4f5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px', // tighter vertical spacing for more elements
            pointerEvents: 'none',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
          }}
        >
          <div style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.15em', opacity: 0.8, borderBottom: '1px solid var(--color-border-subtle, #27272a)', paddingBottom: '6px', fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>
            RESUMEN
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '9px', color: 'var(--color-text-secondary, #a1a1aa)' }}>LONGITUD TOTAL</span>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#38bdf8' }}>{formatNumber(totalLength, 1)} m</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '9px', color: 'var(--color-text-secondary, #a1a1aa)' }}>DESNIVEL SOLERA</span>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#10b981' }}>{formatNumber(summary.drop, 2)} m</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '9px', color: 'var(--color-text-secondary, #a1a1aa)' }}>PENDIENTE MEDIA</span>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#fb923c' }}>{formatNumber(summary.avgSlope, 2)} ‰</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '9px', color: 'var(--color-text-secondary, #a1a1aa)' }}>Q. MÁXIMO</span>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#818cf8' }}>{formatNumber(summary.maxFlow, 2)} L/s</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '9px', color: 'var(--color-text-secondary, #a1a1aa)' }}>VOLUMEN EXCAV.</span>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#a78bfa' }}>{formatNumber(summary.totalExcavation, 0)} m³</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '9px', color: 'var(--color-text-secondary, #a1a1aa)' }}>CÁMARAS / COND.</span>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-text-primary, #f4f4f5)' }}>{summary.numManholes} / {summary.numPipes}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '9px', color: 'var(--color-text-secondary, #a1a1aa)' }}>TAPADA MÍNIMA</span>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: summary.minCover < 1 ? '#ef4444' : '#fcd34d' }}>{formatNumber(summary.minCover, 2)} m</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '9px', color: 'var(--color-text-secondary, #a1a1aa)' }}>h/D MÁXIMO</span>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: summary.maxHRatio > 0.8 ? '#ef4444' : '#f4f4f5' }}>{formatNumber(summary.maxHRatio, 2)}</span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
