"use client";

import {
  usePathname,
  useSearchParams,
  type ReadonlyURLSearchParams,
} from "next/navigation";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination";
import { useIsMobile } from "@/hooks/use-mobile";

type PageItemProps = {
  currentPage: number;
  pathname: string;
  totalPages: number;
  searchParams: ReadonlyURLSearchParams;
};

export function BottomPagination({ items }: { items: number }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = searchParams.get("page");
  const currentPage = Boolean(page) && !isNaN(Number(page)) ? Number(page) : 1;

  const totalPages = Math.ceil(items / 15);

  if (totalPages === 1) {
    return null;
  }

  return (
    <Pagination>
      <PaginationContent>
        <PreviusPageItem
          currentPage={currentPage}
          pathname={pathname}
          totalPages={totalPages}
          searchParams={searchParams}
        />
        <CurrentPageItem
          totalPages={totalPages}
          currentPage={currentPage}
          pathname={pathname}
          searchParams={searchParams}
        />
        <NextPageItem
          currentPage={currentPage}
          pathname={pathname}
          totalPages={totalPages}
          searchParams={searchParams}
        />
      </PaginationContent>
    </Pagination>
  );
}

function CurrentPageItem({
  totalPages,
  currentPage,
  pathname,
  searchParams,
}: {
  totalPages: number;
  currentPage: number;
  pathname: string;
  searchParams: ReadonlyURLSearchParams;
}) {
  const isMobile = useIsMobile();
  const rederPages = isMobile ? 2 : 3;
  const items = [];

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1) {
      items.push(
        <PaginationItem key={1}>
          <PaginationLink
            href={buildHref(pathname, searchParams, 1)}
            isActive={currentPage === 1}
          >
            1
          </PaginationLink>
        </PaginationItem>
      );
      continue;
    }

    if (i === totalPages) {
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink
            href={buildHref(pathname, searchParams, totalPages)}
            isActive={currentPage === totalPages}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
      break;
    }

    const differenceAfter = i - currentPage;
    const differenceBefore = currentPage - i;

    if (differenceBefore >= rederPages) {
      if (currentPage - 1 >= 3 && i === 2) {
        items.push(
          <PaginationItem key={"EllipsisBefore"}>
            <PaginationEllipsis />
          </PaginationItem>
        );
      }
      continue;
    }

    if (differenceAfter >= rederPages) {
      if (totalPages - currentPage >= 4 && i + 1 === totalPages) {
        items.push(
          <PaginationItem key={"EllipsisAfter"}>
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      continue;
    }

    items.push(
      <PaginationItem key={i}>
        <PaginationLink
          href={buildHref(pathname, searchParams, i)}
          isActive={currentPage === i}
        >
          {i}
        </PaginationLink>
      </PaginationItem>
    );
  }

  return <>{items}</>;
}

function NextPageItem({
  currentPage,
  pathname,
  totalPages,
  searchParams,
}: PageItemProps) {
  if (currentPage === totalPages) {
    return null;
  }

  return (
    <PaginationItem>
      <PaginationNext
        href={buildHref(pathname, searchParams, currentPage + 1)}
      />
    </PaginationItem>
  );
}

function PreviusPageItem({ currentPage, pathname, searchParams }: PageItemProps) {
  if (currentPage === 1) {
    return null;
  }

  return (
    <PaginationItem>
      <PaginationPrevious
        href={buildHref(pathname, searchParams, currentPage - 1)}
      />
    </PaginationItem>
  );
}

function buildHref(
  pathname: string,
  searchParams: ReadonlyURLSearchParams,
  page: number
) {
  const params = new URLSearchParams(searchParams.toString());

  if (page <= 1) {
    params.delete("page");
  } else {
    params.set("page", String(page));
  }

  const queryString = params.toString();

  return queryString ? `${pathname}?${queryString}` : pathname;
}
