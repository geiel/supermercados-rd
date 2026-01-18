import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Sobre Nosotros | SupermercadosRD",
  description:
    "Conoce más sobre SupermercadosRD, tu comparador de precios de supermercados en República Dominicana.",
};

export default function SobreNosotrosPage() {
  return (
    <main className="container mx-auto px-4 py-8 max-w-3xl">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al inicio
      </Link>

      <h1 className="text-3xl font-bold mb-6">Sobre Nosotros</h1>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-3">¿Quiénes somos?</h2>
          <p className="text-muted-foreground leading-relaxed">
            SupermercadosRD es una plataforma dedicada a ayudar a los
            consumidores dominicanos a tomar decisiones de compra más
            inteligentes. Comparamos precios de productos en los principales
            supermercados de República Dominicana para que puedas encontrar las
            mejores ofertas y ahorrar dinero en tus compras del hogar.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Nuestra Misión</h2>
          <p className="text-muted-foreground leading-relaxed">
            Nuestra misión es democratizar el acceso a la información de precios
            y empoderar a los consumidores dominicanos con herramientas que les
            permitan optimizar su presupuesto familiar. Creemos que todos
            merecen acceso a información clara y actualizada sobre los precios
            de los productos que consumen a diario.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">¿Cómo funciona?</h2>
          <p className="text-muted-foreground leading-relaxed">
            Recopilamos y actualizamos constantemente los precios de miles de
            productos de los supermercados más populares del país, incluyendo
            Sirena, Nacional, Jumbo, Bravo, Plaza Lama, PriceSmart y más.
            Nuestra plataforma te permite buscar productos, comparar precios
            entre tiendas y crear listas de compras para planificar mejor tus
            visitas al supermercado.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Contacto</h2>
          <p className="text-muted-foreground leading-relaxed">
            ¿Tienes preguntas, sugerencias o comentarios? Nos encantaría
            escucharte. Visita nuestra página de{" "}
            <Link href="/contacto" className="text-primary hover:underline">
              contacto
            </Link>{" "}
            para ver los canales disponibles.
          </p>
        </section>
      </div>
    </main>
  );
}
