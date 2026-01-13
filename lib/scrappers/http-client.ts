/**
 * HTTP Client utility for web scraping with realistic browser headers
 * Each supermarket has specific header requirements to avoid blocking
 */

// Modern Chrome user agents (rotate these)
const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
];

export function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Random delay between requests to mimic human behavior
 * @param min Minimum delay in ms (default 1500)
 * @param max Maximum delay in ms (default 4000)
 */
export function randomDelay(min = 1500, max = 4000): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Common Chrome headers that all sites expect
 */
function getCommonChromeHeaders(userAgent: string) {
  return {
    'User-Agent': userAgent,
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'en-US,en;q=0.9',
    'sec-ch-ua': '"Chromium";v="143", "Not A(Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
  };
}

/**
 * Headers for Nacional (Magento-based HTML scraping)
 */
export function getNacionalHeaders(url: string): Record<string, string> {
  const userAgent = getRandomUserAgent();
  return {
    ...getCommonChromeHeaders(userAgent),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Referer': 'https://supermercadosnacional.com/',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'same-origin',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    'priority': 'u=0, i',
  };
}

/**
 * Headers for Jumbo (Magento-based HTML scraping)
 */
export function getJumboHeaders(url: string): Record<string, string> {
  const userAgent = getRandomUserAgent();
  return {
    ...getCommonChromeHeaders(userAgent),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Referer': 'https://jumbo.com.do/',
    'Cache-Control': 'max-age=0',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'same-origin',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    'priority': 'u=0, i',
  };
}

/**
 * Headers for Sirena (JSON API)
 * Note: Sirena uses special encoded client/source headers
 */
export function getSirenaHeaders(): Record<string, string> {
  const userAgent = getRandomUserAgent();
  return {
    ...getCommonChromeHeaders(userAgent),
    'Accept': 'application/json',
    'Origin': 'https://sirena.do',
    'Referer': 'https://sirena.do/',
    // These are base64 encoded values required by their API
    'client': 'MWZiZWNmNzM4YWU5ODkwMGI5MjQ4ZjI1ODNhZWZlNjYwNGE2MmEwZg==',
    'source': 'c3RvcmVmcm9udA==',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
    'priority': 'u=1, i',
  };
}

/**
 * Headers for Plaza Lama (GraphQL API via Instaleap)
 */
export function getPlazaLamaHeaders(): Record<string, string> {
  const userAgent = getRandomUserAgent();
  return {
    ...getCommonChromeHeaders(userAgent),
    'Accept': '*/*',
    'Content-Type': 'application/json',
    'Origin': 'https://plazalama.com.do',
    'Referer': 'https://plazalama.com.do/',
    'apollographql-client-name': 'Ecommerce Moira client',
    'apollographql-client-version': '0.18.386',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'cross-site',
    'priority': 'u=1, i',
  };
}

/**
 * Headers for PriceSmart (JSON API with Cloudflare)
 */
export function getPricesmartHeaders(): Record<string, string> {
  const userAgent = getRandomUserAgent();
  return {
    ...getCommonChromeHeaders(userAgent),
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    'Origin': 'https://www.pricesmart.com',
    'Referer': 'https://www.pricesmart.com/es-do/',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'priority': 'u=1, i',
  };
}

/**
 * Headers for Bravo (Mobile API)
 * Note: Bravo uses a static auth token - this may need to be updated periodically
 */
export function getBravoHeaders(): Record<string, string> {
  return {
    'Host': 'bravova-api.superbravo.com.do',
    'X-Auth-Token': 'dDfy25KA4AbcAIbTGrWHimB1eaiJnCAHqBO1cQlb113QtVsKOHlobtCzUh0FTdOPkLTSEl7Wn17TW0K2jIvoMybcp4zp7beQqdX1zxKqKb6yfZnKlF3hTDaIVZbi1OIB',
    'Accept': '*/*',
    'User-Agent': 'Domicilio/122130 CFNetwork/3826.500.131 Darwin/24.5.0',
    'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
  };
}

/**
 * Get headers by shop ID
 */
export function getHeadersByShopId(shopId: number, url?: string): Record<string, string> {
  switch (shopId) {
    case 1:
      return getSirenaHeaders();
    case 2:
      return getNacionalHeaders(url || '');
    case 3:
      return getJumboHeaders(url || '');
    case 4:
      return getPlazaLamaHeaders();
    case 5:
      return getPricesmartHeaders();
    case 6:
      return getBravoHeaders();
    default:
      return getNacionalHeaders(url || '');
  }
}

/**
 * Fetch with retry and exponential backoff
 * Handles rate limiting (429) and server errors (503)
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 3
): Promise<Response | null> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(10000),
      });

      // Handle rate limiting
      if (response.status === 429 || response.status === 503) {
        const waitTime = Math.pow(2, attempt) * 5000 + Math.random() * 2000;
        console.log(`[RETRY] Status ${response.status} - waiting ${Math.round(waitTime)}ms before retry ${attempt + 1}/${maxRetries}`);
        await new Promise((r) => setTimeout(r, waitTime));
        continue;
      }

      return response;
    } catch (error) {
      console.log(`[ERROR] Attempt ${attempt + 1}/${maxRetries} failed:`, error instanceof Error ? error.message : error);
      
      if (attempt === maxRetries - 1) {
        return null;
      }
      
      // Exponential backoff on error
      const waitTime = Math.pow(2, attempt) * 2000 + Math.random() * 1000;
      await new Promise((r) => setTimeout(r, waitTime));
    }
  }
  
  return null;
}

/**
 * Convenience function: fetch JSON with proper headers
 */
export async function fetchJson<T>(
  url: string,
  shopId: number,
  body?: unknown
): Promise<T | null> {
  const headers = getHeadersByShopId(shopId, url);
  
  const options: RequestInit = {
    headers,
    method: body ? 'POST' : 'GET',
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetchWithRetry(url, options);
  
  if (!response) {
    return null;
  }
  
  try {
    return await response.json() as T;
  } catch {
    return null;
  }
}

/**
 * Convenience function: fetch HTML with proper headers
 */
export async function fetchHtml(url: string, shopId: number): Promise<string | null> {
  const headers = getHeadersByShopId(shopId, url);
  
  const response = await fetchWithRetry(url, { headers });
  
  if (!response) {
    return null;
  }
  
  try {
    return await response.text();
  } catch {
    return null;
  }
}
