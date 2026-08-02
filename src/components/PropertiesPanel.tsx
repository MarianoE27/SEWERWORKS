import React from 'react';
import { useStore } from '../store/useStore';
import { formatNumber, getStateColor } from '../lib/utils';
import { X, ArrowRightLeft, Trash2 } from 'lucide-react';
import { LongitudinalProfile } from './LongitudinalProfile';
import { ConfirmModal } from './ui/ConfirmModal';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const INPUT_CLASS = 'w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-200';

export function PropertiesPanel({ isStacked = false }: { isStacked?: boolean }) {
  const { t } = useTranslation();
  const { selectedElementId, selectedElementType, selectedElementIds, selectedElementTypes, nodes, conduits, parameters, updateNode, updateConduit, selectElement, clearMultiSelection, deleteNode, deleteConduit, deleteSelected } = useStore();
  const [elementToDelete, setElementToDelete] = useState<{ id?: string, type: 'node' | 'conduit' | 'selected' } | null>(null);

  const confirmDelete = () => {
    if (!elementToDelete) return;
    if (elementToDelete.type === 'selected') {
      deleteSelected();
    } else if (elementToDelete.type === 'node' && elementToDelete.id) {
      deleteNode(elementToDelete.id);
    } else if (elementToDelete.type === 'conduit' && elementToDelete.id) {
      deleteConduit(elementToDelete.id);
    }
    setElementToDelete(null);
  };

  // Multi-selection panel
  if (selectedElementIds.length > 1) {
    const nodeCount = selectedElementIds.filter(id => selectedElementTypes[id] === 'node').length;
    const conduitCount = selectedElementIds.filter(id => selectedElementTypes[id] === 'conduit').length;
    return (
      <>
      <div className={`${isStacked ? 'w-full' : 'w-80'} shrink-0 glass-panel flex flex-col h-full z-10 relative text-sm text-text-secondary border-l`}>
        <div className="h-9 border-b border-border-subtle flex items-center justify-between px-3 shrink-0 bg-bg-primary/50">
          <h3 className="font-bold text-xs uppercase tracking-wider text-text-primary">{t('properties.multi_selection', 'Selección múltiple')}</h3>
          <button type="button" className="text-text-secondary hover:text-accent transition-all duration-200" onClick={() => clearMultiSelection()} title={t('properties.close', 'Cerrar')}>
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 p-3 space-y-2">
          <div className="bg-bg-primary rounded-md p-3 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-text-secondary">{t('properties.total_selected', 'Total seleccionados')}</span>
              <span className="font-semibold text-text-primary">{selectedElementIds.length}</span>
            </div>
            {nodeCount > 0 && (
              <div className="flex justify-between">
                <span className="text-text-secondary">{t('properties.manholes', 'Cámaras')}</span>
                <span className="font-semibold text-text-primary">{nodeCount}</span>
              </div>
            )}
            {conduitCount > 0 && (
              <div className="flex justify-between">
                <span className="text-text-secondary">{t('properties.pipes', 'Tuberías')}</span>
                <span className="font-semibold text-text-primary">{conduitCount}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-text-secondary">
            {t('properties.multi_selection_help', 'Arrastrá una cámara seleccionada para mover el grupo. Presioná')} <kbd className="bg-bg-primary border border-border-subtle rounded px-1">{t('properties.del_key', 'Del')}</kbd> {t('properties.to_delete', 'para eliminar.')}
          </p>
          <button
            type="button"
            onClick={() => setElementToDelete({ type: 'selected' })}
            className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-md px-3 py-2 text-sm transition-all duration-200 cursor-pointer"
          >
            <Trash2 size={14} />
            {t('properties.delete_selection', 'Eliminar selección')}
          </button>
        </div>
      </div>
      <ConfirmModal
        isOpen={elementToDelete !== null}
        onClose={() => setElementToDelete(null)}
        onConfirm={confirmDelete}
        title={t('properties.delete_selection_confirm_title', 'Eliminar Selección')}
        message={t('properties.delete_selection_confirm_msg', '¿Estás seguro de que deseas eliminar los elementos seleccionados? Esta acción no se puede deshacer.')}
        confirmText={t('properties.delete', 'Eliminar')}
        cancelText={t('properties.cancel', 'Cancelar')}
        variant="danger"
      />
    </>
    );
  }

  if (!selectedElementId && !selectedElementType) {
    return null;
  }

  if (selectedElementType === 'node' && selectedElementId) {
    const node = nodes[selectedElementId];
    if (!node) return null;

    return (
      <div className={`${isStacked ? 'w-full' : 'w-80'} shrink-0 glass-panel flex flex-col h-full z-10 relative text-sm text-text-secondary border-l`}>
        <div className="h-9 border-b border-border-subtle flex items-center justify-between px-3 shrink-0 bg-bg-primary/50">
          <h3 className="font-bold text-xs uppercase tracking-wider text-text-primary">{t('properties.node_title', 'Propiedades de Cámara')}</h3>
          <button type="button" className="text-text-secondary hover:text-accent transition-all duration-200" onClick={() => selectElement(null, null)} title={t('properties.close', 'Cerrar')}>
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
          <div>
            <label htmlFor={`node-name-${node.id}`} className="block text-xs font-medium text-text-primary mb-1.5">{t('properties.name', 'Nombre')}</label>
            <input
              id={`node-name-${node.id}`}
              type="text"
              value={node.name}
              onChange={(e) => updateNode(node.id, { name: e.target.value })}
              className={INPUT_CLASS}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor={`node-x-${node.id}`} className="block text-xs font-medium text-text-primary mb-1.5">X</label>
              <input
                id={`node-x-${node.id}`}
                type="number"
                value={node.x}
                onChange={(e) => updateNode(node.id, { x: Number(e.target.value) })}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label htmlFor={`node-y-${node.id}`} className="block text-xs font-medium text-text-primary mb-1.5">Y</label>
              <input
                id={`node-y-${node.id}`}
                type="number"
                value={node.y}
                onChange={(e) => updateNode(node.id, { y: Number(e.target.value) })}
                className={INPUT_CLASS}
              />
            </div>
          </div>
          <div>
            <label htmlFor={`node-ctn-${node.id}`} className="block text-xs font-medium text-text-primary mb-1.5">{t('properties.ctn', 'Cota Terreno (CTN)')}</label>
            <input
              id={`node-ctn-${node.id}`}
              type="number"
              step="0.01"
              value={node.ctn ?? ''}
              onChange={(e) => updateNode(node.id, { ctn: e.target.value === '' ? undefined : Number(e.target.value) })}
              className={INPUT_CLASS}
            />
          </div>
          
          <div className="pt-3 border-t border-border-subtle">
            <h3 className="text-text-secondary font-medium mb-2 uppercase tracking-wider text-xs">{t('properties.inflows_hydrology', 'Aportes (Hidrología)')}</h3>
            <div className="space-y-3">
              <div>
                <label htmlFor={`node-pointflow-${node.id}`} className="block text-xs font-medium text-text-primary mb-1.5">{t('properties.point_flow', 'Caudal Puntual (L/s)')}</label>
                <input
                  id={`node-pointflow-${node.id}`}
                  type="number"
                  step="0.01"
                  value={node.pointFlow || ''}
                  placeholder="0.00"
                  onChange={(e) => updateNode(node.id, { pointFlow: e.target.value === '' ? undefined : Number(e.target.value) })}
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          </div>
          
          {/* Topología y Derivación de Bifurcaciones — solo visible si >1 conduit saliente */}
          {(() => {
            const salientes = Object.values(conduits).filter(c => c.from === node.id);
            if (salientes.length <= 1) return null;
            const currentRatios = node.outletDiversionRatios || {};
            
            const totalRatio = salientes.reduce((sum, c) => {
              const val = currentRatios[c.id];
              return sum + ((val !== undefined && !isNaN(val) && val > 0) ? val : 0);
            }, 0);

            return (
              <>
                <div className="pt-3 border-t border-border-subtle">
                  <h3 className="text-text-secondary font-medium mb-2 uppercase tracking-wider text-xs">
                    {t('properties.bifurcation_topology', 'Topología de Bifurcación')}
                  </h3>
                  {!node.primaryOutletConduitId && (
                    <div className="mb-2 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 rounded-md p-2">
                      {salientes.length} {t('properties.outlets_detected_alert', 'salidas detectadas. Designar conduit principal para cálculo correcto.')}
                    </div>
                  )}
                  <label htmlFor={`node-primary-outlet-${node.id}`} className="block text-xs font-medium text-text-primary mb-1.5">
                    {t('properties.primary_outlet', 'Conduit Principal de Salida')}
                  </label>
                  <select
                    id={`node-primary-outlet-${node.id}`}
                    value={node.primaryOutletConduitId || ''}
                    onChange={(e) => updateNode(node.id, {
                      primaryOutletConduitId: e.target.value || undefined
                    })}
                    className={INPUT_CLASS}
                  >
                    <option value="">{t('properties.unassigned', '— Sin designar —')}</option>
                    {salientes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {node.primaryOutletConduitId && (
                    <div className="mt-2 space-y-1 text-xs">
                      {salientes.map(c => (
                        <div key={c.id} className="flex items-center gap-2">
                          <span className={c.id === node.primaryOutletConduitId ? 'text-emerald-400 font-semibold' : 'text-violet-400'}>
                            {c.id === node.primaryOutletConduitId ? t('properties.outlet_primary', '→ Principal') : t('properties.outlet_subred', '⋯ Subred')}
                          </span>
                          <span className="text-text-secondary">{c.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-border-subtle">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-text-secondary font-medium uppercase tracking-wider text-xs">
                      {t('properties.bifurcation_diversion', 'Bifurcación / Derivación de Caudales')}
                    </h3>
                    {totalRatio > 0 && (
                      <span className="text-[10px] text-text-secondary font-mono bg-bg-primary px-1.5 py-0.5 rounded border border-border-subtle">
                        {t('properties.sum_ratios', 'Total:')} {formatNumber(totalRatio, 2)}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-text-secondary mb-2.5">
                    {t('properties.bifurcation_diversion_help', 'Ingrese porcentajes (%) o fracciones (0-1) para derivar el caudal entrante entre los conductos de salida.')}
                  </p>
                  <div className="space-y-2">
                    {salientes.map(c => {
                      const val = currentRatios[c.id];
                      const normalizedPct = totalRatio > 0 && val !== undefined && !isNaN(val) && val > 0 
                        ? (val / totalRatio) * 100 
                        : 0;

                      return (
                        <div key={c.id} className="bg-bg-primary p-2 rounded-md border border-border-subtle space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-text-primary truncate" title={c.name}>
                              {c.name}
                            </span>
                            <span className="text-text-secondary text-[10px] font-mono">
                              ({c.id})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              placeholder="Ej: 50"
                              value={val !== undefined ? val : ''}
                              onChange={(e) => {
                                const inputVal = e.target.value;
                                const newRatios = { ...currentRatios };
                                if (inputVal === '') {
                                  delete newRatios[c.id];
                                } else {
                                  const num = parseFloat(inputVal);
                                  if (!isNaN(num)) {
                                    newRatios[c.id] = num;
                                  } else {
                                    delete newRatios[c.id];
                                  }
                                }
                                updateNode(node.id, {
                                  outletDiversionRatios: Object.keys(newRatios).length > 0 ? newRatios : undefined
                                });
                              }}
                              className={`${INPUT_CLASS} py-1 text-xs`}
                            />
                            {totalRatio > 0 && val !== undefined && val > 0 && (
                              <span className="text-[11px] font-semibold font-mono text-accent shrink-0 w-12 text-right">
                                {formatNumber(normalizedPct, 1)}%
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            );
          })()}

          <div className="pt-3 border-t border-border-subtle">
            <h3 className="text-text-secondary font-medium mb-2 uppercase tracking-wider text-xs">{t('properties.results', 'Resultados')}</h3>
            <div className="grid grid-cols-2 gap-y-2 text-xs">
              <span className="text-text-secondary">{t('properties.inflow_rate', 'Caudal Ingreso:')}</span>
              <span className="text-text-primary font-mono">{formatNumber(node.inflow, 2)} L/s</span>
              <span className="text-text-secondary">{t('properties.invert', 'Invertido:')}</span>
              <span className="text-text-primary font-mono">{formatNumber(node.invert, 3)} m</span>
              <span className="text-text-secondary">{t('properties.depth', 'Profundidad:')}</span>
              <span className="text-text-primary font-mono">{formatNumber(node.depth, 3)} m</span>
              <span className="text-text-secondary">{t('properties.drop', 'Salto Interno:')}</span>
              <span className="text-text-primary font-mono">{formatNumber(node.drop, 3)} m</span>
              <span className="text-text-secondary">{t('properties.drop_pipe', 'Cañería de Salto:')}</span>
              <span className={node.hasDropPipe ? "text-yellow-400 font-semibold" : "text-text-primary"}>
                {node.hasDropPipe ? t('properties.required', 'REQUERIDA') : t('properties.no', 'No')}
              </span>
              <span className="text-text-secondary">{t('properties.state', 'Estado:')}</span>
              <span className={`font-semibold ${getStateColor(node.state)}`}>
                {node.state?.toUpperCase() || 'N/A'}
              </span>
            </div>
          </div>
          
          <div className="pt-3 border-t border-border-subtle">
            <button
              type="button"
              className="w-full py-2 px-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-md text-xs font-medium transition-all duration-200 cursor-pointer"
              onClick={() => setElementToDelete({ id: node.id, type: 'node' })}
            >
              {t('properties.delete_node', 'Eliminar Cámara')}
            </button>
          </div>
        </div>
        <ConfirmModal
          isOpen={elementToDelete !== null}
          onClose={() => setElementToDelete(null)}
          onConfirm={confirmDelete}
          title={t('properties.delete_node', 'Eliminar Cámara')}
          message={t('properties.delete_node_confirm_msg', `¿Estás seguro de que deseas eliminar la cámara ${node.name}? Esta acción no se puede deshacer.`)}
          confirmText={t('properties.delete', 'Eliminar')}
          cancelText={t('properties.cancel', 'Cancelar')}
          variant="danger"
        />
      </div>
    );
  }

  if (selectedElementType === 'conduit' && selectedElementId) {
    const conduit = conduits[selectedElementId];
    if (!conduit) return null;

    return (
      <div className={`${isStacked ? 'w-full' : 'w-80'} shrink-0 glass-panel flex flex-col h-full z-10 relative text-sm text-text-secondary border-l`}>
        <div className="h-9 border-b border-border-subtle flex items-center justify-between px-3 shrink-0 bg-bg-primary/50">
          <h3 className="font-bold text-xs uppercase tracking-wider text-text-primary">{t('properties.conduit_title', 'Propiedades de Conducto')}</h3>
          <button type="button" className="text-text-secondary hover:text-accent transition-all duration-200" onClick={() => selectElement(null, null)} title={t('properties.close', 'Cerrar')}>
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
          <div>
            <label htmlFor={`conduit-name-${conduit.id}`} className="block text-xs font-medium text-text-primary mb-1.5">{t('properties.name', 'Nombre')}</label>
            <input
              id={`conduit-name-${conduit.id}`}
              type="text"
              value={conduit.name}
              onChange={(e) => updateConduit(conduit.id, { name: e.target.value })}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor={`conduit-slope-${conduit.id}`} className="block text-xs font-medium text-text-primary mb-1.5">{t('properties.imposed_slope', 'Pendiente Impuesta (‰)')}</label>
            <input
              id={`conduit-slope-${conduit.id}`}
              type="number"
              step="0.1"
              value={conduit.slopeImposed || ''}
              placeholder={t('properties.automatic', 'Automático')}
              onChange={(e) => updateConduit(conduit.id, { slopeImposed: e.target.value ? Number(e.target.value) : undefined })}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor={`conduit-dn-${conduit.id}`} className="block text-xs font-medium text-text-primary mb-1.5">{t('properties.imposed_dn', 'Diámetro Impuesto (mm)')}</label>
            <select
              id={`conduit-dn-${conduit.id}`}
              value={conduit.dnImposed || ''}
              onChange={(e) => updateConduit(conduit.id, { dnImposed: e.target.value ? Number(e.target.value) : undefined })}
              className={INPUT_CLASS}
            >
              <option value="">{t('properties.automatic', 'Automático')}</option>
              {parameters.conduitRepository.map(dn => (
                <option key={dn.id} value={dn.dn}>{dn.dn} mm</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`conduit-sidewalks-${conduit.id}`} className="block text-xs font-medium text-text-primary mb-1.5">{t('properties.contributing_sidewalks', 'Veredas Aportantes')}</label>
            <select
              id={`conduit-sidewalks-${conduit.id}`}
              value={conduit.contributingSidewalks !== undefined ? conduit.contributingSidewalks : 2}
              onChange={(e) => updateConduit(conduit.id, { contributingSidewalks: Number(e.target.value) as 0 | 1 | 2 })}
              className={INPUT_CLASS}
            >
              <option value={0}>{t('properties.sidewalks_0', '0 (Sin aporte)')}</option>
              <option value={1}>{t('properties.sidewalks_1', '1 (Media calle)')}</option>
              <option value={2}>{t('properties.sidewalks_2', '2 (Calle completa)')}</option>
            </select>
          </div>
          
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                updateConduit(conduit.id, {
                  from: conduit.to,
                  to: conduit.from,
                  state: 'uncalculated'
                });
                updateNode(conduit.from, { state: 'uncalculated' });
                updateNode(conduit.to, { state: 'uncalculated' });
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-bg-hover hover:bg-bg-surface text-text-secondary hover:text-text-primary rounded-md border border-border-subtle transition-all duration-200 text-xs font-medium cursor-pointer"
            >
              <ArrowRightLeft size={14} />
              {t('properties.reverse_direction', 'Invertir Sentido')}
            </button>
          </div>
          
          <div className="pt-3 border-t border-border-subtle">
            <h3 className="text-text-secondary font-medium mb-2 uppercase tracking-wider text-xs">{t('properties.hydraulic_results', 'Resultados Hidráulicos')}</h3>
            <div className="grid grid-cols-2 gap-y-2 text-xs">
              <span className="text-text-secondary">{t('properties.length', 'Longitud:')}</span>
              <span className="text-text-primary font-mono">{formatNumber(conduit.length, 2)} m</span>
              <span className="text-text-secondary">{t('properties.adopted_dn', 'DN Adoptado:')}</span>
              <span className="text-text-primary font-mono">{conduit.dn ? `${conduit.dn} mm` : '-'}</span>
              <span className="text-text-secondary">{t('properties.slope', 'Pendiente:')}</span>
              <span className="text-text-primary font-mono">{formatNumber(conduit.slope, 2)} ‰</span>
              <span className="text-text-secondary">{t('properties.q_inflow', 'Q Aporte:')}</span>
              <span className="text-text-primary font-mono">{formatNumber(conduit.qAporte, 4)} l/s</span>
              <span className="text-text-secondary">{t('properties.q_infiltration', 'Q Infiltración:')}</span>
              <span className="text-text-primary font-mono">{formatNumber(conduit.qInfiltration, 4)} l/s</span>
              <span className="text-text-secondary">{t('properties.q_upstream', 'Q Ag. Arriba:')}</span>
              <span className="text-text-primary font-mono">{formatNumber(conduit.qUpstream, 4)} l/s</span>
              
              <div className="col-span-2 border-t border-border-subtle my-1"></div>
              
              <span className="text-text-secondary text-blue-300">{t('properties.ql0', 'Ql0 (Ini):')}</span>
              <span className="text-text-primary font-mono text-blue-300">{formatNumber(conduit.ql0, 4)} l/s</span>
              <span className="text-text-secondary text-orange-300">{t('properties.qe10', 'QE10 (10a):')}</span>
              <span className="text-text-primary font-mono text-orange-300">{formatNumber(conduit.qe10, 4)} l/s</span>
              <span className="text-text-secondary text-accent">{t('properties.qe20', 'QE20 (20a):')}</span>
              <span className="text-text-primary font-mono text-accent">{formatNumber(conduit.qe20, 4)} l/s</span>
              
              <div className="col-span-2 border-t border-border-subtle my-1"></div>
              <span className="text-text-secondary">{t('properties.q_full', 'Q Lleno:')}</span>
              <span className="text-text-primary font-mono">{formatNumber(conduit.qFull, 4)} l/s</span>
              <span className="text-text-secondary">{t('properties.q_ratio', 'Q/Qll (20a):')}</span>
              <span className="text-text-primary font-mono">{formatNumber(conduit.qRatio, 2)}</span>
              <span className="text-text-secondary">{t('properties.h_ratio', 'h/D (20a):')}</span>
              <span className="text-text-primary font-mono">{formatNumber(conduit.hRatio, 3)}</span>
              <span className="text-text-secondary">{t('properties.flow_depth', 'Tirante (20a):')}</span>
              <span className="text-text-primary font-mono">{formatNumber(conduit.flowDepth, 3)} m</span>
              <span className="text-text-secondary">{t('properties.velocity', 'Velocidad (20a):')}</span>
              <span className="text-text-primary font-mono">{formatNumber(conduit.velocity, 2)} m/s</span>
              
              <div className="col-span-2 border-t border-border-subtle my-1"></div>
              
              <span className="text-text-secondary text-blue-300">{t('properties.h_ratio0', 'h/D (Ini):')}</span>
              <span className="text-text-primary font-mono text-blue-300">{formatNumber(conduit.hRatio0, 3)}</span>
              <span className="text-text-secondary text-blue-300">{t('properties.velocity0', 'Vel. (Ini):')}</span>
              <span className="text-text-primary font-mono text-blue-300">{formatNumber(conduit.velocity0, 2)} m/s</span>
              <span className="text-text-secondary text-blue-300">{t('properties.tractive_force0', 'Tractiva (Ini):')}</span>
              <span className="text-text-primary font-mono text-blue-300">{formatNumber(conduit.tractiveForce0, 3)} kg/m²</span>
              
              <div className="col-span-2 border-t border-border-subtle my-1"></div>
              <span className="text-text-secondary">{t('properties.cover_in_out', 'Tapada Ini/Fin:')}</span>
              <span className="text-text-primary font-mono">{formatNumber(conduit.coverIn, 2)} / {formatNumber(conduit.coverOut, 2)} m</span>
              <span className="text-text-secondary">{t('properties.state', 'Estado:')}</span>
              <span className={`font-semibold ${getStateColor(conduit.state)}`}>
                {conduit.state?.toUpperCase() || 'N/A'}
              </span>
            </div>
            {conduit.errorMessage && (
              <div className="mt-2 text-xs text-red-400 bg-red-500/20 p-2 rounded-md">
                {conduit.errorMessage}
              </div>
            )}
          </div>

          {conduit.state && conduit.state !== 'uncalculated' && nodes[conduit.from] && nodes[conduit.to] && (
            <div className="pt-4 border-t border-border">
              <LongitudinalProfile
                conduit={conduit}
                nodeFrom={nodes[conduit.from]}
                nodeTo={nodes[conduit.to]}
              />
            </div>
          )}

          <div className="pt-3 border-t border-border-subtle">
            <button
              type="button"
              className="w-full py-2 px-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-md text-xs font-medium transition-all duration-200 cursor-pointer"
              onClick={() => setElementToDelete({ id: conduit.id, type: 'conduit' })}
            >
              {t('properties.delete_conduit', 'Eliminar Tubería')}
            </button>
          </div>
        </div>
        <ConfirmModal
          isOpen={elementToDelete !== null}
          onClose={() => setElementToDelete(null)}
          onConfirm={confirmDelete}
          title={t('properties.delete_conduit', 'Eliminar Tubería')}
          message={t('properties.delete_conduit_confirm_msg', `¿Estás seguro de que deseas eliminar la tubería ${conduit.name}? Esta acción no se puede deshacer.`)}
          confirmText={t('properties.delete', 'Eliminar')}
          cancelText={t('properties.cancel', 'Cancelar')}
          variant="danger"
        />
      </div>
    );
  }

  return null;
}
