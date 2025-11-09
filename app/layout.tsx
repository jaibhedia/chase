import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "./providers/Web3Provider";
import { AudioInitializer } from "./components/AudioInitializer";

const inter = Inter({ subsets: ["latin"] });

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
        </Web3Provider>
      </body>
    </html>
  );
}
