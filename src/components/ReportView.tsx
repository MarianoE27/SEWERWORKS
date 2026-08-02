import React from 'react';
import { Node, Conduit, DesignParameters } from '../types';
import { formatNumber } from '../lib/utils';

interface Props {
  nodes: Record<string, Node>;
  conduits: Record<string, Conduit>;
  parameters: DesignParameters;
  onClose: () => void;
}

export function ReportView({ nodes, conduits, parameters, onClose }: Props) {
  const sortedConduits = Object.values(conduits).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  const sortedNodes = Object.values(nodes).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  const now = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const calculated = sortedConduits.filter(c => c.state && c.state !== 'uncalculated');
  const { errors, warnings, ok } = calculated.reduce(
    (acc, c) => {
      if (c.state === 'error') acc.errors++;
      else if (c.state === 'warning') acc.warnings++;
      else if (c.state === 'ok') acc.ok++;
      return acc;
    },
    { errors: 0, warnings: 0, ok: 0 }
  );

  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-[1000] bg-black/60 flex items-start justify-center overflow-auto py-8 px-4 print:bg-white print:p-0 print:py-0">
      <div
        id="sewerworks-report"
        className="bg-white text-gray-900 rounded-lg shadow-2xl w-full max-w-5xl print:rounded-none print:shadow-none print:max-w-none"
      >
        {/* Toolbar — hidden in print */}
        <div className="flex items-center justify-between px-6 py-3 bg-gray-100 rounded-t-lg border-b print:hidden">
          <span className="font-semibold text-sm text-gray-700">Vista previa del informe</span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 bg-[#FF5A09] hover:bg-[#E64F00] text-white text-sm rounded font-medium transition-colors cursor-pointer"
            >
              Imprimir / Guardar PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-gray-300 hover:bg-gray-400 text-gray-800 text-sm rounded font-medium transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* Report Body */}
        <div className="p-8">
          {/* Header */}
          <div className="border-b-2 border-[#FF5A09] pb-4 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Informe de Diseño Hidráulico</h1>
                <h2 className="text-lg text-[#FF5A09] mt-1">{parameters.projectName}</h2>
                <p className="text-sm text-gray-500 mt-1">{parameters.location} — {now}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-[#FF5A09]">S</div>
                <div className="text-xs font-bold text-gray-500 tracking-wider">SewerWorks</div>
                <div className="text-xs text-gray-400">Norma ENOHSA</div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <section className="mb-6">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 border-b border-gray-200 pb-1">Resumen del Proyecto</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded p-3 text-center">
                <div className="text-2xl font-bold text-gray-800">{Object.keys(nodes).length}</div>
                <div className="text-xs text-gray-500">Cámaras</div>
              </div>
              <div className="bg-gray-50 rounded p-3 text-center">
                <div className="text-2xl font-bold text-gray-800">{sortedConduits.length}</div>
                <div className="text-xs text-gray-500">Tuberías</div>
              </div>
              <div className="bg-green-50 rounded p-3 text-center">
                <div className="text-2xl font-bold text-green-700">{ok}</div>
                <div className="text-xs text-gray-500">OK</div>
              </div>
              <div className="bg-red-50 rounded p-3 text-center">
                <div className="text-2xl font-bold text-red-600">{errors + warnings}</div>
                <div className="text-xs text-gray-500">Advertencias/Errores</div>
              </div>
            </div>
          </section>

          {/* Design Parameters */}
          <section className="mb-6">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 border-b border-gray-200 pb-1">Parámetros de Diseño</h3>
            <div className="grid grid-cols-3 gap-x-8 gap-y-1 text-xs">
              <div className="flex justify-between py-0.5 border-b border-gray-100"><span className="text-gray-500">Población Total:</span><span className="font-medium">{parameters.population0.toLocaleString()} hab</span></div>
              <div className="flex justify-between py-0.5 border-b border-gray-100"><span className="text-gray-500">Dotación:</span><span className="font-medium">{parameters.dotation} L/hab/d</span></div>
              <div className="flex justify-between py-0.5 border-b border-gray-100"><span className="text-gray-500">Coef. Retorno:</span><span className="font-medium">{parameters.returnRate}</span></div>
              <div className="flex justify-between py-0.5 border-b border-gray-100"><span className="text-gray-500">Coef. Babbitt (M):</span><span className="font-medium">{parameters.babbittCoefficient}</span></div>
              <div className="flex justify-between py-0.5 border-b border-gray-100"><span className="text-gray-500">Manning (n):</span><span className="font-medium">{parameters.manningN}</span></div>
              <div className="flex justify-between py-0.5 border-b border-gray-100"><span className="text-gray-500">Infiltración:</span><span className="font-medium">{parameters.infiltrationRate} L/s/km</span></div>
              <div className="flex justify-between py-0.5 border-b border-gray-100"><span className="text-gray-500">Tapada mín/máx:</span><span className="font-medium">{parameters.minCover} / {parameters.maxCover} m</span></div>
              <div className="flex justify-between py-0.5 border-b border-gray-100"><span className="text-gray-500">h/D máximo:</span><span className="font-medium">{parameters.maxHRatio}</span></div>
              <div className="flex justify-between py-0.5 border-b border-gray-100"><span className="text-gray-500">Velocidad mín/máx:</span><span className="font-medium">{parameters.minVelocity} / {parameters.maxVelocity} m/s</span></div>
            </div>
          </section>

          {/* Results Table */}
          <section>
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 border-b border-gray-200 pb-1">Resultados por Tubería</h3>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-600">
                  <th className="px-2 py-1.5 text-left border border-gray-200 font-semibold">Tramo</th>
                  <th className="px-2 py-1.5 text-left border border-gray-200 font-semibold">De → A</th>
                  <th className="px-2 py-1.5 text-right border border-gray-200 font-semibold">Long. (m)</th>
                  <th className="px-2 py-1.5 text-right border border-gray-200 font-semibold">DN (mm)</th>
                  <th className="px-2 py-1.5 text-right border border-gray-200 font-semibold">Pend. (‰)</th>
                  <th className="px-2 py-1.5 text-right border border-gray-200 font-semibold">Q Ap (l/s)</th>
                  <th className="px-2 py-1.5 text-right border border-gray-200 font-semibold">Q Inf (l/s)</th>
                  <th className="px-2 py-1.5 text-right border border-gray-200 font-semibold">Q A.Arr (l/s)</th>
                  <th className="px-2 py-1.5 text-right border border-gray-200 font-semibold">Q Tot (l/s)</th>
                  <th className="px-2 py-1.5 text-right border border-gray-200 font-semibold">V (m/s)</th>
                  <th className="px-2 py-1.5 text-right border border-gray-200 font-semibold">h/D</th>
                  <th className="px-2 py-1.5 text-right border border-gray-200 font-semibold">T (kg/m²)</th>
                  <th className="px-2 py-1.5 text-right border border-gray-200 font-semibold">Inv.Ini (m)</th>
                  <th className="px-2 py-1.5 text-right border border-gray-200 font-semibold">Inv.Fin (m)</th>
                  <th className="px-2 py-1.5 text-center border border-gray-200 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {sortedConduits.map((c, i) => {
                  const fromName = nodes[c.from]?.name ?? c.from;
                  const toName = nodes[c.to]?.name ?? c.to;
                  const rowBg = c.state === 'error' ? 'bg-red-50' : c.state === 'warning' ? 'bg-yellow-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                  const stateColor = c.state === 'error' ? 'text-red-600' : c.state === 'warning' ? 'text-yellow-600' : c.state === 'ok' ? 'text-green-700' : 'text-gray-400';
                  return (
                    <tr key={c.id} className={rowBg}>
                      <td className="px-2 py-1 border border-gray-200 font-medium">{c.name}</td>
                      <td className="px-2 py-1 border border-gray-200 text-gray-600">{fromName} → {toName}</td>
                      <td className="px-2 py-1 border border-gray-200 text-right">{formatNumber(c.length, 1)}</td>
                      <td className="px-2 py-1 border border-gray-200 text-right">{c.dn ?? '-'}</td>
                      <td className="px-2 py-1 border border-gray-200 text-right">{formatNumber(c.slope, 2)}</td>
                      <td className="px-2 py-1 border border-gray-200 text-right">{formatNumber(c.qAporte, 3)}</td>
                      <td className="px-2 py-1 border border-gray-200 text-right">{formatNumber(c.qInfiltration, 3)}</td>
                      <td className="px-2 py-1 border border-gray-200 text-right">{formatNumber(c.qUpstream, 3)}</td>
                      <td className="px-2 py-1 border border-gray-200 text-right">{formatNumber(c.qDesign, 3)}</td>
                      <td className="px-2 py-1 border border-gray-200 text-right">{formatNumber(c.velocity, 2)}</td>
                      <td className="px-2 py-1 border border-gray-200 text-right">{formatNumber(c.hRatio, 3)}</td>
                      <td className="px-2 py-1 border border-gray-200 text-right">{formatNumber(c.tractiveForce, 3)}</td>
                      <td className="px-2 py-1 border border-gray-200 text-right">{formatNumber(c.invertIn, 3)}</td>
                      <td className="px-2 py-1 border border-gray-200 text-right">{formatNumber(c.invertOut, 3)}</td>
                      <td className={`px-2 py-1 border border-gray-200 text-center font-semibold ${stateColor}`}>
                        {c.state?.toUpperCase() ?? '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          {/* Node Results Table */}
          <section className="mt-8 print:break-before-page">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 border-b border-gray-200 pb-1">Resultados por Cámara</h3>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-600">
                  <th className="px-2 py-1.5 text-left border border-gray-200 font-semibold">Cámara</th>
                  <th className="px-2 py-1.5 text-right border border-gray-200 font-semibold">X (m)</th>
                  <th className="px-2 py-1.5 text-right border border-gray-200 font-semibold">Y (m)</th>
                  <th className="px-2 py-1.5 text-right border border-gray-200 font-semibold">Cota Terreno (m)</th>
                  <th className="px-2 py-1.5 text-right border border-gray-200 font-semibold">Cota Fondo (m)</th>
                  <th className="px-2 py-1.5 text-right border border-gray-200 font-semibold">Profundidad (m)</th>
                  <th className="px-2 py-1.5 text-right border border-gray-200 font-semibold">Salto (m)</th>
                  <th className="px-2 py-1.5 text-right border border-gray-200 font-semibold">Q Ingreso (L/s)</th>
                  <th className="px-2 py-1.5 text-center border border-gray-200 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {sortedNodes.map((n, i) => {
                  const rowBg = n.state === 'error' ? 'bg-red-50' : n.state === 'warning' ? 'bg-yellow-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                  const stateColor = n.state === 'error' ? 'text-red-600' : n.state === 'warning' ? 'text-yellow-600' : n.state === 'ok' ? 'text-green-700' : 'text-gray-400';
                  return (
                    <tr key={n.id} className={rowBg}>
                      <td className="px-2 py-1 border border-gray-200 font-medium">{n.name}</td>
                      <td className="px-2 py-1 border border-gray-200 text-right font-mono text-gray-500">{formatNumber(n.x, 1)}</td>
                      <td className="px-2 py-1 border border-gray-200 text-right font-mono text-gray-500">{formatNumber(n.y, 1)}</td>
                      <td className="px-2 py-1 border border-gray-200 text-right font-mono font-semibold text-emerald-700">{formatNumber(n.ctn, 3)}</td>
                      <td className="px-2 py-1 border border-gray-200 text-right font-mono text-accent">{formatNumber(n.invert, 3)}</td>
                      <td className="px-2 py-1 border border-gray-200 text-right font-mono font-semibold">{formatNumber(n.depth, 2)}</td>
                      <td className="px-2 py-1 border border-gray-200 text-right font-mono">{n.drop && n.drop > 0 ? formatNumber(n.drop, 3) : '-'}</td>
                      <td className="px-2 py-1 border border-gray-200 text-right font-mono">{formatNumber(n.inflow, 3)}</td>
                      <td className={`px-2 py-1 border border-gray-200 text-center font-semibold ${stateColor}`}>
                        {n.state?.toUpperCase() ?? '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          {/* Compliance note */}
          <div className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-400 text-center">
            Diseño realizado según Normas ENOHSA para redes de desagüe cloacal. Generado con SewerWorks — {now}.
          </div>
        </div>
      </div>

      {/* Print styles injected inline */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #sewerworks-report, #sewerworks-report * { visibility: visible; }
          #sewerworks-report { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}
