import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chatbot Pariwisata Palangka Raya",
  description: "Backend & Admin Panel untuk Chatbot Telegram berbasis Advanced RAG",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
