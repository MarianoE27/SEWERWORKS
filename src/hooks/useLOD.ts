import { useStore } from '../store/useStore';
import { LODLevel } from '../types';
import { useMemo } from 'react';

export interface LODProperties {
  lodLevel: LODLevel;
  nodeSize: number;
  showFlowArrows: boolean;
  showBadges: boolean;
  showDiameterLabels: boolean;
  showConduitTooltips: boolean;
  showStartCaps: boolean;
  conduitWeight: (baseWeight: number) => number;
  arrowSize: number;
  tooltipContent: 'full' | 'reduced' | 'minimal';
}

export function useLOD(): LODProperties {
  const lodConfigEnabled = useStore(s => s.lodConfig.enabled);
  const lodLevel = useStore(s => {
    if (!s.lodConfig.enabled) return 0 as LODLevel;
    const [t1, t2, t3] = s.lodConfig.thresholds;
    if (s.currentZoom < t3) return 3 as LODLevel;
    if (s.currentZoom < t2) return 2 as LODLevel;
    if (s.currentZoom < t1) return 1 as LODLevel;
    return 0 as LODLevel;
  });

  return useMemo(() => {
    if (!lodConfigEnabled) {
      return {
        lodLevel: 0,
        nodeSize: 14,
        showFlowArrows: true,
        showBadges: true,
        showDiameterLabels: true,
        showConduitTooltips: true,
        showStartCaps: true,
        conduitWeight: (baseWeight) => baseWeight,
        arrowSize: 16,
        tooltipContent: 'full',
      };
    }

    switch (lodLevel) {
    case 0:
      return {
        lodLevel: 0,
        nodeSize: 14,
        showFlowArrows: true,
        showBadges: true,
        showDiameterLabels: true,
        showConduitTooltips: true,
        showStartCaps: true,
        conduitWeight: (baseWeight) => baseWeight,
        arrowSize: 16,
        tooltipContent: 'full',
      };
    case 1:
      return {
        lodLevel: 1,
        nodeSize: 10,
        showFlowArrows: true,
        showBadges: true,
        showDiameterLabels: false,
        showConduitTooltips: true,
        showStartCaps: true,
        conduitWeight: (baseWeight) => baseWeight,
        arrowSize: 12,
        tooltipContent: 'reduced',
      };
    case 2:
      return {
        lodLevel: 2,
        nodeSize: 6,
        showFlowArrows: false,
        showBadges: false,
        showDiameterLabels: false,
        showConduitTooltips: false,
        showStartCaps: false,
        conduitWeight: (baseWeight) => Math.max(2, baseWeight * 0.7),
        arrowSize: 12,
        tooltipContent: 'minimal',
      };
    case 3:
      return {
        lodLevel: 3,
        nodeSize: 4,
        showFlowArrows: false,
        showBadges: false,
        showDiameterLabels: false,
        showConduitTooltips: false,
        showStartCaps: false,
        conduitWeight: (baseWeight) => Math.max(1, baseWeight * 0.5),
        arrowSize: 12,
        tooltipContent: 'minimal',
      };
    }
  }, [lodConfigEnabled, lodLevel]);
}
