import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Felippe's Log",
  description: "Caderno pessoal de treino: strength, cardio, peso corporal, progressão.",
  applicationName: "Felippe's Log",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "Felippe's Log",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full" suppressHydrationWarning>
      <head>
        {/* Inline script to apply the saved theme class BEFORE React
            hydrates, preventing a flash of the wrong palette. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("flog:theme");if(t==="orchid")document.documentElement.classList.add("theme-orchid");if(t==="beast")document.documentElement.classList.add("theme-beast")}catch{}`,
          }}
        />
      </head>
      <body className="min-h-full bg-[var(--bg)] text-[var(--text)]">
        <ThemeProvider>
          <main
            className="max-w-xl mx-auto pb-24"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
          >
            {children}
          </main>
          <BottomNav />
        </ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
