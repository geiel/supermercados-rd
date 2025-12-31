"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/searchbar";

export function HeaderSearch() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        className="rounded-full"
        size="icon-lg"
        type="button"
        aria-label="Open search"
        onClick={() => {
          setIsOpen(true);
        }}
      >
        <Search />
      </Button>
      <div className={isOpen ? "block" : "hidden"}>
        <SearchBar open={isOpen} onOpenChange={setIsOpen} autoFocus />
      </div>
    </>
  );
}
