/**
 * test-login.ts — Test API login admin
 *
 * Jalankan: npx tsx src/scripts/test-login.ts
 */
async function main() {
  console.log("=".repeat(60));
  console.log("🔐 TEST LOGIN ADMIN API");
  console.log("=".repeat(60));

  const baseUrl = "http://localhost:3001";
  const email = "admin@pariwisata-palangkaraya.id";
  const password = "admin123";

  console.log(`\n📧 Email: ${email}`);
  console.log(`🔑 Password: ${password}`);
  console.log(`🌐 URL: ${baseUrl}/api/admin/auth/login`);

  try {
    const res = await fetch(`${baseUrl}/api/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    console.log(`\n📡 Status: ${res.status} ${res.statusText}`);

    const data = await res.json();
    console.log("📦 Response Body:", JSON.stringify(data, null, 2));

    const cookie = res.headers.get("set-cookie");
    if (cookie) {
      console.log("\n🍪 Cookie Set:", cookie.split(";")[0]);
    }

    if (res.ok) {
      console.log("\n✅ LOGIN BERHASIL!");
    } else {
      console.log("\n❌ LOGIN GAGAL!");
    }
  } catch (err: any) {
    console.error("❌ Error:", err.message);
  }

  console.log("=".repeat(60));
}

main();
