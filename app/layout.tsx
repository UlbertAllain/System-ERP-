import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "NEXTY ERP",
  description: "Internal ERP system for NEXTY Labs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
