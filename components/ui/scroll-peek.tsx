"use client";

import React, { useId } from "react";
import { cn } from "@/lib/utils";

interface ScrollPeekProps {
  children: React.ReactNode;
  className?: string;
  hideScrollbar?: boolean;
  peek?: string;
  gutter?: string;
  gutterLeft?: string;
  endPadding?: string;
  itemWidth?: string;
  itemWidthMd?: string;
}

export default function ScrollPeek({
  children,
  className,
  hideScrollbar = true,
  peek = "40%",
  gutter = "16px",
  gutterLeft = "0px",
  endPadding = "0px",
  itemWidth,
  itemWidthMd
}: ScrollPeekProps) {
  const id = useId();
  const baseItemWidth = itemWidth ?? itemWidthMd;
  const hasItemWidth = Boolean(baseItemWidth);

  const style: React.CSSProperties = {
    paddingLeft: gutterLeft,
    paddingRight: endPadding,
    scrollPaddingLeft: gutterLeft,
    scrollPaddingRight: `calc(${peek} + ${gutter})`
  };

  const baseCss = baseItemWidth
    ? `[data-scroll-peek-id="${id}"] { --scroll-peek-item-width: ${baseItemWidth}; }`
    : "";
  const responsiveCss =
    itemWidthMd && baseItemWidth !== itemWidthMd
      ? `@media (min-width: 768px) { [data-scroll-peek-id="${id}"] { --scroll-peek-item-width: ${itemWidthMd}; } }`
      : "";
  const widthCss = [baseCss, responsiveCss].filter(Boolean).join("\n");

  return (
    <div className="relative">
      {widthCss ? <style>{widthCss}</style> : null}
      <div
        className={cn(
          hideScrollbar &&
            "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
          "w-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory [&>*]:min-w-full [&>*]:w-max [&>*]:snap-start [&>*]:shrink-0 [&>*>*]:snap-start [&>*>*]:shrink-0",
          hasItemWidth && "[&>*>*]:w-[var(--scroll-peek-item-width)]",
          className
        )}
        style={style}
        data-scroll-peek-id={id}
      >
        {children}
      </div>
    </div>
  );
}
