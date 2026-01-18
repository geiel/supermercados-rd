import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Contacto | SupermercadosRD",
  description:
    "Ponte en contacto con SupermercadosRD para consultas, sugerencias o soporte.",
};

export default function ContactoPage() {
  return (
    <main className="container mx-auto px-4 py-8 max-w-3xl">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al inicio
      </Link>

      <h1 className="text-3xl font-bold mb-6">Contacto</h1>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-3">Estamos para ayudarte</h2>
          <p className="text-muted-foreground leading-relaxed">
            ¿Tienes preguntas, sugerencias o reportes? Escríbenos y con gusto te
            responderemos.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Correo</h2>
          <p className="text-muted-foreground leading-relaxed">
            <a
              href="mailto:contacto@supermercadosrd.com"
              className="text-primary hover:underline"
            >
              contacto@supermercadosrd.com
            </a>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Instagram</h2>
          <p className="text-muted-foreground leading-relaxed">
            <a
              href="https://www.instagram.com/superrepdom/"
              className="text-primary hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              @superrepdom
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
