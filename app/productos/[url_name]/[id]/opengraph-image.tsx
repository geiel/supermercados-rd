import { ImageResponse } from "next/og";
import { db } from "@/db";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const product = await db.query.products.findFirst({
    columns: { name: true, unit: true, image: true },
    where: (products, { eq }) => eq(products.id, Number(id)),
    with: {
      shopCurrentPrices: {
        columns: { currentPrice: true },
        where: (scp, { isNull, eq, or }) =>
          or(isNull(scp.hidden), eq(scp.hidden, false)),
        orderBy: (prices, { asc }) => [asc(prices.currentPrice)],
        limit: 1,
      },
      brand: { columns: { name: true } },
    },
  });

  if (!product) {
    return new ImageResponse(
      (
        <div
          style={{
            fontSize: 48,
            background: "linear-gradient(135deg, #4A2169 0%, #2E1248 100%)",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
          }}
        >
          Producto no encontrado
        </div>
      ),
      { ...size }
    );
  }

  const lowestPrice = product.shopCurrentPrices[0]?.currentPrice;

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 32,
          background: "linear-gradient(135deg, #4A2169 0%, #2E1248 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          padding: "40px",
          color: "white",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            gap: "40px",
          }}
        >
          {/* Product Image */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "400px",
              height: "400px",
              background: "white",
              borderRadius: "20px",
              flexShrink: 0,
            }}
          >
            {product.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.image}
                alt={product.name}
                width={350}
                height={350}
                style={{ objectFit: "contain" }}
              />
            ) : (
              <div
                style={{
                  fontSize: 24,
                  color: "#666",
                  textAlign: "center",
                }}
              >
                Sin imagen
              </div>
            )}
          </div>

          {/* Product Info */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              flex: 1,
              gap: "16px",
            }}
          >
            {product.brand && (
              <div
                style={{
                  fontSize: 24,
                  opacity: 0.8,
                  textTransform: "uppercase",
                  letterSpacing: "2px",
                }}
              >
                {product.brand.name}
              </div>
            )}
            <div
              style={{
                fontSize: 48,
                fontWeight: "bold",
                lineHeight: 1.2,
              }}
            >
              {product.name}
            </div>
            <div
              style={{
                fontSize: 28,
                opacity: 0.9,
              }}
            >
              {product.unit}
            </div>
            {lowestPrice && (
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "8px",
                  marginTop: "16px",
                }}
              >
                <span style={{ fontSize: 24, opacity: 0.8 }}>Desde</span>
                <span style={{ fontSize: 56, fontWeight: "bold" }}>
                  RD${lowestPrice}
                </span>
              </div>
            )}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginTop: "auto",
                paddingTop: "24px",
              }}
            >
              <span style={{ fontSize: 20, opacity: 0.7 }}>
                SupermercadosRD
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
