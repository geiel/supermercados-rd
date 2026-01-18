import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Política de Privacidad | SupermercadosRD",
  description:
    "Conoce cómo SupermercadosRD protege tu privacidad y maneja tus datos personales.",
};

export default function PrivacidadPage() {
  return (
    <main className="container mx-auto px-4 py-8 max-w-3xl">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al inicio
      </Link>

      <h1 className="text-3xl font-bold mb-6">Política de Privacidad</h1>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
        <p className="text-muted-foreground leading-relaxed">
          Última actualización: Enero 2026
        </p>

        <section>
          <h2 className="text-xl font-semibold mb-3">1. Información que Recopilamos</h2>
          <p className="text-muted-foreground leading-relaxed">
            En SupermercadosRD, recopilamos información que nos proporcionas
            directamente cuando utilizas nuestro servicio, como cuando creas una
            cuenta, guardas listas de compras o nos contactas. Esta información
            puede incluir tu nombre, dirección de correo electrónico y
            preferencias de compra.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">2. Uso de la Información</h2>
          <p className="text-muted-foreground leading-relaxed">
            Utilizamos la información recopilada para:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-2">
            <li>Proporcionar y mejorar nuestros servicios</li>
            <li>Personalizar tu experiencia en la plataforma</li>
            <li>Guardar tus listas de compras y preferencias</li>
            <li>Comunicarnos contigo sobre actualizaciones del servicio</li>
            <li>Analizar el uso de la plataforma para mejorarla</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">3. Cookies y Tecnologías Similares</h2>
          <p className="text-muted-foreground leading-relaxed">
            Utilizamos cookies y tecnologías similares para mejorar tu
            experiencia, recordar tus preferencias y analizar cómo se utiliza
            nuestra plataforma. Puedes configurar tu navegador para rechazar
            cookies, aunque esto puede afectar algunas funcionalidades del
            servicio.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">4. Compartir Información</h2>
          <p className="text-muted-foreground leading-relaxed">
            No vendemos ni compartimos tu información personal con terceros para
            fines de marketing. Podemos compartir información con proveedores de
            servicios que nos ayudan a operar la plataforma, siempre bajo
            estrictas obligaciones de confidencialidad.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">5. Seguridad de los Datos</h2>
          <p className="text-muted-foreground leading-relaxed">
            Implementamos medidas de seguridad técnicas y organizativas para
            proteger tu información personal contra acceso no autorizado,
            alteración, divulgación o destrucción.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">6. Tus Derechos</h2>
          <p className="text-muted-foreground leading-relaxed">
            Tienes derecho a acceder, corregir o eliminar tu información
            personal. También puedes solicitar una copia de los datos que
            tenemos sobre ti. Para ejercer estos derechos, contáctanos a través
            de nuestra plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">7. Retención de Datos</h2>
          <p className="text-muted-foreground leading-relaxed">
            Conservamos tu información personal solo durante el tiempo necesario
            para cumplir con los propósitos descritos en esta política, a menos
            que la ley requiera o permita un período de retención más largo.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">8. Cambios a esta Política</h2>
          <p className="text-muted-foreground leading-relaxed">
            Podemos actualizar esta política de privacidad periódicamente. Te
            notificaremos sobre cambios significativos publicando la nueva
            política en esta página y actualizando la fecha de última
            modificación.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">9. Contacto</h2>
          <p className="text-muted-foreground leading-relaxed">
            Si tienes preguntas sobre esta política de privacidad o sobre cómo
            manejamos tu información, no dudes en contactarnos a través de
            nuestra plataforma.
          </p>
        </section>
      </div>
    </main>
  );
}
