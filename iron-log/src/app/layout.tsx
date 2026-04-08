import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Felippe's Log",
  description: "Upper/Lower workout tracker with double progression",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
