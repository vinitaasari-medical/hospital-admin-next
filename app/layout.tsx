import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/providers";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "MedicalCircles Admin",
  description: "Hospital Administration Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          {children}
          <Toaster />
          <Sonner />
        </Providers>
      </body>
    </html>
  );
}
