"use client";

import { cn } from "@/lib/utils";
import { StaticImport } from "next/dist/shared/lib/get-img-props";
import Image, { ImageProps } from "next/image";
import { useRef, useState } from "react";

function getImageSrc(src: string | StaticImport): string | StaticImport {
  if (typeof src === "string") {
    if (src.startsWith("https://assets-sirenago.s3-us-west-1")) {
      return src.replace("/original/", "/large/");
    }
  }

  return src;
}

function getImageKey(src: string | StaticImport): string {
  if (typeof src === "string") {
    return src;
  }

  if ("src" in src) {
    return src.src;
  }

  return "";
}

type ProductImageProps = ImageProps & {
  productId?: number;
};

const BROKEN_IMAGE_ENDPOINT = "/api/products/broken-images";
const PLACEHOLDER_IMAGE = "/no-product-found.jpg";

function shouldReportImage(imageUrl: string) {
  return imageUrl.length > 0 && imageUrl !== PLACEHOLDER_IMAGE;
}

export function ProductImage(props: ProductImageProps) {
  const imageKey = getImageKey(props.src);

  return <ProductImageInner key={imageKey} {...props} />;
}

function ProductImageInner({ productId, ...props }: ProductImageProps) {
  const [imageSrc, setImageSrc] = useState<string | StaticImport>(
    getImageSrc(props.src)
  );
  const [loaded, setLoaded] = useState(false);
  const nacionalFailedImageStepRef = useRef(0);
  const reportedImagesRef = useRef(new Set<string>());

  const reportBrokenImage = (imageUrl: string) => {
    if (!productId || !shouldReportImage(imageUrl)) {
      return;
    }

    const reportKey = `${productId}:${imageUrl}`;
    if (reportedImagesRef.current.has(reportKey)) {
      return;
    }

    reportedImagesRef.current.add(reportKey);
    void fetch(BROKEN_IMAGE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ productId, imageUrl }),
      keepalive: true,
    }).catch((error) => {
      console.error("[product-image] Failed to report broken image", error);
    });
  };

  return (
    <Image
      {...props}
      className={cn(
        `transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`,
        props.className
      )}
      src={imageSrc}
      onError={() => {
        if (
          typeof imageSrc === "string" &&
          imageSrc.startsWith("https://assets-sirenago.s3-us-west-1") &&
          imageSrc.includes("/large/")
        ) {
          setImageSrc(imageSrc.replace("/large/", "/original/"));
          return;
        }

        if (typeof imageSrc === "string") {
          reportBrokenImage(imageSrc);
        }

        setImageSrc(PLACEHOLDER_IMAGE);
      }}
      onLoad={(e) => {
        const isNacionalPlaceholder =
          e.currentTarget.naturalWidth === 384 &&
          e.currentTarget.naturalHeight === 384 &&
          imageSrc.toString().startsWith("https://supermercadosnacional.com");

        if (!isNacionalPlaceholder) {
          setLoaded(true);
          return;
        }

        setLoaded(false);

        if (nacionalFailedImageStepRef.current === 0 && imageSrc.toString().includes("__")) {
          nacionalFailedImageStepRef.current = 1;
          setImageSrc(imageSrc.toString().replace(/__\d+(?=\.\w+$)/, ""));
          return;
        }

        if (nacionalFailedImageStepRef.current === 1 && imageSrc.toString().includes("-1")) {
          nacionalFailedImageStepRef.current = 2;
          setImageSrc(imageSrc.toString().replace("-1", "_-1"));
          return;
        }

        reportBrokenImage(imageSrc.toString());
        setImageSrc(PLACEHOLDER_IMAGE);
      }}
      alt={props.alt}
      unoptimized
    />
  );
}
