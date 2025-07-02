"use client";

import { StaticImport } from "next/dist/shared/lib/get-img-props";
import Image, { ImageProps } from "next/image";
import { useState } from "react";

export function ProductImage(props: ImageProps) {
  const [imageSrc, setImageSrc] = useState<string | StaticImport>(props.src);

  return (
    <Image
      {...props}
      src={imageSrc}
      onError={() => {
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
