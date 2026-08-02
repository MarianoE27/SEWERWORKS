import React, { useRef, useState, useEffect } from 'react';
import { ProfileChainData } from './useProfileData';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../store/useStore';
import { formatNumber } from '../../lib/utils';

interface Props {
  data: ProfileChainData;
  zoom: number;
  exaggeration: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(v: number | undefined, dec = 2): string {
  if (v === undefined || v === null || isNaN(v as number)) return '—';
  return formatNumber(v, dec);
}

function StateIndicator({ state }: { state?: string }) {
  const colors: Record<string, string> = {
    ok: '#10b981',
    warning: '#fbbf24',
    error: '#ef4444',
    uncalculated: '#475569',
  };
  const c = colors[state || 'uncalculated'] || '#475569';
  return (
    <span
      style={{
        display: 'inline-block',
        width: 6,
        height: 6,
        borderRadius: '50%',
        backgroundColor: c,
        marginRight: 5,
        flexShrink: 0,
        boxShadow: `0 0 4px ${c}80`,
      }}
    />
  );
}

// ─── Row Components ──────────────────────────────────────────────────────────

interface RowProps {
  label: string;
  height?: number;
  labelBg?: string;
  children: React.ReactNode;
  sectionBg?: string;
  borderColor?: string;
}

function BandRow({ label, height = 26, labelBg = '#18181b', children, sectionBg = 'transparent', borderColor = 'rgba(255,255,255,0.05)' }: RowProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        height,
        borderBottom: `1px solid ${borderColor}`,
        background: sectionBg,
        position: 'relative',
      }}
    >
      {/* Sticky label column */}
      <div
        style={{
          position: 'sticky',
          left: 0,
          width: 144,
          minWidth: 144,
          background: labelBg,
          borderRight: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 10,
          paddingRight: 8,
          zIndex: 10,
          boxShadow: '4px 0 14px rgba(0,0,0,0.4)',
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#a1a1aa',
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        {label}
      </div>
      {/* Content */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, right: 0, zIndex: 1, pointerEvents: 'none' }}>
        {children}
      </div>
    </div>
  );
}

// ─── Section Divider ─────────────────────────────────────────────────────────

function SectionDivider({ title, labelBg = '#18181b' }: { title: string; labelBg?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        height: 24,
        borderTop: '1px solid var(--color-border-subtle)',
        borderBottom: '1px solid var(--color-border-subtle)',
        background: 'var(--color-bg-hover)',
      }}
    >
      {/* Sticky label side */}
      <div
        style={{
          position: 'sticky',
          left: 0,
          width: 144,
          minWidth: 144,
          background: labelBg,
          borderRight: '1px solid var(--color-border-subtle)',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 10,
          zIndex: 10,
          boxShadow: '4px 0 14px rgba(0,0,0,0.1)',
          flexShrink: 0,
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'rgba(255,90,9,0.9)',
        }}
      >
        {title}
      </div>
      {/* Empty data area */}
      <div style={{ flex: 1 }} />
    </div>
  );
}

// ─── Value Cell (positioned at node X) ───────────────────────────────────────

interface NodeCellProps {
  key?: React.Key;
  x: number;
  color?: string;
  bold?: boolean;
  align?: 'center' | 'left';
  children: React.ReactNode;
}

function NodeCell({ x, color = 'var(--color-text-secondary)', bold = false, align = 'center', children }: NodeCellProps) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: 0,
        bottom: 0,
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: align === 'center' ? 'center' : 'flex-start',
        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
        fontSize: 10,
        fontWeight: bold ? 700 : 500,
        color,
        padding: '0 4px',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </div>
  );
}

// ─── Conduit Cell (centered between two nodes) ────────────────────────────────

interface ConduitCellProps {
  key?: React.Key;
  xStart: number;
  xEnd: number;
  color?: string;
  bold?: boolean;
  children: React.ReactNode;
}

function ConduitCell({ xStart, xEnd, color = 'var(--color-text-secondary)', bold = false, children }: ConduitCellProps) {
  const width = xEnd - xStart;
  const center = xStart + width / 2;
  if (width < 10) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: center,
        top: 0,
        bottom: 0,
        transform: 'translateX(-50%)',
        maxWidth: width - 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
        fontSize: 10,
        fontWeight: bold ? 700 : 500,
        color,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
      }}
    >
      {children}
    </div>
  );
}

