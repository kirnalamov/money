import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/components/i18n-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { PrefsSync } from "@/components/prefs-sync";
import { AppShell } from "@/components/layout/app-shell";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Plutus",
  description: "Multi-account personal finance & investment dashboard",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0E0F0E" },
    { media: "(prefers-color-scheme: dark)", color: "#0E0F0E" }
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.className
        )}
        suppressHydrationWarning
      >
        <AuthProvider>
          <PrefsSync />
          <I18nProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              forcedTheme="dark"
              disableTransitionOnChange
            >
              <AppShell>{children}</AppShell>
            </ThemeProvider>
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
