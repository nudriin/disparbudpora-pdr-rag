/**
 * middleware.ts — Proteksi route /admin/*
 * Berjalan di Edge Runtime — pakai jose (Web Crypto), bukan jsonwebtoken.
 */
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "admin_session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /admin/login SELALU dilewati — tidak perlu auth
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  // Cek JWT dari cookie
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const secret = process.env.ADMIN_JWT_SECRET;
    if (!secret) {
      console.error("[Middleware] ADMIN_JWT_SECRET tidak di-set!");
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    const secretKey = new TextEncoder().encode(secret);
    await jwtVerify(token, secretKey);

    return NextResponse.next();
  } catch (err) {
    console.error("[Middleware] Token invalid:", err);
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }
}

export const config = {
  // Hanya proteksi /admin (tidak termasuk /admin/login — ditangani di atas)
  matcher: ["/admin", "/admin/:path*"],
};
