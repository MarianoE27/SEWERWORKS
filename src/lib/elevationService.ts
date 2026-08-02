export interface Coordinate {
  id: string;
  lat: number;
  lon: number;
}

export interface ElevationResult {
  id: string;
  elevation: any;
  warning?: string;
}

// Simple sleep utility to respect API rate limits
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function validateUrl(urlStr: string): boolean {
  try {
    const urlObject = new URL(urlStr);
    if (urlObject.protocol === 'https:') {
      return true;
    }
    if (urlObject.protocol === 'http:' && (urlObject.hostname === 'localhost' || urlObject.hostname === '127.0.0.1')) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Fetches elevation from OpenTopoData
 * Max 100 locations per request.
 */
async function fetchOpenTopoData(
  coords: Coordinate[],
  dataset: string,
  customUrl?: string
): Promise<ElevationResult[]> {
  const baseUrl = customUrl || `https://api.opentopodata.org/v1/${dataset}`;
  if (customUrl && !validateUrl(customUrl)) {
    console.warn(`[SSRF Protection] URL personalizada no válida o insegura bloqueada: ${customUrl}`);
    throw new Error('URL no válida o insegura (SSRF protection)');
  }
  if (!validateUrl(baseUrl)) {
    console.warn(`[SSRF Protection] URL base no válida o insegura bloqueada: ${baseUrl}`);
    throw new Error('URL no válida o insegura (SSRF protection)');
  }
  const locationsParam = coords.map((c) => `${c.lat},${c.lon}`).join('|');
  const url = `${baseUrl}?locations=${encodeURIComponent(locationsParam)}`;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 8000);
  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(id);
  }

  if (!response.ok) {
    throw new Error(`OpenTopoData request failed: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.status !== 'OK' || !Array.isArray(data.results)) {
    throw new Error('Invalid response structure from OpenTopoData');
  }

  return coords.map((coord, idx) => {
    const result = data.results[idx];
    return {
      id: coord.id,
      elevation: typeof result?.elevation === 'number' ? result.elevation : null,
    };
  });
}

/**
 * Fetches elevation from Open-Meteo API.
 */
async function fetchOpenMeteo(coords: Coordinate[]): Promise<ElevationResult[]> {
  const url = 'https://api.open-meteo.com/v1/elevation';
  const lats = coords.map((c) => c.lat).join(',');
  const lons = coords.map((c) => c.lon).join(',');
  const fullUrl = `${url}?latitude=${lats}&longitude=${lons}`;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 8000);
  let response: Response;
  try {
    response = await fetch(fullUrl, { signal: controller.signal });
  } finally {
    clearTimeout(id);
  }

  if (!response.ok) {
    throw new Error(`Open-Meteo request failed: ${response.statusText}`);
  }

  const data = await response.json();
  if (!Array.isArray(data.elevation)) {
    throw new Error('Invalid response structure from Open-Meteo');
  }

  return coords.map((coord, idx) => {
    const elev = data.elevation[idx];
    return {
      id: coord.id,
      elevation: typeof elev === 'number' ? elev : null,
    };
  });
}

/**
 * Fetches elevation from Open-Elevation API.
 * Post JSON with locations.
 */
async function fetchOpenElevation(coords: Coordinate[]): Promise<ElevationResult[]> {
  const url = 'https://api.open-elevation.com/api/v1/lookup';
  if (!validateUrl(url)) {
    console.warn(`[SSRF Protection] URL no válida o insegura bloqueada: ${url}`);
    throw new Error('URL no válida o insegura (SSRF protection)');
  }
  const body = {
    locations: coords.map((c) => ({
      latitude: c.lat,
      longitude: c.lon,
    })),
  };

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 8000);
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(id);
  }

  if (!response.ok) {
    throw new Error(`Open-Elevation request failed: ${response.statusText}`);
  }

  const data = await response.json();
  if (!Array.isArray(data.results)) {
    throw new Error('Invalid response structure from Open-Elevation');
  }

  return coords.map((coord, idx) => {
    const result = data.results[idx];
    return {
      id: coord.id,
      elevation: typeof result?.elevation === 'number' ? result.elevation : null,
    };
  });
}

/**
 * Main elevation service entry point. Handles chunking, rate-limiting, and error fallback.
 */
export async function getElevations(
  coords: Coordinate[],
  provider: string = 'open_meteo',
  customUrl?: string,
  onProgress?: (progress: number) => void
): Promise<ElevationResult[]> {
  if (provider === 'none' || coords.length === 0) {
    return [];
  }

  if (customUrl && !validateUrl(customUrl)) {
    console.warn(`[SSRF Protection] URL personalizada no válida o insegura bloqueada antes de solicitar: ${customUrl}`);
    return coords.map((c) => ({
      id: c.id,
      elevation: null,
      warning: 'No se pudo obtener elevación automática (timeout/error de red)',
    }));
  }

  const results: ElevationResult[] = [];
  const chunkSize = provider.startsWith('opentopodata') || provider === 'open_meteo' ? 100 : 150;
  const totalChunks = Math.ceil(coords.length / chunkSize);

  for (let i = 0; i < totalChunks; i++) {
    const chunk = coords.slice(i * chunkSize, (i + 1) * chunkSize);

    // Call API with retries
    let chunkResults: ElevationResult[] = [];
    let retries = 3;
    while (retries > 0) {
      try {
        if (provider.startsWith('opentopodata_')) {
          const dataset = provider.replace('opentopodata_', '');
          chunkResults = await fetchOpenTopoData(chunk, dataset, customUrl);
        } else if (provider === 'open_elevation') {
          chunkResults = await fetchOpenElevation(chunk);
        } else if (provider === 'open_meteo') {
          chunkResults = await fetchOpenMeteo(chunk);
        } else if (provider === 'custom') {
          chunkResults = await fetchOpenTopoData(chunk, 'srtm30m', customUrl);
        } else {
          // Fallback
          chunkResults = await fetchOpenMeteo(chunk);
        }
        break;
      } catch (err) {
        retries--;
        console.error(`Elevation fetch failed, remaining retries: ${retries}`, err);
        if (retries === 0) {
          // Fall back to null elevation with warning
          chunkResults = chunk.map((c) => ({
            id: c.id,
            elevation: null,
            warning: 'No se pudo obtener elevación automática (timeout/error de red)',
          }));
        } else {
          await sleep(2000); // Wait 2s before retry
        }
      }
    }

    results.push(...chunkResults);

    if (onProgress) {
      onProgress(Math.min(100, Math.round(((i + 1) / totalChunks) * 100)));
    }

    if (i < totalChunks - 1) {
      await sleep(1500); // 1.5s delay to be safe
    }
  }

  return results;
}
