"use client";

import { usePathname, useSearchParams } from "next/navigation";
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
};

export function BottomPagination({ items }: { items: number }) {
  const pathname = usePathname();
  const searchParam = useSearchParams();

  const page = searchParam.get("page");
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
        />
        <CurrentPageItem
          totalPages={totalPages}
          currentPage={currentPage}
          pathname={pathname}
        />
        <NextPageItem
          currentPage={currentPage}
          pathname={pathname}
          totalPages={totalPages}
        />
      </PaginationContent>
    </Pagination>
  );
}

function CurrentPageItem({
  totalPages,
  currentPage,
  pathname,
}: {
  totalPages: number;
  currentPage: number;
  pathname: string;
}) {
  const isMobile = useIsMobile();
  const rederPages = isMobile ? 2 : 3;
  const items = [];

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1) {
      items.push(
        <PaginationItem key={1}>
          <PaginationLink
            href={`${pathname}?page=${1}`}
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
            href={`${pathname}?page=${totalPages}`}
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
          href={`${pathname}?page=${i}`}
          isActive={currentPage === i}
        >
          {i}
        </PaginationLink>
      </PaginationItem>
    );
  }

  return <>{items}</>;
}

function NextPageItem({ currentPage, pathname, totalPages }: PageItemProps) {
  if (currentPage === totalPages) {
    return null;
  }

  return (
    <PaginationItem>
      <PaginationNext href={`${pathname}?page=${currentPage + 1}`} />
    </PaginationItem>
  );
}

function PreviusPageItem({ currentPage, pathname }: PageItemProps) {
  if (currentPage === 1) {
    return null;
  }

  return (
    <PaginationItem>
      <PaginationPrevious href={`${pathname}?page=${currentPage - 1}`} />
    </PaginationItem>
  );
}
