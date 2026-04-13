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
    PopoverTrigger } from "@/components/ui/popover"

interface DatePickerWithRangeProps {
    className?: string
    date: DateRange | undefined
    setDate: (date: DateRange | undefined) => void
    onPresetSelect?: (preset: string) => void
}

export function DatePickerWithRange({
    className,
    date,
    setDate,
    onPresetSelect }: DatePickerWithRangeProps) {
    const [open, setOpen] = React.useState(false)
    const [tempDate, setTempDate] = React.useState<DateRange | undefined>(date)
    const [isMobile, setIsMobile] = React.useState(false)

    // Handle mobile responsiveness
    React.useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768)
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

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
        if (onPresetSelect) onPresetSelect(preset)
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
                            "w-full md:w-[260px] justify-start text-left font-bold bg-white/20 backdrop-blur-md border-[1.5px] border-white/30 text-[#1a1a2e] hover:bg-white/30 hover:border-white/50 transition-colors rounded-xl h-[52px] px-5",
                            !date && "text-muted-foreground font-medium",
                            open && "border-[var(--primary)] ring-4 ring-[var(--primary)]/10"
                        )}
                    >
                        <CalendarIcon className="mr-3 h-4 w-4 text-[var(--primary)]" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "MMM dd")}
                                    <span className="mx-2 text-[var(--primary)]/40">→</span>
                                    {format(date.to, "MMM dd")}
                                </>
                            ) : (
                                format(date.from, "MMM dd, y")
                            )
                        ) : (
                            <span>Filter by Date</span>
                        )}
                        <ChevronDown className="ml-auto h-4 w-4 text-[var(--primary)]/40 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white/15 backdrop-blur-[20px] border border-white/30 shadow-[0_20px_60px_rgba(0,0,0,0.15)] rounded-[24px] overflow-hidden" align="start">
                    <div className="p-4 pb-0 flex gap-4">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={tempDate?.from || subDays(new Date(), 30)}
                            selected={tempDate}
                            onSelect={setTempDate}
                            numberOfMonths={isMobile ? 1 : 2}
                            showOutsideDays={false}
                            disabled={{ after: new Date() }}
                            className="bg-transparent"
                            classNames={{
                                months: "flex flex-col md:flex-row space-y-4 md:space-x-4 md:space-y-0",
                                month: "space-y-4",
                                caption: "flex justify-center pt-1 relative items-center mb-2",
                                caption_label: "text-[16px] font-black text-[#1a1a2e]", // Month title
                                nav: "space-x-1 flex items-center",
                                nav_button: cn(
                                    "h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100 border border-white/20 rounded-full hover:bg-white/20 hover:border-white/40 transition-all flex items-center justify-center"
                                ),
                                nav_button_previous: "absolute left-1",
                                nav_button_next: "absolute right-1",
                                table: "w-full border-collapse space-y-1",
                                head_row: "flex",
                                head_cell:
                                    "text-[#1a1a2e] rounded-md w-9 font-black text-[10px] uppercase tracking-[1px]", // Day headers
                                row: "flex w-full mt-2",
                                cell: cn(
                                    "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                                    "[&:has([aria-selected].day-range-end)]:rounded-r-full [&:has([aria-selected].day-range-start)]:rounded-l-full",
                                    "[&:has([aria-selected].day-range-start.day-range-end)]:rounded-full"
                                ),
                                day: cn(
                                    "h-9 w-9 p-0 font-bold aria-selected:opacity-100 transition-all text-[#1a1a2e] hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] rounded-full"
                                ),
                                day_range_start: "day-range-start rounded-r-none rounded-l-full bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary-glow)]",
                                day_range_end: "day-range-end rounded-l-none rounded-r-full bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary-glow)]",
                                day_selected:
                                    "bg-[var(--primary)] text-white hover:bg-[var(--primary)] hover:text-white focus:bg-[var(--primary)] focus:text-white z-30 relative", 
                                day_today: "border-2 border-[var(--primary)] font-black rounded-full", // Today
                                day_outside:
                                    "day-outside text-[#1a1a2e] opacity-40 aria-selected:bg-transparent aria-selected:text-[#1a1a2e] aria-selected:opacity-30",
                                day_disabled: "text-[#1a1a2e] opacity-10 pointer-events-none cursor-not-allowed",
                                day_range_middle:
                                    "aria-selected:bg-[var(--primary)]/15 aria-selected:text-[var(--primary)] aria-selected:font-black rounded-none", // Range middle - glassy bar
                                day_hidden: "invisible" }}
                        />
                    </div>

                    {/* Presets */}
                    <div className="px-5 pt-2 pb-4 border-b border-white/10">
                        <div className="flex items-center gap-2">
                            <span className="text-[12px] font-semibold text-[#1a1a2e] mr-2">Presets:</span>
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
                                        "text-[12px] font-bold px-3 py-1.5 rounded-full border transition-all",
                                        isPresetActive(preset.value)
                                            ? "bg-[var(--primary)] border-[var(--primary)] text-white shadow-[0_4px_12px_var(--primary-glow)]"
                                            : "bg-white/10 border-[#1a1a2e]/20 text-[#1a1a2e] hover:bg-white/20 hover:border-[#1a1a2e]/30"
                                    )}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="p-4 bg-white/5 backdrop-blur-md flex items-center justify-between border-t border-white/10">
                        <div className="flex items-center gap-3 bg-white/20 border border-white/30 rounded-[12px] px-4 py-2.5 shadow-inner">
                            <CalendarIcon className="h-4 w-4 text-[var(--primary)]" />
                            <div className="text-[13px] font-bold text-[#1a1a2e]">
                                {tempDate?.from ? format(tempDate.from, "MMM dd, yyyy") : "Start"}
                                <span className="mx-2 text-[var(--primary)]/60">→</span>
                                {tempDate?.to ? format(tempDate.to, "MMM dd, yyyy") : "End"}
                            </div>
                            {tempDate?.from && tempDate?.to && (
                                <span className="bg-[var(--primary)] text-white text-[10px] font-black px-2 py-0.5 rounded-full ml-2 shadow-[0_2px_8px_var(--primary-glow)]">
                                    {differenceInDays(tempDate.to, tempDate.from) + 1} DAYS
                                </span>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <Button variant="ghost" onClick={handleCancel} className="text-[#1a1a2e] font-bold hover:text-black hover:bg-white/10 rounded-xl px-5">
                                Cancel
                            </Button>
                            <Button onClick={handleApply} className="bg-[var(--primary)] hover:bg-[#EA6C00] text-white font-black uppercase tracking-widest text-[12px] px-6 rounded-xl shadow-[0_8px_20px_var(--primary-glow)] transition-all hover:scale-[1.02] active:scale-[0.98]">
                                Apply Range
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}
