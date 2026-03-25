"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, XCircle } from "lucide-react"
import { DayPicker, useNavigation } from "react-day-picker"
import { format, isBefore, isAfter, isSameDay, startOfToday } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export type PremiumCalendarProps = React.ComponentProps<typeof DayPicker> & {
    mode_type?: "upcoming" | "completed"
    onClear?: () => void
    onToday?: () => void
}

function PremiumCalendar({
    className,
    classNames,
    showOutsideDays = true,
    mode_type = "upcoming",
    onClear,
    onToday,
    ...props
}: PremiumCalendarProps) {
    const today = startOfToday()

    // Custom disabled dates logic
    const isDateDisabled = (date: Date) => {
        if (mode_type === "upcoming") {
            return isBefore(date, today)
        } else {
            return isAfter(date, today)
        }
    }

    return (
        <div className={cn("p-3 glass-calendar-container", className)}>
            <style jsx global>{`
        .glass-calendar-container {
          background: rgba(255, 255, 255, 0.65) !important;
          backdrop-filter: blur(20px) saturate(160%) !important;
          -webkit-backdrop-filter: blur(20px) saturate(160%) !important;
          border: 1px solid rgba(255, 255, 255, 0.5) !important;
          border-radius: 24px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08);
          width: fit-content;
          position: relative;
          overflow: hidden;
        }

        .glass-calendar-container::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), transparent);
          pointer-events: none;
        }

        /* Weekend styling */
        .rdp-day_weekend {
            color: rgba(180,80,30,0.4) !important;
        }

        /* Diagonal Strikethrough for disabled areas */
        .rdp-day_disabled {
          background-image: repeating-linear-gradient(
            45deg,
            var(--primary-glow) 0,
            var(--primary-glow) 1px,
            transparent 0,
            transparent 50%
          );
          background-size: 8px 8px;
          color: rgba(180, 80, 30, 0.25) !important;
          cursor: not-allowed !important;
          opacity: 0.3 !important;
        }

        .mode-upcoming .rdp-day_disabled {
          text-decoration: line-through;
        }

        .rdp-day_today:not(.rdp-day_selected) {
           box-shadow: 0 0 0 2px var(--primary);
           border-radius: 50%;
           color: var(--primary) !important;
           font-weight: 700 !important;
           background: var(--primary-glow);
        }

        /* Valid selectable zone highlight - removed orange tint */
        .rdp-day:not(.rdp-day_disabled):not(.rdp-day_outside) {
            background-color: transparent;
        }
        
        .rdp-day_selected {
            background: linear-gradient(135deg, var(--primary), var(--primary-light)) !important;
            color: white !important;
            box-shadow: 0 0 15px var(--primary-glow) !important;
            border-radius: 50% !important;
        }

        /* Range highlighting */
        .rdp-day_range_middle {
            background-color: var(--primary-glow) !important;
            border-radius: 0 !important;
        }
        .rdp-day_range_start {
            border-top-right-radius: 0 !important;
            border-bottom-right-radius: 0 !important;
        }
        .rdp-day_range_end {
            border-top-left-radius: 0 !important;
            border-bottom-left-radius: 0 !important;
        }
      `}</style>

            <DayPicker
                showOutsideDays={showOutsideDays}
                disabled={isDateDisabled}
                className={cn(mode_type === "upcoming" ? "mode-upcoming" : "mode-completed")}
                classNames={{
                    months: "flex flex-col sm:flex-row space-y-3 sm:space-x-4 sm:space-y-0",
                    month: "space-y-3",
                    caption: "flex justify-center pt-0 relative items-center mb-2",
                    caption_label: "text-[13.5px] font-black text-slate-800",
                    nav: "space-x-1 flex items-center",
                    nav_button: "h-7 w-7 bg-white/40 backdrop-blur-md border border-white/50 p-0 rounded-full flex items-center justify-center text-orange-500 hover:bg-orange-500 hover:text-white transition-all shadow-sm",
                    nav_button_previous: "absolute left-0.5",
                    nav_button_next: "absolute right-0.5",
                    table: "w-full border-collapse space-y-0.5",
                    head_row: "flex mb-1.5",
                    head_cell: "text-slate-400 text-[10px] font-bold uppercase tracking-widest text-center w-8 py-1.5 border-b border-white/20",
                    row: "flex w-full mt-0.5",
                    cell: "h-8 w-8 text-center text-[12.5px] p-0 relative focus-within:relative focus-within:z-20",
                    day: cn(
                        "h-8 w-8 p-0 font-bold text-slate-700 rounded-full hover:bg-orange-500/10 hover:text-orange-600 transition-all flex items-center justify-center"
                    ),
                    day_selected: "day-selected", // Handled in CSS
                    day_today: "day-today", // Handled in CSS
                    day_outside: "text-slate-400 opacity-30",
                    day_disabled: "opacity-20 cursor-not-allowed",
                    ...classNames }}
                components={{
                    IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
                    IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" /> }}
                modifiers={{
                    weekend: { dayOfWeek: [0, 6] }
                }}
                {...props}
            />

            {/* Footer / Legend / Controls */}
            <div className="mt-4 pt-4 border-t border-white/20">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex gap-3">
                        <div className="flex items-center gap-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
                            <span className="text-[9px] font-bold text-[#4A2B1D]/60 uppercase tracking-wider">Available</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            <span className="text-[9px] font-bold text-[#4A2B1D]/60 uppercase tracking-wider">Restricted</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                    <Button
                        variant="ghost"
                        onClick={onClear}
                        className="flex-1 h-8 rounded-full text-[var(--primary)] hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] font-black text-[9px] uppercase tracking-widest border border-[var(--primary)]/20"
                    >
                        Clear Selection
                    </Button>
                    <Button
                        onClick={onToday}
                        className="flex-1 h-8 rounded-full bg-[var(--primary)] text-white hover:bg-[var(--primary)] font-black text-[9px] uppercase tracking-widest shadow-lg shadow-orange-500/20"
                    >
                        Jump to Today
                    </Button>
                </div>
            </div>
        </div>
    )
}
PremiumCalendar.displayName = "PremiumCalendar"

export { PremiumCalendar }
