import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { ThemeProvider } from "../components/ThemeProvider";
import "./globals.css";
import { env } from "@/lib/env";

// Enforce environment validation at startup to prevent tree-shaking
if (!env.DATABASE_URL) {
  console.warn("Database URL is not defined.");
}
import FeedbackWidget from "../components/FeedbackWidget";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "Aydım | AI Destekli YKS & Eğitim Yönetim Platformu",
  description: "Kurumlar için optik okuma entegrasyonlu, yapay zeka destekli rehberlik ve veli yoklama bildirim sistemi sunan yeni nesil eğitim platformu.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Aydım",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      <html lang="tr" className={inter.className} suppressHydrationWarning>
        <head>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                try {
                  var saved = localStorage.getItem("web-theme") || "dark";
                  document.documentElement.setAttribute("data-theme", saved);
                } catch (_) {}
              `,
            }}
          />
        </head>
        <body suppressHydrationWarning>
          <ThemeProvider>
            {children}
            <FeedbackWidget />
          </ThemeProvider>
        </body>
      </html>
    </AuthProvider>
  );
}
