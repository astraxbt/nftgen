import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NFTGen — Animated APNG Studio",
  description: "Upload trait spritesheets and generate layered animated NFTs (APNG) in your browser.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="text-slate-100 antialiased">{children}</body>
    </html>
  );
}
