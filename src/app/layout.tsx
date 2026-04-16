import { Lexend, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import type { Metadata, Viewport } from "next";

// Configurazione Font Premium
const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Freeway-Life | Focus Hub",
  description: "Webapp per potenziare il focus e superare le sfide dell'ADHD",
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Freeway-Life",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#10b981",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="h-full scroll-smooth">
      <body
        className={`${lexend.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} min-h-full flex flex-col bg-black text-white antialiased`}
      >
        {children}
      </body>
    </html>
  );
}