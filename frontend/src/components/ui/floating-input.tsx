import * as React from "react"
import { cn } from "@/lib/utils"

export interface FloatingInputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string
    error?: string
}

const FloatingLabelInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
    ({ className, type, id, label, error, ...props }, ref) => {
        return (
            <div className="relative group">
                <input
                    type={type}
                    id={id}
                    className={cn(
                        "peer flex h-12 w-full rounded-lg border border-slate-200 bg-white px-3 pt-4 pb-1 text-sm text-slate-900 shadow-sm transition-all outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 placeholder:text-transparent disabled:cursor-not-allowed disabled:opacity-50",
                        error ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : "",
                        className
                    )}
                    placeholder=" "
                    ref={ref}
                    {...props}
                />
                <label
                    htmlFor={id}
                    className={cn(
                        "absolute left-3 top-1 z-10 origin-[0] -translate-y-0 scale-75 transform text-xs text-black duration-150 peer-placeholder-shown:top-3.5 peer-placeholder-shown:scale-100 peer-focus:top-1 peer-focus:scale-75 peer-focus:text-blue-500 pointer-events-none",
                        error ? "text-red-500 peer-focus:text-red-500" : ""
                    )}
                >
                    {label}
                </label>
                {error && (
                    <p className="mt-1 text-xs font-medium text-red-500 flex items-center gap-1 animate-in slide-in-from-top-1 fade-in">
                        <span className="inline-block w-1 h-1 rounded-full bg-red-500"></span>
                        {error}
                    </p>
                )}
            </div>
        )
    }
)
FloatingLabelInput.displayName = "FloatingLabelInput"

export { FloatingLabelInput }
