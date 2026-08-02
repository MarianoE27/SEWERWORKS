import { TimeSeriesPoint, StormMethod } from '../types';

/**
 * Generates a Chicago Design Storm hyetograph.
 * i = a / (t + b)^c
 */
export function generateChicagoStorm(
  a: number, 
  b: number, 
  c: number, 
  r: number, 
  durationHrs: number, 
  timeStepMin: number
): TimeSeriesPoint[] {
  const durationMin = durationHrs * 60;
  const numSteps = Math.ceil(durationMin / timeStepMin);
  const data: TimeSeriesPoint[] = [];
  const tp = durationMin * r; // Time of peak

  for (let i = 0; i <= numSteps; i++) {
    const t = i * timeStepMin;
    let intensity = 0;
    
    if (t <= tp) {
      // Before peak
      const timeToPeak = (tp - t) / r;
      intensity = a * ((1 - c) * (timeToPeak / r) + b) / Math.pow(timeToPeak / r + b, c + 1);
    } else {
      // After peak
      const timeFromPeak = (t - tp) / (1 - r);
      intensity = a * ((1 - c) * (timeFromPeak / (1 - r)) + b) / Math.pow(timeFromPeak / (1 - r) + b, c + 1);
    }
    
    data.push({ time: t / 60, value: Math.max(0, intensity) });
  }

  return data;
}

/**
 * Generates an SCS Design Storm (Type I, IA, II, III).
 * Simplified implementation using cumulative fraction distributions.
 */
export function generateSCSStorm(
  type: 'Type1' | 'Type1A' | 'Type2' | 'Type3',
  totalDepth: number,
  durationHrs: number,
  timeStepMin: number
): TimeSeriesPoint[] {
  // Simplified dimensionless cumulative rainfall distributions (24h)
  // These are approximations of the standard SCS curves
  const getSCSFactor = (tFraction: number, type: string) => {
    if (type === 'Type2') {
      // Type II is very intense in the middle
      if (tFraction < 0.5) return Math.pow(tFraction * 2, 3) * 0.5;
      return 0.5 + (1 - Math.pow((1 - tFraction) * 2, 3) * 0.5);
    }
    // Default to a generic S-curve for others (simplified)
    return Math.pow(tFraction, 2) * (3 - 2 * tFraction);
  };

  const durationMin = durationHrs * 60;
  const numSteps = Math.ceil(durationMin / timeStepMin);
  const data: TimeSeriesPoint[] = [];
  
  let lastCumulative = 0;
  for (let i = 0; i <= numSteps; i++) {
    const t = i * timeStepMin;
    const tFrac = t / durationMin;
    const cumulative = getSCSFactor(tFrac, type) * totalDepth;
    
    // Intensity in mm/hr = delta depth / delta time (hrs)
    const intensity = i === 0 ? 0 : (cumulative - lastCumulative) / (timeStepMin / 60);
    
    data.push({ time: t / 60, value: Math.max(0, intensity) });
    lastCumulative = cumulative;
  }

  return data;
}

/**
 * Calculates total depth of a hyetograph.
 */
export function calculateTotalDepth(data: TimeSeriesPoint[], timeStepMin: number): number {
  return data.reduce((acc, p) => acc + p.value * (timeStepMin / 60), 0);
}

/**
 * Calculates peak intensity of a hyetograph.
 */
export function calculatePeakIntensity(data: TimeSeriesPoint[]): number {
  return Math.max(...data.map(p => p.value), 0);
}
