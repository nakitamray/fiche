import type { Metadata } from "next";
import localFont from "next/font/local";
import { Newsreader } from "next/font/google";
import { Shell } from "@/components/Shell";
import { LibraryProvider } from "@/lib/store";
import "./globals.css";

const display = localFont({
  src: "../../public/fonts/BlackGoose.otf",
  variable: "--font-display",
  display: "swap",
});

const mono = localFont({
  src: "../../public/fonts/MarklMono-Regular.otf",
  variable: "--font-mono",
  display: "swap",
});

const script = localFont({
  src: "../../public/fonts/PerfectoCalligraphy.ttf",
  variable: "--font-script",
  display: "swap",
});

const serif = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "fiche",
  description: "recipes under version control. baker's math, branches, diffs, and a cookbook that compiles itself.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable} ${script.variable} ${serif.variable}`}>
      <body className="font-serif">
        <LibraryProvider>
          <Shell>{children}</Shell>
        </LibraryProvider>
      </body>
    </html>
  );
}
