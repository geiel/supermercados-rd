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

export function ProductImage(props: ImageProps) {
  const imageKey = getImageKey(props.src);

  return <ProductImageInner key={imageKey} {...props} />;
}

function ProductImageInner(props: ImageProps) {
  const [imageSrc, setImageSrc] = useState<string | StaticImport>(getImageSrc(props.src));
  const [loaded, setLoaded] = useState(false);
  const nacionalFailedImageStepRef = useRef(0);

  return (
    <Image
      {...props}
      className={cn(`transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`, props.className)}
      src={imageSrc}
      onError={() => {
        if (typeof imageSrc === "string" && imageSrc.startsWith("https://assets-sirenago.s3-us-west-1") && imageSrc.includes("/large/")) {
          setImageSrc(imageSrc.replace("/large/", "/original/"));
          return;
        }

        setImageSrc("/no-product-found.jpg");
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

        setImageSrc("/no-product-found.jpg");
      }}
      alt={props.alt}
    />
  );
}
