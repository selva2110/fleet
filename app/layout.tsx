import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/context/tooltip-provdier";
import {
  ThemeProvider,
  themeInitScript,
} from "@/components/context/theme-provider";
import "./globals.css";
import { LanguageProvider } from "@/components/context/language-provider";
import Script from "next/script";
import { NotificationProvider } from "@/components/context/notification-provider";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "CareVoy | Event Transportation Management",
  description:
    "Smart Vehicles Event Transportation Management Platform for coordinating participant transport to healthcare and community events.",
  generator: "v0.app",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
    shortcut: "/favicon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} bg-background`}
      suppressHydrationWarning
    >
      <head>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body className="font-sans antialiased">
        <LanguageProvider>
          <ThemeProvider>
            <NotificationProvider>
              <TooltipProvider delay={200}>{children}</TooltipProvider>
            </NotificationProvider>
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
