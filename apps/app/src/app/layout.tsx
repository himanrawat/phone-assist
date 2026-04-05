import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/lib/providers";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Phone Assistant",
  description: "AI-Powered Phone Assistant Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("dark h-full antialiased", "font-sans", geist.variable)} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-svh">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
