"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

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
  includeHome?: boolean;
};

type ResponsiveBreadcrumbProps = {
  items: GroupBreadcrumbItem[];
  className?: string;
  compactMobileMode?: "current" | "parent" | "last";
};

type LastOverflowCandidate = {
  startIndex: number;
  showTrailingEllipsis: boolean;
};

function areSameLastOverflowCandidate(
  left: LastOverflowCandidate,
  right: LastOverflowCandidate
) {
  return (
    left.startIndex === right.startIndex &&
    left.showTrailingEllipsis === right.showTrailingEllipsis
  );
}

function buildLastOverflowCandidates(total: number) {
  const candidates: LastOverflowCandidate[] = [];

  const pushCandidate = (candidate: LastOverflowCandidate) => {
    if (
      candidates.some((existing) =>
        areSameLastOverflowCandidate(existing, candidate)
      )
    ) {
      return;
    }
    candidates.push(candidate);
  };

  pushCandidate({
    startIndex: 0,
    showTrailingEllipsis: false,
  });

  for (let startIndex = 1; startIndex <= Math.max(total - 2, 0); startIndex += 1) {
    pushCandidate({
      startIndex,
      showTrailingEllipsis: false,
    });
  }

  if (total >= 2) {
    pushCandidate({
      startIndex: total - 2,
      showTrailingEllipsis: true,
    });
  }

  return candidates;
}

type RenderLastOverflowNodesOptions = {
  keyPrefix: string;
  includeSchemaData: boolean;
};

function renderLastOverflowNodes(
  items: GroupBreadcrumbItem[],
  candidate: LastOverflowCandidate,
  { keyPrefix, includeSchemaData }: RenderLastOverflowNodesOptions
) {
  if (items.length === 0) return [];

  const safeStartIndex = Math.min(candidate.startIndex, items.length - 1);
  const remainingItems = items.slice(safeStartIndex);
  const visibleItems = candidate.showTrailingEllipsis
    ? remainingItems.slice(0, 1)
    : remainingItems;

  const nodes: ReactNode[] = [];

  visibleItems.forEach((item, visibleIndex) => {
    const originalIndex = safeStartIndex + visibleIndex;
    const isCurrentPage =
      !candidate.showTrailingEllipsis && originalIndex === items.length - 1;
    const itemKey = `${keyPrefix}-item-${originalIndex}-${item.id}-${item.href}`;

    nodes.push(
      <BreadcrumbItem
        key={itemKey}
        {...(includeSchemaData
          ? {
              itemScope: true,
              itemType: "http://schema.org/ListItem",
              itemProp: "itemListElement",
            }
          : {})}
      >
        <BreadcrumbLink asChild className={isCurrentPage ? "text-foreground font-normal" : undefined}>
          <Link href={item.href} {...(includeSchemaData ? { itemProp: "item" } : {})} aria-current={isCurrentPage ? "page" : undefined}>
            <span
              {...(includeSchemaData ? { itemProp: "name" } : {})}
              className={cn(
                "truncate",
                isCurrentPage ? "max-w-[58vw] md:max-w-none" : "max-w-[40vw] md:max-w-none"
              )}
            >
              {item.name}
            </span>
          </Link>
        </BreadcrumbLink>
        {includeSchemaData ? (
          <meta itemProp="position" content={String(originalIndex + 1)} />
        ) : null}
      </BreadcrumbItem>
    );

    if (!candidate.showTrailingEllipsis && visibleIndex < visibleItems.length - 1) {
      nodes.push(
        <BreadcrumbSeparator
          key={`${keyPrefix}-sep-${originalIndex}-${item.id}-${item.href}`}
        />
      );
    }
  });

  if (candidate.showTrailingEllipsis && visibleItems.length > 0) {
    const ellipsisAfterIndex = safeStartIndex;

    nodes.push(
      <BreadcrumbSeparator key={`${keyPrefix}-sep-ellipsis-${ellipsisAfterIndex}`} />
    );
    nodes.push(
      <BreadcrumbItem key={`${keyPrefix}-ellipsis-${ellipsisAfterIndex}`}>
        <BreadcrumbEllipsis />
      </BreadcrumbItem>
    );
  }

  return nodes;
}

