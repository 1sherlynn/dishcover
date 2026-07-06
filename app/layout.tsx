import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito_Sans } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["SOFT", "WONK", "opsz"],
});

const nunito = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: "Dishcover",
  description:
    "Turn what's already in your kitchen into recipes — with honest nutrition, every time.",
};

export const viewport: Viewport = {
  themeColor: "#faf3e8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="hearth">
      <body className={`${fraunces.variable} ${nunito.variable}`}>
        <div className="atmosphere" />
        <div className="mx-auto min-h-dvh w-full max-w-2xl px-5 pb-28 pt-6 md:px-6">
          {children}
        </div>
      </body>
    </html>
  );
}
