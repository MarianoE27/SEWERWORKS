import { Node, Conduit, DesignParameters, DNTableEntry } from '../types';
import { calculateDistance } from './utils';

interface CalculationResult {
  nodes: Record<string, Node>;
  conduits: Record<string, Conduit>;
  success: boolean;
  errors: string[];
}

// Iterative calculation for circular section
function calculateHydraulicElementsIterative(qDesignM3s: number, D: number, S: number, n: number) {
  if (qDesignM3s <= 0) return { hRatio: 0, v: 0, rh: 0, theta: 0 };
  if (S <= 0 || D <= 0) return null;
  
  const K = (qDesignM3s * n) / Math.sqrt(S);
  const target = K * 8 / (Math.pow(D, 2) * Math.pow(D / 4, 2 / 3));
  
  // Bisection method for theta in [0.0001, 2*PI]
  let low = 0.0001;
  let high = 2 * Math.PI;
  let theta = Math.PI;
  
  for (let i = 0; i < 50; i++) {
    theta = (low + high) / 2;
    const val = (theta - Math.sin(theta)) * Math.pow(1 - Math.sin(theta) / theta, 2 / 3);
    if (Math.abs(val - target) < 1e-6) break;
    if (val < target) {
      low = theta;
    } else {
      high = theta;
    }
  }
  
  const hRatio = 0.5 * (1 - Math.cos(theta / 2));
  const A = (Math.pow(D, 2) / 8) * (theta - Math.sin(theta));
  const P = (D / 2) * theta;
  const Rh = A / P;
  const V = qDesignM3s / A;
  
  return { hRatio, v: V, rh: Rh, theta };
}

class MinHeap {
  private heap: Array<[number, string]> = [];

  constructor(initialItems: Array<[number, string]> = []) {
    for (const item of initialItems) {
      this.push(item);
    }
  }

  push(item: [number, string]): void {
    this.heap.push(item);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): [number, string] | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const bottom = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = bottom;
      this.bubbleDown(0);
    }
    return top;
  }

  get length(): number {
    return this.heap.length;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = (index - 1) >> 1;
      if (this.heap[index][0] < this.heap[parentIndex][0]) {
        [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
        index = parentIndex;
      } else {
        break;
      }
    }
  }

  private bubbleDown(index: number): void {
    const length = this.heap.length;
    while (true) {
      const leftChild = (index << 1) + 1;
      const rightChild = (index << 1) + 2;
      let smallest = index;

      if (leftChild < length && this.heap[leftChild][0] < this.heap[smallest][0]) {
        smallest = leftChild;
      }
      if (rightChild < length && this.heap[rightChild][0] < this.heap[smallest][0]) {
        smallest = rightChild;
      }
      if (smallest !== index) {
        [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
        index = smallest;
      } else {
        break;
      }
    }
  }
}

