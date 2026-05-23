import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://conversaai.store"),
  title: "ConversaAI — Asistentes de IA para tu negocio",
  description:
    "Crea asistentes de inteligencia artificial personalizados para automatizar conversaciones, captar leads y atender clientes las 24 horas.",
  icons: {
    icon: [
      { url: "/logo.png", sizes: "any" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/logo.png",
    shortcut: "/logo.png",
  },
  openGraph: {
    title: "ConversaAI — Asistentes de IA para tu negocio",
    description:
      "Automatiza conversaciones, capta leads y atiende clientes con IA. Sin código.",
    url: "https://conversaai.store",
    siteName: "ConversaAI",
    images: [{ url: "/logo.png" }],
    locale: "es_MX",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
