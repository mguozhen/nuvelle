import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const EMPTY_VALUE = "__nuvelle_empty_select_value__";

export type SelectOption = {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
};

export interface SelectProps
  extends Omit<React.ComponentPropsWithoutRef<typeof SelectPrimitive.Root>, "onValueChange" | "value" | "defaultValue"> {
  "aria-label"?: string;
  className?: string;
  contentClassName?: string;
  options: SelectOption[];
  placeholder?: string;
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

export const Select = React.forwardRef<React.ElementRef<typeof SelectPrimitive.Trigger>, SelectProps>(
  (
    {
      "aria-label": ariaLabel,
      className,
      contentClassName,
      defaultValue,
      options,
      placeholder = "Select",
      value,
      onValueChange,
      ...props
    },
    ref
  ) => (
    <SelectPrimitive.Root
      defaultValue={encodeValue(defaultValue)}
      value={encodeValue(value)}
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
            "z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-white/14 bg-[#101521] text-white shadow-2xl shadow-black/40",
            contentClassName
          )}
          position="popper"
          sideOffset={6}
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
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
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
);
Select.displayName = "Select";
