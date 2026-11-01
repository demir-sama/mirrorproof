import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono, Manrope } from "next/font/google";
import "./globals.css";

const serif = Fraunces({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-serif", axes: ["SOFT", "opsz"] });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
const sans = Manrope({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Mirrorproof: is your skincare actually working?",
  description: "Run a measured trial on any skincare product with YouCam Skin AI, and get a keep-or-return verdict before the return window closes.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${serif.variable} ${mono.variable} ${sans.variable} antialiased`}>{children}</body>
    </html>
  );
}
