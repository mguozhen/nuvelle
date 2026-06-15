import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/85",
        className
      )}
      {...props}
    />
  );
}
