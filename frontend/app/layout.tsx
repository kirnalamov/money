import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./layout.css";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/components/i18n-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";

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
    { media: "(prefers-color-scheme: light)", color: "#00C853" },
    { media: "(prefers-color-scheme: dark)", color: "#00C853" }
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-sans antialiased")} suppressHydrationWarning>
        <AuthProvider>
          <I18nProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem
              disableTransitionOnChange
            >
              <div className="flex min-h-screen flex-col">
                <Sidebar />
                <main id="main-content" className="app-main min-w-0 flex-1 pb-16 md:pb-0">
                  <div className="mx-auto w-full max-w-[1600px] p-4 md:px-8 md:py-6 xl:px-10">
                    {children}
                  </div>
                </main>
                <MobileNav />
              </div>
            </ThemeProvider>
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
