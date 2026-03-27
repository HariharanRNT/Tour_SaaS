import { useState } from 'react'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { User, Check } from 'lucide-react'
import { format, differenceInYears, parseISO } from "date-fns"
import { cn } from "@/lib/utils"

export interface Traveler {
    id: string
    title: string
    first_name: string
    last_name: string
    date_of_birth: string
    gender: string
    passport_number: string
    passport_expiry: string
    nationality: string
    type: 'ADULT' | 'CHILD' | 'INFANT'
}

interface TravelerFormProps {
    traveler: Traveler
    index: number
    onChange: (index: number, field: keyof Traveler, value: string) => void
    errors?: Record<string, string>
    travelDate: string
}

import { FloatingLabelInput } from "@/components/ui/floating-input"

export function TravelerForm({ traveler, index, onChange, errors = {}, travelDate }: TravelerFormProps) {
    // Parse existing DOB or default
    const [y, m, d] = traveler.date_of_birth ? traveler.date_of_birth.split('-') : ['', '', '']

    // Helper arrays
    const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'))
    const months = [
        { value: '01', label: 'Jan' }, { value: '02', label: 'Feb' }, { value: '03', label: 'Mar' },
        { value: '04', label: 'Apr' }, { value: '05', label: 'May' }, { value: '06', label: 'Jun' },
        { value: '07', label: 'Jul' }, { value: '08', label: 'Aug' }, { value: '09', label: 'Sep' },
        { value: '10', label: 'Oct' }, { value: '11', label: 'Nov' }, { value: '12', label: 'Dec' }
    ]
    const currentYear = new Date().getFullYear()
    const tripYear = travelDate ? parseISO(travelDate).getFullYear() : currentYear

    let years: string[] = []
    if (traveler.type === 'INFANT') {
        // Infant: Age < 2 years on travel date
        years = Array.from({ length: 3 }, (_, i) => (tripYear - i).toString())
    } else if (traveler.type === 'CHILD') {
        // Child: Age >= 2 and < 12 years
        years = Array.from({ length: 11 }, (_, i) => (tripYear - 2 - i).toString())
    } else {
        // Adult: Age >= 12 years
        years = Array.from({ length: 110 }, (_, i) => (tripYear - 12 - i).toString())
    }

    const calculateAge = (dob: string, tripDate: string) => {
        if (!dob || dob.includes('--') || !tripDate) return null
        try {
            const birthDate = parseISO(dob)
            const travelDateObj = parseISO(tripDate)
            return differenceInYears(travelDateObj, birthDate)
        } catch (e) {
            return null
        }
    }

    const classifyTraveler = (age: number): 'ADULT' | 'CHILD' | 'INFANT' => {
        if (age < 2) return 'INFANT'
        if (age < 12) return 'CHILD'
        return 'ADULT'
    }

    const handleDateChange = (type: 'day' | 'month' | 'year', val: string) => {
        let newD = d
        let newM = m
        let newY = y

        if (type === 'day') newD = val
        if (type === 'month') newM = val
        if (type === 'year') newY = val

        const newDob = `${newY}-${newM}-${newD}`
        onChange(index, 'date_of_birth', newDob)

        // Auto-classification (only if all parts are present)
        if (travelDate && newD && newM && newY) {
            const age = calculateAge(newDob, travelDate)
            if (age !== null) {
                const newType = classifyTraveler(age)
                if (newType !== traveler.type) {
                    onChange(index, 'type', newType)

                    // Auto-adjust title if needed
                    if (newType === 'INFANT') {
                        onChange(index, 'title', 'Infant')
                    } else if (newType === 'CHILD') {
                        if (traveler.gender === 'MALE') onChange(index, 'title', 'Mstr')
                        else onChange(index, 'title', 'Miss')
                    } else if (newType === 'ADULT') {
                        if (traveler.gender === 'MALE') onChange(index, 'title', 'Mr')
                        else onChange(index, 'title', 'Mrs')
                    }
                }
            }
        }
    }

    return (
        <div className="bg-white/15 backdrop-blur-xl p-6 rounded-[24px] border border-white/35 shadow-[0_8px_32px_var(--primary-glow)] space-y-6 hover:shadow-[0_12px_40px_var(--primary-glow)] transition-shadow duration-300 relative overflow-hidden">
            <h3 className="font-bold text-[#3A1A08] font-display text-xl flex items-center justify-between border-b border-white/20 pb-4">
                <span className="flex items-center gap-3">
                    <span className="bg-[var(--primary)]/10 text-[var(--primary)] p-2 rounded-xl border border-[var(--primary)]/20">
                        <User className="h-5 w-5" />
                    </span>
                    Traveler {index + 1}
                    <span className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-wider bg-white/20 border border-[var(--primary)]/20 px-2.5 py-1 rounded-full ml-2 shadow-inner">
                        {traveler.type}
                    </span>
                </span>
            </h3>

            {/* Row 1: Title & Names */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                <div className="md:col-span-2">
                    <div className="relative group">
                        <Select value={traveler.title} onValueChange={(val) => onChange(index, 'title', val)}>
                            <SelectTrigger className="w-full h-14 bg-white/25 border-white/40 rounded-[14px] px-3 pt-5 pb-1 text-sm shadow-sm transition-all outline-none focus:bg-white/40 focus:border-[var(--primary)] focus:ring-[3px] focus:ring-[var(--primary)]/25 text-[#5C2500] font-bold backdrop-blur-sm">
                                <SelectValue placeholder=" " />
                            </SelectTrigger>
                            <SelectContent className="bg-white/95 backdrop-blur-md rounded-[14px] border border-white/50">
                                {[
                                    { val: 'Mr', types: ['ADULT'] },
                                    { val: 'Mrs', types: ['ADULT'] },
                                    { val: 'Ms', types: ['ADULT'] },
                                    { val: 'Master', types: ['CHILD'] },
                                    { val: 'Miss', types: ['CHILD'] },
                                    { val: 'Infant', types: ['INFANT'] },
                                    { val: 'Mstr', types: ['CHILD'] }
                                ].filter((opt, index, self) =>
                                    index === self.findIndex((t) => (
                                        t.val === opt.val
                                    ))
                                ).map((opt) => (
                                    <SelectItem
                                        key={opt.val}
                                        value={opt.val}
                                        disabled={!opt.types.includes(traveler.type)}
                                        className={!opt.types.includes(traveler.type) ? 'opacity-50 cursor-not-allowed hidden' : 'font-bold text-[#3A1A08] focus:bg-[var(--primary)]/10'}
                                    >
                                        {opt.val}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <label className="absolute left-3 top-2 z-10 origin-[0] -translate-y-0 scale-75 transform text-[10px] font-bold tracking-widest uppercase text-[#A0501E] duration-150 pointer-events-none">
                            Title
                        </label>
                    </div>
                </div>

                {/* Names */}
                <div className="md:col-span-5">
                    <FloatingLabelInput
                        id={`fname-${index}`}
                        label="First Name (As on Passport)"
                        value={traveler.first_name}
                        onChange={(e: any) => onChange(index, 'first_name', e.target.value)}
                        error={errors[`first_name_${index}`]}
                        className="!h-14 !bg-white/25 !border-white/40 !rounded-[14px] focus:!bg-white/40 focus:!border-[var(--primary)] focus:!ring-[3px] focus:!ring-[var(--primary)]/25 !text-[#5C2500] !font-bold transition-all"
                    />
                </div>
                <div className="md:col-span-5">
                    <FloatingLabelInput
                        id={`lname-${index}`}
                        label="Last Name"
                        value={traveler.last_name}
                        onChange={(e: any) => onChange(index, 'last_name', e.target.value)}
                        className="!h-14 !bg-white/25 !border-white/40 !rounded-[14px] focus:!bg-white/40 focus:!border-[var(--primary)] focus:!ring-[3px] focus:!ring-[var(--primary)]/25 !text-[#5C2500] !font-bold transition-all"
                    />
                </div>
            </div>

            {/* Row 2: DOB & Gender */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Gender Segmented Control */}
                <div className="space-y-1.5 relative z-10">
                    <Label className="text-[10px] font-bold text-[#A0501E] uppercase tracking-widest ml-1 drop-shadow-sm">Gender</Label>
                    <div className="flex bg-white/20 p-1 rounded-[16px] border border-white/40 h-14 items-center shadow-inner backdrop-blur-sm">
                        {[
                            { val: 'MALE', label: 'Male' },
                            { val: 'FEMALE', label: 'Female' }
                        ].map((g) => (
                            <button
                                key={g.val}
                                onClick={() => {
                                    onChange(index, 'gender', g.val)
                                    // Auto-adjust title if needed
                                    if (traveler.type === 'ADULT') {
                                        if (g.val === 'MALE') onChange(index, 'title', 'Mr')
                                        else onChange(index, 'title', 'Mrs')
                                    } else if (traveler.type === 'CHILD') {
                                        if (g.val === 'MALE') onChange(index, 'title', 'Mstr')
                                        else onChange(index, 'title', 'Miss')
                                    }
                                }}
                                type="button"
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 text-sm font-bold h-full rounded-[12px] transition-all",
                                    traveler.gender === g.val
                                        ? "bg-[var(--primary)] text-white shadow-[0_4px_16px_var(--primary-glow)] ring-1 ring-[var(--primary)]"
                                        : "text-[#8B5030] hover:text-[#5C2500] hover:bg-white/40"
                                )}
                            >
                                {g.label}
                                {traveler.gender === g.val && <Check className="h-4 w-4" />}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-1.5 relative z-10 group">
                    <Label className="text-[10px] font-bold text-[#A0501E] uppercase tracking-widest ml-1 drop-shadow-sm group-focus-within:text-[var(--primary)] transition-colors">
                        Date of Birth <span className="text-red-500">*</span>
                    </Label>
                    <div className="bg-white/20 p-1 rounded-[16px] border border-white/40 h-14 flex items-center shadow-inner backdrop-blur-sm group-focus-within:border-[var(--primary)] group-focus-within:ring-[3px] group-focus-within:ring-[var(--primary)]/25 transition-all">
                        {/* Day */}
                        <Select value={d} onValueChange={(val) => handleDateChange('day', val)}>
                            <SelectTrigger className="flex-1 h-full bg-transparent border-none text-[#5C2500] font-bold focus:ring-0 shadow-none px-3">
                                <SelectValue placeholder="DD" />
                            </SelectTrigger>
                            <SelectContent className="bg-white/95 backdrop-blur-md rounded-[14px] border border-white/50">
                                {days.map(day => (
                                    <SelectItem key={day} value={day} className="font-bold text-[#3A1A08] focus:bg-[var(--primary)]/10">{day}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="w-px h-8 bg-white/30 mx-0.5" />

                        {/* Month */}
                        <Select value={m} onValueChange={(val) => handleDateChange('month', val)}>
                            <SelectTrigger className="flex-1 h-full bg-transparent border-none text-[#5C2500] font-bold focus:ring-0 shadow-none px-3">
                                <SelectValue placeholder="MMM" />
                            </SelectTrigger>
                            <SelectContent className="bg-white/95 backdrop-blur-md rounded-[14px] border border-white/50">
                                {months.map(mon => (
                                    <SelectItem key={mon.value} value={mon.value} className="font-bold text-[#3A1A08] focus:bg-[var(--primary)]/10">{mon.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="w-px h-8 bg-white/30 mx-0.5" />

                        {/* Year */}
                        <Select value={y} onValueChange={(val) => handleDateChange('year', val)}>
                            <SelectTrigger className="flex-[1.2] h-full bg-transparent border-none text-[#5C2500] font-bold focus:ring-0 shadow-none px-3">
                                <SelectValue placeholder="YYYY" />
                            </SelectTrigger>
                            <SelectContent className="bg-white/95 backdrop-blur-md rounded-[14px] border border-white/50 h-[300px]">
                                {years.map(yr => (
                                    <SelectItem key={yr} value={yr} className="font-bold text-[#3A1A08] focus:bg-[var(--primary)]/10">{yr}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {errors[`dob_age_${index}`] && (
                        <p className="text-[10px] font-bold text-red-500 mt-1 ml-1 animate-pulse">
                            {errors[`dob_age_${index}`]}
                        </p>
                    )}
                </div>
            </div>

            {/* Row 3: Nationality & Passport (Optional/Required Logic) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                <FloatingLabelInput
                    id={`nat-${index}`}
                    label="Nationality (ISO Code e.g. IN)"
                    value={traveler.nationality}
                    onChange={(e: any) => onChange(index, 'nationality', e.target.value.toUpperCase())}
                    maxLength={2}
                    className="!h-14 !bg-white/25 !border-white/40 !rounded-[14px] focus:!bg-white/40 focus:!border-[var(--primary)] focus:!ring-[3px] focus:!ring-[var(--primary)]/25 !text-[#5C2500] !font-bold transition-all"
                />

                <FloatingLabelInput
                    id={`pass-${index}`}
                    label="Passport Number (Optional for Domestic)"
                    value={traveler.passport_number}
                    onChange={(e: any) => onChange(index, 'passport_number', e.target.value.toUpperCase())}
                    className="!h-14 !bg-white/25 !border-white/40 !rounded-[14px] focus:!bg-white/40 focus:!border-[var(--primary)] focus:!ring-[3px] focus:!ring-[var(--primary)]/25 !text-[#5C2500] !font-bold transition-all"
                />
            </div>
        </div>
    )
}
