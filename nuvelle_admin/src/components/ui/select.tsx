import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const EMPTY_VALUE = "__nuvelle_empty_select_value__";
const OPTION_HEIGHT = 36;
const LIST_HEIGHT = 288;
const OVERSCAN = 3;

export type SelectOption = {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
  searchValue?: string;
};

export interface SelectProps
  extends Omit<React.ComponentPropsWithoutRef<typeof SelectPrimitive.Root>, "onValueChange" | "value" | "defaultValue"> {
  "aria-label"?: string;
  className?: string;
  contentClassName?: string;
  noMatchesLabel?: string;
  options: SelectOption[];
  placeholder?: string;
  searchable?: boolean;
  searchLabel?: string;
  virtualized?: boolean;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

function encodeValue(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return value === "" ? EMPTY_VALUE : value;
}

function decodeValue(value: string): string {
  return value === EMPTY_VALUE ? "" : value;
}

function optionSearchText(option: SelectOption): string {
  if (option.searchValue !== undefined) {
    return option.searchValue;
  }
  if (typeof option.label === "string" || typeof option.label === "number") {
    return String(option.label);
  }
  return option.value;
}

export const Select = React.forwardRef<React.ElementRef<typeof SelectPrimitive.Trigger>, SelectProps>(
  (
    {
      "aria-label": ariaLabel,
      className,
      contentClassName,
      defaultValue,
      noMatchesLabel = "No matches",
      options,
      placeholder = "Select",
      searchable = false,
      searchLabel = "Search",
      virtualized = false,
      value,
      onOpenChange,
      onValueChange,
      ...props
    },
    ref
  ) => {
    const [searchQuery, setSearchQuery] = React.useState("");
    const [scrollTop, setScrollTop] = React.useState(0);
    const searchRef = React.useRef<HTMLInputElement | null>(null);
    const viewportRef = React.useRef<React.ElementRef<typeof SelectPrimitive.Viewport> | null>(null);
    const filteredOptions = React.useMemo(() => {
      const normalizedQuery = searchQuery.trim().toLowerCase();
      if (!searchable || !normalizedQuery) {
        return options;
      }

      return options.filter((option) => optionSearchText(option).toLowerCase().includes(normalizedQuery));
    }, [options, searchable, searchQuery]);
    const shouldVirtualize = virtualized && filteredOptions.length > 20;
    const startIndex = shouldVirtualize
      ? Math.max(0, Math.floor(scrollTop / OPTION_HEIGHT) - OVERSCAN)
      : 0;
    const visibleCount = shouldVirtualize
      ? Math.ceil(LIST_HEIGHT / OPTION_HEIGHT) + OVERSCAN * 2
      : filteredOptions.length;
    const endIndex = Math.min(filteredOptions.length, startIndex + visibleCount);
    const visibleOptions = shouldVirtualize ? filteredOptions.slice(startIndex, endIndex) : filteredOptions;

    React.useEffect(() => {
      if (viewportRef.current) {
        viewportRef.current.scrollTop = 0;
      }
      setScrollTop(0);
    }, [searchQuery]);

    const renderOption = (option: SelectOption) => (
      <SelectPrimitive.Item
        key={option.value || EMPTY_VALUE}
        className="relative flex h-9 cursor-default select-none items-center rounded-md py-2 pl-8 pr-3 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[highlighted]:bg-white/10 data-[state=checked]:bg-[#a14bff22] data-[disabled]:opacity-45"
        disabled={option.disabled}
        value={encodeValue(option.value) ?? EMPTY_VALUE}
      >
        <SelectPrimitive.ItemIndicator className="absolute left-2 inline-flex h-4 w-4 items-center justify-center text-[#ff8de0]">
          <Check className="h-3.5 w-3.5" />
        </SelectPrimitive.ItemIndicator>
        <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
      </SelectPrimitive.Item>
    );

    return (
      <SelectPrimitive.Root
        defaultValue={encodeValue(defaultValue)}
        value={encodeValue(value)}
        onOpenChange={(open) => {
          if (open) {
            setSearchQuery("");
            setScrollTop(0);
            requestAnimationFrame(() => searchRef.current?.focus());
          }
          onOpenChange?.(open);
        }}
        onValueChange={(nextValue) => onValueChange?.(decodeValue(nextValue))}
        {...props}
      >
        <SelectPrimitive.Trigger
          ref={ref}
          aria-label={ariaLabel}
          className={cn(
            "flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-white/14 bg-[#111622]/90 px-3.5 py-2 text-left text-sm text-white shadow-sm shadow-black/10 transition-colors hover:border-white/24 focus-visible:border-[#d69aff]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c078ff]/30 disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-white/42",
            className
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="h-4 w-4 shrink-0 text-white/55" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className={cn(
              "z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-white/14 bg-[#101521] text-white shadow-2xl shadow-black/40",
              !searchable && "max-h-72",
              contentClassName
            )}
            position="popper"
            sideOffset={6}
          >
            {searchable ? (
              <div className="border-b border-white/10 p-2">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/42" />
                  <input
                    ref={searchRef}
                    aria-label={searchLabel}
                    className="h-9 w-full rounded-md border border-white/12 bg-[#0b0f18] pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/36 focus:border-[#d69aff]/70 focus:ring-2 focus:ring-[#c078ff]/30"
                    placeholder={searchLabel}
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onKeyDown={(event) => event.stopPropagation()}
                  />
                </label>
              </div>
            ) : null}
            <SelectPrimitive.Viewport
              ref={viewportRef}
              className="p-1"
              style={shouldVirtualize ? { maxHeight: LIST_HEIGHT, overflowY: "auto" } : undefined}
              onScroll={shouldVirtualize ? (event) => setScrollTop(event.currentTarget.scrollTop) : undefined}
            >
              {filteredOptions.length ? (
                shouldVirtualize ? (
                  <>
                    {startIndex > 0 ? <div aria-hidden="true" style={{ height: startIndex * OPTION_HEIGHT }} /> : null}
                    {visibleOptions.map(renderOption)}
                    {endIndex < filteredOptions.length ? (
                      <div
                        aria-hidden="true"
                        style={{ height: (filteredOptions.length - endIndex) * OPTION_HEIGHT }}
                      />
                    ) : null}
                  </>
                ) : (
                  filteredOptions.map(renderOption)
                )
              ) : (
                <div className="px-3 py-6 text-center text-sm text-[#9aa2c0]">{noMatchesLabel}</div>
              )}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    );
  }
);
Select.displayName = "Select";
