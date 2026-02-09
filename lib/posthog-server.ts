import "server-only";

import { createHash } from "crypto";

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

function getClientIp(requestHeaders: Headers): string {
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = requestHeaders.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}

function getDistinctId(requestHeaders: Headers): string {
  const ip = getClientIp(requestHeaders);
  const userAgent = requestHeaders.get("user-agent") ?? "unknown";
  const acceptLanguage = requestHeaders.get("accept-language") ?? "unknown";

  const raw = `${ip}|${userAgent}|${acceptLanguage}`;
  const hash = createHash("sha256").update(raw).digest("hex");

  return `anon_${hash.slice(0, 32)}`;
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
          distinct_id: getDistinctId(requestHeaders),
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
      console.error(
        `[posthog] group_visit returned ${response.status} ${response.statusText}`
      );
    }
  } catch (error) {
    console.error("[posthog] Failed to track group_visit", error);
  }
}
