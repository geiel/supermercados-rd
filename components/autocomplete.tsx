"use client";

import {
  CommandGroup,
  CommandItem,
  CommandList,
  CommandInput,
} from "./ui/command";
import { Command as CommandPrimitive } from "cmdk";
import {
  Fragment,
  useCallback,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { Skeleton } from "./ui/skeleton";

import { cn } from "@/lib/utils";
import { productsSelect } from "@/db/schema";

type ProductSuggestion = {
  phrase: string;
  sml: number;
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

const normalizeTerm = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .toLowerCase()
    .trim();

const buildTokenCounts = (query: string) => {
  const counts = new Map<string, number>();

  query
    .split(/\s+/)
    .map(normalizeTerm)
    .filter(Boolean)
    .forEach((token) => {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    });

  return counts;
};

const getPrefixLength = (segment: string, normalizedTarget: string) => {
  if (!normalizedTarget) {
    return 0;
  }

  let normalizedSoFar = "";

  for (let index = 0; index < segment.length; index++) {
    const normalizedChar = normalizeTerm(segment[index]);

    if (normalizedChar) {
      normalizedSoFar += normalizedChar;
    }

    if (normalizedSoFar.length >= normalizedTarget.length) {
      return index + 1;
    }
  }

  return segment.length;
};

const renderHighlightedPhrase = (
  phrase: string,
  query: string
): ReactNode => {
  const tokenCounts = buildTokenCounts(query);
  const orderedTokens = [...tokenCounts.keys()].sort(
    (tokenA, tokenB) => tokenB.length - tokenA.length
  );

  if (orderedTokens.length === 0) {
    return phrase;
  }

  return phrase.split(/(\s+)/).map((segment, index) => {
    const key = `segment-${index}`;

    if (!segment.trim()) {
      return <Fragment key={key}>{segment}</Fragment>;
    }

    const normalizedSegment = normalizeTerm(segment);
    if (!normalizedSegment) {
      return <Fragment key={key}>{segment}</Fragment>;
    }

    const exactMatches = tokenCounts.get(normalizedSegment) ?? 0;
    if (exactMatches > 0) {
      tokenCounts.set(normalizedSegment, exactMatches - 1);
      return <Fragment key={key}>{segment}</Fragment>;
    }

    let prefixToken: string | undefined;

    for (const token of orderedTokens) {
      const remaining = tokenCounts.get(token) ?? 0;
      if (remaining === 0) {
        continue;
      }

      if (normalizedSegment.startsWith(token)) {
        prefixToken = token;
        break;
      }
    }

    if (prefixToken) {
      const remaining = tokenCounts.get(prefixToken) ?? 0;
      tokenCounts.set(prefixToken, Math.max(remaining - 1, 0));

      const prefixLength = getPrefixLength(segment, prefixToken);
      const prefix = segment.slice(0, prefixLength);
      const suffix = segment.slice(prefixLength);

      if (!suffix) {
        return <Fragment key={key}>{segment}</Fragment>;
      }

      return (
        <Fragment key={key}>
          {prefix}
          <span className="font-semibold text-primary">{suffix}</span>
        </Fragment>
      );
    }

    return (
      <Fragment key={key}>
        <span className="font-semibold text-primary">{segment}</span>
      </Fragment>
    );
  });
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

  function clean() {
    setPrevSuggestions([]);
    setInputValue("");
    setOpen(false);
  }

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
          onClean={clean}
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
                <CommandItem
                  key="hidden"
                  value={inputValue}
                  className="hidden"
                />
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
                      <span className="flex-1 whitespace-pre-wrap">
                        {renderHighlightedPhrase(
                          suggestion.phrase,
                          inputValue
                        )}
                      </span>
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
