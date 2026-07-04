import type { Metadata, Viewport } from "next";
import { MonitorSmartphone } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Column Management",
  description: "QC laboratory column lifecycle management"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="mobile-block" role="alert">
          <MonitorSmartphone size={40} />
          <h1>Desktop only</h1>
          <p>Column Management is designed for laboratory workstations and isn&apos;t supported on phones or small tablets. Please open it on a desktop or laptop browser.</p>
        </div>
        <div className="app-root">{children}</div>
      </body>
    </html>
  );
}
