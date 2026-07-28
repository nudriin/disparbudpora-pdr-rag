/**
 * reset-admin-password.ts — Reset password admin
 *
 * Jalankan: npx tsx src/scripts/reset-admin-password.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { getSupabaseAdmin } from "../lib/supabase/client";
import { hashPassword } from "../lib/auth/session";

async function main() {
  console.log("=".repeat(60));
  console.log("🔑 RESET PASSWORD ADMIN");
  console.log("=".repeat(60));

  const email = "admin@pariwisata-palangkaraya.id";
  const newPassword = "admin123"; // Password default

  const passwordHash = await hashPassword(newPassword);
  console.log(`\nHash baru: ${passwordHash}`);

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("admin_users")
    .update({ password_hash: passwordHash })
    .eq("email", email)
    .select("email, full_name, is_active")
    .single();

  if (error) {
    console.error("❌ Gagal update password:", error);
    process.exit(1);
  }

  console.log("\n✅ Password berhasil direset!");
  console.log(`   Email:    ${data.email}`);
  console.log(`   Password: ${newPassword}`);
  console.log(`   Active:   ${data.is_active}`);
  console.log("\n⚠️  Segera login dan ganti password!");
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
