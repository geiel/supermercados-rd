"use client";

import {
  CommandGroup,
  CommandItem,
  CommandList,
  CommandInput,
} from "./ui/command";
import { Command as CommandPrimitive } from "cmdk";
import {
  useState,
  useRef,
  useCallback,
  type KeyboardEvent,
  useEffect,
} from "react";

import { Skeleton } from "./ui/skeleton";

import { cn } from "@/lib/utils";
import { productsSelect } from "@/db/schema";

type ProductSuggestion = {
  phrase: string;
};

type AutoCompleteProps = {
  suggestions: ProductSuggestion[];
  emptyMessage: string;
  value?: productsSelect;
  productName?: string;
  onInputChange?: (value: string) => void;
  onSearch: (inputValue: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
};

export const AutoComplete = ({
  suggestions,
  placeholder,
  emptyMessage,
  value,
  onInputChange,
  onSearch,
  disabled,
  isLoading = false,
  productName,
}: AutoCompleteProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState<string>(
    value?.name || productName || ""
  );

  const [prevSuggestions, setPrevSuggestions] = useState<ProductSuggestion[]>(
    []
  );

  useEffect(() => {
    if (suggestions.length > 0 && inputValue.length > 0) {
      setPrevSuggestions(suggestions);
    }
  }, [suggestions, inputValue]);

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
        const optionToSelect = suggestions.find(
          (suggestion) => suggestion.phrase === input.value
        );

        if (optionToSelect) {
          onSearch(optionToSelect.phrase);
        } else {
          onSearch(input.value);
        }

        input.blur();
      }

      if (event.key === "Escape") {
        input.blur();
      }
    },
    [isOpen, suggestions, onSearch]
  );

  const handleSelectProduct = useCallback(
    (selectedSuggestion: ProductSuggestion) => {
      setInputValue(selectedSuggestion.phrase);
      onSearch(selectedSuggestion.phrase);

      // This is a hack to prevent the input from being focused after the user selects an option
      // We can call this hack: "The next tick"
      setTimeout(() => {
        inputRef?.current?.blur();
      }, 0);
    },
    [onSearch]
  );

  const handlerInputChange = (value: string) => {
    setInputValue(value);
    onInputChange?.(value);
  };

  const onFocus = () => {
    setOpen(true);
  };

  const displaySuggestions =
    suggestions.length > 0 ? suggestions : prevSuggestions;

  return (
    <CommandPrimitive
      onKeyDown={handleKeyDown}
      filter={() => {
        return 1;
      }}
    >
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

            {displaySuggestions.length > 0 && !isLoading ? (
              <CommandGroup heading="Productos">
                <CommandItem value={inputValue} className="hidden" />
                {displaySuggestions.map((suggestion, key) => {
                  return (
                    <CommandItem
                      key={key}
                      value={suggestion.phrase}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onSelect={() => handleSelectProduct(suggestion)}
                      className={cn("flex w-full items-center gap-2")}
                    >
                      {suggestion.phrase}
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
