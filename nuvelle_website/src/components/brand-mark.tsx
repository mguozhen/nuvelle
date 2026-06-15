import { useId } from "react";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  compact?: boolean;
};

export function BrandMark({ className, compact = false }: BrandMarkProps) {
  const gradientId = useId();

  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <svg
        className="h-8 w-8 flex-none drop-shadow-[0_4px_16px_rgba(255,95,191,0.34)]"
        viewBox="0 0 72 72"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`${gradientId}-a`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b25cff" />
            <stop offset="1" stopColor="#ff5fbf" />
          </linearGradient>
          <linearGradient id={`${gradientId}-b`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ff5fbf" />
            <stop offset="1" stopColor="#ff96d0" />
          </linearGradient>
          <linearGradient id={`${gradientId}-c`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffd0e8" />
            <stop offset="1" stopColor="#ff96d0" />
          </linearGradient>
        </defs>
        <polygon points="16,15 27,15 27,57 16,57" fill={`url(#${gradientId}-a)`} />
        <polygon points="16,15 27,15 56,57 45,57" fill={`url(#${gradientId}-b)`} />
        <polygon points="27,15 33,15 56,52 50,52" fill={`url(#${gradientId}-c)`} />
        <polygon points="45,15 56,15 56,57 45,57" fill={`url(#${gradientId}-a)`} />
      </svg>
      {!compact && <span className="text-2xl font-semibold tracking-normal text-white">Nuvelle</span>}
    </span>
  );
}
