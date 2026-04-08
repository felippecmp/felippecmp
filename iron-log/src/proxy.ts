import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, verifyAuthCookie } from "@/lib/auth";

// Paths that don't require auth
const PUBLIC_PATHS = ["/login"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Let public routes through
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    // Misconfigured: show a clear message instead of silently allowing
    return new NextResponse(
      "Configuração faltando: AUTH_SECRET não definido no Vercel.",
      { status: 500 }
    );
  }

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  const valid = await verifyAuthCookie(cookie, secret);

  if (!valid) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except static assets and Next.js internals
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|.*\\.svg).*)",
  ],
};
