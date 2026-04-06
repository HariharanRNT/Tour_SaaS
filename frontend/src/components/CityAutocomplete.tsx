'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Check, ChevronsUpDown, Loader2, MapPin } from 'lucide-react'
import { City } from 'country-state-city'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { debounce } from 'lodash'

interface CityAutocompleteProps {
    countryName: string
    value: string
    onChange: (value: string) => void
    placeholder?: string
    className?: string
}

// Simple cache for cities per country to avoid recomputing city list on every render
const cityCache: Record<string, string[]> = {}

const normalizeCity = (val: string) => {
    if (!val) return ''
    const trimmed = val.trim()
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

export function CityAutocomplete({
    countryName,
    value,
    onChange,
    placeholder = "Select city...",
    className
}: CityAutocompleteProps) {
    const [open, setOpen] = useState(false)
    const [inputValue, setInputValue] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [currentCities, setCurrentCities] = useState<{ name: string, country: string }[]>([])

    // Debounced search handler
    const debouncedSearch = useCallback(
        debounce((query: string) => {
            setSearchQuery(query)
        }, 300),
        []
    )

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value
        setInputValue(query)
        debouncedSearch(query)
    }

    const handleSelect = (cityName: string) => {
        const normalized = normalizeCity(cityName)
        if (normalized) {
            onChange(normalized)
            setOpen(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            const trimmed = inputValue.trim()
            if (!trimmed) return

            // If there's a matching suggestion, use the first one
            if (filteredResults.length > 0) {
                // If it's an exact match (case-insensitive), or just use the first result
                const exactMatch = filteredResults.find(r => r.name.toLowerCase() === trimmed.toLowerCase())
                handleSelect(exactMatch ? exactMatch.name : filteredResults[0].name)
            } else {
                // Use the custom input value
                handleSelect(trimmed)
            }
        }
    }

    // Fetch cities from backend or library when country changes
    useEffect(() => {
        if (!countryName) {
            const countries = require('country-state-city').Country.getAllCountries()
            setCurrentCities(countries.map((c: any) => ({ isCountry: true, name: c.name, isoCode: c.isoCode })))
            return
        }

        if (cityCache[countryName]) {
            setCurrentCities(cityCache[countryName].map(c => ({ name: c, country: countryName })))
            return
        }

        const fetchCities = async () => {
            setIsLoading(true)
            try {
                let data = []
                try {
                    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/locations/cities?country=${encodeURIComponent(countryName)}`)
                    if (response.ok) {
                        data = await response.json()
                    }
                } catch (e) {
                    console.warn("Backend city API unavailable, falling back to library")
                }

                if (data && data.length > 0) {
                    cityCache[countryName] = data
                    setCurrentCities(data.map((c: string) => ({ name: c, country: countryName })))
                } else {
                    const countries = require('country-state-city').Country.getAllCountries()
                    const country = countries.find((c: any) => c.name === countryName)
                    if (country) {
                        const cities = City.getCitiesOfCountry(country.isoCode)
                        const cityNames = cities ? cities.map(c => c.name) : []
                        cityCache[countryName] = cityNames
                        setCurrentCities(cityNames.map(c => ({ name: c, country: countryName })))
                    }
                }
            } catch (error) {
                console.error("Error fetching cities:", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchCities()
    }, [countryName])

    // Filter cities based on search query
    const filteredResults = useMemo(() => {
        const query = searchQuery.toLowerCase().trim()
        const countries = require('country-state-city').Country.getAllCountries()

        if (countryName) {
            if (!query) return currentCities.slice(0, 100)
            if (query === countryName.toLowerCase()) return currentCities.slice(0, 100)

            return currentCities
                .filter(city => city.name.toLowerCase().includes(query))
                .slice(0, 100)
        }

        if (!query) return []

        const matchedCountry = countries.find((c: any) => c.name.toLowerCase() === query || c.name.toLowerCase().includes(query))
        if (matchedCountry && query.length > 2) {
            const cities = City.getCitiesOfCountry(matchedCountry.isoCode)
            if (cities) {
                return cities.map(c => ({ name: c.name, country: matchedCountry.name })).slice(0, 100)
            }
        }

        return [] 
    }, [currentCities, searchQuery, countryName])

    // Reset when popover opens/closes
    useEffect(() => {
        if (open) {
            setInputValue('')
            setSearchQuery('')
        }
    }, [open])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "w-full justify-between glass-input h-11 border-gray-200 rounded-xl px-3 font-normal",
                        !value && "text-black opacity-60",
                        className
                    )}
                >
                    <div className="flex items-center gap-2 truncate">
                        <MapPin className="h-4 w-4 text-black shrink-0" />
                        <span className="truncate">{value || placeholder}</span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className={cn("pkg-creation-root glass-dropdown-content w-[var(--radix-popover-trigger-width)] p-0 border-white/20 shadow-xl")} align="start">
                <div className="flex items-center border-b px-3 border-white/10">
                    <Input
                        placeholder="Search city..."
                        className="h-10 border-0 focus-visible:ring-0 bg-transparent text-sm"
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        autoFocus
                    />
                </div>
                <ScrollArea className="h-[300px]">
                    <div className="p-1">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-6 text-sm text-black font-bold">
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Loading...
                            </div>
                        ) : (
                            <>
                                {filteredResults.map((result: any) => (
                                    <button
                                        key={`${result.name}-${result.country}`}
                                        className={cn(
                                            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-[var(--primary)]/10 text-left",
                                            value === result.name ? "bg-[var(--primary)]/20 text-[var(--primary)] font-bold" : "text-black font-medium"
                                        )}
                                        onClick={() => handleSelect(result.name)}
                                    >
                                        <Check
                                            className={cn(
                                                "h-4 w-4",
                                                value === result.name ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        <div className="flex flex-col">
                                            <span>{result.name}</span>
                                            {!countryName && <span className="text-[10px] text-black font-bold opacity-60">{result.country}</span>}
                                        </div>
                                    </button>
                                ))}

                                {inputValue.trim() && !filteredResults.some(r => r.name.toLowerCase() === inputValue.trim().toLowerCase()) && (
                                    <button
                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-[var(--primary)]/10 text-left text-[var(--primary)] font-medium bg-[var(--primary)]/5 mt-1 border border-dashed border-[var(--primary)]/20"
                                        onClick={() => handleSelect(inputValue)}
                                    >
                                        <Check className="h-4 w-4 opacity-0" />
                                        <div className="flex flex-col">
                                            <span>Use "{inputValue.trim()}"</span>
                                            <span className="text-[10px] opacity-70">Add custom city</span>
                                        </div>
                                    </button>
                                )}

                                {filteredResults.length === 0 && !inputValue.trim() && (
                                    <div className="py-6 text-center text-sm text-black font-bold">
                                        Type to search cities...
                                    </div>
                                )}
                                
                                {filteredResults.length === 0 && inputValue.trim() && (
                                    <div className="px-3 py-2 text-[10px] text-black uppercase tracking-wider font-bold text-center border-t border-white/10 mt-1">
                                        Can't find your city? Press Enter to add it
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    )
}
