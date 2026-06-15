import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Column Management",
  description: "QC laboratory column lifecycle management"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
