import { Badge } from "@/components/ui/badge";
import { db } from "@/db";
import Image from "next/image";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;

  const product = await db.query.products.findFirst({
    where: (products, { eq }) => eq(products.id, Number(id)),
    with: {
      shopCurrentPrices: true,
    },
  });

  if (!product) {
    return <div>Producto no encontrado.</div>;
  }

  return (
    <div className="container mx-auto">
      <div className="flex flex-1 gap-6 p-4">
        <section className="flex flex-row md:flex-col gap-1">
          <div className="font-semibold text-3xl">{product.name}</div>
          <Badge>{product.unit}</Badge>
          <div className="px-4 py-8">
            {product.image ? (
              <Image
                src={product.image}
                width={500}
                height={200}
                alt={product.name + product.unit}
              />
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
