import { useState } from 'react'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { User, Check } from 'lucide-react'
import { format } from "date-fns"
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
}

import { FloatingLabelInput } from "@/components/ui/floating-input"

export function TravelerForm({ traveler, index, onChange, errors = {} }: TravelerFormProps) {
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
    const years = Array.from({ length: 120 }, (_, i) => (currentYear - i).toString())

    const handleDateChange = (type: 'day' | 'month' | 'year', val: string) => {
        let newD = d || '01'
        let newM = m || '01'
        let newY = y || '2000'

        if (type === 'day') newD = val
        if (type === 'month') newM = val
        if (type === 'year') newY = val

        // Basic validation for days in month could be added here if strictly needed, 
        // but for now relying on user sanity or basic check logic if we want to be fancy.
        // Let's just update for now.
        onChange(index, 'date_of_birth', `${newY}-${newM}-${newD}`)
    }

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-6 hover:shadow-md transition-shadow duration-300 relative overflow-hidden">
            {/* Top accent bar */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-20"></div>

            <h3 className="font-bold text-slate-800 text-lg flex items-center justify-between border-b border-slate-50 pb-4">
                <span className="flex items-center gap-3">
                    <span className="bg-blue-50 text-blue-600 p-2 rounded-full ring-1 ring-blue-100">
                        <User className="h-5 w-5" />
                    </span>
                    Traveler {index + 1}
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full ml-1">
                        {traveler.type}
                    </span>
                </span>
            </h3>

            {/* Row 1: Title & Names */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                <div className="md:col-span-2">
                    <div className="relative group">
                        <Select value={traveler.title} onValueChange={(val) => onChange(index, 'title', val)}>
                            <SelectTrigger className="w-full h-12 bg-white border-slate-200 px-3 pt-4 pb-1 text-sm shadow-sm transition-all outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-left">
                                <SelectValue placeholder=" " />
                            </SelectTrigger>
                            <SelectContent>
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
                                        className={!opt.types.includes(traveler.type) ? 'opacity-50 cursor-not-allowed hidden' : ''}
                                    >
                                        {opt.val}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <label className="absolute left-3 top-1 z-10 origin-[0] -translate-y-0 scale-75 transform text-xs text-slate-500 duration-150 pointer-events-none">
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
                    />
                </div>
                <div className="md:col-span-5">
                    <FloatingLabelInput
                        id={`lname-${index}`}
                        label="Last Name"
                        value={traveler.last_name}
                        onChange={(e: any) => onChange(index, 'last_name', e.target.value)}
                    />
                </div>
            </div>

            {/* Row 2: DOB & Gender */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Gender Segmented Control */}
                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide ml-1">Gender</Label>
                    <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-100">
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
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-lg transition-all",
                                    traveler.gender === g.val
                                        ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200"
                                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                                )}
                            >
                                {g.label}
                                {traveler.gender === g.val && <Check className="h-3.5 w-3.5" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Date Selection Dropdowns */}
                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide ml-1">Date of Birth</Label>
                    <div className="grid grid-cols-3 gap-2">
                        {/* Day */}
                        <Select value={d} onValueChange={(val) => handleDateChange('day', val)}>
                            <SelectTrigger className="bg-slate-50 border-slate-200">
                                <SelectValue placeholder="Day" />
                            </SelectTrigger>
                            <SelectContent>
                                {days.map(day => (
                                    <SelectItem key={day} value={day}>{day}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Month */}
                        <Select value={m} onValueChange={(val) => handleDateChange('month', val)}>
                            <SelectTrigger className="bg-slate-50 border-slate-200">
                                <SelectValue placeholder="Month" />
                            </SelectTrigger>
                            <SelectContent>
                                {months.map(mon => (
                                    <SelectItem key={mon.value} value={mon.value}>{mon.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Year */}
                        <Select value={y} onValueChange={(val) => handleDateChange('year', val)}>
                            <SelectTrigger className="bg-slate-50 border-slate-200">
                                <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map(yr => (
                                    <SelectItem key={yr} value={yr}>{yr}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
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
                />

                <FloatingLabelInput
                    id={`pass-${index}`}
                    label="Passport Number (Optional for Domestic)"
                    value={traveler.passport_number}
                    onChange={(e: any) => onChange(index, 'passport_number', e.target.value.toUpperCase())}
                />
            </div>
        </div>
    )
}
