import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tourism Intelligence - Admin Panel Palangka Raya",
  description: "Backend & Admin Panel untuk Chatbot Telegram berbasis Parent Document Retrieval (PDR)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily: "'Hanken Grotesk', system-ui, -apple-system, sans-serif",
          backgroundColor: "#f7f9fb",
          color: "#191c1e",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        {children}
      </body>
    </html>
  );
}
