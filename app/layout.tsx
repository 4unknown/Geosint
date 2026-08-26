import type { Metadata } from "next";
import { Rajdhani, Share_Tech_Mono } from "next/font/google";
import "./globals.css";
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'leaflet/dist/leaflet.css';

const rajdhani = Rajdhani({
  weight: ["300", "500", "700"],
  subsets: ["latin"],
  variable: "--font-ui",
});

const shareTechMono = Share_Tech_Mono({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Geosint",
  description: "Geosint Challenge",
  icons: {
    icon: "/favicon.PNG",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${rajdhani.variable} ${shareTechMono.variable}`}>
      <body className="bg-[#070a10] text-[#e4eaf4] font-sans overflow-hidden h-screen w-screen selection:bg-[#00e68a] selection:text-black">
        {children}
      </body>
    </html>
  );
}
