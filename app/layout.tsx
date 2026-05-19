import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SWELL",
  description: "Ditch's internal operating system.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
