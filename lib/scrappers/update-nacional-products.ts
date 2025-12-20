"use server";

import {
  ProductShopUrlRow,
  fetchProductShopUrls,
  updateProductShopUrl,
} from "@/lib/admin/product-urls";
import { toSlug } from "@/lib/utils";
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

function getSlugFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    return normalizePath(parsed.pathname);
  } catch {
    return normalizePath(url);
  }
}

function stripNumericSuffix(slug: string) {
  return slug.replace(/-\d+$/, "");
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesSlug(href: string, expectedSlug: string) {
  try {
    const path = normalizePath(new URL(href, NACIONAL_BASE_URL).pathname);
    const slugRegex = new RegExp(
      `^${escapeRegex(expectedSlug)}(?:-[a-z0-9]+)*$`,
      "i"
    );
    return slugRegex.test(path);
  } catch {
    return false;
  }
}

function findMatchingUrls(html: string, currentUrl: string, productName: string) {
  const $ = cheerio.load(html);
  const currentSlug = getSlugFromUrl(currentUrl);
  const fallbackSlug = toSlug(productName);
  const hasEnye = /ñ/i.test(productName.normalize("NFC"));

  const targetBases = new Set<string>();
  if (currentSlug) {
    targetBases.add(stripNumericSuffix(currentSlug));
  }
  if (!currentSlug || hasEnye) {
    targetBases.add(stripNumericSuffix(fallbackSlug));
  }

  if (targetBases.size === 0) {
    return [];
  }
  const matches = new Map<string, { priority: number; index: number }>();

  $(".product-item-link").each((index, element) => {
    const href = $(element).attr("href");
    if (!href) {
      return;
    }

    const hasSlugMatch = Array.from(targetBases).some((base) =>
      matchesSlug(href, base)
    );
    if (!hasSlugMatch) {
      return;
    }

    let normalizedPath: string | null = null;
    try {
      normalizedPath = normalizePath(new URL(href, NACIONAL_BASE_URL).pathname);
    } catch {
      normalizedPath = null;
    }

    if (!normalizedPath) {
      return;
    }

    const basePath = stripNumericSuffix(normalizedPath);
    const isBaseMatch = Array.from(targetBases).some(
      (base) => basePath === base || basePath.startsWith(`${base}-`)
    );
    if (!isBaseMatch) {
      return;
    }

    const hasNumericSuffix = basePath !== normalizedPath;
    const priority = hasNumericSuffix ? 1 : 0;
    const absoluteUrl = new URL(href, NACIONAL_BASE_URL).toString();
    const existing = matches.get(absoluteUrl);

    if (!existing || existing.priority > priority) {
      matches.set(absoluteUrl, { priority, index });
    }
  });

  return Array.from(matches.entries())
    .sort((a, b) => a[1].priority - b[1].priority || a[1].index - b[1].index)
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
    const matches = findMatchingUrls(html, row.url, row.productName);

    if (matches.length === 0) {
      console.log(
        `[Nacional URL Updater] No matching URL found for productId=${row.productId}`
      );
      return { ...baseResult, status: "not_found" };
    }

    if (matches.length === 1) {
      const matchedUrl = matches[0];

      await updateProductShopUrl({
        productId: row.productId,
        shopId: row.shopId,
        url: matchedUrl,
      });

      console.log(
        `[Nacional URL Updater] Updated productId=${row.productId} to url=${matchedUrl}`
      );

      return { ...baseResult, status: "updated", matchedUrl };
    }

    console.log(
      `[Nacional URL Updater] Found multiple matches for productId=${row.productId}: ${matches.join(
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
