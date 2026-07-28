import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Providers } from "@/components/Providers";
import { RegisterServiceWorker } from "@/components/RegisterServiceWorker";
import { SoundInit } from "@/components/SoundInit";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Hong Kong Mahjong",
  description: "Solo Hong Kong-style mahjong against intermediate bots",
  // Next strips basePath from the manifest href on static export, so it lands
  // at the site root -- fine, because the iOS fullscreen path (below) relies
  // on the apple meta tag, not the manifest. Android install is the only thing
  // the manifest gates, and that's a non-goal here.
  manifest: "/manifest.webmanifest",
  // Makes "Add to Home Screen" launch the app chrome-free (fullscreen) on
  // iOS -- the only way to get fullscreen there, since iOS Safari can't
  // fullscreen a web element.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mahjong",
  },
  other: { "mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: "#14663d",
  // Edge-to-edge under the notch/home indicator when launched standalone.
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <RegisterServiceWorker />
        <SoundInit />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
