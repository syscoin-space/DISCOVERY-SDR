import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Discovery SDR — CRM de Prospecção",
  description:
    "CRM de prospecção para SDRs de retenção e-commerce. Kanban, Score de Potencial, ICP, Cadências.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Discovery SDR",
  },
  icons: {
    icon: "/api/favicon",
    apple: "/icon-192.png",
  },
  openGraph: {
    title: "Discovery SDR — CRM de Prospecção",
    description:
      "CRM de prospecção para SDRs de retenção e-commerce. Kanban, Score de Potencial, ICP, Cadências.",
    type: "website",
    images: [{ url: "/icon-512.png", width: 512, height: 512 }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2E86AB",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
