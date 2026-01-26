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
import { ArrowLeft, ArrowRight, ArrowUpLeft, Search, Clock } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const RECENT_SEARCHES_KEY = "recent-searches-v2";
const MAX_RECENT_SEARCHES = 5;

type SuggestionType = "suggestion" | "recent";

type RecentSearch = {
  phrase: string;
  groupId?: number | null;
  groupHumanId?: string | null;
  parentGroupName?: string | null;
};

const getRecentSearches = (): RecentSearch[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    // Handle migration from old format (string[]) to new format (RecentSearch[])
    if (Array.isArray(parsed) && parsed.length > 0) {
      if (typeof parsed[0] === "string") {
        // Old format - migrate to new format
        return parsed.map((phrase: string) => ({ phrase }));
      }
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
};

const saveRecentSearch = (
  query: string,
  groupId?: number | null,
  groupHumanId?: string | null,
  parentGroupName?: string | null
) => {
  if (typeof window === "undefined" || !query.trim()) return;
  try {
    const recent = getRecentSearches();
    // Filter out duplicates by phrase (case-insensitive)
    const filtered = recent.filter(
      (item) => item.phrase.toLowerCase() !== query.toLowerCase()
    );
    const newEntry: RecentSearch = {
      phrase: query,
      groupId: groupId ?? null,
      groupHumanId: groupHumanId ?? null,
      parentGroupName: parentGroupName ?? null,
    };
    const updated = [newEntry, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors
  }
};

type ProductSuggestion = {
  phrase: string;
  sml: number;
  groupId: number | null;
  groupName: string | null;
  groupHumanId: string | null;
  parentGroupName: string | null;
};

type AutoCompleteProps = {
  suggestions: ProductSuggestion[];
  emptyMessage: string;
  value?: productsSelect;
  productName?: string;
  onInputChange?: (value: string) => void;
  onSearch: (inputValue: string, groupHumanId?: string | null) => void;
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

  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
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
    setRecentSearches(getRecentSearches());
  }, []);

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
    (
      nextValue: string,
      groupHumanId?: string | null,
      groupId?: number | null,
      parentGroupName?: string | null
    ) => {
      if (nextValue.trim()) {
        saveRecentSearch(nextValue.trim(), groupId, groupHumanId, parentGroupName);
        setRecentSearches(getRecentSearches());
      }
      onSearch(nextValue, groupHumanId);
      setTimeout(() => {
        setOpen(false);
      }, 100);
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
          handleSearch(
            optionToSelect.phrase,
            optionToSelect.groupHumanId,
            optionToSelect.groupId,
            optionToSelect.parentGroupName
          );
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
      handleSearch(
        selectedSuggestion.phrase,
        selectedSuggestion.groupHumanId,
        selectedSuggestion.groupId,
        selectedSuggestion.parentGroupName
      );

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

  const hasSearchValue = inputValue.trim().length > 0;
  
  // When input is empty, show recent searches; otherwise show suggestions
  type DisplayItem = {
    phrase: string;
    type: SuggestionType;
    groupId?: number | null;
    groupHumanId?: string | null;
    parentGroupName?: string | null;
  };
  
  const displayItems: DisplayItem[] = hasSearchValue
    ? suggestions.map((s) => ({
        phrase: s.phrase,
        type: "suggestion" as const,
        groupId: s.groupId,
        groupHumanId: s.groupHumanId,
        parentGroupName: s.parentGroupName,
      }))
    : recentSearches.map((recent) => ({
        phrase: recent.phrase,
        type: "recent" as const,
        groupId: recent.groupId,
        groupHumanId: recent.groupHumanId,
        parentGroupName: recent.parentGroupName,
      }));
  
  const hasMultipleSuggestions = displayItems.length >= 1;
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

              {displayItems.length > 0 && !isLoading ? (
                <CommandGroup>
                  <CommandItem
                    key="hidden"
                    value={inputValue}
                    className="hidden"
                  />
                  {displayItems.map((item, key) => {
                    const isRecent = item.type === "recent";
                    return (
                      <CommandItem
                        key={key}
                        value={item.phrase}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                        onSelect={() => handleSelectProduct({ phrase: item.phrase, sml: 0, groupId: item.groupId ?? null, groupName: null, groupHumanId: item.groupHumanId ?? null, parentGroupName: item.parentGroupName ?? null })}
                        className={cn("flex w-full items-center gap-2 text-base")}
                      >
                        {isRecent ? (
                          <Clock className="size-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <Search className="size-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="flex-1 whitespace-pre-wrap text-left">
                          {isRecent
                            ? item.phrase
                            : renderHighlightedPhrase(item.phrase, inputValue)}
                        </span>
                        {item.groupId && (
                          <span className="text-sm text-muted-foreground opacity-70 shrink-0">
                            {item.parentGroupName ? `en ${item.parentGroupName}` : "Categoría"}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            applySuggestionToInput(item.phrase);
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
