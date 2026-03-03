'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog'
import { PassengerCounter } from '@/components/packages/PassengerCounter'
import { MapPin, Search, Calendar as CalendarIcon, Users, Filter, X, ChevronRight, ArrowRight, Loader2, PlayCircle, Image as ImageIcon, CheckCircle2, RotateCcw, ChevronDown, Check } from 'lucide-react'
import { toast } from "react-toastify"
import { useTheme } from '@/context/ThemeContext'
import Image from 'next/image'

// Types
interface Package {
    id: string;
    title: string;
    slug: string;
    destination: string;
    country: string;
    duration_days: number;
    duration_nights: number;
    price_per_person: number;
    trip_style: string;
    activities: string[];
    package_mode: string;
    destinations: { city: string, country: string, days: number }[];
    feature_image_url?: string;
    images?: { url: string }[];
    itinerary_items?: { day_number: number, title: string, description: string, city?: string }[];
    included_items?: string[];
    // GST fields
    gst_applicable?: boolean;
    gst_percentage?: number;
    gst_mode?: string;
}

export default function PlanTripPage() {
    const router = useRouter()
    const { theme } = useTheme()

    // Booking Modal State
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
    const [selectedPackageForBooking, setSelectedPackageForBooking] = useState<Package | null>(null)
    const [selectedDate, setSelectedDate] = useState('')
    const [travelers, setTravelers] = useState({ adults: 2, children: 0, infants: 0 })

    // UI State
    const [loading, setLoading] = useState(false)
    const [searching, setSearching] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [inputValue, setInputValue] = useState('')
    const [suggestions, setSuggestions] = useState<{ label: string, value: string, type: string }[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [popularDestinations, setPopularDestinations] = useState<string[]>([])

    // Results State
    const [isActivitiesOpen, setIsActivitiesOpen] = useState(false)
    const [isTripStyleOpen, setIsTripStyleOpen] = useState(false)
    const [isSliderDragging, setIsSliderDragging] = useState(false)

    // Load initial packages, setPackages] = useState<Package[]>([])
    const [packages, setPackages] = useState<Package[]>([])
    const [totalPackages, setTotalPackages] = useState(0)
    const [hasSearched, setHasSearched] = useState(false) // Whether user has executed a search/filter to show grid

    // Filter State
    const [filters, setFilters] = useState({
        package_mode: 'all',
        duration_min: 1,
        duration_max: 30,
        price_min: 0,
        price_max: 500000,
        trip_styles: [] as string[],
        activities: [] as string[],
        countries: [] as string[]
    })

    // Sort State
    const [sort, setSort] = useState('recommended')

    // Constants for filters
    const TRIP_STYLES = ['Adventure', 'Leisure', 'Cultural', 'Family', 'Honeymoon', 'Luxury', 'Wellness', 'Group Tour', 'Corporate']
    const ACTIVITIES = ['Beach', 'Mountain', 'Trekking', 'Heritage', 'Nature', 'Food & Culinary', 'City Tour', 'Snow', 'Pilgrimage', 'Water Sports', 'Safari', 'Cycling', 'Wine Tour', 'Photography', 'Festivals']
    const AVAILABLE_COUNTRIES = ['India', 'France', 'Italy', 'Spain', 'Germany', 'Switzerland', 'Thailand', 'Maldives', 'Indonesia', 'UAE'] // Ideally fetched from API

    // Refs
    const searchRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Global drag selection lock
    useEffect(() => {
        if (isSliderDragging) {
            document.body.style.userSelect = 'none';
            document.body.style.webkitUserSelect = 'none';
        } else {
            document.body.style.userSelect = '';
            document.body.style.webkitUserSelect = '';
        }
    }, [isSliderDragging]);

    // Initial load - Fetch popular destinations
    useEffect(() => {
        const fetchPopularDestinations = async () => {
            try {
                const domain = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
                const res = await fetch('http://localhost:8000/api/v1/packages/config/destinations/popular', {
                    headers: { 'X-Domain': domain }
                })
                if (res.ok) {
                    const data = await res.json()
                    if (data && data.length > 0) {
                        setPopularDestinations(data)
                    } else {
                        setPopularDestinations(['Goa', 'Mumbai', 'Delhi', 'Manali', 'Kerala'])
                    }
                } else {
                    setPopularDestinations(['Goa', 'Mumbai', 'Delhi', 'Manali', 'Kerala'])
                }
            } catch (error) {
                setPopularDestinations(['Goa', 'Mumbai', 'Delhi', 'Manali', 'Kerala'])
            }
        }
        fetchPopularDestinations()

        // Handle click outside to close suggestions
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        const handleDragEnd = () => setIsSliderDragging(false);

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("mouseup", handleDragEnd);
        document.addEventListener("touchend", handleDragEnd);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("mouseup", handleDragEnd);
            document.removeEventListener("touchend", handleDragEnd);
        }
    }, [])

    // Fetch Suggestions while typing
    const fetchSuggestions = async (q: string) => {
        if (q.length < 3) {
            setSuggestions([])
            return
        }

        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }

        const controller = new AbortController()
        abortControllerRef.current = controller

        try {
            const domain = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
            const res = await fetch(`http://localhost:8000/api/v1/packages/config/suggestions?q=${encodeURIComponent(q)}`, {
                headers: { 'X-Domain': domain },
                signal: controller.signal
            })
            if (res.ok) {
                const data = await res.json()
                setSuggestions(data)
            }
        } catch (error: any) {
            if (error.name === 'AbortError') {
                // Ignore aborted requests
            } else {
                console.error("Failed to fetch suggestions", error)
            }
        }
    }

    // Debounce effect for suggestions
    useEffect(() => {
        if (inputValue.length < 3) {
            setSuggestions([])
            return
        }

        const timer = setTimeout(() => {
            fetchSuggestions(inputValue)
        }, 400)

        return () => clearTimeout(timer)
    }, [inputValue])

    const handleSearchSubmit = (term?: string) => {
        let finalTerm = term !== undefined ? term : inputValue;

        // Normalize: "Chennai, India" -> "Chennai" for better matching
        if (finalTerm.includes(',')) {
            finalTerm = finalTerm.split(',')[0].trim();
        }

        setSearchQuery(finalTerm)
        setHasSearched(true)
        setShowSuggestions(false)
    }

    // Execute Search / Filter
    const executeSearch = async () => {
        setSearching(true)
        setShowSuggestions(false)
        setHasSearched(true)

        try {
            const domain = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
            const params = new URLSearchParams()

            if (searchQuery) params.append('search', searchQuery)
            if (filters.package_mode !== 'all') params.append('package_mode', filters.package_mode)

            // Duration ranges
            if (filters.duration_min > 1) params.append('duration_min', filters.duration_min.toString())
            if (filters.duration_max < 30) params.append('duration_max', filters.duration_max.toString())

            // Price ranges
            if (filters.price_min > 0) params.append('price_min', filters.price_min.toString())
            if (filters.price_max < 500000) params.append('price_max', filters.price_max.toString())

            // Arrays
            filters.trip_styles.forEach(ts => params.append('trip_styles', ts))
            filters.activities.forEach(act => params.append('activities', act))
            filters.countries.forEach(c => params.append('countries', c))

            // Sort
            if (sort !== 'recommended') params.append('sort', sort)

            const res = await fetch(`http://localhost:8000/api/v1/packages?${params.toString()}`, {
                headers: { 'X-Domain': domain }
            })

            if (res.ok) {
                const data = await res.json()
                setPackages(data.packages)
                setTotalPackages(data.total)
            } else {
                toast.error("Failed to fetch packages")
            }
        } catch (error) {
            console.error("Search failed:", error)
            toast.error("Error connecting to server")
        } finally {
            setSearching(false)
        }
    }

    // Run search when searchQuery or hasSearched changes (Instant)
    useEffect(() => {
        if (hasSearched) {
            executeSearch()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery, hasSearched])

    // Run search when filters or sort change (Debounced)
    useEffect(() => {
        if (hasSearched) {
            // Debounce to prevent multiple API calls while sliding sliders
            const timer = setTimeout(() => {
                executeSearch()
            }, 500)
            return () => clearTimeout(timer)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters, sort])

    // Filter Handlers
    const toggleFilterArray = (key: 'trip_styles' | 'activities' | 'countries', value: string) => {
        setFilters(prev => {
            const current = prev[key]
            if (current.includes(value)) {
                return { ...prev, [key]: current.filter(item => item !== value) }
            } else {
                return { ...prev, [key]: [...current, value] }
            }
        })
    }

    const removeFilter = (key: string, value?: string) => {
        if (key === 'package_mode') setFilters(prev => ({ ...prev, package_mode: 'all' }))
        else if (key === 'duration') setFilters(prev => ({ ...prev, duration_min: 1, duration_max: 30 }))
        else if (key === 'price') setFilters(prev => ({ ...prev, price_min: 0, price_max: 500000 }))
        else if (key === 'searchQuery') {
            setSearchQuery('');
            if (hasSearched) setTimeout(executeSearch, 0); // Re-run immediately
        }
        else if (value) {
            setFilters(prev => ({
                ...prev,
                [key as 'trip_styles' | 'activities' | 'countries']: prev[key as 'trip_styles' | 'activities' | 'countries'].filter(item => item !== value)
            }))
        }
    }

    const clearAllFilters = () => {
        setSearchQuery('')
        setFilters({
            package_mode: 'all',
            duration_min: 1,
            duration_max: 30,
            price_min: 0,
            price_max: 500000,
            trip_styles: [],
            activities: [],
            countries: []
        })
        setSort('recommended')
    }

    // Helper to render active filter chips
    const renderActiveFilters = () => {
        const chips = []

        if (searchQuery) {
            chips.push(
                <Badge key="sq" variant="outline" className="px-4 py-1.5 flex items-center gap-2 border-0 bg-[#FFD6B9]/60 hover:bg-[#FFD6B9] text-[#A0501E] rounded-md font-bold text-[11px] shadow-sm transition-all cursor-default">
                    <span className="capitalize">{searchQuery}</span>
                    <X className="h-3 w-3 cursor-pointer hover:text-[#E8682A] transition-colors" onClick={() => removeFilter('searchQuery')} />
                </Badge>
            )
        }

        filters.trip_styles.forEach(ts => {
            chips.push(
                <Badge key={`ts-${ts}`} variant="outline" className="px-4 py-1.5 flex items-center gap-2 border-0 bg-[#FFD6B9]/60 hover:bg-[#FFD6B9] text-[#A0501E] rounded-md font-bold text-[11px] shadow-sm transition-all cursor-default">
                    <span>{ts}</span>
                    <X className="h-3 w-3 cursor-pointer hover:text-[#E8682A] transition-colors" onClick={() => removeFilter('trip_styles', ts)} />
                </Badge>
            )
        })
        filters.activities.forEach(act => {
            chips.push(
                <Badge key={`act-${act}`} variant="outline" className="px-4 py-1.5 flex items-center gap-2 border-0 bg-[#FFD6B9]/60 hover:bg-[#FFD6B9] text-[#A0501E] rounded-md font-bold text-[11px] shadow-sm transition-all cursor-default">
                    <span>{act}</span>
                    <X className="h-3 w-3 cursor-pointer hover:text-[#E8682A] transition-colors" onClick={() => removeFilter('activities', act)} />
                </Badge>
            )
        })

        if (chips.length > 0) {
            return (
                <div className="flex flex-wrap items-center gap-4 mb-4 mt-2">
                    {chips}
                    <button onClick={clearAllFilters} className="text-[11px] font-bold text-[#FF6B2B] hover:underline px-2 transition-all">Clear All</button>
                </div>
            )
        }
        return null;
    }

    // Move to step 2 (Actually creating logic)
    const handleContinueToBook = (pkg: Package) => {
        setSelectedPackageForBooking(pkg);
        setIsBookingModalOpen(true);
    }

    // Sub-components
    const FilterPanel = () => {
        const activeFilterCount = (
            (filters.package_mode !== 'all' ? 1 : 0) +
            (filters.duration_min > 1 || filters.duration_max < 30 ? 1 : 0) +
            (filters.price_min > 0 || filters.price_max < 500000 ? 1 : 0) +
            filters.trip_styles.length +
            filters.activities.length +
            filters.countries.length
        );

        return (
            <div className="flex flex-col h-full relative">
                <div className={`flex-1 ${isSliderDragging ? 'overflow-hidden' : 'overflow-y-auto'} custom-scrollbar px-6 pt-6 pb-28 space-y-6`}>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-[#5C2500] flex items-center gap-2 text-[16px]">
                            <Filter className="h-4 w-4 text-[#E8682A]" /> Filters
                            {activeFilterCount > 0 && (
                                <span className="bg-[#FF6B2B] text-white text-[10px] min-w-[20px] h-[20px] px-1.5 rounded-full flex items-center justify-center font-bold">
                                    {activeFilterCount}
                                </span>
                            )}
                        </h3>
                        <button onClick={clearAllFilters} className="text-[11px] text-[#A0501E] bg-white/40 px-3 py-1.5 rounded-full hover:bg-white/60 font-bold transition-all flex items-center gap-1.5 border border-white/50 shadow-sm backdrop-blur-sm">
                            <RotateCcw className="h-3 w-3" /> Reset All
                        </button>
                    </div>

                    {/* Package Type */}
                    <div className="space-y-4">
                        <p className="text-[10px] font-bold text-[#A0501E] uppercase tracking-widest border-b border-orange-200/50 pb-2 flex items-center gap-1.5">
                            <span className="text-[#FFB347]">📦</span> PACKAGE TYPE
                        </p>
                        <div className="flex flex-col gap-2">
                            {['all', 'single', 'multi'].map(type => (
                                <div
                                    key={type}
                                    onClick={() => setFilters(prev => ({ ...prev, package_mode: type }))}
                                    className={`
                                py-2.5 px-4 rounded-xl text-[13px] font-bold cursor-pointer border transition-all duration-300 flex items-center justify-between group
                                ${filters.package_mode === type
                                            ? 'bg-gradient-to-r from-[#FF6B2B] to-[#FF8C00] border-transparent text-white shadow-md'
                                            : 'bg-white/50 border-orange-100 text-[#7C3A10] hover:border-[#E8682A] hover:bg-white'}
                            `}
                                >
                                    <span>{type === 'all' ? 'All Packages' : type === 'single' ? 'Single City' : 'Multi-City Tours'}</span>
                                    {filters.package_mode === type && <CheckCircle2 className="h-4 w-4 text-white" />}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Duration */}
                    <div className="space-y-4 pt-4 border-t border-orange-200/30">
                        <p className="text-[10px] font-bold text-[#A0501E] uppercase tracking-wider flex justify-between items-center gap-1.5 mb-3">
                            <span className="flex items-center gap-1.5"><span className="text-[#4F46E5]">⏱️</span> DURATION</span>
                        </p>

                        <div className="flex flex-wrap gap-2 mb-4">
                            {['1-3', '4-6', '7-10', '10+'].map(range => {
                                const [minLabel, maxLabel] = range.includes('+') ? [10, 30] : range.split('-').map(Number);
                                const isActive = filters.duration_min === minLabel && filters.duration_max === maxLabel;

                                return (
                                    <button
                                        key={range}
                                        onClick={() => {
                                            setFilters(prev => ({ ...prev, duration_min: minLabel, duration_max: maxLabel }));
                                        }}
                                        className={`px-4 py-2 h-[36px] rounded-full text-[12px] font-bold transition-all border ${isActive ? 'bg-[#FF6B2B] text-white border-[#FF6B2B] shadow-[0_0_12px_rgba(255,107,43,0.3)]' : 'border-white/40 bg-white/25 text-[#7C3A10] hover:bg-[#FFD6B9]/50'}`}
                                    >
                                        {range} Days
                                    </button>
                                )
                            })}
                        </div>

                        <div
                            className="pt-2 px-2 flex flex-col gap-4 relative"
                            style={{ touchAction: 'none' }}
                            onPointerDown={(e) => { e.stopPropagation(); setIsSliderDragging(true); }}
                            onTouchStart={(e) => { e.stopPropagation(); setIsSliderDragging(true); }}
                            onMouseDown={(e) => { e.stopPropagation(); setIsSliderDragging(true); }}
                            onPointerUp={() => setIsSliderDragging(false)}
                            onPointerCancel={() => setIsSliderDragging(false)}
                        >
                            <div className="bg-[#FF6B2B]/85 text-white text-[11px] font-bold rounded-full py-1 px-3 mx-auto shadow-[0_2px_8px_rgba(255,107,43,0.25)] tracking-wide w-max">
                                {filters.duration_min} - {filters.duration_max} Days
                            </div>
                            <Slider
                                value={[filters.duration_min, filters.duration_max]}
                                min={1}
                                max={30}
                                step={1}
                                onValueChange={(vals) => setFilters(prev => ({ ...prev, duration_min: vals[0], duration_max: vals[1] }))}
                            />
                        </div>
                    </div>

                    {/* Budget */}
                    <div className="space-y-4 pt-4 border-t border-orange-200/30">
                        <p className="text-[10px] font-bold text-[#A0501E] uppercase tracking-wider flex items-center gap-1.5">
                            <span className="text-[#10B981]">💰</span> BUDGET (PER PERSON)
                        </p>

                        <div className="grid grid-cols-2 gap-2 mt-2">
                            {[
                                { label: 'Under ₹5K', min: 0, max: 5000 },
                                { label: '₹5K–₹20K', min: 5000, max: 20000 },
                                { label: '₹20K–₹50K', min: 20000, max: 50000 },
                                { label: '₹50K+', min: 50000, max: 500000 }
                            ].map(range => {
                                const isActive = filters.price_min === range.min && filters.price_max === range.max;
                                return (
                                    <button
                                        key={range.label}
                                        onClick={() => setFilters(prev => ({ ...prev, price_min: range.min, price_max: range.max }))}
                                        className={`px-3 py-2 h-[36px] rounded-full text-[11px] font-bold transition-all border ${isActive ? 'bg-[#FF6B2B] text-white border-[#FF6B2B] shadow-[0_0_12px_rgba(255,107,43,0.3)]' : 'border-white/40 bg-white/25 text-[#7C3A10] hover:bg-[#FFD6B9]/50'}`}
                                    >
                                        {range.label}
                                    </button>
                                )
                            })}
                        </div>

                        <div
                            className="pt-2 px-2 flex flex-col gap-4 relative"
                            style={{ touchAction: 'none' }}
                            onPointerDown={(e) => { e.stopPropagation(); setIsSliderDragging(true); }}
                            onTouchStart={(e) => { e.stopPropagation(); setIsSliderDragging(true); }}
                            onMouseDown={(e) => { e.stopPropagation(); setIsSliderDragging(true); }}
                            onPointerUp={() => setIsSliderDragging(false)}
                            onPointerCancel={() => setIsSliderDragging(false)}
                        >
                            <div className="bg-[#FF6B2B]/85 text-white text-[11px] font-bold rounded-full py-1 px-3 mx-auto shadow-[0_2px_8px_rgba(255,107,43,0.25)] tracking-wide w-max">
                                ₹{filters.price_min.toLocaleString()} — ₹{filters.price_max.toLocaleString()}
                            </div>
                            <Slider
                                value={[filters.price_min, filters.price_max]}
                                min={0}
                                max={500000}
                                step={5000}
                                onValueChange={(vals) => setFilters(prev => ({ ...prev, price_min: vals[0], price_max: vals[1] }))}
                            />
                        </div>
                    </div>

                    {/* Trip Style */}
                    <div className="pt-4 border-t border-orange-200/30">
                        <div
                            className="flex justify-between items-center cursor-pointer group"
                            onClick={() => setIsTripStyleOpen(!isTripStyleOpen)}
                        >
                            <p className="text-[10px] font-bold text-[#A0501E] uppercase tracking-wider flex items-center gap-1.5 group-hover:text-[#E8682A] transition-colors">
                                <span className="text-pink-400 text-sm">🌺</span> TRIP STYLE
                            </p>
                            <ChevronDown className={`h-4 w-4 text-[#A0501E] transition-transform duration-300 ${isTripStyleOpen ? 'rotate-180' : ''}`} />
                        </div>
                        {isTripStyleOpen && (
                            <div className="mt-3 max-h-[180px] overflow-y-auto custom-scrollbar pr-2 relative filter-list-container">
                                <div className="space-y-3 pb-6">
                                    {TRIP_STYLES.map(style => (
                                        <div key={style} className="flex items-center group cursor-pointer" onClick={() => toggleFilterArray('trip_styles', style)}>
                                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center mr-3 transition-colors ${filters.trip_styles.includes(style) ? 'bg-[#FF6B2B] border-[#FF6B2B]' : 'bg-white/50 border-orange-200 group-hover:border-[#FF6B2B]'}`}>
                                                {filters.trip_styles.includes(style) && <Check className="h-3 w-3 text-white" />}
                                            </div>
                                            <label className="text-[13px] font-bold text-[#6B3010] cursor-pointer group-hover:text-[#E8682A] transition-colors uppercase tracking-tight">
                                                {style}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                                {/* Fade out gradient indicating scroll */}
                                <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-[#FFE4CC] to-transparent pointer-events-none rounded-b-md" />
                            </div>
                        )}
                    </div>

                    {/* Activities */}
                    <div className="pt-4 border-t border-orange-200/30">
                        <div
                            className="flex justify-between items-center cursor-pointer group"
                            onClick={() => setIsActivitiesOpen(!isActivitiesOpen)}
                        >
                            <p className="text-[10px] font-bold text-[#A0501E] uppercase tracking-wider flex items-center gap-1.5 group-hover:text-[#E8682A] transition-colors">
                                <span className="text-blue-500 text-sm">🏄</span> ACTIVITIES
                            </p>
                            <ChevronDown className={`h-4 w-4 text-[#A0501E] transition-transform duration-300 ${isActivitiesOpen ? 'rotate-180' : ''}`} />
                        </div>
                        {isActivitiesOpen && (
                            <div className="mt-3 max-h-[180px] overflow-y-auto custom-scrollbar pr-2 relative filter-list-container">
                                <div className="space-y-3 pb-6">
                                    {ACTIVITIES.slice(0, 10).map(act => (
                                        <div key={act} className="flex items-center group cursor-pointer" onClick={() => toggleFilterArray('activities', act)}>
                                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center mr-3 transition-colors ${filters.activities.includes(act) ? 'bg-[#FF6B2B] border-[#FF6B2B]' : 'bg-white/50 border-orange-200 group-hover:border-[#FF6B2B]'}`}>
                                                {filters.activities.includes(act) && <Check className="h-3 w-3 text-white" />}
                                            </div>
                                            <label className="text-[13px] font-bold text-[#8B5030] cursor-pointer group-hover:text-[#E8682A] transition-colors uppercase tracking-tight">
                                                {act}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                                {/* Fade out gradient indicating scroll */}
                                <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-[#FFE4CC] to-transparent pointer-events-none rounded-b-md" />
                            </div>
                        )}
                    </div>

                    {/* Country */}
                    <div className="space-y-4 pt-4 border-t border-orange-200/30 pb-6">
                        <p className="text-[10px] font-bold text-[#A0501E] uppercase tracking-wider flex items-center gap-1.5">
                            <span className="text-cyan-500 text-sm">🌍</span> COUNTRY
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {AVAILABLE_COUNTRIES.map(c => (
                                <Badge
                                    key={c}
                                    variant={filters.countries.includes(c) ? "default" : "outline"}
                                    className={`cursor-pointer px-3 py-1.5 rounded-full transition-all border
                                ${filters.countries.includes(c)
                                            ? 'bg-[#FF6B2B] border-[#FF6B2B] text-white shadow-sm'
                                            : 'bg-white/40 border-orange-100 text-[#8B5030] hover:bg-white'}`}
                                    onClick={() => toggleFilterArray('countries', c)}
                                >
                                    {c}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Apply Filters Floating Button */}
                <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-[#FFE4CC]/90 via-[#FFE4CC]/80 to-transparent pt-10 rounded-b-3xl">
                    <Button className="w-full h-12 bg-gradient-to-r from-[#FF6B2B] to-[#FF9A5C] hover:opacity-90 text-white font-bold rounded-full shadow-[0_4px_20px_rgba(255,107,43,0.3)] hover:scale-[1.02] transition-all text-[15px]">
                        Apply Filters
                    </Button>
                </div>
            </div>
        )
    }

    // Parallax Effect
    const { scrollY } = useScroll()
    const y1 = useTransform(scrollY, [0, 500], [0, 150])
    const opacity = useTransform(scrollY, [0, 300], [1, 0])

    // Reusable Search Bar
    const renderSearchBar = (isCompact: boolean) => (
        <div className={`relative flex items-center shadow-[0_8px_32px_rgba(255,107,43,0.15)] bg-white/95 backdrop-blur-lg rounded-full overflow-visible ${isCompact ? 'p-1 pl-4 mx-auto w-full max-w-4xl' : 'p-2 pl-6'}`}>
            <Search className={`text-blue-500 ${isCompact ? 'h-5 w-5' : 'h-6 w-6'} mr-2`} />
            <Input
                placeholder="Search destination, package, or activity..."
                value={inputValue}
                onChange={(e) => {
                    setInputValue(e.target.value)
                    setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearchSubmit()
                }}
                className={`border-0 focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none font-bold text-[#3A1A08] bg-transparent flex-1 placeholder:text-[#A0501E]/40 placeholder:font-medium ${isCompact ? 'h-10 text-sm pl-1' : 'h-14 text-lg pl-2'}`}
            />
            <Button
                onClick={() => handleSearchSubmit()}
                className={`rounded-full text-white font-bold transition-all shadow-sm ${isCompact ? 'h-10 px-8 text-sm bg-[#2563EB] hover:bg-blue-700 ml-2 rounded-[20px]' : 'h-12 px-8 text-md bg-[#2563EB] hover:bg-blue-700 shadow-[0_4px_15px_rgba(37,99,235,0.3)] hover:shadow-lg mt-4 md:mt-0 md:ml-4 w-full md:w-auto'}`}
            >
                Search
            </Button>

            {/* Suggestions Dropdown */}
            <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className={`absolute left-0 right-0 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden text-left z-[9999] isolate ${isCompact ? 'top-full mt-2' : 'top-full mt-3'}`}
                    >
                        <div className="max-h-80 overflow-y-auto p-2">
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider px-4 py-2">Suggestions</div>
                            {suggestions.map((s, i) => (
                                <div
                                    key={i}
                                    className="px-4 py-3 bg-white hover:bg-white cursor-pointer flex items-center justify-between rounded-xl transition-colors group"
                                    onClick={() => {
                                        setInputValue(s.value)
                                        handleSearchSubmit(s.value)
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="bg-transparent p-2 rounded-full transition-colors">
                                            <MapPin className="h-4 w-4 text-gray-500 group-hover:text-blue-500" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-[#1a1a1a]">{s.label}</div>
                                            <div className="text-xs text-gray-500 capitalize">{s.type}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )

    return (
        <div className="min-h-screen font-sans bg-gradient-to-br from-[#FFCC99]/80 via-[#FF9A5C]/80 to-[#FF6B2B]/90 pb-20 relative overflow-x-hidden">
            {/* Ambient Orbs */}
            <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-[#FFD4B0]/40 rounded-full blur-[100px] pointer-events-none z-[-1]" />
            <div className="fixed bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] bg-[#E8682A]/20 rounded-full blur-[120px] pointer-events-none z-[-1]" />

            {/* Sticky Header when hasSearched is true */}
            {hasSearched && (
                <div className="sticky top-4 z-[100] mx-4 lg:mx-auto max-w-7xl glass-floating-nav py-3 px-6 w-auto mt-4">
                    <div className="flex items-center justify-between gap-6" ref={searchRef}>
                        <div className="font-bold text-2xl text-[#E8682A] flex items-center gap-2 cursor-pointer shrink-0 font-display" onClick={() => { setHasSearched(false); clearAllFilters(); }}>
                            <MapPin className="h-6 w-6 text-[#C2440A]" /> TourSaaS
                        </div>
                        <div className="flex-1 max-w-2xl relative">
                            {renderSearchBar(true)}
                        </div>
                    </div>
                </div>
            )}

            {/* Hero Search Section - Shown if NOT hasSearched */}
            {!hasSearched && (
                <>
                    <div className="relative overflow-visible flex items-center justify-center min-h-[70vh] md:min-h-[80vh] -mt-16 noise-overlay">
                        <motion.div style={{ y: y1, opacity }} className="absolute inset-0 z-0">
                            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${theme.plan_trip_image || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=2021&q=80'}")` }} />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#EA6E28]/70 via-transparent to-transparent mix-blend-multiply" />
                            <div className="absolute inset-0 bg-black/20" />
                        </motion.div>

                        <div className="container mx-auto px-4 relative z-10 text-center space-y-8 w-full max-w-5xl pt-24 md:pt-16">
                            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}>
                                <h1 className="text-5xl md:text-8xl font-bold font-display text-white leading-tight drop-shadow-2xl mb-6 tracking-tight">
                                    Where do you <br />
                                    <span className="shimmer-text italic font-medium !text-inherit">want</span> to go?
                                </h1>
                                <p className="text-xl text-blue-50 font-light drop-shadow-lg max-w-2xl mx-auto opacity-90">
                                    Search for a destination, package name, or an experience you love.
                                </p>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5, delay: 0.3 }}
                                className="relative z-50 max-w-4xl mx-auto w-full"
                                ref={searchRef}
                            >
                                <div className="glass-search p-2 md:p-3 shadow-[0_20px_50px_rgba(255,107,43,0.15)] rounded-full focus-within:ring-[4px] focus-within:ring-[#FF6B2B]/30 transition-all duration-300">
                                    <div className="bg-white/95 rounded-full overflow-hidden p-1 flex flex-col md:flex-row items-center gap-2 relative shadow-[inset_0_0_0_2px_transparent] focus-within:shadow-[inset_0_0_0_2px_rgba(255,107,43,0.5)] transition-shadow">
                                        <div className="flex-1 flex items-center px-6 py-2 group w-full h-[48px] md:h-[56px]">
                                            <Search className="h-5 w-5 text-[#FF6B2B] mr-3 group-focus-within:scale-110 transition-transform" />
                                            <input
                                                type="text"
                                                placeholder="Search city, country, or package..."
                                                className="w-full bg-transparent border-none focus:ring-0 focus:outline-none p-0 text-gray-900 font-medium placeholder:text-gray-400 text-lg"
                                                value={inputValue}
                                                onChange={(e) => {
                                                    setInputValue(e.target.value)
                                                    setShowSuggestions(true)
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSearchSubmit()
                                                }}
                                            />
                                        </div>
                                        <Button
                                            onClick={() => handleSearchSubmit()}
                                            className="bg-gradient-to-r from-[#FF6B2B] to-[#FF9A5C] hover:opacity-90 text-white px-10 py-6 md:py-7 rounded-full text-lg font-bold shadow-[0_4px_20px_rgba(255,107,43,0.3)] transition-all active:scale-95 w-full md:w-auto hover:shadow-[0_4px_30px_rgba(255,107,43,0.5)] h-[48px] md:h-[56px] flex items-center"
                                        >
                                            Explore Now
                                        </Button>
                                    </div>

                                    {/* Inline Suggestions */}
                                    <AnimatePresence>
                                        {showSuggestions && suggestions.length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 10 }}
                                                className="absolute left-0 right-0 top-full mt-4 bg-white rounded-[24px] border border-white/50 shadow-2xl overflow-hidden py-3 z-[9999] max-h-80 overflow-y-auto isolate"
                                            >
                                                {suggestions.map((s, idx) => (
                                                    <div
                                                        key={idx}
                                                        onClick={() => {
                                                            setInputValue(s.label);
                                                            handleSearchSubmit(s.label);
                                                        }}
                                                        className="px-6 py-3 bg-white hover:bg-white flex items-center gap-4 cursor-pointer group transition-colors"
                                                    >
                                                        <div className="bg-transparent p-2 rounded-lg transition-colors">
                                                            {s.type === 'package' ? <MapPin className="h-4 w-4" /> : <Search className="h-4 w-4" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-bold text-[#1a1a1a] truncate">{s.label}</p>
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{s.type}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Quick filter tags - hidden when suggestions are visible */}
                                {!(showSuggestions || inputValue.length > 0) && (
                                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                                        {['Adventure', 'Beach', 'Honeymoon', 'Family'].map((tag) => (
                                            <button
                                                key={tag}
                                                onClick={() => { setFilters(prev => ({ ...prev, trip_styles: [tag] })); setHasSearched(true); }}
                                                className="px-6 py-2 rounded-full glass-search !bg-white/20 !border-white/30 text-white text-sm font-medium hover:!bg-white/40 transition-all hover:-translate-y-1"
                                            >
                                                {tag}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="container mx-auto px-4 py-24 space-y-32 max-w-7xl">
                        {/* Browse by Trip Style */}
                        <section>
                            <div className="mb-12">
                                <h2 className="text-4xl font-bold text-[#5C2500] inline-block relative font-display">
                                    Browse by Trip Style
                                    <div className="absolute -bottom-3 left-0 w-10 h-[3px] bg-[#E8682A]"></div>
                                </h2>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                {[
                                    { style: 'Adventure', icon: '⛰️' },
                                    { style: 'Beach', icon: '🏖️' },
                                    { style: 'Honeymoon', icon: '💑' },
                                    { style: 'Family', icon: '👨‍👩‍👧' }
                                ].map(item => (
                                    <div
                                        key={item.style}
                                        onClick={() => { setFilters(prev => ({ ...prev, trip_styles: [item.style] })); setHasSearched(true); }}
                                        className="glass-trip-card p-10 text-center cursor-pointer flex flex-col items-center group"
                                    >
                                        <div className="w-20 h-20 bg-[#FFE4CC] rounded-full flex items-center justify-center text-4xl mb-6 shadow-sm group-hover:scale-110 transition-transform duration-500">
                                            {item.icon}
                                        </div>
                                        <h3 className="text-xl font-bold text-[#6B3010] tracking-tight">{item.style}</h3>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Popular Destinations */}
                        {popularDestinations.length > 0 && (
                            <section>
                                <div className="mb-12">
                                    <h2 className="text-4xl font-bold text-[#5C2500] inline-block relative font-display">
                                        Popular Destinations
                                        <div className="absolute -bottom-3 left-0 w-10 h-[3px] bg-[#E8682A]"></div>
                                    </h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    {popularDestinations.slice(0, 3).map((city, idx) => {
                                        const images = [
                                            "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&q=80&w=2071",
                                            "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&q=80&w=1964",
                                            "https://images.unsplash.com/photo-1603262110263-fb0112e7cc33?auto=format&fit=crop&q=80&w=2071"
                                        ]
                                        return (
                                            <div
                                                key={city}
                                                onClick={() => { setSearchQuery(city); setInputValue(city); setHasSearched(true); }}
                                                className="relative h-[500px] rounded-[32px] overflow-hidden cursor-pointer group shadow-2xl"
                                            >
                                                <Image
                                                    src={images[idx % images.length]}
                                                    alt={city}
                                                    fill
                                                    className="object-cover group-hover:scale-105 transition-transform duration-1000"
                                                />
                                                <div className="absolute inset-0 destination-overlay opacity-90 group-hover:opacity-100 transition-opacity" />
                                                <div className="absolute bottom-10 left-10 right-10">
                                                    <h3 className="text-4xl font-bold text-white mb-3 font-display">{city}</h3>
                                                    <div className="relative inline-block group/link">
                                                        <p className="text-blue-50 text-base font-medium flex items-center gap-2">
                                                            Explore packages <ChevronRight className="h-4 w-4 group-hover/link:translate-x-1 transition-transform" />
                                                        </p>
                                                        <div className="absolute -bottom-1 left-0 w-0 h-[2px] bg-[#FFD4A8] group-hover/link:w-full transition-all duration-300"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </section>
                        )}
                    </div>
                </>
            )}

            {/* Main Content Area - Only shown after filtering or searching */}
            <AnimatePresence>
                {hasSearched && (
                    <motion.div
                        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                        className="container mx-auto px-4 mt-8"
                    >
                        <div className="flex flex-col md:flex-row gap-8">

                            {/* Desktop Sidebar Filter */}
                            <div className="hidden md:block w-[280px] shrink-0">
                                <div className="glass-filter-panel shadow-[0_8px_32px_rgba(255,107,43,0.06)] bg-white/50 backdrop-blur-xl sticky top-24 h-[calc(100vh-120px)] flex flex-col z-10 border border-white/40 overflow-hidden rounded-3xl">
                                    <FilterPanel />
                                </div>
                            </div>

                            {/* Main Results Area */}
                            <div className="flex-1 min-w-0">
                                {/* Context Header & Mobile Filter Trigger */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="bg-[#FFE4CC]/30 backdrop-blur-md rounded-2xl h-[120px] px-8 border border-white/20 shadow-[0_8px_32px_rgba(255,107,43,0.04)] flex-1 flex flex-col justify-center relative overflow-hidden">
                                        {/* faint texture overlay */}
                                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/noise-pattern-with-subtle-cross-lines.png')]" />

                                        <h2 className="text-4xl md:text-[44px] tracking-tight font-bold text-[#3A1A08] flex items-center gap-4 font-display relative z-10">
                                            {searching ? 'Looking for your next adventure...' : (
                                                <>
                                                    <span className="text-[40px] drop-shadow-sm flex-shrink-0 relative">
                                                        <Search className="h-10 w-10 text-indigo-500 stroke-[2.5]" />
                                                        <div className="absolute inset-0 bg-purple-300 blur-xl opacity-30 z-[-1] scale-150"></div>
                                                    </span>
                                                    <span className="capitalize text-[#3A1A08]">{searchQuery || 'All Destinations'}</span>
                                                </>
                                            )}
                                        </h2>
                                    </div>

                                    <div className="flex items-center gap-2 self-start sm:self-auto h-[120px]">
                                        {/* Mobile Filter Sheet */}
                                        <div className="md:hidden">
                                            <Sheet>
                                                <SheetTrigger asChild>
                                                    <Button variant="outline" className="flex items-center gap-2 h-14 rounded-full border-none shadow-sm bg-white/70">
                                                        <Filter className="h-4 w-4" /> Filters
                                                        {(filters.trip_styles.length > 0 || filters.activities.length > 0) && (
                                                            <span className="bg-[#FF6B2B] text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">!</span>
                                                        )}
                                                    </Button>
                                                </SheetTrigger>
                                                <SheetContent side="left" className="w-[300px] sm:w-[400px] overflow-y-auto pb-20">
                                                    <SheetHeader className="mb-6">
                                                        <SheetTitle>Filters</SheetTitle>
                                                    </SheetHeader>
                                                    <FilterPanel />
                                                </SheetContent>
                                            </Sheet>
                                        </div>

                                        {/* Sort Dropdown */}
                                        <Select value={sort} onValueChange={setSort}>
                                            <SelectTrigger className="w-[200px] h-14 bg-white/70 backdrop-blur-md border border-white/40 shadow-sm rounded-full px-5 text-sm font-bold text-[#5C2500]">
                                                <span className="text-[10px] text-[#A0501E] mr-2 uppercase tracking-widest opacity-80 font-bold">Sort:</span>
                                                <SelectValue placeholder="Recommended" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-white/50 bg-white/95 backdrop-blur-md shadow-[0_8px_32px_rgba(255,107,43,0.1)]">
                                                <SelectItem value="recommended" className="font-bold text-[#5C2500]">Recommended</SelectItem>
                                                <SelectItem value="price_asc" className="font-bold text-[#5C2500]">Price: Low to High</SelectItem>
                                                <SelectItem value="price_desc" className="font-bold text-[#5C2500]">Price: High to Low</SelectItem>
                                                <SelectItem value="duration_asc" className="font-bold text-[#5C2500]">Duration: Short to Long</SelectItem>
                                                <SelectItem value="duration_desc" className="font-bold text-[#5C2500]">Duration: Long to Short</SelectItem>
                                                <SelectItem value="newest" className="font-bold text-[#5C2500]">Newest First</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Active Filters */}
                                {renderActiveFilters()}

                                {/* Results Grid */}
                                {searching ? (
                                    <div className="flex items-center justify-center py-32">
                                        <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
                                    </div>
                                ) : packages.length === 0 ? (
                                    <div className="bg-white/40 backdrop-blur-xl rounded-[32px] border-2 border-dashed border-orange-200 p-20 text-center shadow-sm">
                                        <div className="w-24 h-24 bg-orange-100/50 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <Search className="h-10 w-10 text-[#E8682A]" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-[#3A1A08] mb-3">No more results</h3>
                                        <p className="text-[#8B5030] max-w-sm mx-auto mb-8 font-medium">Try adjusting your filters or expanding your search to find more hidden gems.</p>
                                        <Button onClick={clearAllFilters} className="bg-[#E8682A] text-white px-8 py-6 rounded-full font-bold shadow-lg hover:shadow-orange-200 transition-all">
                                            Clear all filters
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[32px]">
                                        {packages.map((pkg, idx) => (
                                            <motion.div
                                                key={pkg.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.5, delay: idx * 0.1 }}
                                                className="glass-pkg-card group flex flex-col h-full relative overflow-hidden"
                                            >
                                                <div className="flex flex-col flex-1 h-full p-2">
                                                    {/* Image Header */}
                                                    <div className="relative h-56 overflow-hidden bg-gray-100 cursor-pointer rounded-2xl" onClick={() => handleContinueToBook(pkg)}>

                                                        {pkg.feature_image_url || (pkg.images && pkg.images.length > 0) ? (
                                                            <>
                                                                <img
                                                                    src={pkg.feature_image_url || pkg.images![0]?.url}
                                                                    alt={pkg.title}
                                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                                />
                                                                <div className="absolute inset-0 bg-gradient-to-t from-[#2a1106]/80 via-transparent to-transparent opacity-80" />
                                                            </>
                                                        ) : (
                                                            <div className="absolute inset-0 bg-gradient-to-br from-[#FFD4A8] to-[#FF6B2B] flex items-center justify-center p-6 text-center">
                                                                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/topography.png')] mix-blend-overlay"></div>
                                                                <div className="relative z-10">
                                                                    <div className="text-white font-bold text-xl mb-2 drop-shadow-md font-display">
                                                                        {pkg.package_mode === 'multi' && pkg.destinations?.length > 0
                                                                            ? pkg.destinations.map(d => d.city).join(' → ')
                                                                            : pkg.destination}
                                                                    </div>
                                                                    <div className="text-orange-50 font-bold tracking-wide text-sm flex items-center justify-center gap-1.5 uppercase drop-shadow-sm">
                                                                        {pkg.package_mode === 'multi' ? '🌍 Multi-City Tour' : `📍 ${pkg.country || 'Destination'}`}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Overlays */}
                                                        <div className="absolute top-4 left-4 flex flex-col gap-2">
                                                            <Badge className="bg-white/40 text-white hover:bg-white/60 backdrop-blur-md border border-white/50 shadow-[0_4px_10px_rgba(0,0,0,0.1)] font-bold rounded-full px-3 py-1">
                                                                {pkg.duration_days} Days
                                                            </Badge>
                                                        </div>
                                                        {pkg.package_mode === 'multi' && (
                                                            <div className="absolute top-4 right-4">
                                                                <Badge className="bg-gradient-to-r from-[#FFB347] to-[#FF8C00] text-white border-0 shadow-lg font-bold flex items-center gap-1 rounded-full px-3 py-1">
                                                                    ✈ Multi-City
                                                                </Badge>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Content */}
                                                    <div className="p-5 flex flex-col flex-1 cursor-pointer bg-transparent" onClick={() => handleContinueToBook(pkg)}>
                                                        <div className="flex items-start justify-between gap-3 mb-2">
                                                            <h3 className="font-bold text-[#3A1A08] text-xl line-clamp-2 leading-tight group-hover:text-[#FF6B2B] transition-colors font-display">
                                                                {pkg.title}
                                                            </h3>
                                                        </div>

                                                        {/* Destination Route */}
                                                        <div className="mb-4 text-sm text-[#8B5030] mt-1 flex items-center gap-2 line-clamp-1 font-medium">
                                                            <MapPin className="h-4 w-4 shrink-0 text-[#FF6B2B]" />
                                                            {pkg.package_mode === 'multi' && pkg.destinations && pkg.destinations.length > 0 ? (
                                                                <span className="truncate">
                                                                    {pkg.destinations.map(d => d.city).join(' → ')}
                                                                </span>
                                                            ) : (
                                                                <span>{pkg.destination} · {pkg.country || "Asia"}</span>
                                                            )}
                                                        </div>

                                                        {/* Tags */}
                                                        <div className="flex flex-wrap gap-2 mb-6 max-h-[80px] overflow-hidden">
                                                            {pkg.trip_style && (
                                                                <Badge variant="outline" className="bg-white/50 text-[#5C2500] border-orange-100/50 font-bold whitespace-nowrap rounded-full px-3 py-1 uppercase text-[10px] tracking-wider flex items-center gap-1.5 backdrop-blur-sm">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B2B]"></span>
                                                                    {pkg.trip_style}
                                                                </Badge>
                                                            )}
                                                            {pkg.activities && pkg.activities.slice(0, 2).map((act, idx) => (
                                                                typeof act === 'string' ? ( // Handle JSON string edge cases if any
                                                                    <Badge key={idx} variant="outline" className="text-[#8B5030] border-orange-100/50 font-bold whitespace-nowrap rounded-full px-3 py-1 uppercase text-[10px] tracking-wider bg-white/40 flex items-center gap-1.5 backdrop-blur-sm">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-orange-300"></span>
                                                                        {act.replace(/["\[\]]/g, '')}
                                                                    </Badge>
                                                                ) : null
                                                            ))}
                                                        </div>

                                                        {/* Rating & Group info (Mocked for now since not in schema) */}
                                                        <div className="flex items-center gap-3 text-sm font-medium text-[#8B5030]/80 mb-2 mt-auto">
                                                            <span className="flex items-center gap-1">
                                                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FFB347] to-[#FF8C00] font-bold text-lg">★</span>
                                                                4.5
                                                            </span>
                                                            <span className="w-1 h-1 rounded-full bg-orange-200"></span>
                                                            <span className="flex items-center gap-1">👥 Max 20</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Price and Action Section */}
                                                <div className="px-7 pb-6 pt-0 mt-auto relative z-20 bg-transparent" onClick={(e) => e.stopPropagation()}>
                                                    <div className="pt-4 border-t border-orange-200/40 flex items-center justify-between gap-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-bold text-[#FF6B2B] uppercase tracking-wider mb-0.5">Starting From</span>
                                                            <div className="flex items-baseline gap-1">
                                                                <span className="text-2xl font-bold text-[#5C2500]">₹{pkg.price_per_person.toLocaleString()}</span>
                                                                <span className="text-[10px] text-[#8B5030]/70 font-medium uppercase tracking-widest">/ pp</span>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                setSelectedPackageForBooking(pkg);
                                                                setIsBookingModalOpen(true);
                                                            }}
                                                            className="bg-gradient-to-r from-[#FF6B2B] to-[#FF9A5C] hover:opacity-90 text-white px-7 py-6 rounded-full text-sm font-bold shadow-[0_4px_15px_rgba(255,107,43,0.3)] transition-all hover:scale-105 active:scale-95 group/btn flex items-center gap-2 overflow-hidden relative"
                                                        >
                                                            <span className="relative z-10 flex items-center gap-2">
                                                                Book Now
                                                                <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                                                            </span>
                                                            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700 ease-in-out z-0"></div>
                                                        </Button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Booking Modal */}
            <Dialog open={isBookingModalOpen} onOpenChange={setIsBookingModalOpen}>
                <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border border-[#F0A050]/30 shadow-[0_24px_64px_rgba(180,80,20,0.2)] rounded-[24px] !bg-none" style={{
                    background: 'rgba(255, 248, 240, 0.9)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)'
                }}>
                    <div className="absolute top-3 right-3 z-30">
                        <DialogClose asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white/30 text-[#3A1A08] hover:bg-white/50 hover:text-black backdrop-blur-md border border-white/40 transition-all shadow-sm">
                                <X className="h-4 w-4" />
                            </Button>
                        </DialogClose>
                    </div>

                    <div className="flex flex-col h-full max-h-[85vh]">
                        {/* Modal Header with Package Banner overlay */}
                        <div className="relative h-[140px] shrink-0 bg-gray-200 overflow-hidden">
                            {selectedPackageForBooking?.images && selectedPackageForBooking.images.length > 0 ? (
                                <img
                                    src={selectedPackageForBooking.images[0].url}
                                    alt={selectedPackageForBooking.title || 'Package Image'}
                                    className="w-full h-full object-cover"
                                />
                            ) : selectedPackageForBooking?.feature_image_url ? (
                                <img
                                    src={selectedPackageForBooking.feature_image_url}
                                    alt={selectedPackageForBooking.title || 'Package Image'}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-orange-100">
                                    <ImageIcon className="h-10 w-10 text-orange-300" />
                                </div>
                            )}

                            {/* Warm Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#B4460A]/90 via-[#B4460A]/30 to-transparent"></div>

                            {/* Location Pill */}
                            <div className="absolute top-4 left-4">
                                <Badge variant="secondary" className="bg-white/20 backdrop-blur-md text-white border-0 py-1 px-3 rounded-full flex items-center gap-1.5 font-bold text-[10px] shadow-sm">
                                    <MapPin className="h-3 w-3 text-orange-200" />
                                    {selectedPackageForBooking?.package_mode === 'multi' && selectedPackageForBooking?.destinations?.length ? (
                                        selectedPackageForBooking.destinations[0].city
                                    ) : (
                                        selectedPackageForBooking?.destination
                                    )}
                                </Badge>
                            </div>

                            {/* Text Content Overlay */}
                            <div className="absolute bottom-4 left-6 right-6 text-white text-center">
                                <h3 className="font-bold text-xl line-clamp-1 mb-0.5 font-display drop-shadow-md">
                                    {selectedPackageForBooking?.title}
                                </h3>
                                <p className="text-[11px] text-orange-50 flex items-center justify-center gap-2 font-medium opacity-90">
                                    <span className="bg-white/10 px-1.5 py-0.5 rounded backdrop-blur-sm">{selectedPackageForBooking?.duration_days} Days</span>
                                    <span className="w-1 h-1 rounded-full bg-white/40" />
                                    <span>{selectedPackageForBooking?.country || "India"}</span>
                                </p>
                            </div>
                        </div>

                        {/* Step Indicator */}
                        <div className="bg-orange-50/50 backdrop-blur-sm border-b border-orange-100/30 py-4 px-8 shrink-0">
                            <div className="flex items-center justify-between max-w-sm mx-auto relative px-4">
                                {/* Connecting Lines */}
                                <div className="absolute top-1/2 left-8 right-8 h-px border-t border-dashed border-orange-200/50 -translate-y-[10px] z-0" />

                                {/* Step 1: Date */}
                                <div className="relative z-10 flex flex-col items-center gap-1">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300 ${selectedDate
                                        ? 'bg-[#E8682A] text-white'
                                        : 'bg-white border border-orange-200 text-[#A0501E]'
                                        }`}>
                                        {selectedDate ? <CheckCircle2 className="h-3.5 w-3.5" /> : '1'}
                                    </div>
                                    <span className="text-[10px] font-bold text-[#A0501E] uppercase tracking-wider opacity-80">Date</span>
                                </div>

                                {/* Step 2: Travelers */}
                                <div className="relative z-10 flex flex-col items-center gap-1">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300 ${selectedDate
                                        ? 'bg-white border-2 border-[#E8682A] text-[#E8682A] shadow-[0_0_10px_rgba(232,104,42,0.15)]'
                                        : 'bg-white border border-orange-100 text-orange-200'
                                        }`}>
                                        2
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${selectedDate ? 'text-[#A0501E]' : 'text-orange-200'} opacity-80`}>Travelers</span>
                                </div>

                                {/* Step 3: Confirm */}
                                <div className="relative z-10 flex flex-col items-center gap-1">
                                    <div className="w-7 h-7 rounded-full bg-white border border-orange-100 text-orange-200 flex items-center justify-center text-[11px] font-bold">
                                        3
                                    </div>
                                    <span className="text-[10px] font-bold text-orange-200 uppercase tracking-wider opacity-80">Confirm</span>
                                </div>
                            </div>
                        </div>

                        {/* Booking Form Content */}
                        <div className="px-6 py-6 overflow-y-auto space-y-6 flex-1">
                            {/* Date Selection */}
                            <div className="space-y-2.5">
                                <Label htmlFor="travel-date" className="text-[11px] font-bold text-[#A0501E] uppercase tracking-[0.1em] flex items-center gap-2 px-1">
                                    <CalendarIcon className="h-3 w-3" />
                                    Date of Travel
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="travel-date"
                                        type="date"
                                        min={new Date().toISOString().split('T')[0]}
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className="h-11 bg-white/70 border-[#F4A261]/35 rounded-xl px-4 font-bold text-sm text-[#3A1A08] focus-visible:ring-orange-500/20 focus-visible:border-orange-500/50 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Travelers Selection */}
                            <div className="space-y-2.5">
                                <Label className="text-[11px] font-bold text-[#A0501E] uppercase tracking-[0.1em] flex items-center gap-2 px-1">
                                    <Users className="h-3 w-3" />
                                    Travelers
                                </Label>
                                <div className="space-y-1.5">
                                    <PassengerCounter
                                        label="Adults"
                                        sublabel="Age 13+"
                                        value={travelers.adults}
                                        min={1}
                                        max={10}
                                        compact={true}
                                        onChange={(val) => setTravelers(prev => ({ ...prev, adults: val }))}
                                    />
                                    <div className="h-[1px] bg-[rgba(240,160,80,0.1)] mx-4" />
                                    <PassengerCounter
                                        label="Children"
                                        sublabel="Age 2-12"
                                        value={travelers.children}
                                        min={0}
                                        max={5}
                                        compact={true}
                                        onChange={(val) => setTravelers(prev => ({ ...prev, children: val }))}
                                    />
                                    <div className="h-[1px] bg-[rgba(240,160,80,0.1)] mx-4" />
                                    <PassengerCounter
                                        label="Infants"
                                        sublabel="Under 2"
                                        badge="FREE"
                                        value={travelers.infants}
                                        min={0}
                                        max={3}
                                        compact={true}
                                        onChange={(val) => setTravelers(prev => ({ ...prev, infants: val }))}
                                    />
                                </div>

                                {travelers.adults + travelers.children + travelers.infants >= 15 && (
                                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50/70 rounded-lg border border-amber-200/50 text-amber-700 text-[10px] font-bold">
                                        <Users className="h-3 w-3" />
                                        Max 20 travelers allowed per booking
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="px-6 py-6 bg-white/60 backdrop-blur-md border-t border-orange-100/30 mt-auto rounded-b-[24px] shrink-0">
                            {selectedDate && travelers.adults >= 1 && selectedPackageForBooking ? (() => {
                                const pkg = selectedPackageForBooking;
                                const basePriceTotal = pkg.price_per_person * (travelers.adults + travelers.children);
                                const gstAmt = pkg.gst_applicable && pkg.gst_mode === 'exclusive'
                                    ? basePriceTotal * (pkg.gst_percentage || 0) / 100
                                    : 0;
                                const grandTotal = basePriceTotal + gstAmt;
                                return (
                                    <div className="mb-5 bg-[#FFE4B4]/30 border border-orange-200/40 rounded-xl px-4 py-2.5 h-[44px] flex items-center justify-between transition-all">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-bold text-[#A0501E] uppercase tracking-wider">Estimated Total</span>
                                            <span className="text-[10px] text-[#8B5030] font-medium leading-none">Incl. GST</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-[#A0501E] font-bold">₹{pkg.price_per_person.toLocaleString()} × {travelers.adults + travelers.children}</span>
                                            <span className="text-2xl font-black text-[#E8682A]">₹{grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                        </div>
                                    </div>
                                );
                            })() : (
                                <div className="mb-5 bg-[#FFE4B4]/30 border border-dashed border-orange-200/50 rounded-xl h-[40px] flex items-center justify-center text-center">
                                    <p className="text-[10px] text-[#E8682A] font-bold italic flex items-center justify-center gap-2">
                                        <span className="w-1 h-1 rounded-full bg-[#E8682A] animate-pulse" />
                                        Select a date to continue
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1 bg-white/40 hover:bg-white/80 border-[#F4A261]/40 text-[#7C3A10] font-bold rounded-full h-12 transition-all text-sm"
                                    onClick={() => setIsBookingModalOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1 font-bold rounded-full h-12 shadow-[0_8px_20px_rgba(232,104,42,0.25)] transition-all border-none text-white bg-gradient-to-r from-[#E8682A] to-[#C2440A] hover:opacity-95 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 text-sm"
                                    disabled={!selectedDate || travelers.adults < 1}
                                    onClick={() => {
                                        if (selectedPackageForBooking) {
                                            const url = new URL(`/plan-trip/${selectedPackageForBooking.slug}`, window.location.origin);
                                            url.searchParams.set('date', selectedDate);
                                            url.searchParams.set('adults', travelers.adults.toString());
                                            url.searchParams.set('children', travelers.children.toString());
                                            url.searchParams.set('infants', travelers.infants.toString());
                                            url.searchParams.set('ref', 'listing');
                                            router.push(url.toString());
                                        }
                                    }}
                                >
                                    Continue
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Footer */}
            <footer className="bg-[#3A1A08] text-[#FFD4A8] py-16 px-4 mt-20 relative z-10">
                <div className="container mx-auto max-w-7xl">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
                        <div>
                            <div className="font-bold text-2xl text-[#E8682A] flex items-center gap-2 mb-6 font-display">
                                <MapPin className="h-6 w-6 text-[#C2440A]" /> TourSaaS
                            </div>
                            <p className="text-sm text-orange-200/60 max-w-xs leading-relaxed">
                                Experience the world through our warm, glassmorphic lens. Premium tours designed for the modern explorer.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <h4 className="font-bold text-white mb-6 uppercase text-xs tracking-widest">Quick Links</h4>
                                <ul className="space-y-4 text-sm text-orange-200/80 font-medium">
                                    <li className="hover:text-[#E8682A] cursor-pointer transition-colors">Find Packages</li>
                                    <li className="hover:text-[#E8682A] cursor-pointer transition-colors">Popular Deals</li>
                                    <li className="hover:text-[#E8682A] cursor-pointer transition-colors">Trip Stories</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold text-white mb-6 uppercase text-xs tracking-widest">Support</h4>
                                <ul className="space-y-4 text-sm text-orange-200/80 font-medium">
                                    <li className="hover:text-[#E8682A] cursor-pointer transition-colors">Help Center</li>
                                    <li className="hover:text-[#E8682A] cursor-pointer transition-colors">Contact Us</li>
                                    <li className="hover:text-[#E8682A] cursor-pointer transition-colors">Privacy Policy</li>
                                </ul>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-bold text-white mb-6 uppercase text-xs tracking-widest">Follow Us</h4>
                            <div className="flex gap-4">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#E8682A] hover:border-[#E8682A] transition-all cursor-pointer">
                                        <div className="w-1 h-1 rounded-full bg-orange-200" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="pt-12 border-t border-white/5 text-center">
                        <p className="text-[10px] text-orange-200/40 font-bold tracking-widest uppercase">
                            © {new Date().getFullYear()} TourSaaS. All rights reserved. Built with warmth.
                        </p>
                    </div>
                </div>
            </footer>

            <style jsx global>{`
                .glass-card {
                    background: rgba(255, 255, 255, 0.4);
                    backdrop-filter: blur(16px) saturate(180%);
                    -webkit-backdrop-filter: blur(16px) saturate(180%);
                    border: 1px solid rgba(255, 255, 255, 0.6);
                    border-radius: 16px;
                }

                .glass-input {
                    background: rgba(255, 255, 255, 0.5) !important;
                    border: 1px solid rgba(255, 255, 255, 0.8) !important;
                    color: #1e293b !important;
                    border-radius: 12px;
                    transition: all 0.2s ease;
                }
                .glass-input:focus {
                    background: rgba(255, 255, 255, 0.8) !important;
                    border-color: rgba(249, 115, 22, 0.5) !important;
                    box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.15) !important;
                }
            `}</style>
        </div>
    )
}
