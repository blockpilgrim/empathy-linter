import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const iaQuattro = localFont({
  src: [
    { path: "../fonts/iAWriterQuattroS-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/iAWriterQuattroS-Italic.woff2", weight: "400", style: "italic" },
    { path: "../fonts/iAWriterQuattroS-Bold.woff2", weight: "700", style: "normal" },
    { path: "../fonts/iAWriterQuattroS-BoldItalic.woff2", weight: "700", style: "italic" },
  ],
  variable: "--font-quattro",
  display: "swap",
});

const iaMono = localFont({
  src: [
    { path: "../fonts/iAWriterMonoS-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/iAWriterMonoS-Italic.woff2", weight: "400", style: "italic" },
    { path: "../fonts/iAWriterMonoS-Bold.woff2", weight: "700", style: "normal" },
    { path: "../fonts/iAWriterMonoS-BoldItalic.woff2", weight: "700", style: "italic" },
  ],
  variable: "--font-ia-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Empathy Linter",
  description: "Scan technical docs for assumed knowledge, unexplained jargon, and missing context.",
  openGraph: {
    title: "Empathy Linter",
    description:
      "AI-powered tool that scans technical documentation for assumed knowledge, unexplained jargon, and missing context.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${iaQuattro.variable} ${iaMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
