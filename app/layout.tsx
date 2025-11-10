import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "./providers/Web3Provider";
import { SocketProvider } from "./providers/SocketProvider";
import { AudioInitializer } from "./components/AudioInitializer";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({ subsets: ["latin"] });

// Force dynamic rendering for all pages due to Web3Modal
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Chase - Crypto Game",
  description: "A fast-paced multiplayer chase game with crypto wallet integration",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <style dangerouslySetInnerHTML={{ __html: `
          @media screen and (max-width: 768px) {
            body {
              overflow: hidden;
            }
          }
        `}} />
      </head>
      <body className={inter.className}>
        <Web3Provider>
          <SocketProvider>
            <AudioInitializer />
            {children}
            <Analytics />
          </SocketProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