export function calculateNetwork(
  nodes: Record<string, Node>,
  conduits: Record<string, Conduit>,
  params: DesignParameters,
  crs: string = 'EPSG:3857'
): CalculationResult {
  const resultNodes = structuredClone(nodes) as Record<string, Node>;
  const resultConduits = structuredClone(conduits) as Record<string, Conduit>;
  const errors: string[] = [];

  // PASO A: Topological Sort
  const adjList: Record<string, string[]> = {};
  const inDegree: Record<string, number> = {};
  
  Object.keys(resultNodes).forEach(id => {
    adjList[id] = [];
    inDegree[id] = 0;
  });

  const conduitList = Object.values(resultConduits);
  conduitList.forEach(c => {
    if (!resultNodes[c.from] || !resultNodes[c.to]) {
      errors.push(`Conducto ${c.name} tiene nodos inexistentes.`);
      return;
    }
    adjList[c.from].push(c.to);
    inDegree[c.to]++;
  });

  if (errors.length > 0) return { nodes: resultNodes, conduits: resultConduits, success: false, errors };

  const queue: string[] = [];
  Object.keys(inDegree).forEach(id => {
    if (inDegree[id] === 0) queue.push(id);
  });

  const sortedNodes: string[] = [];
  while (queue.length > 0) {
    const u = queue.shift()!;
    sortedNodes.push(u);
    adjList[u].forEach(v => {
      inDegree[v]--;
      if (inDegree[v] === 0) queue.push(v);
    });
  }

  if (sortedNodes.length !== Object.keys(resultNodes).length) {
    const sortedSet = new Set(sortedNodes);
    const unvisitedIds = Object.keys(resultNodes).filter(nodeId => !sortedSet.has(nodeId));
    unvisitedIds.forEach(nodeId => {
      if (resultNodes[nodeId]) {
        resultNodes[nodeId].state = 'error';
        resultNodes[nodeId].errorMessage = 'Ciclo hidráulico detectado o cámara desconectada de la descarga';
      }
    });
    errors.push('Error topológico: ciclo hidráulico o nodos desconectados detectados (' + unvisitedIds.join(', ') + ')');
    return { nodes: resultNodes, conduits: resultConduits, success: false, errors };
  }

  // PASO B & C: Calculate flows and design pipes
  let totalLength = 0;
  let totalContributingLength = 0;
  conduitList.forEach(c => {
    const n1 = resultNodes[c.from];
    const n2 = resultNodes[c.to];
    const len = calculateDistance(n1.x, n1.y, n2.x, n2.y, crs);
    c.length = len;
    totalLength += len;
    const sidewalks = c.contributingSidewalks !== undefined ? c.contributingSidewalks : 2;
    totalContributingLength += len * sidewalks;
  });

  const linearDensity0 = totalContributingLength > 0 ? (params.population0 || 0) / totalContributingLength : 0;
  const linearDensity10 = totalContributingLength > 0 ? (params.population10 || 0) / totalContributingLength : 0;
  const linearDensity20 = totalContributingLength > 0 ? (params.population20 || 0) / totalContributingLength : 0;

  // Track accumulated population, length, and point flows at each node
  const accPop0: Record<string, number> = {};
  const accPop10: Record<string, number> = {};
  const accPop20: Record<string, number> = {};
  const accLength: Record<string, number> = {};
  const accPointFlow: Record<string, number> = {};
  
  Object.keys(resultNodes).forEach(id => {
    accPop0[id] = 0;
    accPop10[id] = 0;
    accPop20[id] = 0;
    accLength[id] = 0;
    accPointFlow[id] = resultNodes[id].pointFlow || 0;
    resultNodes[id].inflow = 0; // Reset before accumulation
  });

  // Process conduits in topological order of their 'from' nodes
  const sortedConduits: Conduit[] = [];
  sortedNodes.forEach(nodeId => {
    const outgoing = conduitList.filter(c => c.from === nodeId);
    sortedConduits.push(...outgoing);
  });

  // Mapa: nodeId → conduits salientes (para lógica de bifurcación)
  const outgoingByNode: Record<string, Conduit[]> = {};
  sortedConduits.forEach(c => {
    if (!outgoingByNode[c.from]) outgoingByNode[c.from] = [];
    outgoingByNode[c.from].push(c);
  });

  // Mapa: nodeId → conduits entrantes
  const incomingByNode: Record<string, Conduit[]> = {};
  conduitList.forEach(c => {
    if (!incomingByNode[c.to]) incomingByNode[c.to] = [];
    incomingByNode[c.to].push(c);
  });

  /**
   * Auto-detección de conduit principal en bifurcaciones.
   * Criterio: menor longitud acumulada hacia la descarga (evita profundizaciones excesivas).
   * El conduit cuyo camino hacia el nodo de descarga sea más corto hereda los caudales
   * y cotas de aguas arriba. Los secundarios arrancan como cabeceras.
   *
   * Algoritmo:
   * 1. Dijkstra inverso desde nodos de descarga (sin salidas) hacia atrás en la red.
   *    distToOutlet[nodeId] = longitud mínima acumulada desde ese nodo hasta cualquier descarga.
   * 2. Para cada bifurcación: el conduit cuyo (length + distToOutlet[c.to]) sea mínimo → principal.
   * 3. Desempate: alineación geométrica con el conduit entrante dominante.
   */

  // Paso 1: Dijkstra inverso — distancia mínima de cada nodo a la descarga
  const INF = Infinity;
  const distToOutlet: Record<string, number> = {};
  Object.keys(resultNodes).forEach(id => { distToOutlet[id] = INF; });

  // Nodos de descarga: sin conduits salientes
  const outletNodeIds = Object.keys(resultNodes).filter(id => !(outgoingByNode[id]?.length > 0));
  outletNodeIds.forEach(id => { distToOutlet[id] = 0; });

  // Cola de prioridad optimizada con Binary Min-Heap (O(log N) push/pop)
  // Estructura: [dist, nodeId]
  const pq = new MinHeap(outletNodeIds.map(id => [0, id]));
  // Grafo inverso: de cada nodo, los conduits cuyo .to apunta a él
  // (incomingByNode ya existe)
  while (pq.length > 0) {
    const [dist, nodeId] = pq.pop()!;
    if (dist > distToOutlet[nodeId]) continue; // entrada obsoleta
    (incomingByNode[nodeId] || []).forEach(c => {
      const newDist = dist + (c.length || 0);
      if (newDist < distToOutlet[c.from]) {
        distToOutlet[c.from] = newDist;
        pq.push([newDist, c.from]);
      }
    });
  }

  function getAlignmentAngle(fromNodeId: string, toNodeId: string): number {
    const from = resultNodes[fromNodeId];
    const to = resultNodes[toNodeId];
    if (!from || !to) return 0;
    return Math.atan2(to.y - from.y, to.x - from.x);
  }

  // Paso 2: Para cada bifurcación, elegir el conduit con menor distancia total a descarga
  const autoPrimaryOutletMap: Record<string, string> = {};
  Object.entries(outgoingByNode).forEach(([nodeId, outgoing]) => {
    if (outgoing.length <= 1) return;
    const node = resultNodes[nodeId];
    if (node.primaryOutletConduitId) return; // ya designado por el usuario

    const ranked = outgoing.map(c => ({
      conduit: c,
      distTotal: (c.length || 0) + (distToOutlet[c.to] ?? INF),
    }));
    const minDist = Math.min(...ranked.map(r => r.distTotal));
    const candidates = ranked.filter(r => r.distTotal === minDist);

    if (candidates.length === 1) {
      autoPrimaryOutletMap[nodeId] = candidates[0].conduit.id;
      return;
    }

    // Desempate: alineación geométrica con el conduit entrante dominante
    const incList = incomingByNode[nodeId] || [];
    if (incList.length === 0) {
      // Cabecera con bifurcación: usar el conduit más largo como principal
      const longest = candidates.reduce((best, r) =>
        (r.conduit.length || 0) > (best.conduit.length || 0) ? r : best
      );
      autoPrimaryOutletMap[nodeId] = longest.conduit.id;
      return;
    }
    const dominantIncoming = incList.reduce((best, inc) =>
      (inc.qDesign || 0) > (best.qDesign || 0) ? inc : best
    );
    const inAngle = getAlignmentAngle(dominantIncoming.from, nodeId);
    let bestCandidate = candidates[0];
    let minDeflection = Infinity;
    candidates.forEach(r => {
      const outAngle = getAlignmentAngle(nodeId, r.conduit.to);
      const deflection = Math.abs(Math.atan2(
        Math.sin(outAngle - inAngle),
        Math.cos(outAngle - inAngle)
      ));
      if (deflection < minDeflection) {
        minDeflection = deflection;
        bestCandidate = r;
      }
    });
    autoPrimaryOutletMap[nodeId] = bestCandidate.conduit.id;
  });

  // Función helper: retorna el ID del conduit principal efectivo (explícito o auto-detectado)
  function getEffectivePrimary(nodeId: string): string | undefined {
    return resultNodes[nodeId].primaryOutletConduitId || autoPrimaryOutletMap[nodeId];
  }

  sortedConduits.forEach(c => {
    const len = c.length || 0;
    const sidewalks = c.contributingSidewalks !== undefined ? c.contributingSidewalks : 2;
    const conduitPop0 = len * sidewalks * linearDensity0;
    const conduitPop10 = len * sidewalks * linearDensity10;
    const conduitPop20 = len * sidewalks * linearDensity20;
    
    // Accumulate at 'from' node + conduit's own contribution
    const outgoingFromNode = outgoingByNode[c.from] || [];
    const esBifurcacion = outgoingFromNode.length > 1;

    let popBase0 = accPop0[c.from];
    let popBase10 = accPop10[c.from];
    let popBase20 = accPop20[c.from];
    let lengthBase = accLength[c.from];
    let pointFlowBase = accPointFlow[c.from];

    if (esBifurcacion) {
      const node = resultNodes[c.from];
      const ratios = node.outletDiversionRatios;
      let handledByDiversion = false;

      if (ratios) {
        let sumRatios = 0;
        let cRatio = 0;
        outgoingFromNode.forEach(outC => {
          const val = ratios[outC.id];
          const r = (val !== undefined && !isNaN(val) && val > 0) ? val : 0;
          sumRatios += r;
          if (outC.id === c.id) {
            cRatio = r;
          }
        });

        if (sumRatios > 0) {
          const share = cRatio / sumRatios;
          popBase0 *= share;
          popBase10 *= share;
          popBase20 *= share;
          lengthBase *= share;
          pointFlowBase *= share;
          handledByDiversion = true;
        }
      }

      if (!handledByDiversion) {
        const effectivePrimary = getEffectivePrimary(c.from);
        if (effectivePrimary && c.id !== effectivePrimary) {
          // Conduit secundario de bifurcación: empieza desde cero (nueva cabecera)
          popBase0 = 0;
          popBase10 = 0;
          popBase20 = 0;
          lengthBase = 0;
          pointFlowBase = 0;
        }
      }
    }

    const popTotal0 = popBase0 + conduitPop0;
    const popTotal10 = popBase10 + conduitPop10;
    const popTotal20 = popBase20 + conduitPop20;
    const lengthTotal = lengthBase + len;
    const pointFlowTotal = pointFlowBase;
    
    // Pass to 'to' node
    accPop0[c.to] += popTotal0;
    accPop10[c.to] += popTotal10;
    accPop20[c.to] += popTotal20;
    accLength[c.to] += lengthTotal;
    accPointFlow[c.to] += pointFlowTotal;

    // Calculate flows for the 3 stages
    const baseFactor = (params.dotation * params.returnRate * params.industrialCoefficient) / 86400;
    
    const qMedio0 = popTotal0 * baseFactor;
    const qMedio10 = popTotal10 * baseFactor;
    const qMedio20 = popTotal20 * baseFactor;
    
    const qInf = params.infiltrationRate * (lengthTotal / 1000); // L/s/km * km = L/s
    
    // Ql0 = Caudal inicial al año 0 para verificación de velocidad y tensión tractiva
    // Según indicación: Ql0 = alpha2 * beta1 * Qc (siendo Qc = qMedio0)
    const ql0 = qMedio0 * params.alpha2 * params.beta1 + qInf + pointFlowTotal;
    
    // QE10 y QE20 son Caudales Máximos Horarios
    const qe10 = qMedio10 * params.babbittCoefficient + qInf + pointFlowTotal;
    const qe20 = qMedio20 * params.babbittCoefficient + qInf + pointFlowTotal;
    const qDiseno = qe20; // El dimensionamiento de capacidad usa el de 20 años

    // Flow breakdown: contribution of this segment only (based on year 20)
    const conduitPopOnly = conduitPop20;
    const qMedioTramo = conduitPopOnly * baseFactor;
    const qInfTramo = params.infiltrationRate * (len / 1000); // infiltration of this segment only
    const qAporteTramo = qMedioTramo * params.babbittCoefficient + qInfTramo;
    const qUpstream = qDiseno - qAporteTramo;

    c.ql0 = ql0;
    c.qe10 = qe10;
    c.qe20 = qe20;
    c.qAporte = qMedioTramo * params.babbittCoefficient;
    c.qInfiltration = qInfTramo;
    c.qUpstream = qUpstream;
    c.qDesign = qDiseno;

    // Store total inflow at the downstream node (to)
    resultNodes[c.to].inflow = (resultNodes[c.to].inflow || 0) + qDiseno;

    // Design slope and diameter
    const n1 = resultNodes[c.from];
    const n2 = resultNodes[c.to];
    
    // Validar longitud del conduit
    if (len <= 0) {
      c.state = 'error';
      c.errorMessage = `Longitud de conduit es cero o negativa.`;
      return;
    }

    let selectedDN: DNTableEntry | null = null;
    let finalSlope = 0;
    let finalInvIn = 0;
    let finalInvOut = 0;
    let finalV = 0;
    let finalTractive = 0;
    let finalQRatio = 0;
    let finalHRatio = 0;
    let finalFlowDepth = 0;
    let finalQll = 0;
    let cState: 'ok' | 'warning' | 'error' = 'error';
    let errorMessage = '';
    let failReasonV = false;
    let failReasonT = false;
    let failReasonH = false;

    // Find incoming conduits to determine starting invert
    const incoming = conduitList.filter(inc => inc.to === c.from);

    // Conduit secundario de bifurcación se trata como cabecera hidráulica
    const outgoingDesdeFrom = outgoingByNode[c.from] || [];
    const effectivePrimaryForInvert = getEffectivePrimary(c.from);
    const esSecundario = outgoingDesdeFrom.length > 1 &&
      effectivePrimaryForInvert !== undefined &&
      c.id !== effectivePrimaryForInvert;
    const esEfectivamenteCabecera = incoming.length === 0 || esSecundario;

    let minIncomingInv = Infinity;
    let minIncomingCrown = Infinity;
    if (incoming.length > 0) {
      incoming.forEach(inc => {
        if (inc.invertOut !== undefined) {
          if (inc.invertOut < minIncomingInv) {
            minIncomingInv = inc.invertOut;
          }
          if (inc.dn !== undefined) {
            const crown = inc.invertOut + (inc.dn / 1000);
            if (crown < minIncomingCrown) {
              minIncomingCrown = crown;
            }
          }
        }
      });
    }

    let repositoryToUse = params.conduitRepository;
    if (c.dnImposed) {
      const imposed = params.conduitRepository.find(d => d.dn === c.dnImposed);
      if (imposed) {
        repositoryToUse = [imposed];
      } else {
        repositoryToUse = [{ id: `imposed-${c.dnImposed}`, dn: c.dnImposed, iMin: 0.001, di: c.dnImposed, trenchWidth: 0.6 }];
      }
    }

    for (const dn of repositoryToUse) {
      failReasonV = false;
      failReasonT = false;
      failReasonH = false;
      let foundValidSlope = false;
      const dnM = dn.dn / 1000;

      // PASO 1: Determinar invertido de inicio (invIn)
      let invIn = 0;
      if (esEfectivamenteCabecera) {
        // Cabecera (o secundario de bifurcación): tapada mínima en inicio
        invIn = n1.ctn - params.minCover - dnM;
      } else {
        // Continuación: Enrase por clave (Match crowns)
        invIn = minIncomingCrown - dnM;
        // Asegurar que no suba respecto al invertido de entrada
        if (invIn > minIncomingInv) {
          invIn = minIncomingInv;
        }
      }

      // Verificar tapada mínima en inicio (para todos los casos)
      if (n1.ctn - invIn - dnM < params.minCover) {
        invIn = n1.ctn - params.minCover - dnM;
      }

      // PASO 2: Pendiente adoptada = máximo entre iMin del diámetro y pendiente impuesta
      const iAdoptada = Math.max(dn.iMin, c.slopeImposed || 0);

      // PASO 3: Calcular invOut con la pendiente adoptada
      let invOut = invIn - (iAdoptada * len);

      // PASO 4: Verificar tapada mínima en fin - solo ajustar si no cumple
      if (n2.ctn - invOut - dnM < params.minCover) {
        invOut = n2.ctn - params.minCover - dnM;
      }

      const actualSlope = (invIn - invOut) / len;
      const tapadaInicio = n1.ctn - invIn - dnM;
      const tapadaFin = n2.ctn - invOut - dnM;

      // Manning
      const diM = dn.di / 1000;
      const areaFull = Math.PI * Math.pow(diM, 2) / 4;
      const qllM3s = (1 / params.manningN) * areaFull * Math.pow(diM / 4, 2/3) * Math.pow(actualSlope, 1/2);
      const qll = qllM3s * 1000; // l/s

      const qRatio = qDiseno / qll;

      let hyd_q = qDiseno;
      let q_ratio_exceeded = false;
      if (qRatio > 1.0) {
        hyd_q = qll;
        q_ratio_exceeded = true;
      }

      const hyd = calculateHydraulicElementsIterative(hyd_q / 1000, diM, actualSlope, params.manningN);
      const hyd0 = calculateHydraulicElementsIterative(Math.min(ql0, qll) / 1000, diM, actualSlope, params.manningN);

      if (hyd && hyd0) {
        const v20 = hyd.v;
        const v0 = hyd0.v;
        const tractive0 = 1000 * hyd0.rh * actualSlope;

        // Evaluación directa por h/D
        if (hyd.hRatio > params.maxHRatio || qRatio > 1.0) {
          failReasonH = true;
        }

        if (!failReasonH || c.dnImposed) {
          // DN aceptado: asignar resultados
          selectedDN = dn;
            finalSlope = actualSlope;
            finalInvIn = invIn;
            finalInvOut = invOut;
            finalV = v20;
            finalTractive = tractive0; // Guardamos la fuerza tractiva inicial
            finalQRatio = qRatio;
            finalHRatio = qRatio > 1.0 ? 1.0 : hyd.hRatio; // Si sobrepasa la capacidad, h/D es 1.0
            finalFlowDepth = finalHRatio * diM;
            finalQll = qll;
            c.velocity0 = v0;
            c.tractiveForce0 = tractive0;
            c.hRatio0 = hyd0.hRatio;
            foundValidSlope = true;

            // Determinar estado: V0 y T0 son informativos (warning, no error)
            const warnings: string[] = [];
            if (v0 < params.minVelocity) {
              warnings.push(`V0=${v0.toFixed(2)} m/s < ${params.minVelocity}`);
              failReasonV = true; // Set to pass to error message if no DN works
            }
            if (v20 > params.maxVelocity) warnings.push(`V20=${v20.toFixed(2)} m/s > ${params.maxVelocity}`);
            if (tractive0 < params.minTractiveForce) {
              warnings.push(`T0=${tractive0.toFixed(3)} < ${params.minTractiveForce} kg/m²`);
              failReasonT = true;
            }
            if (tapadaInicio > params.maxCover || tapadaFin > params.maxCover) warnings.push(`Tapada excede máximo (${params.maxCover}m)`);
            if (failReasonH) {
               // Reportamos siempre la relación h/D ya que evalúa directamente eso
               const exceededHRatio = qRatio > 1.0 ? 1.0 : hyd.hRatio;
               warnings.push(`Relación h/D excedida (h/D=${exceededHRatio.toFixed(2)} > ${params.maxHRatio})`);
            }

            if (failReasonH || failReasonT || failReasonV) {
              cState = 'error';
              errorMessage = warnings.join(' | ');
            } else if (warnings.length > 0) {
              cState = 'warning';
              errorMessage = warnings.join(' | ');
            } else {
              cState = 'ok';
              errorMessage = '';
            }
          }
        }

      if (foundValidSlope) {
        break; // DN válido encontrado
      }
    }

    if (!selectedDN) {
      // If none worked, pick the largest and mark error
      selectedDN = params.conduitRepository[params.conduitRepository.length - 1];
      const dnMFallback = selectedDN.dn / 1000;
      // Calcular invIn con la misma lógica
      if (esEfectivamenteCabecera) {
        finalInvIn = n1.ctn - params.minCover - dnMFallback;
      } else {
        finalInvIn = minIncomingCrown - dnMFallback;
        if (finalInvIn > minIncomingInv) finalInvIn = minIncomingInv;
      }
      if (n1.ctn - finalInvIn - dnMFallback < params.minCover) {
        finalInvIn = n1.ctn - params.minCover - dnMFallback;
      }
      // Pendiente = iMin del DN
      const iAdoptada = Math.max(selectedDN.iMin, c.slopeImposed || 0);
      finalInvOut = finalInvIn - (iAdoptada * len);
      // Verificar tapada mínima en fin
      if (n2.ctn - finalInvOut - dnMFallback < params.minCover) {
        finalInvOut = n2.ctn - params.minCover - dnMFallback;
      }
      finalSlope = iAdoptada;
      cState = 'error';
      const reasons: string[] = [];
      if (failReasonV) reasons.push(`Velocidad mínima no alcanzada (V < ${params.minVelocity} m/s)`);
      if (failReasonT) reasons.push(`Fuerza tractiva insuficiente (T < ${params.minTractiveForce} kg/m²)`);
      if (failReasonH) reasons.push(`Relación h/D excedida (h/D > ${params.maxHRatio})`);
      errorMessage = reasons.length > 0 ? reasons.join(' | ') : 'Sin solución hidráulica para los parámetros dados.';
    }

    if (len > params.maxManholeDistance) {
      if (cState === 'ok') cState = 'warning';
      errorMessage += errorMessage ? ` | ` : '';
      errorMessage += `Longitud excede máximo (${params.maxManholeDistance}m)`;
    }

    c.dn = selectedDN.dn;
    c.slope = finalSlope * 1000; // to ‰
    c.invertIn = finalInvIn;
    c.invertOut = finalInvOut;
    c.coverIn = n1.ctn - finalInvIn - (selectedDN.dn / 1000);
    c.coverOut = n2.ctn - finalInvOut - (selectedDN.dn / 1000);
    c.velocity = finalV;
    c.tractiveForce = finalTractive;
    c.qRatio = finalQRatio;
    c.hRatio = finalHRatio;
    c.flowDepth = finalFlowDepth;
    c.qFull = finalQll;
    c.state = cState;
    c.errorMessage = errorMessage;

    // Excavation volume
    const hMedia = (c.coverIn + c.coverOut) / 2 + (selectedDN.dn / 1000) / 2;
    c.excavationVol = len * selectedDN.trenchWidth * hMedia;
    if (hMedia < 2.5) c.excavationClass = '<2.5m';
    else if (hMedia < 4) c.excavationClass = '2.5-4m';
    else c.excavationClass = '>4m';
  });

  // PASO D: Update Nodes
  Object.keys(resultNodes).forEach(id => {
    const n = resultNodes[id];
    const connectedConduits = sortedConduits.filter(c => c.from === id || c.to === id);
    
    if (connectedConduits.length === 0) {
      n.state = 'uncalculated';
      return;
    }

    let minIncomingInv = Infinity;
    let outgoingInv = Infinity;

    connectedConduits.forEach(c => {
      if (c.to === id && c.invertOut !== undefined) {
        minIncomingInv = Math.min(minIncomingInv, c.invertOut);
      }
      if (c.from === id && c.invertIn !== undefined) {
        outgoingInv = Math.min(outgoingInv, c.invertIn);
      }
    });

    let minInv = Math.min(minIncomingInv, outgoingInv);
    if (minInv === Infinity) minInv = 0;

    n.invert = minInv;
    n.depth = n.ctn - minInv;
    
    // Calculate drop (salto)
    if (minIncomingInv !== Infinity && outgoingInv !== Infinity) {
      const drop = minIncomingInv - outgoingInv;
      if (drop > 0) {
        n.drop = drop;
        n.hasDropPipe = drop >= params.minDropForBackdrop;
      } else {
        n.drop = 0;
        n.hasDropPipe = false;
      }
    } else {
      n.drop = 0;
      n.hasDropPipe = false;
    }
    
    if (n.depth < 2.5) n.state = 'ok'; // Green
    else if (n.depth < 4) n.state = 'warning'; // Yellow
    else n.state = 'error'; // Red
  });

  // Escribir auto-detección de conduit principal en nodos que no tengan designación explícita
  Object.entries(autoPrimaryOutletMap).forEach(([nodeId, conduitId]) => {
    if (resultNodes[nodeId] && !resultNodes[nodeId].primaryOutletConduitId) {
      resultNodes[nodeId].primaryOutletConduitId = conduitId;
    }
  });

  return { nodes: resultNodes, conduits: resultConduits, success: true, errors };
}
