import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Nexty Labs ERP",
    template: "%s | Nexty Labs ERP",
  },
  description:
    "Sistem ERP untuk mengelola proyek, pelanggan, keuangan, dan sumber daya manusia dalam satu ruang kerja.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
