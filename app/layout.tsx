import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Courier_Prime, Caveat } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
});

const courier = Courier_Prime({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-courier",
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
});

export const metadata: Metadata = {
  title: "Dishcover",
  description:
    "Turn what's already in your kitchen into recipes — with honest nutrition, every time.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Dishcover",
  },
};

export const viewport: Viewport = {
  themeColor: "#faf3e3",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="riso">
      <body className={`${bricolage.variable} ${courier.variable} ${caveat.variable}`}>
        <div className="atmosphere" />
        <div className="mx-auto min-h-dvh w-full max-w-[640px] px-5 pb-28 pt-6 md:px-6">
          {children}
        </div>
      </body>
    </html>
  );
}
