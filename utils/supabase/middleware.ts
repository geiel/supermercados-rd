import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Route types (middleware only runs on protected routes via matcher config)
  const isAdminRoute = pathname.startsWith("/admin");
  const isApiAdminRoute = pathname.startsWith("/api/admin");
  const isApiUserRoute = pathname.startsWith("/api/user");
  const isListDetailRoute = pathname.startsWith("/lists/");

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser();

  // Admin pages: require user + ADMIN_ID, redirect to home if not admin
  if (isAdminRoute) {
    if (user?.id !== process.env.ADMIN_ID) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  // /api/admin/** routes: require admin user, return 401/403 JSON if not admin
  if (isApiAdminRoute) {
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    if (user.id !== process.env.ADMIN_ID) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }
  }

  // /api/user/** routes: require authenticated user, return 401 JSON if missing
  if (isApiUserRoute && !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // List detail routes (e.g., /lists/123): require authenticated user
  if (isListDetailRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/lists/local';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}