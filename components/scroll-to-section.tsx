"use client";

import * as React from "react";

type ScrollToSectionProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  targetId: string;
};

export function ScrollToSection({
  targetId,
  onClick,
  ...props
}: ScrollToSectionProps) {
  return (
    <button
      type="button"
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        const element = document.getElementById(targetId);
        element?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
      {...props}
    />
  );
}