function OverflowLastBreadcrumb({
  items,
  className,
}: Pick<ResponsiveBreadcrumbProps, "items" | "className">) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const candidateMeasureRefs = useRef<Array<HTMLDivElement | null>>([]);
  const candidates = useMemo(
    () => buildLastOverflowCandidates(items.length),
    [items.length]
  );
  const [activeCandidate, setActiveCandidate] = useState<LastOverflowCandidate>(
    candidates[0] ?? { startIndex: 0, showTrailingEllipsis: false }
  );

  useEffect(() => {
    setActiveCandidate(candidates[0] ?? { startIndex: 0, showTrailingEllipsis: false });
  }, [candidates]);

  useEffect(() => {
    candidateMeasureRefs.current = candidateMeasureRefs.current.slice(
      0,
      candidates.length
    );
  }, [candidates.length]);

  useEffect(() => {
    const container = containerRef.current;
    const measureRoot = measureRef.current;
    if (!container || !measureRoot) return;

    const pickBestCandidate = () => {
      const availableWidth = container.clientWidth;
      if (availableWidth <= 0 || candidates.length === 0) return;

      let bestIndex = candidates.length - 1;
      let hasMeasurement = false;

      for (let index = 0; index < candidates.length; index += 1) {
        const candidateMeasureNode = candidateMeasureRefs.current[index];
        if (!candidateMeasureNode) continue;
        hasMeasurement = true;

        if (candidateMeasureNode.scrollWidth <= availableWidth) {
          bestIndex = index;
          break;
        }
      }

      if (!hasMeasurement) return;

      const nextCandidate = candidates[bestIndex];
      if (!nextCandidate) return;

      setActiveCandidate((previousCandidate) =>
        areSameLastOverflowCandidate(previousCandidate, nextCandidate)
          ? previousCandidate
          : nextCandidate
      );
    };

    pickBestCandidate();
    const observer = new ResizeObserver(() => pickBestCandidate());
    observer.observe(container);
    observer.observe(measureRoot);
    return () => observer.disconnect();
  }, [candidates]);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <Breadcrumb>
        <BreadcrumbList
          className="flex-nowrap whitespace-nowrap overflow-hidden w-full"
          itemScope
          itemType="http://schema.org/BreadcrumbList"
        >
          {renderLastOverflowNodes(items, activeCandidate, {
            keyPrefix: "visible",
            includeSchemaData: true,
          })}
        </BreadcrumbList>
      </Breadcrumb>

      <div
        ref={measureRef}
        className="pointer-events-none absolute top-0 left-0 -z-10 h-0 overflow-visible invisible"
        aria-hidden="true"
      >
        {candidates.map((candidate, index) => (
          <div
            key={`measure-candidate-${index}`}
            ref={(node) => {
              candidateMeasureRefs.current[index] = node;
            }}
            className="w-max"
          >
            <Breadcrumb>
              <BreadcrumbList className="flex-nowrap whitespace-nowrap overflow-visible w-max">
                {renderLastOverflowNodes(items, candidate, {
                  keyPrefix: `measure-${index}`,
                  includeSchemaData: false,
                })}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResponsiveBreadcrumb({
  items,
  className,
  compactMobileMode = "current",
}: ResponsiveBreadcrumbProps) {
  if (compactMobileMode === "last") {
    return <OverflowLastBreadcrumb items={items} className={className} />;
  }

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
  const hasHiddenMobileItems = total > 3;

  const isVisibleOnMobile = (index: number) =>
    showAllOnMobile || index === 0 || index >= total - 2;

  const isHiddenWhenCompact = (index: number) =>
    total > 2 && index < total - 2;

  const isVisibleOnCompactMobile = (index: number) =>
    compactMobileMode === "parent"
      ? total <= 1
        ? index === 0
        : index === total - 2
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
  includeHome = false,
}: GroupBreadcrumbsProps) {
  if (paths.length === 0) return null;

  const homeItem: GroupBreadcrumbItem = {
    id: 0,
    name: "Inicio",
    href: "/",
  };

  const pathsWithHome = includeHome
    ? paths.map((path) => {
        if (path[0]?.href === homeItem.href) {
          return path;
        }
        return [homeItem, ...path];
      })
    : paths;

  return (
    <div className={cn("flex flex-col gap-2 overflow-hidden", className)}>
      {pathsWithHome.map((path, pathIndex) => {
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
