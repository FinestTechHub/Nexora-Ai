import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response; // Not configured yet: the site stays open (demo mode).

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser(); // verifies the session with Supabase
  const path = request.nextUrl.pathname;
  if (!user && path.startsWith("/dashboard")) { const u = request.nextUrl.clone(); u.pathname = "/login"; return NextResponse.redirect(u); }
  if (user && (path === "/login" || path === "/signup")) { const u = request.nextUrl.clone(); u.pathname = "/dashboard"; return NextResponse.redirect(u); }
  return response;
}
