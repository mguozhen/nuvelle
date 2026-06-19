import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type * as React from "react";

type PaginationProps = {
  className?: string;
  firstLabel: string;
  lastLabel: string;
  nextLabel: string;
  page: number;
  pageLabel: string;
  pageSize: number;
  previousLabel: string;
  summaryLabel: string;
  total: number;
  onPageChange: (page: number) => void;
};

export function PaginationRoot({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      aria-label="Pagination"
      className={cn("flex flex-wrap items-center justify-between gap-3", className)}
      {...props}
    />
  );
}

export function PaginationSummary({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-xs text-[#9aa2c0]", className)} {...props} />;
}

export function PaginationContent({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul className={cn("flex items-center gap-2", className)} {...props} />;
}

export function PaginationItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li className={cn("flex items-center", className)} {...props} />;
}

type PaginationControlProps = React.ComponentProps<typeof Button>;

export function PaginationControl({ className, size = "icon", variant = "outline", ...props }: PaginationControlProps) {
  return <Button className={cn(className)} size={size} type="button" variant={variant} {...props} />;
}

export function PaginationCurrent({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      aria-current="page"
      className={cn("min-w-24 rounded-md border border-white/12 bg-white/[0.04] px-3 py-2 text-center text-xs font-semibold text-white", className)}
      {...props}
    />
  );
}

export function Pagination({
  className,
  firstLabel,
  lastLabel,
  nextLabel,
  page,
  pageLabel,
  pageSize,
  previousLabel,
  summaryLabel,
  total,
  onPageChange
}: PaginationProps) {
  if (total <= 0) {
    return null;
  }

  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  if (totalPages === 1) {
    return (
      <PaginationRoot className={cn("justify-end", className)}>
        <PaginationSummary>{summaryLabel}</PaginationSummary>
      </PaginationRoot>
    );
  }

  return (
    <PaginationRoot className={className}>
      <PaginationSummary>{summaryLabel}</PaginationSummary>
      <PaginationContent>
        <PaginationItem>
          <PaginationControl
            aria-label={firstLabel}
            disabled={!canGoPrevious}
            onClick={() => onPageChange(1)}
          >
            <ChevronsLeft className="h-4 w-4" />
          </PaginationControl>
        </PaginationItem>
        <PaginationItem>
          <PaginationControl
            aria-label={previousLabel}
            disabled={!canGoPrevious}
            onClick={() => onPageChange(currentPage - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </PaginationControl>
        </PaginationItem>
        <PaginationItem>
          <PaginationCurrent>{pageLabel}</PaginationCurrent>
        </PaginationItem>
        <PaginationItem>
          <PaginationControl
            aria-label={nextLabel}
            disabled={!canGoNext}
            onClick={() => onPageChange(currentPage + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </PaginationControl>
        </PaginationItem>
        <PaginationItem>
          <PaginationControl
            aria-label={lastLabel}
            disabled={!canGoNext}
            onClick={() => onPageChange(totalPages)}
          >
            <ChevronsRight className="h-4 w-4" />
          </PaginationControl>
        </PaginationItem>
      </PaginationContent>
    </PaginationRoot>
  );
}
