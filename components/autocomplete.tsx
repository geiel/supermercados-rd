"use client";

import {
  CommandGroup,
  CommandItem,
  CommandList,
  CommandInput,
} from "./ui/command";
import { Command as CommandPrimitive } from "cmdk";
import { useState, useRef, useCallback, type KeyboardEvent } from "react";

import { Skeleton } from "./ui/skeleton";

import { cn } from "@/lib/utils";
import { productsSelect } from "@/db/schema";
import { Badge } from "./ui/badge";

type AutoCompleteProps = {
  products: productsSelect[];
  emptyMessage: string;
  value?: productsSelect;
  onValueChange?: (value: productsSelect) => void;
  onInputChange?: (value: string) => void;
  onSearch: (inputValue: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
};

export const AutoComplete = ({
  products,
  placeholder,
  emptyMessage,
  value,
  onValueChange,
  onInputChange,
  onSearch,
  disabled,
  isLoading = false,
}: AutoCompleteProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState<string>(value?.name || "");

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const input = inputRef.current;
      if (!input) {
        return;
      }

      // Keep the options displayed when the user is typing
      if (!isOpen) {
        setOpen(true);
      }

      // This is not a default behaviour of the <input /> field
      if (event.key === "Enter" && input.value !== "") {
        const optionToSelect = products.find(
          (product) => product.name === input.value
        );

        if (optionToSelect) {
          onValueChange?.(optionToSelect);
          onSearch(optionToSelect.name);
        } else {
          onSearch(input.value);
        }
      }

      if (event.key === "Escape") {
        input.blur();
      }
    },
    [isOpen, products, onValueChange, onSearch]
  );

  const handleSelectProduct = useCallback(
    (selectedProduct: productsSelect) => {
      setInputValue(selectedProduct.name);
      onValueChange?.(selectedProduct);

      // This is a hack to prevent the input from being focused after the user selects an option
      // We can call this hack: "The next tick"
      setTimeout(() => {
        inputRef?.current?.blur();
      }, 0);
    },
    [onValueChange]
  );

  const handlerInputChange = (value: string) => {
    setInputValue(value);
    onInputChange?.(value);
  };

  const onFocus = () => {
    setOpen(true);
  };

  return (
    <CommandPrimitive onKeyDown={handleKeyDown}>
      <div>
        <CommandInput
          ref={inputRef}
          value={inputValue}
          onValueChange={isLoading ? undefined : handlerInputChange}
          onBlur={() => setOpen(false)}
          onFocus={onFocus}
          placeholder={placeholder}
          disabled={disabled}
          className="text-base"
        />
      </div>
      <div className="relative mt-1">
        <div
          className={cn(
            "animate-in fade-in-0 zoom-in-95 absolute top-0 z-10 w-full rounded-xl bg-white outline-none",
            isOpen ? "block" : "hidden"
          )}
        >
          <CommandList className="rounded-lg ring-1 ring-slate-200">
            {isLoading ? (
              <CommandPrimitive.Loading>
                <div className="p-1">
                  <Skeleton className="h-8 w-full" />
                </div>
              </CommandPrimitive.Loading>
            ) : null}

            {products.length > 0 && !isLoading ? (
              <CommandGroup heading="Productos">
                <CommandItem value={inputValue} className="hidden" />
                {products.map((product) => {
                  return (
                    <CommandItem
                      key={product.id}
                      value={product.name + product.unit + product.brandId}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onSelect={() => handleSelectProduct(product)}
                      className={cn("flex w-full items-center gap-2")}
                    >
                      {product.name}
                      <Badge variant="secondary">{product.unit}</Badge>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ) : null}
            {!isLoading ? (
              <CommandPrimitive.Empty className="select-none rounded-sm px-2 py-3 text-center text-sm">
                {emptyMessage}
              </CommandPrimitive.Empty>
            ) : null}
          </CommandList>
        </div>
      </div>
    </CommandPrimitive>
  );
};
