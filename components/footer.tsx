"use client";

import Link from "next/link";
import Image from "next/image";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="mt-auto"
      style={{
        background:
          "radial-gradient(120% 120% at 50% 0%, #4A2169 0%, #3A1857 60%, #2E1248 100%)",
      }}
    >
      <div className="container mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row gap-8 md:gap-12">
          {/* Left section - Logo and description */}
          <div className="md:flex-1">
            <Link href="/" className="inline-block mb-4">
              <Image
                src="/logo-white.svg"
                alt="SupermercadosRD"
                width={170}
                height={20}
              />
            </Link>
            <p className="text-base text-white/80 leading-relaxed max-w-md">
              SupermercadosRD es una plataforma independiente creada para ayudar
              a las personas a comprar de forma más inteligente.
            </p>
            <p className="text-base text-white/80 leading-relaxed max-w-md mt-3">
              Nuestra misión es ofrecer información clara y comparable sobre
              precios, cantidades y valor real de los productos en distintos
              supermercados de la República Dominicana, para que cada decisión
              de compra sea más informada y justa.
            </p>
          </div>

          {/* Right section - Links */}
          <div className="flex flex-col gap-3">
            <h3 className="text-base font-semibold text-white mb-1">Enlaces</h3>
            <Link
              href="/sobre-nosotros"
              className="text-base text-white/80 hover:text-white transition-colors"
            >
              Sobre Nosotros
            </Link>
            <Link
              href="/terminos"
              className="text-base text-white/80 hover:text-white transition-colors"
            >
              Términos y Condiciones
            </Link>
            <Link
              href="/privacidad"
              className="text-base text-white/80 hover:text-white transition-colors"
            >
              Política de Privacidad
            </Link>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-white/20 mt-8 pt-6">
          <p className="text-center text-base text-white/60">
            © {currentYear} SupermercadosRD. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
