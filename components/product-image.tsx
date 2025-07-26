"use client";

import { StaticImport } from "next/dist/shared/lib/get-img-props";
import Image, { ImageProps } from "next/image";
import { useState } from "react";

function getImageSrc(src: string | StaticImport): string | StaticImport {
  if (typeof src === "string") {
    if (src.startsWith("https://assets-sirenago.s3-us-west-1")) {
      return src.replace("/original/", "/large/");
    }
  }

  return src;
}

export function ProductImage(props: ImageProps) {
  const [imageSrc, setImageSrc] = useState<string | StaticImport>(getImageSrc(props.src));

  return (
    <Image
      {...props}
      src={imageSrc}
      onError={() => {
        if (typeof imageSrc === "string" && imageSrc.startsWith("https://assets-sirenago.s3-us-west-1") && imageSrc.includes("/large/")) {
          setImageSrc(imageSrc.replace("/large/", "/original/"));
          return;
        }

        setImageSrc("/no-product-found.jpg");
      }}
      onLoad={(e) => {
        if (
          e.currentTarget.naturalWidth === 384 &&
          e.currentTarget.naturalHeight === 384 &&
          imageSrc.toString().startsWith("https://supermercadosnacional.com")
        ) {
          setImageSrc(imageSrc.toString().replace(/__\d+(?=\.\w+$)/, ""));
        }
      }}
      alt={props.alt}
      unoptimized
    />
  );
}
