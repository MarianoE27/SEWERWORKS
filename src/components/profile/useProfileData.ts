import { useState, useEffect, useRef, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { Conduit, Node } from '../../types';

export interface ProfileChainData {
  conduits: Conduit[];
  nodes: Node[];
  hasData: boolean;
  dists: number[];
  totalLength: number;
  minElev: number;
  maxElev: number;
}

export function useProfileData(): ProfileChainData | null {
  const { conduits, nodes, selectedElementIds, selectedElementTypes } = useStore();
  const [data, setData] = useState<ProfileChainData | null>(null);
  
  // Keep track of the last valid data so we don't clear the profile when deselecting
  const lastValidData = useRef<ProfileChainData | null>(null);

  useEffect(() => {
    const selectedConduits = Object.values(conduits).filter(c => 
      selectedElementIds.includes(c.id) && selectedElementTypes[c.id] === 'conduit'
    );

    if (selectedConduits.length === 0) {
      setData(lastValidData.current);
      if (lastValidData.current) {
        useStore.getState().setProfileConduitIds(lastValidData.current.conduits.map(c => c.id));
      } else {
        useStore.getState().setProfileConduitIds([]);
      }
      return;
    }

    const first = selectedConduits[0];
    const allConduits = Object.values(conduits);
    const searchPool = allConduits;

    // Helper: calculate maximum cumulative upstream length from a conduit
    const getMaxUpstreamLength = (cond: Conduit, visited = new Set<string>()): number => {
      if (visited.has(cond.id)) return 0;
      visited.add(cond.id);
      const len = cond.length || 0;
      const incoming = allConduits.filter(c => c.to === cond.from && !visited.has(c.id));
      if (incoming.length === 0) return len;
      let maxInc = 0;
      for (const inc of incoming) {
        const incLen = getMaxUpstreamLength(inc, new Set(visited));
        if (incLen > maxInc) maxInc = incLen;
      }
      return len + maxInc;
    };

    // Helper: calculate maximum cumulative downstream length from a conduit
    const getMaxDownstreamLength = (cond: Conduit, visited = new Set<string>()): number => {
      if (visited.has(cond.id)) return 0;
      visited.add(cond.id);
      const len = cond.length || 0;
      const outgoing = allConduits.filter(c => c.from === cond.to && !visited.has(c.id));
      if (outgoing.length === 0) return len;
      let maxOut = 0;
      for (const out of outgoing) {
        const outLen = getMaxDownstreamLength(out, new Set(visited));
        if (outLen > maxOut) maxOut = outLen;
      }
      return len + maxOut;
    };

    // Trace downstream
    const downstream: Conduit[] = [first];
    let upstream: Conduit[] = [];
    let currentTo = first.to;
    let currentDownConduit = first;
    while (true) {
      const nextOptions = searchPool.filter(c => c.from === currentTo && !downstream.includes(c) && !upstream.includes(c));
      if (nextOptions.length === 0) break;
      
      const next = nextOptions.sort((a, b) => {
        const aSelected = selectedConduits.some(sc => sc.id === a.id) ? 1 : 0;
        const bSelected = selectedConduits.some(sc => sc.id === b.id) ? 1 : 0;
        if (aSelected !== bSelected) return bSelected - aSelected;
        
        // 2. Identificar arranques secundarios en bifurcaciones (cota de inicio muy por encima de nuestra cota de salida)
        const currentOut = currentDownConduit.invertOut !== undefined ? currentDownConduit.invertOut : -9999;
        const aIn = a.invertIn !== undefined ? a.invertIn : -9999;
        const bIn = b.invertIn !== undefined ? b.invertIn : -9999;
        
        const aIsArranque = aIn > currentOut + 0.1;
        const bIsArranque = bIn > currentOut + 0.1;
        if (aIsArranque !== bIsArranque) return aIsArranque ? 1 : -1;
        
        const diffDn = (b.dn || 0) - (a.dn || 0);
        if (Math.abs(diffDn) >= 1) return diffDn;
        return getMaxDownstreamLength(b) - getMaxDownstreamLength(a);
      })[0];
      
      downstream.push(next);
      currentTo = next.to;
      currentDownConduit = next;
    }

    // Trace upstream
    let currentFrom = first.from;
    let currentUpConduit = first;
    while (true) {
      // 1. Si estamos en una bifurcación (múltiples salidas), comprobar si somos el ramal secundario
      const allOutgoing = allConduits.filter(c => c.from === currentFrom);
      if (allOutgoing.length > 1) {
        const primaryOutgoing = [...allOutgoing].sort((a, b) => {
          const aInElev = a.invertIn !== undefined ? a.invertIn : 9999;
          const bInElev = b.invertIn !== undefined ? b.invertIn : 9999;
          // El colector principal es el más profundo
          if (Math.abs(aInElev - bInElev) > 0.1) return aInElev - bInElev; 
          
          const diffDn = (b.dn || 0) - (a.dn || 0);
          if (Math.abs(diffDn) >= 1) return diffDn;
          return getMaxDownstreamLength(b) - getMaxDownstreamLength(a);
        })[0];
        
        // Si no somos el colector principal, somos un "arranque". Debemos detenernos aquí,
        // a menos que el usuario haya seleccionado explícitamente un conducto aguas arriba de nosotros.
        const userSelectedAbove = selectedConduits.some(sc => sc.to === currentFrom);
        if (currentUpConduit.id !== primaryOutgoing.id && !userSelectedAbove) {
          break; // ¡Es un arranque, no seguimos buscando aguas arriba!
        }
      }

      const prevOptions = searchPool.filter(c => c.to === currentFrom && !downstream.includes(c) && !upstream.includes(c));
      if (prevOptions.length === 0) break;
      
      const prev = prevOptions.sort((a, b) => {
        const aSelected = selectedConduits.some(sc => sc.id === a.id) ? 1 : 0;
        const bSelected = selectedConduits.some(sc => sc.id === b.id) ? 1 : 0;
        if (aSelected !== bSelected) return bSelected - aSelected;
        
        // 2. En confluencias aguas arriba, priorizar el colector principal (el que NO es un salto/caída)
        const currentIn = currentUpConduit.invertIn !== undefined ? currentUpConduit.invertIn : -9999;
        const aOut = a.invertOut !== undefined ? a.invertOut : -9999;
        const bOut = b.invertOut !== undefined ? b.invertOut : -9999;
        
        // Un ramal secundario tendrá un invertOut mucho mayor que nuestro invertIn (salto)
        const aIsDrop = (aOut - currentIn) > 0.1;
        const bIsDrop = (bOut - currentIn) > 0.1;
        if (aIsDrop !== bIsDrop) return aIsDrop ? 1 : -1;
        
        const diffDn = (b.dn || 0) - (a.dn || 0);
        if (Math.abs(diffDn) >= 1) return diffDn;
        return getMaxUpstreamLength(b) - getMaxUpstreamLength(a);
      })[0];
      
      upstream.unshift(prev);
      currentUpConduit = prev;
      currentFrom = prev.from;
    }

    const orderedConduits = [...upstream, ...downstream];
    
    const orderedNodes: Node[] = [];
    if (orderedConduits.length > 0) {
      orderedNodes.push(nodes[orderedConduits[0].from]);
      orderedConduits.forEach(c => {
        orderedNodes.push(nodes[c.to]);
      });
    }

    const hasData = orderedConduits.every(c => c.invertIn !== undefined && c.invertOut !== undefined && c.dn);

    // Geometry data
    const dists: number[] = [0];
    let totalLength = 0;
    orderedConduits.forEach(c => {
      const l = c.length || 0;
      totalLength += l;
      dists.push(totalLength);
    });

    const elevs: number[] = [];
    orderedNodes.forEach(n => {
      if (n) elevs.push(n.ctn);
    });

    orderedConduits.forEach(c => {
      if (c.invertIn !== undefined) {
        elevs.push(c.invertIn);
        elevs.push(c.invertIn + (c.dn || 200) / 1000);
      }
      if (c.invertOut !== undefined) {
        elevs.push(c.invertOut);
        elevs.push(c.invertOut + (c.dn || 200) / 1000);
      }
    });

    const minElev = elevs.length > 0 ? Math.min(...elevs) : 90;
    const maxElev = elevs.length > 0 ? Math.max(...elevs) : 110;

    const newData = {
      conduits: orderedConduits,
      nodes: orderedNodes,
      hasData,
      dists,
      totalLength,
      minElev,
      maxElev
    };

    lastValidData.current = newData;
    setData(newData);
    useStore.getState().setProfileConduitIds(orderedConduits.map(c => c.id));

  }, [conduits, nodes, selectedElementIds, selectedElementTypes]);

  return data;
}
