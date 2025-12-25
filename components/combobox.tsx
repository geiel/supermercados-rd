"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type Option = Record<"value" | "label", string> & Record<string, string>;

type ComboboxProps = {
  options: Option[];
  emptyMessage: string;
  placeholder?: string;
  onValueChange?: (value: Option) => void;
  value?: string;
  defaultValue?: string;
  className?: string;
  contentClassName?: string;
};

export function Combobox({
  options,
  placeholder,
  emptyMessage,
  onValueChange,
  value,
  defaultValue,
  className,
  contentClassName,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? "");
  const isControlled = typeof value !== "undefined";
  const selectedValue = isControlled ? value : internalValue;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-[200px] justify-between", className)}
        >
          {selectedValue
            ? options.find((option) => option.value === selectedValue)?.label
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-[200px] p-0", contentClassName)}>
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    const nextValue =
                      selectedValue === option.value ? "" : option.value;
                    if (!isControlled) {
                      setInternalValue(nextValue);
                    }
                    setOpen(false);

                    if (onValueChange) {
                      onValueChange(option);
                    }
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedValue === option.value
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
