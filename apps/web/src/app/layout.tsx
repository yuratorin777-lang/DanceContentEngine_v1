import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dance Content Engine",
  description: "AI content engine for DanceContentEngine_v1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full">
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}