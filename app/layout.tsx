import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "./providers/Web3Provider";
import { AudioInitializer } from "./components/AudioInitializer";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({ subsets: ["latin"] });

// Force dynamic rendering for all pages due to Web3Modal
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Chase - Crypto Game",
  description: "A fast-paced multiplayer chase game with crypto wallet integration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Web3Provider>
          <AudioInitializer />
          {children}
          <Analytics />
        </Web3Provider>
      </body>
    </html>
  );
}
