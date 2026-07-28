import type { Metadata } from "next";
import { ThemeProvider } from "@/components/admin/ThemeContext";

export const metadata: Metadata = {
  title: "Tourism Intelligence - Admin Panel Palangka Raya",
  description: "Backend & Admin Panel untuk Chatbot Telegram berbasis Parent Document Retrieval (PDR)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" data-theme="light">
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
        <style>{`
          :root {
            --bg-page: #E8EFEB;
            --bg-surface: #FFFFFF;
            --bg-sidebar: #1E1F24;
            --bg-header: #FFFFFF;
            --border-color: #D1D9D4;
            --text-primary: #1E1F24;
            --text-secondary: #5A6065;
            --mint-accent: #A1EBB4;
            --mint-text: #0D381B;
            --lavender-accent: #B5B4FF;
            --lavender-text: #1C1A5E;
            --dark-card-bg: #1E1F24;
            --dark-card-text: #FFFFFF;
            --input-bg: #F4F8F5;
          }

          [data-theme="dark"] {
            --bg-page: #121316;
            --bg-surface: #1A1B20;
            --bg-sidebar: #16171B;
            --bg-header: #1A1B20;
            --border-color: #2A2C34;
            --text-primary: #F0F2F5;
            --text-secondary: #9A9FA5;
            --mint-accent: #1E422B;
            --mint-text: #A1EBB4;
            --lavender-accent: #2A2952;
            --lavender-text: #B5B4FF;
            --dark-card-bg: #23252E;
            --dark-card-text: #FFFFFF;
            --input-bg: #121316;
          }

          body {
            margin: 0;
            padding: 0;
            font-family: 'Hanken Grotesk', system-ui, -apple-system, sans-serif;
            background-color: var(--bg-page);
            color: var(--text-primary);
            -webkit-font-smoothing: antialiased;
            transition: background-color 0.25s ease, color 0.25s ease;
          }
        `}</style>
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
