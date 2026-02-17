import "server-only";

import * as Sentry from "@sentry/nextjs";

type TrackGroupVisitInput = {
  groupId: number;
  groupName: string;
  groupHumanId: string;
  requestHeaders: Headers;
};

function isPrefetchRequest(requestHeaders: Headers): boolean {
  const purpose = requestHeaders.get("purpose")?.toLowerCase();
  const secPurpose = requestHeaders.get("sec-purpose")?.toLowerCase();
  const nextRouterPrefetch = requestHeaders.get("next-router-prefetch");

  return (
    purpose?.includes("prefetch") === true ||
    secPurpose?.includes("prefetch") === true ||
    nextRouterPrefetch === "1"
  );
}

function isBotRequest(requestHeaders: Headers): boolean {
  const userAgent = requestHeaders.get("user-agent");
  if (!userAgent) return false;

  return /(bot|crawler|spider|crawling|facebookexternalhit|slackbot|discordbot|whatsapp|twitterbot|linkedinbot)/i.test(
    userAgent
  );
}

function isLocalhostRequest(requestHeaders: Headers): boolean {
  const hostHeader =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "";
  const firstHost = hostHeader.split(",")[0]?.trim().toLowerCase() ?? "";
  const hostname = firstHost.startsWith("[")
    ? firstHost.slice(1, firstHost.indexOf("]"))
    : firstHost.split(":")[0];

  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "0.0.0.0"
  );
}

function parseCookieHeader(cookieHeader: string | null): Map<string, string> {
  const cookies = new Map<string, string>();
  if (!cookieHeader) return cookies;

  for (const item of cookieHeader.split(";")) {
    const trimmed = item.trim();
    if (!trimmed) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;

    const name = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!name || !value) continue;

    cookies.set(name, value);
  }

  return cookies;
}

function decodeCookieValue(rawValue: string): string {
  let decoded = rawValue;

  for (let i = 0; i < 2; i += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }

  return decoded;
}

function extractDistinctIdFromPosthogCookie(cookieValue: string): string | null {
  const decoded = decodeCookieValue(cookieValue);
  let parsed: unknown;

  try {
    parsed = JSON.parse(decoded);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") return null;

  const record = parsed as Record<string, unknown>;
  const distinctId = record.distinct_id;
  if (typeof distinctId === "string" && distinctId.trim().length > 0) {
    return distinctId;
  }

  const deviceId = record.$device_id;
  if (typeof deviceId === "string" && deviceId.trim().length > 0) {
    return deviceId;
  }

  return null;
}

function sanitizeTokenForCookieName(token: string): string {
  return token.replace(/\+/g, "PL").replace(/\//g, "SL").replace(/=/g, "EQ");
}

function getPosthogCookieNameCandidates(apiKey?: string): string[] {
  const keys = new Set<string>();
  if (apiKey) keys.add(apiKey);
  if (process.env.NEXT_PUBLIC_POSTHOG_KEY) keys.add(process.env.NEXT_PUBLIC_POSTHOG_KEY);

  return Array.from(keys).map((key) => `ph_${sanitizeTokenForCookieName(key)}_posthog`);
}

function getDistinctIdFromPosthogCookies(requestHeaders: Headers, apiKey?: string): string | null {
  const cookies = parseCookieHeader(requestHeaders.get("cookie"));
  if (cookies.size === 0) return null;

  const preferredCookieNames = getPosthogCookieNameCandidates(apiKey);
  for (const cookieName of preferredCookieNames) {
    const value = cookies.get(cookieName);
    if (!value) continue;

    const distinctId = extractDistinctIdFromPosthogCookie(value);
    if (distinctId) return distinctId;
  }

  for (const [cookieName, value] of cookies.entries()) {
    if (!/^ph_.+_posthog$/.test(cookieName)) continue;

    const distinctId = extractDistinctIdFromPosthogCookie(value);
    if (distinctId) return distinctId;
  }

  return null;
}

export async function trackGroupVisit({
  groupId,
  groupName,
  groupHumanId,
  requestHeaders,
}: TrackGroupVisitInput): Promise<void> {
  const apiKey = process.env.POSTHOG_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.POSTHOG_HOST ?? process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!apiKey || !host) return;
  if (isLocalhostRequest(requestHeaders)) return;
  if (isPrefetchRequest(requestHeaders)) return;
  if (isBotRequest(requestHeaders)) return;

  const distinctId = getDistinctIdFromPosthogCookies(requestHeaders, apiKey);
  if (!distinctId) return;

  const endpoint = `${host.replace(/\/$/, "")}/capture/`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(1200),
      body: JSON.stringify({
        api_key: apiKey,
        event: "group_visit",
        properties: {
          distinct_id: distinctId,
          captureSource: "server",
          groupId,
          groupName,
          groupHumanId,
          path: `/grupos/${groupHumanId}`,
          $process_person_profile: false,
        },
      }),
    });

    if (!response.ok) {
      Sentry.logger.error(`[posthog] group_visit returned ${response.status} ${response.statusText}`
      );
    }
  } catch (error) {
    Sentry.logger.error("[posthog] Failed to track group_visit", { error });
  }
}
