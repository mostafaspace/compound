import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Cairo } from "next/font/google";
import "./globals.css";
import { PermissionProviderWrapper } from "@/components/permission-provider-wrapper";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/toast";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const cairo = Cairo({
  variable: "--font-sans",
  subsets: ["arabic"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Compound Admin",
  description: "Operations console for compound management.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  
  const sansFont = locale === "ar" ? cairo.variable : geistSans.variable;

  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className={`${sansFont} ${geistMono.variable}`} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <PermissionProviderWrapper>
              <ToastProvider>
                {children}
              </ToastProvider>
            </PermissionProviderWrapper>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
