/**
 * verify-admin.ts — Skrip untuk verifikasi & membuat admin user
 *
 * Jalankan: npx tsx src/scripts/verify-admin.ts
 */
// Load .env.local terlebih dahulu sebelum import lainnya
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { getSupabaseAdmin } from "../lib/supabase/client";
import { hashPassword } from "../lib/auth/session";

async function main() {
  console.log("=".repeat(60));
  console.log("🔍 VERIFIKASI ADMIN USER");
  console.log("=".repeat(60));

  const supabase = getSupabaseAdmin();

  // Cek apakah tabel admin_users ada
  const { data: tables, error: tableError } = await supabase
    .from("admin_users")
    .select("*")
    .limit(1);

  if (tableError) {
    console.error("❌ Error: Tabel admin_users tidak ditemukan atau ada error:");
    console.error(tableError);
    console.log("\n💡 Solusi: Jalankan schema.sql di Supabase SQL Editor terlebih dahulu!");
    process.exit(1);
  }

  console.log("✅ Tabel admin_users ditemukan.");

  // Cek admin user dengan email admin@pariwisata-palangkaraya.id
  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("*")
    .eq("email", "admin@pariwisata-palangkaraya.id")
    .single();

  if (adminError || !admin) {
    console.log("⚠️  Admin user belum ada. Membuat admin baru...");

    const email = "admin@pariwisata-palangkaraya.id";
    const password = "admin123"; // GANTI setelah login pertama kali!
    const passwordHash = await hashPassword(password);

    const { error: insertError } = await supabase
      .from("admin_users")
      .insert({
        email,
        password_hash: passwordHash,
        full_name: "Administrator",
        is_active: true,
      });

    if (insertError) {
      console.error("❌ Gagal membuat admin user:", insertError);
      process.exit(1);
    }

    console.log("✅ Admin user berhasil dibuat!");
    console.log(`   Email:    ${email}`);
    console.log(`   Password: ${password}`);
    console.log("\n⚠️  PENTING: Segera ganti password setelah login pertama kali!");
  } else {
    console.log("✅ Admin user sudah ada:");
    console.log(`   Email:       ${admin.email}`);
    console.log(`   Full Name:   ${admin.full_name}`);
    console.log(`   Is Active:   ${admin.is_active}`);
    console.log(`   Created At:  ${admin.created_at}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ VERIFIKASI SELESAI");
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
