import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { cn } from "@/lib/utils";
import { Background } from "@/components/ui/backgroud";
import { WalletProvider } from "./context/WalletContext";
import { Toaster } from "@/components/ui/toaster"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "跳格子大冒险",
  description: "跳格子大冒险——探索PlatON生态里程，赢取惊喜奖励！",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cn(
          `${geistSans.variable} ${geistMono.variable} min-h-screen antialiased overflow-y-auto scrollbar-hide`
        )}
      >
        <WalletProvider>
          <div className="w-full min-h-[6vh]">
            <Navbar />
          </div>
          <Background />
          {children}
          <Toaster />
        </WalletProvider>
      </body>
    </html>
  );
}
