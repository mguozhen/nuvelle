import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "flex h-11 w-full rounded-lg border border-white/14 bg-[#111622]/90 px-3.5 py-2 text-sm text-white shadow-sm shadow-black/10 transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-white/36 hover:border-white/24 focus-visible:border-[#d69aff]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c078ff]/30 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";
