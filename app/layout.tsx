import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { HeaderSearchSlot } from "@/components/header-search-slot";
import { Button } from "@/components/ui/button";
import { LogOut, NotepadText, User } from "lucide-react";
import { LogOutUser } from "@/lib/authentication";
import { LoginDialog } from "@/components/login-dialog";
import Link from "next/link";
import { getUser } from "@/lib/supabase";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/sonner";
import { Footer } from "@/components/footer";
import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import Image from "next/image";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://supermercadosrd.com"),
  title: {
    default: "SupermercadosRD - Compara precios de supermercados en RD",
    template: "%s",
  },
  description:
    "Compara precios de productos en supermercados de República Dominicana. Encuentra las mejores ofertas en Sirena, Nacional, Jumbo, Bravo y más.",
  keywords: [
    "supermercados",
    "precios",
    "ofertas",
    "República Dominicana",
    "comparador de precios",
    "Sirena",
    "Nacional",
    "Jumbo",
    "Bravo",
    "Plaza Lama",
    "PriceSmart",
  ],
  authors: [{ name: "SupermercadosRD" }],
  creator: "SupermercadosRD",
  openGraph: {
    type: "website",
    locale: "es_DO",
    url: "https://supermercadosrd.com",
    siteName: "SupermercadosRD",
    title: "SupermercadosRD - Compara precios de supermercados",
    description:
      "Compara precios de productos en supermercados de República Dominicana.",
  },
  twitter: {
    card: "summary_large_image",
    title: "SupermercadosRD - Compara precios de supermercados",
    description:
      "Compara precios de productos en supermercados de República Dominicana.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://supermercadosrd.com",
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "SupermercadosRD",
  url: "https://supermercadosrd.com",
  description:
    "Comparador de precios de supermercados en República Dominicana",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://supermercadosrd.com/explorar/{search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "SupermercadosRD",
  url: "https://supermercadosrd.com",
  logo: "https://supermercadosrd.com/logo.svg",
  description:
    "Plataforma de comparación de precios de supermercados en República Dominicana",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="es">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c"),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <header className="h-[70px]">
            <div className="px-2 py-2 container mx-auto">
              <div className="flex items-center">
                <div className="flex-none">
                  <Link href="/">
                    <Image src="/logo.svg" alt="logo" width={170} height={20} />
                  </Link>
                </div>
                <div className="flex gap-2 grow justify-end items-center">
                  <Suspense>
                    <HeaderSearchSlot />
                  </Suspense>

                  <Button variant="outline" size="icon-lg" asChild>
                    <Link href="/lists">
                        <NotepadText />
                    </Link>
                  </Button>
                  <Suspense fallback={<Button size="icon-lg"><Spinner /></Button>}>
                    <LogInLogOut />
                  </Suspense>
                </div>
              </div>
            </div>
          </header>
          {children}
          <Footer />
          <Toaster richColors position="top-center" />
        </Providers>
      </body>
    </html>
  );
}

async function LogInLogOut() {
  const user = await getUser();

  if (!user) {
    return (
      <LoginDialog />
    )
  }

  const userName = user.user_metadata.name;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon-lg">
          <User />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-40" align="end">
        <DropdownMenuLabel>{userName ? userName : 'Mi Cuenta'}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={LogOutUser}>
          <LogOut />
          Salir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
