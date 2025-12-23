"use server";

import {
  ProductShopUrlRow,
  fetchProductShopUrls,
} from "@/lib/admin/product-urls";
import * as cheerio from "cheerio";

type BaseResult = {
  productId: number;
  shopId: number;
  shopName: string;
  productName: string;
  productImage: string | null;
  productUnit: string;
  previousUrl: string;
};

export type NacionalUpdateResult =
  | (BaseResult & { status: "updated"; matchedUrl: string })
  | (BaseResult & { status: "multiple"; matches: string[] })
  | (BaseResult & { status: "not_found" })
  | (BaseResult & { status: "error"; error: string });

const NACIONAL_SHOP_ID = 2;
const DEFAULT_LIMIT = 1;
const NACIONAL_BASE_URL = "https://supermercadosnacional.com";
const CONCURRENCY = 5;

const SEARCH_HEADERS: Record<string, string> = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:145.0) Gecko/20100101 Firefox/145.0",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "Referer": `${NACIONAL_BASE_URL}/`,
  "Sec-GPC": "1",
  "Connection": "keep-alive",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "same-origin",
  "Sec-Fetch-User": "?1",
  "Priority": "u=0, i",
};

function buildSearchUrl(productName: string) {
  const query = encodeURIComponent(productName);
  return `${NACIONAL_BASE_URL}/catalogsearch/result/?q=${query}`;
}

function normalizePath(path: string) {
  return path.replace(/^\//, "").replace(/\/$/, "").replace(/\.html?$/i, "");
}

function getLastPathSegment(path: string) {
  const normalized = normalizePath(path);
  if (!normalized) return "";
  const segments = normalized.split("/");
  return segments[segments.length - 1] ?? "";
}

function getSlugFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    return getLastPathSegment(parsed.pathname);
  } catch {
    return getLastPathSegment(url);
  }
}

function findMatchingUrls(html: string, currentUrl: string) {
  const $ = cheerio.load(html);
  const currentSlug = getSlugFromUrl(currentUrl);

  if (!currentSlug) {
    return [];
  }
  const expectedSlug = currentSlug.toLowerCase();
  const matches = new Map<string, number>();

  $(".product-item-link").each((index, element) => {
    const href = $(element).attr("href");
    if (!href) {
      return;
    }
    let normalizedPath = "";
    try {
      normalizedPath = normalizePath(
        new URL(href, NACIONAL_BASE_URL).pathname
      );
    } catch {
      normalizedPath = normalizePath(href);
    }

    if (!normalizedPath) {
      return;
    }

    if (!normalizedPath.toLowerCase().includes(expectedSlug)) {
      return;
    }

    const absoluteUrl = new URL(href, NACIONAL_BASE_URL).toString();
    if (!matches.has(absoluteUrl)) {
      matches.set(absoluteUrl, index);
    }
  });

  return Array.from(matches.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([url]) => url);
}

async function fetchSearchPage(productName: string) {
  const url = buildSearchUrl(productName);
  const response = await fetch(url, {
    headers: SEARCH_HEADERS,
    signal: AbortSignal.timeout(20000),
  });

  return await response.text();
}

async function processRow(row: ProductShopUrlRow): Promise<NacionalUpdateResult> {
  console.log(
    `[Nacional URL Updater] Searching for product="${row.productName}" (${row.productId})`
  );

  const baseResult: BaseResult = {
    productId: row.productId,
    shopId: row.shopId,
    shopName: row.shopName,
    productName: row.productName,
    productImage: row.productImage,
    productUnit: row.productUnit,
    previousUrl: row.url,
  };

  try {
    const html = await fetchSearchPage(row.productName);
    const matches = findMatchingUrls(html, row.url);

    if (matches.length === 0) {
      console.log(
        `[Nacional URL Updater] No matching URL found for productId=${row.productId}`
      );
      return { ...baseResult, status: "not_found" };
    }

    console.log(
      `[Nacional URL Updater] Found matches for productId=${row.productId}: ${matches.join(
        ", "
      )}`
    );

    return { ...baseResult, status: "multiple", matches };
  } catch (error) {
    console.error(
      `[Nacional URL Updater] Error processing productId=${row.productId}`,
      error
    );
    return {
      ...baseResult,
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function updateNacionalProducts(
  limit = DEFAULT_LIMIT,
  { ignoredProductIds = [] as number[] } = {}
) {
  const rows = await fetchProductShopUrls({
    visibility: "hidden",
    shopId: NACIONAL_SHOP_ID,
    limit: limit + ignoredProductIds.length,
  });

  const ignoredSet = new Set(ignoredProductIds);
  const filteredRows = rows
    .filter((row) => !ignoredSet.has(row.productId))
    .slice(0, limit);

  const results: NacionalUpdateResult[] = [];

  for (let i = 0; i < filteredRows.length; i += CONCURRENCY) {
    const batch = filteredRows.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map((row) => processRow(row)));
    results.push(...batchResults);
  }

  return results;
}
