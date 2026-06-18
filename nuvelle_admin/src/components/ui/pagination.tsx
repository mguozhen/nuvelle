import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
      <div className={cn("flex items-center justify-end text-xs text-[#9aa2c0]", className)}>
        <span>{summaryLabel}</span>
      </div>
    );
  }

  return (
    <nav className={cn("flex flex-wrap items-center justify-between gap-3", className)} aria-label="Pagination">
      <p className="text-xs text-[#9aa2c0]">{summaryLabel}</p>
      <div className="flex items-center gap-2">
        <Button
          aria-label={firstLabel}
          disabled={!canGoPrevious}
          size="icon"
          type="button"
          variant="outline"
          onClick={() => onPageChange(1)}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          aria-label={previousLabel}
          disabled={!canGoPrevious}
          size="icon"
          type="button"
          variant="outline"
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-24 rounded-md border border-white/12 bg-white/[0.04] px-3 py-2 text-center text-xs font-semibold text-white">
          {pageLabel}
        </span>
        <Button
          aria-label={nextLabel}
          disabled={!canGoNext}
          size="icon"
          type="button"
          variant="outline"
          onClick={() => onPageChange(currentPage + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          aria-label={lastLabel}
          disabled={!canGoNext}
          size="icon"
          type="button"
          variant="outline"
          onClick={() => onPageChange(totalPages)}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  );
}
