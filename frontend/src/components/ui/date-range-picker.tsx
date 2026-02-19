"use client"

import * as React from "react"
import { CalendarIcon, ChevronDown } from "lucide-react"
import { addDays, format, subDays, startOfMonth, endOfMonth, differenceInDays } from "date-fns"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerWithRangeProps {
    className?: string
    date: DateRange | undefined
    setDate: (date: DateRange | undefined) => void
}

export function DatePickerWithRange({
    className,
    date,
    setDate,
}: DatePickerWithRangeProps) {
    const [open, setOpen] = React.useState(false)
    const [tempDate, setTempDate] = React.useState<DateRange | undefined>(date)

    // Sync tempDate with prop date when opening or when prop changes externally
    React.useEffect(() => {
        setTempDate(date)
    }, [date, open])

    const handleApply = () => {
        setDate(tempDate)
        setOpen(false)
    }

    const handleCancel = () => {
        setTempDate(date)
        setOpen(false)
    }

    const handlePreset = (preset: string) => {
        const today = new Date()
        let newDate: DateRange | undefined

        switch (preset) {
            case 'today':
                newDate = { from: today, to: today }
                break
            case 'last7':
                newDate = { from: subDays(today, 6), to: today }
                break
            case 'last30':
                newDate = { from: subDays(today, 29), to: today }
                break
            case 'thisMonth':
                newDate = { from: startOfMonth(today), to: endOfMonth(today) }
                break
        }
        setTempDate(newDate)
    }

    // Helper to check if a preset is active
    const isPresetActive = (preset: string) => {
        if (!tempDate?.from || !tempDate?.to) return false
        const today = new Date()
        let checkDate: DateRange | undefined

        switch (preset) {
            case 'today':
                checkDate = { from: today, to: today }
                break
            case 'last7':
                checkDate = { from: subDays(today, 6), to: today }
                break
            case 'last30':
                checkDate = { from: subDays(today, 29), to: today }
                break
            case 'thisMonth':
                checkDate = { from: startOfMonth(today), to: endOfMonth(today) }
                break
        }

        if (!checkDate) return false

        return (
            format(tempDate.from, 'yyyy-MM-dd') === format(checkDate.from!, 'yyyy-MM-dd') &&
            format(tempDate.to, 'yyyy-MM-dd') === format(checkDate.to!, 'yyyy-MM-dd')
        )
    }

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-[260px] justify-start text-left font-normal bg-white border-[1.5px] border-[#E2E8F0] text-[#374151] hover:bg-white hover:border-[#94A3B8] transition-colors rounded-[10px] h-[44px] px-4",
                            !date && "text-muted-foreground",
                            open && "border-[#6366F1] ring-2 ring-[#6366F1]/10"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4 text-[#6366F1]" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "MMM dd, y")}
                                    <span className="mx-2 text-[#94A3B8]">→</span>
                                    {format(date.to, "MMM dd, y")}
                                </>
                            ) : (
                                format(date.from, "MMM dd, y")
                            )
                        ) : (
                            <span>Pick a date</span>
                        )}
                        <ChevronDown className="ml-auto h-4 w-4 text-[#94A3B8] opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white border-[1.5px] border-[#E2E8F0] shadow-[0_20px_60px_rgba(0,0,0,0.15)] rounded-[16px]" align="end">
                    <div className="p-4 pb-0 flex gap-4">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={tempDate?.from}
                            selected={tempDate}
                            onSelect={setTempDate}
                            numberOfMonths={2}
                            showOutsideDays={false}
                            className="bg-white"
                            classNames={{
                                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                                month: "space-y-4",
                                caption: "flex justify-center pt-1 relative items-center mb-2",
                                caption_label: "text-[16px] font-bold text-[#0F172A]", // Month title
                                nav: "space-x-1 flex items-center",
                                nav_button: cn(
                                    "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 border-[1.5px] border-[#E2E8F0] rounded-[8px] hover:bg-[#EEF2FF] hover:border-[#6366F1] hover:text-[#6366F1] transition-all"
                                ),
                                nav_button_previous: "absolute left-1",
                                nav_button_next: "absolute right-1",
                                table: "w-full border-collapse space-y-1",
                                head_row: "flex",
                                head_cell:
                                    "text-[#94A3B8] rounded-md w-9 font-bold text-[11px] uppercase tracking-[0.5px]", // Day headers
                                row: "flex w-full mt-2",
                                cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-[10px] [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-[#6366F1]/10 first:[&:has([aria-selected])]:rounded-l-[10px] last:[&:has([aria-selected])]:rounded-r-[10px] focus-within:relative focus-within:z-20",
                                day: cn(
                                    "h-9 w-9 p-0 font-medium aria-selected:opacity-100 rounded-[10px] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-all text-[#374151]"
                                ),
                                day_range_end: "day-range-end",
                                day_selected:
                                    "bg-[#6366F1] text-white hover:bg-[#6366F1] hover:text-white focus:bg-[#6366F1] focus:text-white shadow-[0_4px_12px_rgba(99,102,241,0.30)]", // Selected start/end
                                day_today: "bg-[#EEF2FF] text-[#6366F1] font-bold after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-[#6366F1] after:rounded-full", // Today
                                day_outside:
                                    "day-outside text-[#D1D5DB] opacity-50 aria-selected:bg-transparent aria-selected:text-[#D1D5DB] aria-selected:opacity-30",
                                day_disabled: "text-[#D1D5DB] opacity-50",
                                day_range_middle:
                                    "aria-selected:bg-[#6366F1]/10 aria-selected:text-[#4338CA] rounded-none", // Range middle
                                day_hidden: "invisible",
                            }}
                        />
                    </div>

                    {/* Presets */}
                    <div className="px-5 pt-2 pb-4 border-b border-[#F1F5F9]">
                        <div className="flex items-center gap-2">
                            <span className="text-[12px] font-semibold text-[#94A3B8] mr-2">Presets:</span>
                            {[
                                { label: 'Today', value: 'today' },
                                { label: 'Last 7 days', value: 'last7' },
                                { label: 'Last 30 days', value: 'last30' },
                                { label: 'This Month', value: 'thisMonth' }
                            ].map((preset) => (
                                <button
                                    key={preset.value}
                                    onClick={() => handlePreset(preset.value)}
                                    className={cn(
                                        "text-[12px] font-medium px-3 py-1.5 rounded-full border transition-all",
                                        isPresetActive(preset.value)
                                            ? "bg-[#EEF2FF] border-[#6366F1] text-[#6366F1] font-semibold"
                                            : "bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]"
                                    )}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="p-4 bg-[#F8FAFC]/50 flex items-center justify-between border-t border-[#F1F5F9]">
                        <div className="flex items-center gap-3 bg-white border border-[#E2E8F0] rounded-[10px] px-3 py-2 shadow-sm">
                            <CalendarIcon className="h-4 w-4 text-[#6366F1]" />
                            <div className="text-[13px] font-semibold text-[#374151]">
                                {tempDate?.from ? format(tempDate.from, "MMM dd, yyyy") : "Start"}
                                <span className="mx-2 text-[#94A3B8]">→</span>
                                {tempDate?.to ? format(tempDate.to, "MMM dd, yyyy") : "End"}
                            </div>
                            {tempDate?.from && tempDate?.to && (
                                <span className="bg-[#EEF2FF] text-[#6366F1] text-[11px] font-bold px-2 py-0.5 rounded-full ml-2">
                                    {differenceInDays(tempDate.to, tempDate.from) + 1} days
                                </span>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <Button variant="ghost" onClick={handleCancel} className="text-[#64748B] font-semibold hover:text-[#0F172A] hover:bg-transparent">
                                Cancel
                            </Button>
                            <Button onClick={handleApply} className="bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold shadow-[0_4px_12px_rgba(99,102,241,0.30)]">
                                Apply Range
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}