// ─── Vertical grid line at node ───────────────────────────────────────────────

function GridLine({ x, totalHeight }: { key?: React.Key; x: number; totalHeight: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: 0,
        width: 1,
        height: totalHeight,
        background: 'var(--color-border-subtle)',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ProfileBands({ data, zoom }: Props) {
  const { t } = useTranslation();
  const parameters = useStore((s) => s.parameters);
  const { conduits: conds, nodes: nds, dists, totalLength } = data;
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(800);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) setChartWidth(w);
      }
    });
    const target = containerRef.current.parentElement || containerRef.current;
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  // Same geometry as ProfileChart
  const padLeft = 240; // 144 (sticky column) + 96 (padding for half-text width)
  const padRight = 40;
  const minPlotWidth = Math.max(1, chartWidth - padLeft - padRight);
  const actualPlotWidth = minPlotWidth * zoom;
  const totalWidth = Math.max(actualPlotWidth + padLeft + padRight, chartWidth);

  const getX = (dist: number) =>
    padLeft + (totalLength > 0 ? dist / totalLength : 0) * actualPlotWidth;

  // Design limits from parameters
  const maxHRatio = parameters?.maxHRatio ?? 0.75;
  const minVel = parameters?.minVelocity ?? 0.6;
  const maxVel = parameters?.maxVelocity ?? 3.0;
  const minCover = parameters?.minCover ?? 1.2;

  // Color helpers
  const hRatioColor = (v?: number) => {
    if (v === undefined) return '#64748b';
    if (v > maxHRatio) return '#ef4444';
    if (v > maxHRatio * 0.85) return '#fbbf24';
    return '#10b981';
  };

  const velocityColor = (v?: number) => {
    if (v === undefined) return '#64748b';
    if (v < minVel || v > maxVel) return '#ef4444';
    return '#10b981';
  };

  const depthColor = (v: number) => {
    if (v > 4) return '#ef4444';
    if (v > 2.5) return '#fbbf24';
    return 'var(--color-text-secondary)';
  };

  const coverColor = (v?: number) => {
    if (v === undefined) return 'var(--color-text-secondary)';
    if (v < minCover) return '#ef4444';
    return 'var(--color-text-secondary)';
  };

  // Solera helpers for intermediate nodes
  const getSolera = (i: number) => {
    if (i === 0) return conds[0]?.invertIn;
    if (i === nds.length - 1) return conds[i - 1]?.invertOut;
    const invOut = conds[i - 1]?.invertOut;
    const invIn = conds[i]?.invertIn;
    if (invOut !== undefined && invIn !== undefined) return Math.min(invOut, invIn);
    return invOut ?? invIn;
  };

  const getMinCover = (i: number) => {
    if (i === 0) return conds[0]?.coverIn;
    if (i === nds.length - 1) return conds[i - 1]?.coverOut;
    const cOut = conds[i - 1]?.coverOut;
    const cIn = conds[i]?.coverIn;
    if (cOut !== undefined && cIn !== undefined) return Math.min(cOut, cIn);
    return cOut ?? cIn;
  };

  // Background colors
  const labelBg = 'var(--color-bg-surface)';
  const bgA = 'transparent';
  const bgB = 'rgba(0,0,0,0.08)';
  const bgC = 'rgba(0,0,0,0.15)';

  // Count total rows to estimate grid height
  // 3 (A) + 3 (B) + divider + 7 (C) = 13 rows × 26px + 20px = 358px
  const estimatedTotalHeight = 13 * 26 + 20;

  return (
    <div
      ref={containerRef}
      style={{
        width: totalWidth,
        minWidth: '100%',
        position: 'relative',
        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
        userSelect: 'none',
      }}
    >
      {/* Background vertical grid lines */}
      {nds.map((_, i) => (
        <GridLine key={`grid-v-${i}`} x={getX(dists[i])} totalHeight={estimatedTotalHeight} />
      ))}

      {/* ═══════════════════════════════════════════════
          SECTION A — IDENTIFICATION & TOPOGRAPHY
          ═══════════════════════════════════════════════ */}
      <SectionDivider title="CÁMARAS" labelBg={labelBg} />

      {/* A1 — Cámara */}
      <BandRow label={t('profile.bands.manhole', 'Cámara')} labelBg={labelBg} sectionBg={bgA}>
        {nds.map((n, i) => (
          <NodeCell key={`name-${i}`} x={getX(dists[i])} color="var(--color-text-primary)" bold>
            <StateIndicator state={n?.state} />
            {n?.name ?? '—'}
          </NodeCell>
        ))}
      </BandRow>

      {/* A2 — Cota Terreno */}
      <BandRow label={t('profile.bands.terrain_level', 'Cota Terreno')} labelBg={labelBg} sectionBg={bgA}>
        {nds.map((n, i) => (
          <NodeCell key={`ctn-${i}`} x={getX(dists[i])} color="#10b981" bold>
            {fmt(n?.ctn)}
          </NodeCell>
        ))}
      </BandRow>

      {/* A3 — Progresiva Acumulada */}
      <BandRow label={t('profile.bands.cum_dist', 'Prog. (m)')} labelBg={labelBg} sectionBg={bgA} borderColor="var(--color-border-subtle)">
        {dists.map((d, i) => (
          <NodeCell key={`dist-${i}`} x={getX(d)} color="var(--color-text-secondary)">
            {fmt(d, 1)}
          </NodeCell>
        ))}
      </BandRow>

      {/* ═══════════════════════════════════════════════
          SECTION B — HYDRAULIC NODE DATA
          ═══════════════════════════════════════════════ */}

      {/* B1 — Cota Solera */}
      <BandRow label={t('profile.bands.invert_level', 'Cota Solera')} labelBg={labelBg} sectionBg={bgB}>
        {nds.map((n, i) => {
          const sol = getSolera(i);
          const hasDropEntry = i > 0 && i < nds.length - 1
            && conds[i - 1]?.invertOut !== undefined
            && conds[i]?.invertIn !== undefined
            && Math.abs((conds[i - 1]?.invertOut ?? 0) - (conds[i]?.invertIn ?? 0)) > 0.01;
          return (
            <NodeCell key={`sol-${i}`} x={getX(dists[i])} color="#f97316" bold>
              {hasDropEntry
                ? <span title={`Entrada: ${fmt(conds[i-1]?.invertOut)} / Salida: ${fmt(conds[i]?.invertIn)}`}>
                    <span style={{ color: '#fdba74' }}>{fmt(conds[i-1]?.invertOut)}</span>
                    <span style={{ color: 'var(--color-text-secondary)', margin: '0 2px' }}>▼</span>
                    <span>{fmt(conds[i]?.invertIn)}</span>
                  </span>
                : fmt(sol)
              }
            </NodeCell>
          );
        })}
      </BandRow>

      {/* B2 — Profundidad */}
      <BandRow label={t('profile.bands.depth', 'Profundidad')} labelBg={labelBg} sectionBg={bgB}>
        {nds.map((n, i) => {
          const sol = getSolera(i);
          const p = n && sol !== undefined ? n.ctn - sol : undefined;
          return (
            <NodeCell key={`prof-${i}`} x={getX(dists[i])} color={p !== undefined ? depthColor(p) : 'var(--color-text-secondary)'} bold={p !== undefined && p > 2.5}>
              {p !== undefined && p > 0 ? `${fmt(p)} m` : '—'}
            </NodeCell>
          );
        })}
      </BandRow>

      {/* B3 — Tapada */}
      <BandRow label={t('profile.bands.cover', 'Tapada')} labelBg={labelBg} sectionBg={bgB} borderColor="var(--color-border-subtle)">
        {nds.map((_, i) => {
          const cov = getMinCover(i);
          return (
            <NodeCell key={`cov-${i}`} x={getX(dists[i])} color={coverColor(cov)}>
              {cov !== undefined ? `${fmt(cov)} m` : '—'}
            </NodeCell>
          );
        })}
      </BandRow>

      {/* ═══════════════════════════════════════════════
          SECTION DIVIDER
          ═══════════════════════════════════════════════ */}
      <SectionDivider title="CONDUCTOS" labelBg={labelBg} />

      {/* ═══════════════════════════════════════════════
          SECTION C — CONDUIT HYDRAULIC DATA
          ═══════════════════════════════════════════════ */}

      {/* C1 — Nombre del conducto */}
      <BandRow label={t('profile.bands.pipe_name', 'Conducto')} labelBg={labelBg} sectionBg={bgC}>
        {conds.map((c, i) => (
          <ConduitCell key={`cname-${i}`} xStart={getX(dists[i])} xEnd={getX(dists[i + 1])} color="var(--color-text-primary)" bold>
            {c.name}
          </ConduitCell>
        ))}
      </BandRow>

      {/* C2 — DN + Longitud */}
      <BandRow label="DN / Long." labelBg={labelBg} sectionBg={bgC}>
        {conds.map((c, i) => (
          <ConduitCell key={`dn-${i}`} xStart={getX(dists[i])} xEnd={getX(dists[i + 1])} color="#38bdf8" bold>
            <span style={{ color: '#38bdf8' }}>DN {c.dn ?? '—'}</span>
            <span style={{ color: 'var(--color-text-secondary)', margin: '0 4px' }}>·</span>
            <span style={{ color: 'var(--color-text-secondary)', fontWeight: 'normal' }}>{fmt(c.length, 1)} m</span>
          </ConduitCell>
        ))}
      </BandRow>

      {/* C3 — Pendiente */}
      <BandRow label={t('profile.bands.slope', 'Pendiente')} labelBg={labelBg} sectionBg={bgC}>
        {conds.map((c, i) => (
          <ConduitCell key={`slope-${i}`} xStart={getX(dists[i])} xEnd={getX(dists[i + 1])} color="#fb923c" bold>
            {fmt(c.slope, 2)} ‰
          </ConduitCell>
        ))}
      </BandRow>

      {/* C4 — Q Diseño */}
      <BandRow label="Q Diseño" labelBg={labelBg} sectionBg={bgC}>
        {conds.map((c, i) => (
          <ConduitCell key={`q-${i}`} xStart={getX(dists[i])} xEnd={getX(dists[i + 1])} color="#60a5fa">
            {fmt(c.qDesign, 3)} l/s
          </ConduitCell>
        ))}
      </BandRow>

      {/* C5 — h/D */}
      <BandRow label="h/D" labelBg={labelBg} sectionBg={bgC}>
        {conds.map((c, i) => {
          const col = hRatioColor(c.hRatio);
          const symbol = c.hRatio === undefined ? '' : c.hRatio > maxHRatio ? ' ✗' : c.hRatio > maxHRatio * 0.85 ? ' ⚠' : ' ✓';
          return (
            <ConduitCell key={`hr-${i}`} xStart={getX(dists[i])} xEnd={getX(dists[i + 1])} color={col} bold>
              {fmt(c.hRatio, 3)}
              <span style={{ fontSize: 9, marginLeft: 2 }}>{symbol}</span>
            </ConduitCell>
          );
        })}
      </BandRow>

      {/* C6 — Velocidad */}
      <BandRow label="Velocidad" labelBg={labelBg} sectionBg={bgC}>
        {conds.map((c, i) => {
          const col = velocityColor(c.velocity);
          const outOfRange = c.velocity !== undefined && (c.velocity < minVel || c.velocity > maxVel);
          return (
            <ConduitCell key={`vel-${i}`} xStart={getX(dists[i])} xEnd={getX(dists[i + 1])} color={col} bold={outOfRange}>
              {fmt(c.velocity, 2)} m/s
              {outOfRange && <span style={{ fontSize: 9, marginLeft: 2 }}>✗</span>}
            </ConduitCell>
          );
        })}
      </BandRow>

      {/* C7 — Fuerza Tractiva */}
      <BandRow label="F. Tractiva" labelBg={labelBg} sectionBg={bgC} borderColor="rgba(255,255,255,0.05)">
        {conds.map((c, i) => {
          const ft = c.tractiveForce;
          const minFT = parameters?.minTractiveForce ?? 0.1;
          const col = ft === undefined ? '#64748b' : ft < minFT ? '#ef4444' : '#10b981';
          return (
            <ConduitCell key={`ft-${i}`} xStart={getX(dists[i])} xEnd={getX(dists[i + 1])} color={col}>
              {fmt(ft, 3)} kg/m²
            </ConduitCell>
          );
        })}
      </BandRow>

    </div>
  );
}
