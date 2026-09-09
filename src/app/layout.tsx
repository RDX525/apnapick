import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Instrument_Serif } from "next/font/google";
import { AdaptiveSiteChrome } from "@/components/layout/adaptive-site-chrome";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/toast";
import "./globals.css";

const geist = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const instrument = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ApnaPick — Intent-first local discovery",
    template: "%s · ApnaPick",
  },
  description:
    "Search Pune by dish, service, or budget on ApnaPick.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.NODE_ENV === "production"
        ? "https://apnapick.com"
        : "http://localhost:3000"),
  ),
  openGraph: {
    siteName: "ApnaPick",
    locale: "en_IN",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fc" },
    { media: "(prefers-color-scheme: dark)", color: "#070a13" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en-IN"
      className={`${geist.variable} ${instrument.variable} min-h-dvh`}
      suppressHydrationWarning
    >
      <body className="relative flex min-h-dvh flex-col font-sans">
        <ThemeProvider>
          <a
            href="#main-content"
            className="focus:bg-primary focus:text-primary-foreground sr-only focus:not-sr-only focus:absolute focus:[top:max(0.75rem,env(safe-area-inset-top))] focus:[left:max(0.75rem,env(safe-area-inset-left))] focus:z-[100] focus:rounded-lg focus:px-3 focus:py-2 focus:text-sm"
          >
            Skip to content
          </a>
          <AdaptiveSiteChrome>{children}</AdaptiveSiteChrome>
          <Toaster
            position="top-right"
            closeButton
            offset={{
              top: "max(1rem, env(safe-area-inset-top))",
              right: "max(1rem, env(safe-area-inset-right))",
            }}
            mobileOffset={{
              top: "max(1rem, env(safe-area-inset-top))",
              right: "max(0.75rem, env(safe-area-inset-right))",
              left: "max(0.75rem, env(safe-area-inset-left))",
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
