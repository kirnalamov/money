import * as React from "react"

import { cn } from "@/lib/utils"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-[46px] w-full rounded-xl border border-[#2A2E27] bg-[#0E0F0E] px-3.5 py-2 text-sm text-[#F1F3EE] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#6F766A] focus-visible:border-[#C6F24E] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#C6F24E]/15 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }

