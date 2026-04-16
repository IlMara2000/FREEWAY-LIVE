'use client'
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="h-full scroll-smooth">
      <head>
        {/* CONFIGURAZIONE PWA & MOBILE OPTIMIZATION */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#10b981" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        
        {/* Titolo di fallback se non caricato dai metadati */}
        <title>Freeway-Life | Focus Hub</title>
        <meta name="description" content="Webapp per potenziare il focus e superare le sfide dell'ADHD" />
        
        {/* Prevenzione Zoom automatico su input (ottimo per mobile) */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" /> 
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-full flex flex-col bg-black text-white antialiased`}
      >
        {children}
      </body>
    </html>
  );
}