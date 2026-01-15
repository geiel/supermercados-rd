import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Términos y Condiciones",
  description:
    "Lee los términos y condiciones de uso de SupermercadosRD, tu comparador de precios de supermercados en República Dominicana.",
};

export default function TerminosPage() {
  return (
    <main className="container mx-auto px-4 py-8 max-w-3xl">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al inicio
      </Link>

      <h1 className="text-3xl font-bold mb-6">Términos y Condiciones</h1>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
        <p className="text-muted-foreground leading-relaxed">
          Última actualización: Enero 2026
        </p>

        <section>
          <h2 className="text-xl font-semibold mb-3">1. Aceptación de los Términos</h2>
          <p className="text-muted-foreground leading-relaxed">
            Al acceder y utilizar SupermercadosRD, aceptas estar sujeto a estos
            términos y condiciones de uso. Si no estás de acuerdo con alguna
            parte de estos términos, te pedimos que no utilices nuestro
            servicio.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">2. Descripción del Servicio</h2>
          <p className="text-muted-foreground leading-relaxed">
            SupermercadosRD es una plataforma de comparación de precios que
            recopila información de productos de diversos supermercados en
            República Dominicana. Nuestro servicio tiene como objetivo ayudar a
            los consumidores a tomar decisiones de compra informadas.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">3. Precisión de la Información</h2>
          <p className="text-muted-foreground leading-relaxed">
            Nos esforzamos por mantener la información de precios lo más
            actualizada y precisa posible. Sin embargo, los precios pueden
            variar y no garantizamos que la información mostrada sea siempre
            exacta o esté actualizada en tiempo real. Te recomendamos verificar
            los precios directamente con el supermercado antes de realizar tu
            compra.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">4. Uso Permitido</h2>
          <p className="text-muted-foreground leading-relaxed">
            Puedes utilizar SupermercadosRD para uso personal y no comercial.
            Está prohibido el uso automatizado de nuestro servicio para
            recopilar datos, así como cualquier uso que interfiera con el
            funcionamiento normal de la plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">5. Propiedad Intelectual</h2>
          <p className="text-muted-foreground leading-relaxed">
            Todo el contenido de SupermercadosRD, incluyendo pero no limitado a
            textos, gráficos, logos, iconos y software, está protegido por
            derechos de autor y otras leyes de propiedad intelectual.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">6. Limitación de Responsabilidad</h2>
          <p className="text-muted-foreground leading-relaxed">
            SupermercadosRD no se hace responsable por decisiones de compra
            basadas en la información proporcionada en nuestra plataforma. El
            uso de nuestro servicio es bajo tu propio riesgo.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">7. Modificaciones</h2>
          <p className="text-muted-foreground leading-relaxed">
            Nos reservamos el derecho de modificar estos términos en cualquier
            momento. Los cambios entrarán en vigor inmediatamente después de su
            publicación en esta página. El uso continuado del servicio después
            de cualquier modificación constituye tu aceptación de los nuevos
            términos.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">8. Contacto</h2>
          <p className="text-muted-foreground leading-relaxed">
            Si tienes preguntas sobre estos términos y condiciones, puedes
            contactarnos a través de nuestra plataforma.
          </p>
        </section>
      </div>
    </main>
  );
}
