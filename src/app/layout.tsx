import type { Metadata } from "next";

import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/providers/session-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { PostHogProvider } from "@/components/providers/posthog-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Codepylot — AI Sprint Board for Indie Hackers",
  description:
    "Think it. Ship it. AI-powered sprint board that turns your ideas into shipped code. Describe what you want — AI agents write the code for you.",
  manifest: "/manifest.json",
  themeColor: "#7c3aed",
  metadataBase: new URL("https://codepylot.io"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Codepylot",
    title: "Codepylot — AI Sprint Board for Indie Hackers",
    description:
      "Describe what you want built. AI structures it into stories, agents write the code, and you review and ship.",
    url: "https://codepylot.io",
    locale: "en_US",
    images: [
      {
        url: "https://codepylot.io/api/og?title=Codepylot&subtitle=AI-powered+sprint+board+that+turns+your+ideas+into+shipped+code",
        width: 1200,
        height: 630,
        alt: "Codepylot — AI Sprint Board",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Codepylot — AI Sprint Board for Indie Hackers",
    description:
      "AI-powered sprint board that turns your ideas into shipped code. Agents write the code for you.",
    creator: "@codepylot",
    images: [
      "https://codepylot.io/api/og?title=Codepylot&subtitle=AI-powered+sprint+board+that+turns+your+ideas+into+shipped+code",
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Codepylot",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>

        <ThemeProvider>
          <AuthProvider>
            <PostHogProvider>
              <TooltipProvider>
                {children}
                <Toaster />
              </TooltipProvider>
            </PostHogProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
