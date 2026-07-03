import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { PwaRegister } from "@/components/PwaRegister";
import { FinanceBackground } from "@/components/ahorrapp/FinanceBackground";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const nunito = Nunito({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "AhorrApp - Controla tus finanzas",
  description: "Controla tus finanzas de forma inteligente. Registra gastos, planifica presupuestos y ahorra con ayuda de IA.",
  keywords: ["finanzas", "presupuesto", "ahorros", "gastos", "control financiero"],
  authors: [{ name: "AhorrApp" }],
  manifest: "/manifest.json",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💰</text></svg>",
    apple: "/logo.svg",
  },
  appleWebApp: {
    capable: true,
    title: "AhorrApp",
    statusBarStyle: "default",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${fredoka.variable} ${nunito.variable} relative isolate antialiased bg-background text-foreground`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <FinanceBackground />
          <div className="relative z-10">
            {children}
            <PwaRegister />
            <Toaster richColors position="top-right" />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
