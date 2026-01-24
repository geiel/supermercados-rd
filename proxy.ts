import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/user/:path*",
    // Only /lists/<something>, excluding /lists/local and /lists/local/...
    "/lists/:path((?!local(?:/|$)).+)",
  ],
};
