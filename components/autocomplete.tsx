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
import { Button } from "./ui/button";

import { cn } from "@/lib/utils";
import { productsSelect } from "@/db/schema";
import { ArrowLeft, ArrowRight, ArrowUpLeft } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

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
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  autoFocus?: boolean;
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
  open,
  onOpenChange,
  autoFocus = false,
}: AutoCompleteProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  const [isOpenInternal, setOpenInternal] = useState(false);
  const isOpen = open ?? isOpenInternal;
  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (open === undefined) {
        setOpenInternal(nextOpen);
      }
      if (nextOpen !== isOpen) {
        onOpenChange?.(nextOpen);
      }
    },
    [isOpen, onOpenChange, open]
  );
  const [inputValue, setInputValue] = useState<string>(
    value?.name || productName || ""
  );

  useEffect(() => {
    inputRef.current?.addEventListener("focus", () => {
      setTimeout(() => {
        window.scrollTo({ top: 0 });
      }, 250)
    })
  }, [])

  useEffect(() => {
    if (autoFocus && isOpen) {
      inputRef.current?.focus();
    }
  }, [autoFocus, isOpen]);

  const handleSearch = useCallback(
    (nextValue: string) => {
      onSearch(nextValue);
      setOpen(false);
    },
    [onSearch, setOpen]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      
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
          handleSearch(optionToSelect.phrase);
        } else {
          handleSearch(input.value);
        }

        input.blur();
      }

      if (event.key === "Escape") {
        setOpen(false);
        input.blur();
      }
    },
    [isOpen, suggestions, setOpen, handleSearch]
  );

  const applySuggestionToInput = useCallback(
    (phrase: string) => {
      setInputValue(phrase);
      onInputChange?.(phrase);
      inputRef.current?.focus();
    },
    [onInputChange]
  );

  const handleSelectProduct = useCallback(
    (selectedSuggestion: ProductSuggestion) => {
      setInputValue(selectedSuggestion.phrase);
      handleSearch(selectedSuggestion.phrase);

      // This is a hack to prevent the input from being focused after the user selects an option
      // We can call this hack: "The next tick"
      setTimeout(() => {
        inputRef?.current?.blur();
      }, 0);
    },
    [handleSearch]
  );

  const handlerInputChange = (value: string) => {
    setInputValue(value);
    onInputChange?.(value);
  };

  const onFocus = () => {
    setOpen(true);
  };

  function clean() {
    setInputValue("");
    onInputChange?.("");
  }

  const displaySuggestions = inputValue.length > 0 ? suggestions : [];
  const hasSearchValue = inputValue.trim().length > 0;
  const hasMultipleSuggestions = displaySuggestions.length >= 1;
  const inputBottomRadiusClass = hasMultipleSuggestions
    ? "md:rounded-b-none"
    : "md:rounded-b-3xl";
  const commandListBorder = hasMultipleSuggestions 
    ? "md:border md:border-t-0 md:border-slate-200"
    : ""

  return (
    <CommandPrimitive
      onKeyDown={handleKeyDown}
      filter={() => {
        return 1;
      }}
    >
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/30 transition-opacity duration-200",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        aria-hidden="true"
      />
      <div
        className={cn(
          "relative flex flex-col",
          isOpen &&
            "fixed inset-0 z-50 bg-white p-0 md:relative md:z-50 md:bg-transparent md:p-0"
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2",
            isOpen && "border-b border-slate-200 md:border-none"
          )}
        >
          {isOpen ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="ml-2 md:hidden"
              aria-label="Cancelar"
              onClick={() => {
                setOpen(false);
                inputRef.current?.blur();
              }}
            >
              <ArrowLeft className="size-5" />
            </Button>
          ) : null}
          <div
            className={cn(
              "flex-1 rounded-full bg-white",
              isOpen && cn("md:rounded-t-3xl", inputBottomRadiusClass)
            )}
          >
            <CommandInput
              ref={inputRef}
              value={inputValue}
              onValueChange={isLoading ? undefined : handlerInputChange}
              onBlur={() => {
                if (!isMobile) {
                  setOpen(false);
                }
              }}
              onFocus={onFocus}
              placeholder={placeholder}
              disabled={disabled}
              className={cn(
                "text-base",
                isOpen && "text-lg md:text-base"
              )}
              wrapperClassName={cn(
                isOpen &&
                  cn(
                    "border-0 md:border md:border-slate-200 md:rounded-t-3xl",
                    inputBottomRadiusClass
                  )
              )}
              searchIconClassName="hidden md:block"
              rightAdornment={
                isOpen ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Buscar"
                    disabled={!hasSearchValue}
                    onClick={() => {
                      if (!hasSearchValue) {
                        return;
                      }

                      handleSearch(inputValue);
                      inputRef.current?.blur();
                    }}
                  >
                    <ArrowRight className="size-5" />
                  </Button>
                ) : null
              }
              onClean={clean}
            />
          </div>
        </div>
        <div className="relative">
          <div
            className={cn(
              "z-50 w-full rounded-xl bg-white outline-none overflow-hidden",
              isOpen
                ? "block md:absolute md:top-0 md:rounded-b-3xl md:rounded-t-none"
                : "hidden absolute top-0", commandListBorder
            )}
          >
            <CommandList className={cn("max-h-[calc(100vh-9rem)] overflow-y-auto md:max-h-[400px]")}>
              {isLoading ? (
                <CommandPrimitive.Loading>
                  <div className="p-1">
                    <Skeleton className="h-8 w-full" />
                  </div>
                </CommandPrimitive.Loading>
              ) : null}

              {displaySuggestions.length > 0 && !isLoading ? (
                <CommandGroup>
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
                        className={cn("flex w-full items-center gap-2 text-base")}
                      >
                        <span className="flex-1 whitespace-pre-wrap text-left">
                          {renderHighlightedPhrase(
                            suggestion.phrase,
                            inputValue
                          )}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            applySuggestionToInput(suggestion.phrase);
                          }}
                        >
                          <ArrowUpLeft className="size-5" />
                        </Button>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ) : null}
            </CommandList>
          </div>
        </div>
      </div>
    </CommandPrimitive>
  );
};
