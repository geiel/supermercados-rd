import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 32,
          background: "linear-gradient(135deg, #4A2169 0%, #2E1248 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px",
          color: "white",
        }}
      >
        {/* Logo area */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: "bold",
              letterSpacing: "-2px",
            }}
          >
            SupermercadosRD
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              fontSize: 48,
              fontWeight: "bold",
              lineHeight: 1.2,
            }}
          >
            Busca, compara y ahorra
          </div>
          <div
            style={{
              fontSize: 32,
              opacity: 0.9,
              maxWidth: "800px",
            }}
          >
            Compara precios de supermercados en República Dominicana
          </div>
        </div>

        {/* Supermarket names */}
        <div
          style={{
            display: "flex",
            gap: "24px",
            marginTop: "48px",
            opacity: 0.8,
            fontSize: 24,
          }}
        >
          <span>Sirena</span>
          <span>•</span>
          <span>Nacional</span>
          <span>•</span>
          <span>Jumbo</span>
          <span>•</span>
          <span>Bravo</span>
          <span>•</span>
          <span>Plaza Lama</span>
          <span>•</span>
          <span>PriceSmart</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
