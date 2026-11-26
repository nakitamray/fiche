import type { Metadata } from "next";
import localFont from "next/font/local";
import { Shell } from "@/components/Shell";
import { LibraryProvider } from "@/lib/store";
import "./globals.css";

const serif = localFont({
  src: [
    { path: "../../public/fonts/InstrumentSerif-Regular.ttf", style: "normal", weight: "400" },
    { path: "../../public/fonts/InstrumentSerif-Italic.ttf", style: "italic", weight: "400" },
  ],
  variable: "--font-serif",
  display: "swap",
});

const cond = localFont({
  src: "../../public/fonts/ArchivoNarrow-Variable.ttf",
  weight: "400 700",
  variable: "--font-cond",
  display: "swap",
});

export const metadata: Metadata = {
  title: "fiche",
  description: "recipes under version control. baker's math, branches, diffs, and a cookbook that compiles itself.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${cond.variable}`}>
      <body className="font-serif">
        <LibraryProvider>
          <Shell>{children}</Shell>
        </LibraryProvider>
      </body>
    </html>
  );
}
