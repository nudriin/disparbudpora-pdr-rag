import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Panel — Chatbot Pariwisata Palangka Raya",
};

/**
 * Layout ini HANYA menyediakan metadata.
 * Auth guard ada di masing-masing page (bukan di sini),
 * karena layout ini juga membungkus /admin/login yang tidak perlu auth.
 *
 * Sidebar ditampilkan di setiap page yang membutuhkan (bukan di login page).
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
