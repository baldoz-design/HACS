import type { Metadata } from "next";
import { Fragment_Mono, Instrument_Sans, Instrument_Serif } from "next/font/google";
import { AppNav } from "@/components/AppNav";
import "./globals.css";

const sansFont = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-bending-sans",
  display: "swap",
});

const serifFont = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-bending-serif",
  display: "swap",
});

const monoFont = Fragment_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-bending-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HACS Intelligence",
  description: "Entity intelligence map for the HACS framework contract",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sansFont.variable} ${serifFont.variable} ${monoFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppNav />
        {children}
      </body>
    </html>
  );
}
