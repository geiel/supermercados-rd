"use client";

import { useEffect, useRef, useState } from "react";

type GroupDescriptionProps = {
  description: string;
};

const MAX_LINES = 3;

export function GroupDescription({ description }: GroupDescriptionProps) {
  const normalizedDescription = description.trim();
  const [isExpanded, setIsExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const [measuredDescription, setMeasuredDescription] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container) return;
    if (!measure) return;

    const checkOverflow = () => {
      const width = container.clientWidth;
      if (width <= 0) return;

      measure.style.width = `${width}px`;
      measure.textContent = normalizedDescription;

      const lineHeight = Number.parseFloat(
        window.getComputedStyle(measure).lineHeight
      );
      const maxHeight = lineHeight * MAX_LINES;

      setCanExpand(measure.scrollHeight > maxHeight + 1);
      setMeasuredDescription(normalizedDescription);
    };

    const frame = window.requestAnimationFrame(checkOverflow);

    const observer = new ResizeObserver(() => {
      checkOverflow();
    });
    observer.observe(container);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [normalizedDescription]);

  return (
    <div ref={containerRef} className="max-w-4xl">
      <div className="relative">
        <p
          className={`text-sm leading-6 text-foreground/90 sm:text-base sm:leading-8 ${
            !isExpanded ? "line-clamp-3" : ""
          }`}
        >
          {normalizedDescription}
        </p>
        {!isExpanded &&
        canExpand &&
        measuredDescription === normalizedDescription ? (
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="bg-background absolute right-0.5 bottom-0 z-10 whitespace-nowrap px-0.5 text-xs leading-6 text-foreground underline underline-offset-4 sm:right-0 sm:px-1 sm:text-base sm:leading-8"
          >
            Ver mas
          </button>
        ) : null}
      </div>
      <p
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible fixed top-0 left-[-9999px] m-0 break-words text-sm leading-6 sm:text-base sm:leading-8"
      />
    </div>
  );
}
