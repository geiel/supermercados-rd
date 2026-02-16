"use client";

import React, { useId, useRef, useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ScrollPeekProps {
  children: React.ReactNode;
  className?: string;
  hideScrollbar?: boolean;
  peek?: string;
  gutter?: string;
  gutterLeft?: string;
  endPadding?: string;
  itemWidth?: string;
  itemWidthSm?: string;
  itemWidthMd?: string;
  itemWidthLg?: string;
  itemWidthXl?: string;
  showNavButtons?: boolean;
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
  itemWidthSm,
  itemWidthMd,
  itemWidthLg,
  itemWidthXl,
  showNavButtons = true
}: ScrollPeekProps) {
  const id = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const baseItemWidth =
    itemWidth ?? itemWidthSm ?? itemWidthMd ?? itemWidthLg ?? itemWidthXl;
  const hasItemWidth = Boolean(baseItemWidth);

  const checkScrollPosition = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  }, []);

  useEffect(() => {
    checkScrollPosition();
    const container = scrollRef.current;
    if (!container) return;

    container.addEventListener("scroll", checkScrollPosition, { passive: true });
    const resizeObserver = new ResizeObserver(checkScrollPosition);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener("scroll", checkScrollPosition);
      resizeObserver.disconnect();
    };
  }, [checkScrollPosition]);

  const scroll = useCallback((direction: "left" | "right") => {
    const container = scrollRef.current;
    if (!container) return;

    const scrollAmount = container.clientWidth * 0.8;
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth"
    });
  }, []);

  const style: React.CSSProperties = {
    paddingLeft: gutterLeft,
    paddingRight: endPadding,
    scrollPaddingLeft: gutterLeft,
    scrollPaddingRight: `calc(${peek} + ${gutter})`
  };

  const baseCss = baseItemWidth
    ? `[data-scroll-peek-id="${id}"] { --scroll-peek-item-width: ${baseItemWidth}; }`
    : "";
  const responsiveSmCss =
    itemWidthSm
      ? `@media (min-width: 640px) { [data-scroll-peek-id="${id}"] { --scroll-peek-item-width: ${itemWidthSm}; } }`
      : "";
  const responsiveMdCss =
    itemWidthMd
      ? `@media (min-width: 768px) { [data-scroll-peek-id="${id}"] { --scroll-peek-item-width: ${itemWidthMd}; } }`
      : "";
  const responsiveLgCss =
    itemWidthLg
      ? `@media (min-width: 1024px) { [data-scroll-peek-id="${id}"] { --scroll-peek-item-width: ${itemWidthLg}; } }`
      : "";
  const responsiveXlCss =
    itemWidthXl
      ? `@media (min-width: 1280px) { [data-scroll-peek-id="${id}"] { --scroll-peek-item-width: ${itemWidthXl}; } }`
      : "";
  const widthCss = [
    baseCss,
    responsiveSmCss,
    responsiveMdCss,
    responsiveLgCss,
    responsiveXlCss,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div 
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {widthCss ? <style>{widthCss}</style> : null}
      
      {/* Left Navigation Button */}
      {showNavButtons && (
        <button
          type="button"
          onClick={() => scroll("left")}
          className={cn(
            "absolute left-0 top-1/2 -translate-y-1/2 z-10",
            "hidden md:flex items-center justify-center",
            "size-10 rounded-full bg-background/95 shadow-lg border",
            "transition-all duration-200",
            "hover:bg-accent hover:scale-105",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isHovered && canScrollLeft 
              ? "opacity-100 translate-x-0" 
              : "opacity-0 -translate-x-2 pointer-events-none"
          )}
          aria-label="Scroll left"
        >
          <ChevronLeft className="size-5" />
        </button>
      )}

      {/* Right Navigation Button */}
      {showNavButtons && (
        <button
          type="button"
          onClick={() => scroll("right")}
          className={cn(
            "absolute right-0 top-1/2 -translate-y-1/2 z-10",
            "hidden md:flex items-center justify-center",
            "size-10 rounded-full bg-background/95 shadow-lg border",
            "transition-all duration-200",
            "hover:bg-accent hover:scale-105",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isHovered && canScrollRight 
              ? "opacity-100 translate-x-0" 
              : "opacity-0 translate-x-2 pointer-events-none"
          )}
          aria-label="Scroll right"
        >
          <ChevronRight className="size-5" />
        </button>
      )}

      <div
        ref={scrollRef}
        className={cn(
          hideScrollbar &&
            "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
          "w-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory [container-type:inline-size] [&>*]:min-w-full [&>*]:w-max [&>*]:snap-start [&>*]:shrink-0 [&>*>*]:snap-start [&>*>*]:shrink-0",
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
