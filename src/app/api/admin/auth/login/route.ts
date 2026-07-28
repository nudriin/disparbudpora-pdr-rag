import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SignJWT } from "jose";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { verifyPassword, SESSION_COOKIE } from "@/lib/auth/session";

const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 jam

interface AdminUserRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string | null;
  is_active: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan password wajib diisi." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("admin_users")
      .select("id, email, password_hash, full_name, is_active")
      .eq("email", (email as string).toLowerCase())
      .single();

    const user = data as AdminUserRow | null;

    if (error || !user) {
      return NextResponse.json(
        { error: "Email atau password salah." },
        { status: 401 }
      );
    }

    if (!user.is_active) {
      return NextResponse.json(
        { error: "Akun tidak aktif." },
        { status: 403 }
      );
    }

    const isValid = await verifyPassword(password as string, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Email atau password salah." },
        { status: 401 }
      );
    }

    // Buat JWT menggunakan jose (kompatibel dengan Edge Runtime middleware)
    const secret = process.env.ADMIN_JWT_SECRET;
    if (!secret) throw new Error("ADMIN_JWT_SECRET not configured");

    const secretKey = new TextEncoder().encode(secret);
    const token = await new SignJWT({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(`${COOKIE_MAX_AGE}s`)
      .sign(secretKey);

    // Set cookie HTTP-only
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    return NextResponse.json({ ok: true, email: user.email });
  } catch (err) {
    console.error("[Login] Error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server." },
      { status: 500 }
    );
  }
}
