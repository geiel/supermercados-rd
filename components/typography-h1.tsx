import React from "react";

export function TypographyH1({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="scroll-m-20 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
      {children}
    </h1>
  );
}
