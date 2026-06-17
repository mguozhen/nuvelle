import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-24 w-full rounded-lg border border-white/14 bg-[#111622]/90 px-3.5 py-3 text-sm text-white shadow-sm shadow-black/10 transition-colors placeholder:text-white/36 hover:border-white/24 focus-visible:border-[#d69aff]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c078ff]/30 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
