"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import type { GroupBreadcrumbItem } from "@/lib/group-breadcrumbs";

type GroupBreadcrumbsProps = {
  paths: GroupBreadcrumbItem[][];
  className?: string;
  compactMobileMode?: "current" | "parent" | "last";
};

type ResponsiveBreadcrumbProps = {
  items: GroupBreadcrumbItem[];
  className?: string;
  compactMobileMode?: "current" | "parent" | "last";
};

function ResponsiveBreadcrumb({
  items,
  className,
  compactMobileMode = "current",
}: ResponsiveBreadcrumbProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isCompact, setIsCompact] = useState(false);
  const isCompactRef = useRef(isCompact);
  const fullWidthRef = useRef(0);

  useEffect(() => {
    isCompactRef.current = isCompact;
  }, [isCompact]);

  useEffect(() => {
    fullWidthRef.current = 0;
    setIsCompact(false);
  }, [items]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const list = container.querySelector<HTMLOListElement>(
        "ol[data-slot=\"breadcrumb-list\"]"
      );
      if (!list) return;

      if (!isCompactRef.current) {
        const fullWidth = list.scrollWidth;
        fullWidthRef.current = fullWidth;

        if (fullWidth > list.clientWidth) {
          setIsCompact(true);
        }
        return;
      }

      if (
        fullWidthRef.current > 0 &&
        container.clientWidth >= fullWidthRef.current
      ) {
        setIsCompact(false);
      }
    };

    measure();
    const observer = new ResizeObserver(() => measure());
    observer.observe(container);
    return () => observer.disconnect();
  }, [items]);

  const total = items.length;
  const showAllOnMobile = total <= 3;
  const hasHiddenMobileItems = compactMobileMode === "last" ? false : total > 3;

  const isVisibleOnMobile = (index: number) =>
    compactMobileMode === "last"
      ? total <= 1
        ? index === 0
        : index >= total - 2
      : showAllOnMobile || index === 0 || index >= total - 2;

  const isHiddenWhenCompact = (index: number) =>
    total > 2 && index < total - 2;

  const isVisibleOnCompactMobile = (index: number) =>
    compactMobileMode === "parent"
      ? total <= 1
        ? index === 0
        : index === total - 2
      : compactMobileMode === "last"
        ? index === total - 1
      : total <= 1 || index >= total - 2;

  const itemClassName = (index: number) =>
    cn(
      isVisibleOnMobile(index) ? "inline-flex" : "hidden md:inline-flex",
      isHiddenWhenCompact(index) && "group-data-[compact=true]:hidden",
      !isVisibleOnCompactMobile(index) &&
        "group-data-[compact=true]:hidden md:group-data-[compact=true]:inline-flex"
    );

  const isCompactSeparatorVisibleOnMobile = (index: number) =>
    isVisibleOnCompactMobile(index) && isVisibleOnCompactMobile(index + 1);

  const separatorClassName = (index: number) =>
    cn(
      isVisibleOnMobile(index) && isVisibleOnMobile(index + 1)
        ? "inline-flex"
        : "hidden md:inline-flex",
      index < total - 2 && "group-data-[compact=true]:hidden",
      !isCompactSeparatorVisibleOnMobile(index) &&
        "group-data-[compact=true]:hidden md:group-data-[compact=true]:inline-flex"
    );

  const mobileEllipsisClass = cn(
    "inline-flex md:hidden",
    "group-data-[compact=true]:hidden"
  );

  const compactMobileEllipsisClass = "hidden group-data-[compact=true]:inline-flex md:hidden";

  const listClassName =
    "flex-nowrap whitespace-nowrap overflow-hidden w-full";

  const nodes: ReactNode[] = [];

  items.forEach((item, index) => {
    const isLast = index === total - 1;
    const itemKey = `item-${index}-${item.id}-${item.href}`;
    const separatorKey = `sep-${index}-${item.id}-${item.href}`;

    if (
      compactMobileMode === "last" &&
      index === total - 1 &&
      total > 1
    ) {
      nodes.push(
        <BreadcrumbItem key="compact-last-ellipsis" className={compactMobileEllipsisClass}>
          <BreadcrumbEllipsis />
        </BreadcrumbItem>
      );
      nodes.push(
        <BreadcrumbSeparator
          key="compact-last-ellipsis-separator"
          className={compactMobileEllipsisClass}
        />
      );
    }

    if (
      compactMobileMode === "current" &&
      index === total - 2 &&
      total > 2
    ) {
      nodes.push(
        <BreadcrumbItem key="compact-ellipsis" className={compactMobileEllipsisClass}>
          <BreadcrumbEllipsis />
        </BreadcrumbItem>
      );
      nodes.push(
        <BreadcrumbSeparator
          key="compact-ellipsis-separator"
          className={compactMobileEllipsisClass}
        />
      );
    }

    nodes.push(
      <BreadcrumbItem
        key={itemKey}
        className={itemClassName(index)}
        itemScope
        itemType="http://schema.org/ListItem"
        itemProp="itemListElement"
      >
        <BreadcrumbLink asChild className={isLast ? "text-foreground font-normal" : undefined}>
            <Link
              href={item.href}
              itemProp="item"
              aria-current={isLast ? "page" : undefined}
            >
              <span
                itemProp="name"
                className={cn(
                  "truncate",
                  isLast ? "max-w-[58vw] md:max-w-none" : "max-w-[40vw] md:max-w-none"
                )}
              >
                {item.name}
              </span>
            </Link>
          </BreadcrumbLink>
        <meta itemProp="position" content={String(index + 1)} />
      </BreadcrumbItem>
    );

    if (
      compactMobileMode === "parent" &&
      index === total - 2 &&
      total > 1
    ) {
      nodes.push(
        <BreadcrumbSeparator
          key="compact-parent-ellipsis-separator"
          className={compactMobileEllipsisClass}
        />
      );
      nodes.push(
        <BreadcrumbItem key="compact-parent-ellipsis" className={compactMobileEllipsisClass}>
          <BreadcrumbEllipsis />
        </BreadcrumbItem>
      );
    }

    if (index === 0 && hasHiddenMobileItems) {
      nodes.push(
        <BreadcrumbSeparator
          key="ellipsis-sep-start"
          className={mobileEllipsisClass}
        />
      );
      nodes.push(
        <BreadcrumbItem key="ellipsis" className={mobileEllipsisClass}>
          <BreadcrumbEllipsis />
        </BreadcrumbItem>
      );
      nodes.push(
        <BreadcrumbSeparator
          key="ellipsis-sep-end"
          className={mobileEllipsisClass}
        />
      );
    }

    if (!isLast) {
      nodes.push(
        <BreadcrumbSeparator
          key={separatorKey}
          className={separatorClassName(index)}
        />
      );
    }
  });

  return (
    <div
      ref={containerRef}
      data-compact={isCompact ? "true" : "false"}
      className={cn("relative w-full group", className)}
    >
      <Breadcrumb>
        <BreadcrumbList
          className={listClassName}
          itemScope
          itemType="http://schema.org/BreadcrumbList"
        >
          {nodes}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}

export function GroupBreadcrumbs({
  paths,
  className,
  compactMobileMode = "current",
}: GroupBreadcrumbsProps) {
  if (paths.length === 0) return null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {paths.map((path, pathIndex) => {
        const key = `${pathIndex}-${path
          .map((item) => `${item.id}-${item.href}`)
          .join("|")}`;

        return (
          <div key={key} className="flex flex-col gap-1">
            <ResponsiveBreadcrumb
              items={path}
              compactMobileMode={compactMobileMode}
            />
          </div>
        );
      })}
    </div>
  );
}
