import type { Metadata } from "next";
import { Geist, Figtree } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ConversaAISupportWidget } from "@/components/ConversaAISupportWidget"

const figtree = Figtree({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://conversaai.store"),
  title: "ConversaAI | Asistentes IA para atención y leads",
  description:
    "Crea asistentes de inteligencia artificial para atender clientes, responder preguntas frecuentes y capturar leads desde tu sitio web.",
  icons: {
    icon: [
      { url: "/logo.png", sizes: "any" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/logo.png",
    shortcut: "/logo.png",
  },
  openGraph: {
    title: "ConversaAI — Automatiza tus conversaciones",
    description:
      "Crea asistentes de IA para responder clientes, captar prospectos y vender más.",
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
      className={cn("h-full", "antialiased", geistSans.variable, "font-sans", figtree.variable)}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <ConversaAISupportWidget />
      </body>
    </html>
  );
}
