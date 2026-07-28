/**
 * session.ts — Auth utilities untuk Server Components & API Routes
 *
 * Menggunakan jose (Web Crypto) agar konsisten dengan middleware.
 * jose kompatibel dengan Node.js dan Edge Runtime.
 */
import { jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "admin_session";

export interface AdminSession {
  id: string;
  email: string;
  fullName: string | null;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) throw new Error("Missing env var: ADMIN_JWT_SECRET");
  return new TextEncoder().encode(secret);
}

/** Verifikasi dan decode JWT token */
export async function verifySessionToken(
  token: string
): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as AdminSession;
  } catch {
    return null;
  }
}

/** Ambil session dari cookie — untuk Server Components & API Routes */
export async function getSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** Hash password dengan bcrypt */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

/** Verifikasi password */
export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
