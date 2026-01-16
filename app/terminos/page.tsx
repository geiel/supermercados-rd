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

        <p className="text-muted-foreground leading-relaxed">
          Al acceder y utilizar el sitio web y/o la aplicación SupermercadosRD
          (en adelante, &quot;la Plataforma&quot;), aceptas quedar sujeto a los
          presentes Términos y Condiciones. Si no estás de acuerdo con ellos,
          por favor no utilices la Plataforma.
        </p>

        <section>
          <h2 className="text-xl font-semibold mb-3">
            1. Descripción del Servicio
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            SupermercadosRD es una plataforma informativa de comparación que
            permite a los usuarios consultar y analizar precios, presentaciones,
            unidades y valores estimados de productos disponibles en distintos
            supermercados de la República Dominicana.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-2">
            SupermercadosRD:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-4">
            <li>No vende productos</li>
            <li>No procesa pagos</li>
            <li>No gestiona pedidos</li>
            <li>No representa ni actúa en nombre de supermercados</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            La Plataforma tiene como único objetivo apoyar la toma de decisiones
            de compra.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">
            2. Exactitud de la Información
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-2">
            Los precios, descripciones, imágenes, unidades y disponibilidad de
            productos mostrados en la Plataforma:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-4">
            <li>Pueden variar sin previo aviso</li>
            <li>
              Pueden no coincidir con los precios finales en tienda física u
              online
            </li>
            <li>
              Son estimaciones basadas en información disponible públicamente y
              en procesos internos de análisis
            </li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mb-2">
            SupermercadosRD no garantiza:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-4">
            <li>La exactitud absoluta de los precios</li>
            <li>La disponibilidad real de los productos</li>
            <li>La vigencia de ofertas, descuentos o promociones</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed font-medium">
            El precio final y las condiciones de compra siempre son determinados
            por el supermercado correspondiente.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">
            3. Relación con Supermercados y Marcas
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-2">
            SupermercadosRD:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-4">
            <li>
              No está afiliado, patrocinado ni aprobado por ningún supermercado
            </li>
            <li>No es un canal oficial de ventas</li>
            <li>No utiliza logotipos oficiales sin autorización</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            Los nombres comerciales, marcas y referencias a supermercados se
            utilizan únicamente con fines descriptivos e informativos.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">
            4. Uso Permitido de la Plataforma
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-2">
            El usuario puede utilizar SupermercadosRD para:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-4">
            <li>Comparar precios y presentaciones</li>
            <li>Crear listas personales</li>
            <li>Analizar valor por unidad, peso o volumen</li>
            <li>Consultar información con fines personales y no comerciales</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mb-2">
            El usuario no puede:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>
              Copiar, extraer o redistribuir datos de forma masiva con fines
              comerciales
            </li>
            <li>
              Utilizar bots, scrapers o automatizaciones sin autorización
            </li>
            <li>
              Intentar vulnerar la seguridad o el funcionamiento de la
              Plataforma
            </li>
            <li>Usar el servicio para fines ilegales o fraudulentos</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">
            5. Cuentas de Usuario
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-2">
            Al registrarse en la Plataforma, el usuario se compromete a:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-4">
            <li>Proporcionar información veraz</li>
            <li>Mantener la confidencialidad de sus credenciales</li>
            <li>
              Ser responsable de toda actividad realizada desde su cuenta
            </li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mb-2">
            SupermercadosRD se reserva el derecho de:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Suspender o cancelar cuentas por uso indebido</li>
            <li>Eliminar cuentas fraudulentas o inactivas</li>
            <li>Limitar funcionalidades según el tipo de cuenta</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">
            6. Contenido del Usuario
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-2">
            Cuando el usuario crea listas, guarda productos o interactúa con la
            Plataforma:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-4">
            <li>El contenido sigue siendo propiedad del usuario</li>
            <li>
              El usuario concede a SupermercadosRD una licencia no exclusiva
              para usar dicho contenido de forma interna con el fin de mejorar
              el servicio
            </li>
            <li>No se publicará información personal sin consentimiento</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            Actualmente, SupermercadosRD no permite la carga manual de precios
            por parte de los usuarios.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">
            7. Propiedad Intelectual
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-2">
            Todo el contenido propio de la Plataforma, incluyendo pero no
            limitado a:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-4">
            <li>Código</li>
            <li>Diseño</li>
            <li>Estructura</li>
            <li>Algoritmos</li>
            <li>Textos y funcionalidades</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mb-4">
            es propiedad de SupermercadosRD y está protegido por las leyes de
            propiedad intelectual.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Las marcas, nombres comerciales e imágenes de terceros pertenecen a
            sus respectivos propietarios.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">
            8. Limitación de Responsabilidad
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-2">
            SupermercadosRD no será responsable por:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-4">
            <li>Decisiones de compra tomadas por el usuario</li>
            <li>Diferencias de precio entre la Plataforma y el supermercado</li>
            <li>Errores, omisiones o datos desactualizados</li>
            <li>
              Daños directos o indirectos derivados del uso de la Plataforma
            </li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            El uso del servicio es bajo la responsabilidad exclusiva del
            usuario.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">
            9. Disponibilidad del Servicio
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-2">
            SupermercadosRD puede:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-4">
            <li>Modificar funcionalidades en cualquier momento</li>
            <li>Interrumpir temporal o permanentemente el servicio</li>
            <li>Actualizar la Plataforma sin previo aviso</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            No se garantiza disponibilidad continua ni ausencia de errores.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">
            10. Privacidad y Protección de Datos
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            El tratamiento de los datos personales del usuario se rige por la{" "}
            <Link
              href="/privacidad"
              className="text-primary hover:underline"
            >
              Política de Privacidad
            </Link>{" "}
            de SupermercadosRD, la cual forma parte integral de estos Términos y
            Condiciones.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">
            11. Modificaciones de los Términos
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            SupermercadosRD se reserva el derecho de modificar estos Términos y
            Condiciones en cualquier momento.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            El uso continuado de la Plataforma después de dichas modificaciones
            implica la aceptación de los nuevos términos.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">12. Contacto</h2>
          <p className="text-muted-foreground leading-relaxed">
            Para consultas, reclamos o soporte, puedes contactarnos en:{" "}
            <a
              href="mailto:contacto@supermercadosrd.com"
              className="text-primary hover:underline"
            >
              contacto@supermercadosrd.com
            </a>
          </p>
        </section>

        <section className="border-t pt-6 mt-8">
          <p className="text-muted-foreground leading-relaxed italic">
            SupermercadosRD es una herramienta informativa que no reemplaza la
            información oficial provista por los supermercados.
          </p>
        </section>
      </div>
    </main>
  );
}
