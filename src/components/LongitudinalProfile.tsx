import React from 'react';
import { Conduit, Node } from '../types';
import { formatNumber } from '../lib/utils';
import { useTranslation } from 'react-i18next';

interface Props {
  conduit: Conduit;
  nodeFrom: Node;
  nodeTo: Node;
}

const SVG_W = 240;
const SVG_H = 130;
const PAD = { top: 18, right: 14, bottom: 28, left: 44 };
const PLOT_W = SVG_W - PAD.left - PAD.right;
const PLOT_H = SVG_H - PAD.top - PAD.bottom;

export function LongitudinalProfile({ conduit, nodeFrom, nodeTo }: Props) {
  const { t } = useTranslation();
  const { invertIn, invertOut, dn, length, slope } = conduit;
  const ctnFrom = nodeFrom.ctn;
  const ctnTo = nodeTo.ctn;

  if (invertIn === undefined || invertOut === undefined || !dn || !length) {
    return (
      <div className="text-xs text-faint italic text-center py-3">
        {t('profile.calculate_prompt', 'Calcule la red para ver el perfil longitudinal.')}
      </div>
    );
  }

  const diM = dn / 1000;

  // Elevations involved
  const allElev = [ctnFrom, ctnTo, invertIn, invertOut, invertIn + diM, invertOut + diM];
  const minElev = Math.min(...allElev);
  const maxElev = Math.max(...allElev);
  const elevRange = maxElev - minElev || 1;

  // Map elevation to SVG y (flipped: high elev = low y)
  const toY = (elev: number) => PAD.top + PLOT_H - ((elev - minElev) / elevRange) * PLOT_H;
  // Map distance to SVG x
  const toX = (dist: number) => PAD.left + (dist / length) * PLOT_W;

  // Key points
  const x0 = toX(0);
  const x1 = toX(length);

  // Terrain line
  const terrainPath = `M ${x0} ${toY(ctnFrom)} L ${x1} ${toY(ctnTo)}`;

  // Pipe crown (top of pipe)
  const crownPath = `M ${x0} ${toY(invertIn + diM)} L ${x1} ${toY(invertOut + diM)}`;

  // Pipe invert (bottom)
  const invertPath = `M ${x0} ${toY(invertIn)} L ${x1} ${toY(invertOut)}`;

  // Pipe fill polygon
  const pipeFill = [
    `M ${x0} ${toY(invertIn)}`,
    `L ${x1} ${toY(invertOut)}`,
    `L ${x1} ${toY(invertOut + diM)}`,
    `L ${x0} ${toY(invertIn + diM)}`,
    'Z'
  ].join(' ');

  // Y-axis ticks (3 ticks)
  const ticks = [minElev, minElev + elevRange / 2, maxElev];

  return (
    <div className="mt-3">
      <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-medium">{t('profile.title', 'Perfil Longitudinal')}</h4>
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        width="100%"
        className="overflow-visible"
        aria-label="Perfil longitudinal del conduit"
      >
        {/* Background */}
        <rect x={PAD.left} y={PAD.top} width={PLOT_W} height={PLOT_H} fill="var(--color-surface, #1e1e2e)" rx="2" />

        {/* Grid lines */}
        {ticks.map((t, i) => (
          <line key={i} x1={PAD.left} x2={PAD.left + PLOT_W} y1={toY(t)} y2={toY(t)} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
        ))}

        {/* Terrain fill (sky) */}
        <polygon
          points={`${x0},${toY(ctnFrom)} ${x1},${toY(ctnTo)} ${x1},${PAD.top} ${x0},${PAD.top}`}
          fill="rgba(16,185,129,0.05)"
        />
        {/* Terrain line */}
        <path d={terrainPath} stroke="#10b981" strokeWidth="1.5" fill="none" strokeDasharray="4 2" />

        {/* Soil below invert */}
        <polygon
          points={`${x0},${toY(invertIn)} ${x1},${toY(invertOut)} ${x1},${PAD.top + PLOT_H} ${x0},${PAD.top + PLOT_H}`}
          fill="rgba(139,92,26,0.15)"
        />

        {/* Pipe body */}
        <path d={pipeFill} fill="rgba(255, 90, 9, 0.25)" stroke="none" />

        {/* Pipe crown */}
        <path d={crownPath} stroke="#FF5A09" strokeWidth="1.2" fill="none" />

        {/* Pipe invert */}
        <path d={invertPath} stroke="#FF7A39" strokeWidth="1.2" fill="none" />

        {/* Elevation labels at start */}
        <text x={PAD.left - 3} y={toY(invertIn) + 1} textAnchor="end" fontSize="7" fill="#FF7A39" dominantBaseline="middle">
          {formatNumber(invertIn, 2)}
        </text>
        <text x={PAD.left - 3} y={toY(ctnFrom) + 1} textAnchor="end" fontSize="7" fill="#22c55e" dominantBaseline="middle">
          {formatNumber(ctnFrom, 2)}
        </text>

        {/* Elevation labels at end */}
        <text x={x1 + 2} y={toY(invertOut) + 1} textAnchor="start" fontSize="7" fill="#FF7A39" dominantBaseline="middle">
          {formatNumber(invertOut, 2)}
        </text>
        <text x={x1 + 2} y={toY(ctnTo) + 1} textAnchor="start" fontSize="7" fill="#22c55e" dominantBaseline="middle">
          {formatNumber(ctnTo, 2)}
        </text>

        {/* X axis labels */}
        <text x={x0} y={PAD.top + PLOT_H + 10} textAnchor="middle" fontSize="7" fill="#888">0m</text>
        <text x={x1} y={PAD.top + PLOT_H + 10} textAnchor="middle" fontSize="7" fill="#888">{formatNumber(length, 1)}m</text>

        {/* Legend */}
        <line x1={PAD.left} y1={SVG_H - 8} x2={PAD.left + 10} y2={SVG_H - 8} stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4 2" />
        <text x={PAD.left + 13} y={SVG_H - 6} fontSize="7" fill="#888">{t('profile.terrain', 'Terreno')}</text>
        <line x1={PAD.left + 55} y1={SVG_H - 8} x2={PAD.left + 65} y2={SVG_H - 8} stroke="#FF5A09" strokeWidth="1.5" />
        <text x={PAD.left + 68} y={SVG_H - 6} fontSize="7" fill="#888">{t('profile.crown_invert', 'Clave / Solera')}</text>
      </svg>

      {/* Key stats below chart */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-muted mt-1">
        <span className="text-faint">{t('profile.slope', 'Pendiente:')}</span>
        <span>{formatNumber((slope ?? 0), 2)} ‰</span>
        <span className="text-faint">{t('profile.dn', 'DN:')}</span>
        <span>{dn} mm</span>
        <span className="text-faint">{t('profile.cover_start_end', 'Tapada ini/fin:')}</span>
        <span>{formatNumber(conduit.coverIn ?? 0, 2)} / {formatNumber(conduit.coverOut ?? 0, 2)} m</span>
      </div>
    </div>
  );
}
