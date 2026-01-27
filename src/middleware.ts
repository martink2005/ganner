import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken, getTokenFromCookies } from "@/lib/auth";

// Routes ktoré nevyžadujú autentifikáciu
const publicRoutes = ["/login", "/api/auth/login"];

// Routes ktoré sú vždy prístupné
const alwaysPublic = ["/_next", "/favicon.ico"];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Preskočiť statické súbory
    if (alwaysPublic.some((route) => pathname.startsWith(route))) {
        return NextResponse.next();
    }

    const cookieHeader = request.headers.get("cookie");
    const token = getTokenFromCookies(cookieHeader);
    const user = token ? await verifyToken(token) : null;

    // Ak je používateľ prihlásený a ide na login, presmeruj na dashboard
    if (user && pathname === "/login") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Ak nie je prihlásený a ide na chránenú route, presmeruj na login
    if (!user && !publicRoutes.includes(pathname)) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        "/((?!_next/static|_next/image|favicon.ico).*)",
    ],
};
