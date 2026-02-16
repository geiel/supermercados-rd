const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
} as const;

export async function GET() {
  return Response.json(
    {
      ok: true,
      service: "supermercados-rd",
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: NO_STORE_HEADERS,
    }
  );
}

export async function HEAD() {
  return new Response(null, {
    status: 200,
    headers: NO_STORE_HEADERS,
  });
}
