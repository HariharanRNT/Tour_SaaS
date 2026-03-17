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
        <div className={cn("p-4 glass-calendar-container", className)}>
            <style jsx global>{`
        .glass-calendar-container {
          background: rgba(255, 255, 255, 0.1) !important;
          backdrop-filter: blur(25px) saturate(180%) !important;
          -webkit-backdrop-filter: blur(25px) saturate(180%) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          border-radius: 32px;
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.2);
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

        /* Valid selectable zone highlight */
        .rdp-day:not(.rdp-day_disabled):not(.rdp-day_outside) {
            background-color: var(--primary-glow);
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
                    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                    month: "space-y-4",
                    caption: "flex justify-center pt-1 relative items-center mb-4",
                    caption_label: "text-base font-black text-[#4A2B1D]",
                    nav: "space-x-1 flex items-center",
                    nav_button: "h-8 w-8 bg-white/20 backdrop-blur-md border border-white/30 p-0 rounded-full flex items-center justify-center text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-all",
                    nav_button_previous: "absolute left-1",
                    nav_button_next: "absolute right-1",
                    table: "w-full border-collapse space-y-1",
                    head_row: "flex mb-2",
                    head_cell: "text-[var(--primary-glow)] text-[11px] font-semibold uppercase tracking-widest text-center w-9 py-2 border-b border-white/20",
                    row: "flex w-full mt-1",
                    cell: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                    day: cn(
                        "h-9 w-9 p-0 font-medium text-[#2D1A0E] rounded-full hover:bg-[var(--primary-glow)] transition-all flex items-center justify-center"
                    ),
                    day_selected: "day-selected", // Handled in CSS
                    day_today: "day-today", // Handled in CSS
                    day_outside: "text-[#B48060]/40 opacity-50",
                    day_disabled: "opacity-30 cursor-not-allowed",
                    ...classNames,
                }}
                components={{
                    IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
                    IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
                }}
                modifiers={{
                    weekend: { dayOfWeek: [0, 6] }
                }}
                {...props}
            />

            {/* Footer / Legend / Controls */}
            <div className="mt-6 pt-6 border-t border-white/20">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-4">
                        <div className="flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-full bg-[var(--primary)]" />
                            <span className="text-[10px] font-bold text-[#4A2B1D]/60 uppercase tracking-wider">Available</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-full bg-slate-400" />
                            <span className="text-[10px] font-bold text-[#4A2B1D]/60 uppercase tracking-wider">Restricted</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                    <Button
                        variant="ghost"
                        onClick={onClear}
                        className="flex-1 h-9 rounded-full text-[var(--primary)] hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] font-black text-[10px] uppercase tracking-widest border border-[var(--primary)]/20"
                    >
                        Clear Selection
                    </Button>
                    <Button
                        onClick={onToday}
                        className="flex-1 h-9 rounded-full bg-[var(--primary)] text-white hover:bg-[var(--primary)] font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/20"
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
