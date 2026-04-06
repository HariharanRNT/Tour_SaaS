'use client'

import { useState, useEffect, useRef, Suspense, useMemo } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { formatCurrency, formatDate, formatDuration } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { PremiumCalendar } from '@/components/ui/premium-calendar'
import { PassengerCounter } from '@/components/packages/PassengerCounter'
import { MapPin, Search, Calendar as CalendarIcon, Users, Filter, X, ChevronRight, ArrowRight, Loader2, PlayCircle, Image as ImageIcon, CheckCircle2, RotateCcw, ChevronDown, Check, Mountain, Waves, Heart, Sun, Plane, Trees, Palmtree, Compass, Camera, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import { API_URL } from '@/lib/api'

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
    destination_image_url?: string;
    images?: { url: string }[];
    itinerary_items?: { day_number: number, title: string, description: string, city?: string }[];
    included_items?: string[];
    // GST fields
    gst_applicable?: boolean;
    gst_percentage?: number;
    gst_mode?: string;
    // Flight fields
    flights_enabled?: boolean;
    flight_origin_cities?: string[];
    flight_cabin_class?: string;
}

export default function PlanTripPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <PlanTripContent />
        </Suspense>
    )
}

function PlanTripContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Booking Modal State
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
    const [selectedPackageForBooking, setSelectedPackageForBooking] = useState<Package | null>(null)
    const [selectedDate, setSelectedDate] = useState('')
    const [isCalendarOpen, setIsCalendarOpen] = useState(false)
    const [travelers, setTravelers] = useState({ adults: 2, children: 0, infants: 0 })
    const [originCity, setOriginCity] = useState('')


    // UI State
    const [loading, setLoading] = useState(false)
    const [searching, setSearching] = useState(false)

    // Initialize searchQuery from URL params synchronously so first render is correct
    const initialQuery = searchParams.get('destination') || (searchParams.get('search') !== 'all' ? searchParams.get('search') : '') || ''
    const [searchQuery, setSearchQuery] = useState(initialQuery)
    const [inputValue, setInputValue] = useState(initialQuery)
    const [placeholderText, setPlaceholderText] = useState('Try Chennai...')
    const [visibleCount, setVisibleCount] = useState(9)
    const [isLoadingMore, setIsLoadingMore] = useState(false)

    // Cycle placeholders
    useEffect(() => {
        const placeholders = ['Try Chennai...', 'Try Kochi...', 'Try Manali...', 'Search an experience you love...']
        let i = 0
        const interval = setInterval(() => {
            i = (i + 1) % placeholders.length
            setPlaceholderText(placeholders[i])
        }, 2500)
        return () => clearInterval(interval)
    }, [])

    // Read destination and style from URL (handles navigation changes)
    useEffect(() => {
        const dest = searchParams.get('destination')
        const style = searchParams.get('trip_style')
        const searchAll = searchParams.get('search') === 'all'

        if (dest) {
            setInputValue(dest)
            setSearchQuery(dest)
            setHasSearched(true)
        }

        if (style) {
            setFilters(prev => ({ ...prev, trip_styles: [style] }))
            setHasSearched(true)
        }

        if (searchAll) {
            setHasSearched(true)
        }
    }, [searchParams])

    const [suggestions, setSuggestions] = useState<{ label: string, value: string, type: string }[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)

    type PopularDest = { id: string; name: string; country: string; description: string; image_url: string | null; pkg_count: number; min_price: number; min_duration: number; max_duration: number; display_order: number }
    const [popularDestinations, setPopularDestinations] = useState<PopularDest[]>([])

    // Results State
    const [isActivitiesOpen, setIsActivitiesOpen] = useState(false)
    const [isTripStyleOpen, setIsTripStyleOpen] = useState(false)
    const [isSliderDragging, setIsSliderDragging] = useState(false)

    // Load initial packages
    const [packages, setPackages] = useState<Package[]>([])
    const [totalPackages, setTotalPackages] = useState(0)
    const [hasSearched, setHasSearched] = useState(() => {
        // Initialize from URL so first render shows correct view immediately
        const dest = searchParams.get('destination')
        const style = searchParams.get('trip_style')
        const searchQuery = searchParams.get('search')
        return !!(dest || style || searchQuery)
    })

    // Filter State — initialize from URL so first render is correct
    const [filters, setFilters] = useState(() => {
        const style = searchParams.get('trip_style')
        return {
            package_mode: 'all',
            duration_min: 1,
            duration_max: 30,
            price_min: 0,
            price_max: 500000,
            trip_styles: style ? [style] : [] as string[],
            activities: [] as string[],
            countries: [] as string[]
        }
    })

    // Sort State
    const [sort, setSort] = useState('recommended')

    // Constants for filters
    const TRIP_STYLES = ['Adventure', 'Leisure', 'Cultural', 'Family', 'Honeymoon', 'Luxury', 'Wellness', 'Group Tour', 'Corporate']
    const ACTIVITIES = ['Beach', 'Mountain', 'Trekking', 'Heritage', 'Nature', 'Food & Culinary', 'City Tour', 'Snow', 'Pilgrimage', 'Water Sports', 'Safari', 'Cycling', 'Wine Tour', 'Photography', 'Festivals']
    const AVAILABLE_COUNTRIES = ['India', 'France', 'Italy', 'Spain', 'Germany', 'Switzerland', 'Thailand', 'Maldives', 'Indonesia', 'UAE'] // Ideally fetched from API

    // Computed Facets from Current Packages
    const facets = useMemo(() => {
        const activityCounts: Record<string, number> = {}
        const countryCounts: Record<string, number> = {}
        const styleCounts: Record<string, number> = {}
        let minPrice = Infinity
        let maxPrice = -Infinity
        let minDur = Infinity
        let maxDur = -Infinity

        packages.forEach(pkg => {
            // Activities
            pkg.activities?.forEach(act => {
                activityCounts[act] = (activityCounts[act] || 0) + 1
            })
            // Country
            if (pkg.country) {
                countryCounts[pkg.country] = (countryCounts[pkg.country] || 0) + 1
            }
            // Trip Style
            if (pkg.trip_style) {
                styleCounts[pkg.trip_style] = (styleCounts[pkg.trip_style] || 0) + 1
            }
            // Price & Duration for smart ranges
            if (pkg.price_per_person < minPrice) minPrice = pkg.price_per_person
            if (pkg.price_per_person > maxPrice) maxPrice = pkg.price_per_person
            if (pkg.duration_days < minDur) minDur = pkg.duration_days
            if (pkg.duration_days > maxDur) maxDur = pkg.duration_days
        })

        return {
            activityCounts,
            countryCounts,
            styleCounts,
            minPrice: minPrice === Infinity ? 0 : minPrice,
            maxPrice: maxPrice === -Infinity ? 500000 : maxPrice,
            minDur: minDur === Infinity ? 1 : minDur,
            maxDur: maxDur === -Infinity ? 30 : maxDur
        }
    }, [packages])

    // Refs
    const searchRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const loaderRef = useRef<HTMLDivElement>(null);

    // Infinite Scroll Implementation (Intersection Observer)
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const target = entries[0]
                if (target.isIntersecting && packages.length > visibleCount && !searching && !isLoadingMore) {
                    setIsLoadingMore(true)
                    // Simulate a small delay for better UX
                    setTimeout(() => {
                        setVisibleCount(prev => prev + 9)
                        setIsLoadingMore(false)
                    }, 400)
                }
            },
            {
                rootMargin: '200px',
                threshold: 0.1
            }
        )

        if (loaderRef.current) {
            observer.observe(loaderRef.current)
        }

        return () => {
            if (loaderRef.current) {
                observer.unobserve(loaderRef.current)
            }
        }
    }, [packages.length, visibleCount, searching, isLoadingMore])

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
                const res = await fetch(`${API_URL}/api/v1/trip-planner/popular-destinations`, {
                    headers: { 'X-Domain': domain }
                })
                if (res.ok) {
                    const data = await res.json()
                    if (data && data.length > 0) {
                        setPopularDestinations(data)
                    } else {
                        setPopularDestinations([])
                    }
                } else {
                    setPopularDestinations([])
                }
            } catch (error) {
                setPopularDestinations([])
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
            const res = await fetch(`${API_URL}/api/v1/packages/config/suggestions?q=${encodeURIComponent(q)}`, {
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
    const executeSearch = async (signal?: AbortSignal) => {
        setSearching(true)
        setShowSuggestions(false)
        setHasSearched(true)
        setVisibleCount(9) // Reset pagination on new search


        try {
            const domain = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
            const params = new URLSearchParams()

            if (searchQuery) params.append('search', searchQuery)
            if (filters.package_mode !== 'all') params.append('package_mode', filters.package_mode)

            // Duration ranges
            if (filters.duration_min > 1) params.append('duration_min', filters.duration_min.toString())
            if (filters.duration_max < 30) params.append('duration_max', filters.duration_max.toString())

            // Price ranges — backend expects min_price / max_price
            if (filters.price_min > 0) params.append('min_price', filters.price_min.toString())
            if (filters.price_max < 500000) params.append('max_price', filters.price_max.toString())

            // Arrays
            filters.trip_styles.forEach(ts => params.append('trip_styles', ts))
            filters.activities.forEach(act => params.append('activities', act))
            filters.countries.forEach(c => params.append('countries', c))

            // Sort
            if (sort !== 'recommended') params.append('sort', sort)

            const res = await fetch(`${API_URL}/api/v1/packages?${params.toString()}`, {
                headers: { 'X-Domain': domain },
                signal
            })

            if (res.ok) {
                const data = await res.json()
                setPackages(data.packages || [])
                setTotalPackages(data.total)
            } else {
                toast.error("Failed to fetch packages")
            }
        } catch (error: any) {
            if (error.name === 'AbortError') return
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

    // Run search when filters or sort change (Smart debounce/instant)
    useEffect(() => {
        if (hasSearched) {
            const controller = new AbortController()
            // If actively dragging sliders, wait longer. If clicking buttons, fire almost instantly.
            const timeout = isSliderDragging ? 600 : 150

            const timer = setTimeout(() => {
                executeSearch(controller.signal)
            }, timeout)

            return () => {
                clearTimeout(timer)
                controller.abort()
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters, sort, isSliderDragging])

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
                    <X className="h-3 w-3 cursor-pointer hover:text-[var(--primary)] transition-colors" onClick={() => removeFilter('searchQuery')} />
                </Badge>
            )
        }

        filters.trip_styles.forEach(ts => {
            chips.push(
                <Badge key={`ts-${ts}`} variant="outline" className="px-4 py-1.5 flex items-center gap-2 border-0 bg-[#FFD6B9]/60 hover:bg-[#FFD6B9] text-[#A0501E] rounded-md font-bold text-[11px] shadow-sm transition-all cursor-default">
                    <span>{ts}</span>
                    <X className="h-3 w-3 cursor-pointer hover:text-[var(--primary)] transition-colors" onClick={() => removeFilter('trip_styles', ts)} />
                </Badge>
            )
        })
        filters.activities.forEach(act => {
            chips.push(
                <Badge key={`act-${act}`} variant="outline" className="px-4 py-1.5 flex items-center gap-2 border-0 bg-[var(--primary-soft)] text-[var(--primary)] rounded-md font-bold text-[11px] shadow-sm transition-all cursor-default">
                    <span>{act}</span>
                    <X className="h-3 w-3 cursor-pointer hover:text-[var(--primary)] transition-colors" onClick={() => removeFilter('activities', act)} />
                </Badge>
            )
        })

        if (chips.length > 0) {
            return (
                <div className="flex flex-wrap items-center gap-4 mb-8 mt-4">
                    {chips}
                    <button onClick={clearAllFilters} className="text-[11px] font-bold text-[var(--primary)] hover:underline px-2 transition-all">Clear All</button>
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

    // Handle auto-open for popular packages from home page
    const [autoOpenAttempted, setAutoOpenAttempted] = useState(false)
    useEffect(() => {
        const pkgId = searchParams.get('packageId')
        const openPopup = searchParams.get('openPopup') === 'true'

        if (pkgId && openPopup && !autoOpenAttempted && packages.length > 0 && !searching) {
            const pkg = packages.find(p => p.id === pkgId)
            if (pkg) {
                handleContinueToBook(pkg)
                setAutoOpenAttempted(true)
            }
        }
    }, [searchParams, packages, searching, autoOpenAttempted, handleContinueToBook])

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
            <div className="flex flex-col h-full relative w-full">
                <div className="px-6 pt-6 pb-8 space-y-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-[#3A1A08] flex items-center gap-2.5 text-[17px] font-display">
                            <div className="bg-orange-50 p-2 rounded-xl shadow-inner border border-orange-100">
                                <Filter className="h-4 w-4 text-[var(--primary)]" />
                            </div>
                            <span>Filters</span>
                            {activeFilterCount > 0 && (
                                <span className="bg-gradient-to-br from-[var(--primary)] to-[#FF8C00] text-white text-[10px] min-w-[20px] h-[20px] px-1 rounded-full flex items-center justify-center font-black shadow-sm border border-white/20">
                                    {activeFilterCount}
                                </span>
                            )}
                        </h3>
                        <button
                            onClick={clearAllFilters}
                            disabled={activeFilterCount === 0}
                            className={`flex items-center gap-1.5 text-[12px] font-bold transition-all uppercase tracking-wider
                                ${activeFilterCount > 0
                                    ? 'text-[var(--primary)] hover:text-[#A0501E] cursor-pointer'
                                    : 'text-gray-300 cursor-not-allowed opacity-60'}`}
                        >
                            Reset <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    {/* Package Type */}
                    <div className="space-y-4">
                        <p className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-widest border-b border-[var(--primary)]/50 pb-2 flex items-center gap-1.5">
                            <span className="text-[#FFB347]">📦</span> PACKAGE TYPE
                        </p>
                        <div className="flex flex-col gap-2">
                            {['all', 'single', 'multi'].map(type => {
                                const count = type === 'all' ? packages.length : packages.filter(p => p.package_mode === type).length;
                                const isDisabled = count === 0 && type !== 'all';

                                return (
                                    <div
                                        key={type}
                                        onClick={() => !isDisabled && setFilters(prev => ({ ...prev, package_mode: type }))}
                                        className={`
                                            py-2.5 px-4 rounded-xl text-[13px] font-bold cursor-pointer border transition-all duration-300 flex items-center justify-between group
                                            ${filters.package_mode === type
                                                ? 'bg-gradient-to-r from-[var(--primary)] to-[#FF8C00] border-transparent text-white shadow-md'
                                                : isDisabled
                                                    ? 'opacity-30 cursor-not-allowed bg-gray-50 border-gray-100 text-gray-400'
                                                    : 'bg-white/50 border-orange-100 text-[#7C3A10] hover:border-[var(--primary)] hover:bg-white'}
                                        `}
                                    >
                                        <span className="flex items-center gap-2">
                                            {type === 'all' ? 'All Packages' : type === 'single' ? 'Single City' : 'Multi-City Tours'}
                                            {!isDisabled && <span className={`text-[10px] ${filters.package_mode === type ? 'text-white/80' : 'text-[#A0501E]/50'}`}>({count})</span>}
                                        </span>
                                        {filters.package_mode === type && <CheckCircle2 className="h-4 w-4 text-white" />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Duration */}
                    <div className="space-y-4 pt-4 border-t border-[var(--primary)]/30">
                        <p className="text-[10px] font-bold text-[#A0501E] uppercase tracking-wider flex justify-between items-center gap-1.5 mb-3">
                            <span className="flex items-center gap-1.5"><span className="text-[#4F46E5]">⏱️</span> DURATION</span>
                        </p>

                        <div className="flex flex-wrap gap-2 mb-4">
                            {['1-3', '4-6', '7-10', '10+'].map(range => {
                                const [minLabel, maxLabel] = range.includes('+') ? [10, 30] : range.split('-').map(Number);
                                const isActive = filters.duration_min === minLabel && filters.duration_max === maxLabel;
                                const count = packages.filter(p => p.duration_days >= minLabel && p.duration_days <= maxLabel).length;
                                const isDisabled = count === 0;

                                return (
                                    <button
                                        key={range}
                                        disabled={isDisabled}
                                        onClick={() => {
                                            setFilters(prev => ({ ...prev, duration_min: minLabel, duration_max: maxLabel }));
                                        }}
                                        className={`px-4 py-2 h-[36px] rounded-full text-[12px] font-bold transition-all border 
                                            ${isActive ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-[0_0_12px_var(--primary-glow)]' :
                                                isDisabled ? 'opacity-30 border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed' :
                                                    'border-white/40 bg-white/25 text-[var(--primary)] hover:bg-[var(--primary-soft)]'}`}
                                    >
                                        {range} Days {count > 0 && <span className="text-[10px] opacity-60 ml-0.5">({count})</span>}
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
                            <div className="bg-[var(--primary)]/85 text-white text-[11px] font-bold rounded-full py-1 px-3 mx-auto shadow-[0_2px_8px_var(--primary-glow)] tracking-wide w-max">
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
                    <div className="space-y-4 pt-4 border-t border-[var(--primary)]/30">
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
                                const count = packages.filter(p => p.price_per_person >= range.min && p.price_per_person <= range.max).length;
                                const isDisabled = count === 0;

                                return (
                                    <button
                                        key={range.label}
                                        disabled={isDisabled}
                                        onClick={() => setFilters(prev => ({ ...prev, price_min: range.min, price_max: range.max }))}
                                        className={`px-3 py-2 h-[36px] rounded-full text-[11px] font-bold transition-all border 
                                            ${isActive ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-[0_4px_12px_var(--primary-glow)]' :
                                                isDisabled ? 'opacity-30 border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed' :
                                                    'border-white/40 bg-white/25 text-[#7C3A10] hover:bg-[#FFD6B9]/50'}`}
                                    >
                                        {range.label} {count > 0 && <span className="opacity-50 text-[9px]">({count})</span>}
                                    </button>
                                )
                            })}
                        </div>

                        <div
                            className="pt-2 px-1 flex flex-col gap-6 relative"
                            style={{ touchAction: 'none' }}
                            onPointerDown={(e) => { e.stopPropagation(); setIsSliderDragging(true); }}
                            onTouchStart={(e) => { e.stopPropagation(); setIsSliderDragging(true); }}
                            onMouseDown={(e) => { e.stopPropagation(); setIsSliderDragging(true); }}
                            onPointerUp={() => setIsSliderDragging(false)}
                            onPointerCancel={() => setIsSliderDragging(false)}
                        >
                            <div className="bg-gradient-to-br from-[var(--primary)] to-[#FF8C00] text-white text-[11px] font-black rounded-xl py-2 px-4 mx-auto shadow-lg tracking-wider w-max border border-white/30 mb-2">
                                ₹{filters.price_min.toLocaleString('en-IN')} — ₹{filters.price_max.toLocaleString('en-IN')}
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
                    <div className="pt-4 border-t border-[var(--primary)]/30">
                        <div
                            className="flex justify-between items-center cursor-pointer group"
                            onClick={() => setIsTripStyleOpen(!isTripStyleOpen)}
                        >
                            <p className="text-[10px] font-black text-[var(--primary)] uppercase tracking-[0.2em] flex items-center gap-2 group-hover:text-[var(--primary)] transition-colors">
                                <span className="text-pink-400 text-sm drop-shadow-sm">🌺</span> TRIP STYLE
                                {filters.trip_styles.length > 0 && <span className="bg-orange-100 text-[var(--primary)] text-[9px] px-1.5 py-0.5 rounded-md font-black shadow-sm border border-[var(--primary)]/50">({filters.trip_styles.length})</span>}
                            </p>
                            <ChevronDown className={`h-4 w-4 text-[#A0501E]/50 transition-transform duration-500 ${isTripStyleOpen ? 'rotate-180' : ''}`} />
                        </div>
                        {isTripStyleOpen && (
                            <div className="mt-3 max-h-[180px] overflow-y-auto custom-scrollbar pr-2 relative filter-list-container">
                                <div className="space-y-3 pb-6">
                                    {TRIP_STYLES.map(style => {
                                        const count = facets.styleCounts[style] || 0;
                                        const isDisabled = count === 0 && !filters.trip_styles.includes(style);

                                        return (
                                            <div
                                                key={style}
                                                className={`flex items-center group ${isDisabled ? 'opacity-30 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}`}
                                                onClick={() => !isDisabled && toggleFilterArray('trip_styles', style)}
                                            >
                                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center mr-3 transition-colors ${filters.trip_styles.includes(style) ? 'bg-[var(--primary)] border-[var(--primary)]' : 'bg-white/50 border-[var(--primary)]'}`}>
                                                    {filters.trip_styles.includes(style) && <Check className="h-3 w-3 text-white" />}
                                                </div>
                                                <label className={`text-[13px] font-bold cursor-pointer transition-colors uppercase tracking-tight flex items-center gap-2 ${filters.trip_styles.includes(style) ? 'text-[var(--primary)]' : 'text-[#6B3010]'}`}>
                                                    {style}
                                                    {count > 0 && <span className="text-[10px] opacity-40">({count})</span>}
                                                </label>
                                            </div>
                                        );
                                    })}
                                </div>

                            </div>
                        )}
                    </div>

                    {/* Activities */}
                    <div className="pt-4 border-t border-[var(--primary)]/30">
                        <div
                            className="flex justify-between items-center cursor-pointer group"
                            onClick={() => setIsActivitiesOpen(!isActivitiesOpen)}
                        >
                            <p className="text-[10px] font-black text-[var(--primary)] uppercase tracking-[0.2em] flex items-center gap-2 group-hover:text-[var(--primary)] transition-colors">
                                <span className="text-blue-500 text-sm drop-shadow-sm">🏄</span> ACTIVITIES
                                {filters.activities.length > 0 && <span className="bg-orange-100 text-[var(--primary)] text-[9px] px-1.5 py-0.5 rounded-md font-black shadow-sm border border-[var(--primary)]/50">({filters.activities.length})</span>}
                            </p>
                            <ChevronDown className={`h-4 w-4 text-[#A0501E]/50 transition-transform duration-500 ${isActivitiesOpen ? 'rotate-180' : ''}`} />
                        </div>
                        {isActivitiesOpen && (
                            <div className="mt-3 max-h-[180px] overflow-y-auto custom-scrollbar pr-2 relative filter-list-container">
                                <div className="space-y-3 pb-6">
                                    {ACTIVITIES.map(act => {
                                        const count = facets.activityCounts[act] || 0;
                                        const isDisabled = count === 0 && !filters.activities.includes(act);

                                        return (
                                            <div
                                                key={act}
                                                className={`flex items-center group ${isDisabled ? 'opacity-30 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}`}
                                                onClick={() => !isDisabled && toggleFilterArray('activities', act)}
                                            >
                                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center mr-3 transition-colors ${filters.activities.includes(act) ? 'bg-[var(--primary)] border-[var(--primary)]' : 'bg-white/50 border-[var(--primary)]'}`}>
                                                    {filters.activities.includes(act) && <Check className="h-3 w-3 text-white" />}
                                                </div>
                                                <label className={`text-[13px] font-bold cursor-pointer transition-colors uppercase tracking-tight flex items-center gap-2 ${filters.activities.includes(act) ? 'text-[var(--primary)]' : 'text-[#8B5030]'}`}>
                                                    {act}
                                                    {count > 0 && <span className="text-[10px] opacity-40">({count})</span>}
                                                </label>
                                            </div>
                                        );
                                    })}
                                </div>

                            </div>
                        )}
                    </div>

                    {/* Country */}
                    <div className="space-y-4 pt-4 border-t border-[var(--primary)]/30 pb-4">
                        <p className="text-[10px] font-black text-[#A0501E] uppercase tracking-[0.2em] flex items-center gap-2">
                            <span className="text-cyan-500 text-sm drop-shadow-sm">🌍</span> COUNTRY
                        </p>
                        <div className="flex overflow-x-auto gap-2.5 pb-2 scrollbar-hide -mx-2 px-2 snap-x">
                            {AVAILABLE_COUNTRIES.map(c => {
                                const count = facets.countryCounts[c] || 0;
                                const isDisabled = count === 0 && !filters.countries.includes(c);

                                return (
                                    <Badge
                                        key={c}
                                        variant={filters.countries.includes(c) ? "default" : "outline"}
                                        className={`cursor-pointer px-4 py-2 rounded-xl transition-all border snap-start whitespace-nowrap text-xs
                                            ${filters.countries.includes(c)
                                                ? 'bg-[var(--primary)] border-[var(--primary)] text-white shadow-[0_4px_12px_var(--primary-glow)]'
                                                : isDisabled
                                                    ? 'opacity-30 border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed pointer-events-none'
                                                    : 'bg-white/60 border-orange-100/50 text-[#8B5030] hover:bg-white hover:border-[var(--primary)]'}`}
                                        onClick={() => !isDisabled && toggleFilterArray('countries', c)}
                                    >
                                        {c} {count > 0 && <span className="opacity-50 text-[10px] ml-1">({count})</span>}
                                    </Badge>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Parallax Effect
    const { scrollY } = useScroll()
    const y1 = useTransform(scrollY, [0, 500], [0, 150])
    const opacity = useTransform(scrollY, [0, 300], [1, 1])

    // Reusable Search Bar
    const renderSearchBar = (isCompact: boolean) => (
        <div className={`relative flex items-center shadow-[0_8px_32px_var(--primary-glow)] bg-white/95 backdrop-blur-lg rounded-full overflow-visible ${isCompact ? 'p-1 pl-4 mx-auto w-full max-w-4xl' : 'p-2 pl-6'}`}>
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
        <div className="min-h-full font-sans pb-20 relative">




            {!hasSearched && (
                <>
                    <div className="relative overflow-hidden flex items-center justify-center min-h-screen noise-overlay">
                        <motion.div style={{ opacity }} className="absolute inset-0 z-0">
                            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=2021&q=80")` }} />
                            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.5) 100%)' }} />

                        </motion.div>

                        <div className="container mx-auto px-4 relative z-10 text-center space-y-8 w-full max-w-5xl pt-32 md:pt-40">
                            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} className="pt-8">
                                <h1 className="text-4xl md:text-[72px] font-bold font-display text-white leading-[1.1] drop-shadow-2xl mb-6 tracking-tight" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.4)' }}>
                                    Where do you <br />
                                    <span className="italic font-medium" style={{ color: 'var(--primary-light)' }}>want</span> to go?
                                </h1>
                                <p className="text-lg md:text-xl text-white font-light max-w-2xl mx-auto" style={{ opacity: 0.8, textShadow: '0 2px 20px rgba(0,0,0,0.4)' }}>
                                    Search for a destination, package name, or an experience you love
                                </p>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5, delay: 0.3 }}
                                className="relative z-40 max-w-4xl mx-auto w-full"
                                ref={searchRef}
                            >
                                <div className="p-2 md:p-3 transition-all duration-300" style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', borderRadius: '9999px', boxShadow: '0 8px 40px rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.95)' }}>
                                    <div className="bg-transparent rounded-full overflow-hidden flex flex-col md:flex-row items-center gap-2 relative transition-shadow">
                                        <div className="flex-1 flex items-center px-6 py-2 group w-full h-[52px] md:h-[64px]">
                                            <Search className="h-5 w-5 mr-3 group-focus-within:scale-110 transition-transform" style={{ color: 'var(--primary)' }} />
                                            <input
                                                type="text"
                                                placeholder={placeholderText}
                                                className="w-full bg-transparent border-none focus:ring-0 focus:outline-none p-0 text-gray-900 font-bold placeholder:text-gray-400 text-lg transition-all duration-500"
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
                                            className="text-white px-10 py-6 md:py-7 rounded-full text-lg font-black transition-transform duration-200 active:scale-95 w-full md:w-auto h-[52px] md:h-[64px] flex items-center shrink-0 hover:-translate-y-[1px]"
                                            style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary))', boxShadow: '0 6px 24px var(--primary-glow)' }}
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

                                {/* QUICK FILTER TAGS */}
                                {!(showSuggestions || inputValue.length > 0) && (
                                    <div className="space-y-6">
                                        <div className="mt-8 flex flex-wrap justify-center gap-3">
                                            {[
                                                { label: 'Adventure', icon: '🏔' },
                                                { label: 'Beach', icon: '🏖' },
                                                { label: 'Honeymoon', icon: '💑' },
                                                { label: 'Family', icon: '👨‍👩‍👧' }
                                            ].map((tag) => (
                                                <button
                                                    key={tag.label}
                                                    onClick={() => router.push(`/plan-trip?trip_style=${encodeURIComponent(tag.label)}`)}
                                                    className="px-6 py-2.5 rounded-full text-white font-bold text-sm transition-all hover:-translate-y-[2px] tracking-[0.05em] flex items-center gap-2 group border-[1px]"
                                                    style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', borderColor: 'rgba(255,255,255,0.35)' }}
                                                    onMouseOver={(e) => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
                                                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'; }}
                                                >
                                                    <span className="text-base">{tag.icon}</span> {tag.label}
                                                </button>
                                            ))}
                                        </div>

                                        {/* SOCIAL PROOF */}
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 1, duration: 1 }}
                                            className="flex items-center justify-center gap-4 text-white font-medium mx-auto w-max"
                                            style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', borderRadius: '50px', padding: '8px 20px', border: '1px solid rgba(255,255,255,0.2)' }}
                                        >
                                            <div className="flex -space-x-2">
                                                {[1, 2, 3].map(i => (
                                                    <div key={i} className="w-7 h-7 rounded-full border-[2px] border-white overflow-hidden shadow-sm">
                                                        <img src={`https://i.pravatar.cc/100?img=${i + 14}`} alt="user" className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="flex items-center gap-2 text-sm">
                                                <span className="font-bold" style={{ color: 'var(--primary-light)' }}>480+</span> trips planned this week
                                                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)] ml-1" />
                                            </p>
                                        </motion.div>
                                    </div>
                                )}
                            </motion.div>
                        </div>

                        {/* Subtle Divider */}
                        <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-[#FFF5ED] to-transparent z-10" />
                    </div>

                    {/* Content Section */}
                    <div className="container mx-auto px-4 py-8 space-y-12 max-w-7xl">
                        {/* Browse by Trip Style */}
                        <section className="relative py-10 px-8 rounded-[28px] border border-[var(--primary)]/15" style={{ background: 'linear-gradient(160deg, var(--primary-soft) 0%, transparent 100%)' }}>
                            <div className="container mx-auto max-w-7xl">
                                <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                                    <div>
                                        <h2 className="text-[34px] font-semibold text-[#1A1A1A] font-display mb-2 leading-tight">
                                            Browse by Trip Style
                                        </h2>
                                        <p className="text-sm text-[#8B5030] font-medium opacity-80 max-w-xl">
                                            Whether you&apos;re seeking thrills or romantic sunsets, we&apos;ve curated the perfect journeys for every vibe.
                                        </p>
                                    </div>
                                    <div className="hidden md:flex gap-3">
                                        <button className="w-10 h-10 rounded-full border-none bg-[var(--primary)] text-white flex items-center justify-center hover:opacity-90 transition-all active:scale-95 group" style={{ boxShadow: '0 4px 16px var(--primary-glow)' }}>
                                            <ArrowRight className="h-4 w-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
                                        </button>
                                        <button className="w-10 h-10 rounded-full border-none bg-[var(--primary)] text-white flex items-center justify-center hover:opacity-90 transition-all active:scale-95 group" style={{ boxShadow: '0 4px 16px var(--primary-glow)' }}>
                                            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex overflow-x-auto pb-4 -mx-4 px-4 md:grid md:grid-cols-4 gap-6 scrollbar-hide snap-x">
                                    {[
                                        { title: 'Adventure', icon_name: 'Mountain', description: 'For the thrill-seekers', bg: '#FFF4EE', iconBg: '#FFE8DC' },
                                        { title: 'Beach', icon_name: 'Waves', description: 'Sun, sand and serenity', bg: '#EEF8FF', iconBg: '#DAEFFE' },
                                        { title: 'Honeymoon', icon_name: 'Heart', description: 'Romantic getaways', bg: '#FFF0F5', iconBg: '#FFE0EC' },
                                        { title: 'Family', icon_name: 'Users', description: 'Memories for all ages', bg: '#F0FAF4', iconBg: '#D8F3E4' }
                                    ].map((item: any) => {
                                        const IconComponent = (() => {
                                            switch (item.icon_name) {
                                                case 'Mountain': return Mountain;
                                                case 'Waves': return Waves;
                                                case 'Heart': return Heart;
                                                case 'Users': return Users;
                                                case 'Trees': return Trees;
                                                case 'Palmtree': return Palmtree;
                                                case 'Compass': return Compass;
                                                case 'MapPin': return MapPin;
                                                case 'Camera': return Camera;
                                                default: return Sparkles;
                                            }
                                        })();

                                        return (
                                            <div
                                                key={item.title}
                                                onClick={() => router.push(`/plan-trip?trip_style=${encodeURIComponent(item.title)}`)}
                                                className="glass-agent min-w-[220px] md:min-w-0 p-8 text-center cursor-pointer flex flex-col items-center group transition-all duration-300 hover:-translate-y-[8px] snap-start border-b-[4px] border-transparent hover:border-[var(--primary)] hover:shadow-[0_20px_40px_rgba(255,180,160,0.2)]"
                                            >
                                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 bg-white/40 group-hover:bg-white/60 group-hover:scale-110 shadow-sm border border-white/20">
                                                    <IconComponent className="h-7 w-7 text-[var(--primary)]" />
                                                </div>
                                                <h3 className="text-lg font-bold text-[#1A1A1A] tracking-tight mb-2">{item.title}</h3>
                                                <p className="text-xs font-bold text-[#8B5030]/50 uppercase tracking-widest">{item.description}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </section>

                        {/* Popular Destinations */}
                        {popularDestinations.length >= 0 && (
                            <section className="pt-0 pb-12 container mx-auto max-w-7xl">
                                <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 px-4 md:px-0 mt-6">
                                    <div>
                                        <h2 className="text-[48px] md:text-[52px] font-bold text-[#1A1A1A] font-display mb-3 leading-tight">
                                            Popular Destinations
                                        </h2>
                                        <p className="text-[15px] text-[#6B6B6B] font-medium max-w-[520px]">
                                            Join thousands of travelers exploring these top-rated spots this season.
                                        </p>
                                    </div>
                                    <button className="text-[var(--primary)] font-bold text-sm tracking-widest uppercase flex items-center gap-2 group hover:underline transition-all hover:underline-offset-4">
                                        View All Destinations
                                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 px-4 md:px-0">
                                    {popularDestinations.slice(0, 5).map((dest, idx) => {
                                        // Fallback Unsplash images when no package image is set
                                        const fallbackImages = [
                                            "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&q=80&w=2071",
                                            "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&q=80&w=1964",
                                            "https://images.unsplash.com/photo-1603262110263-fb0112e7cc33?auto=format&fit=crop&q=80&w=2071"
                                        ]
                                        const cardImage = dest.image_url || fallbackImages[idx % fallbackImages.length]
                                        const city = dest.name
                                        const pkgCount = dest.pkg_count || 1
                                        const colSpan = idx < 3 ? 'lg:col-span-2' : 'lg:col-span-3';

                                        return (
                                            <div
                                                key={city}
                                                onClick={() => router.push(`/plan-trip?destination=${encodeURIComponent(city)}`)}
                                                className={`relative aspect-[4/3] rounded-[20px] overflow-hidden cursor-pointer group shadow-lg ${colSpan}`}
                                            >
                                                <Image
                                                    src={cardImage}
                                                    alt={city}
                                                    fill
                                                    unoptimized={!!dest.image_url}
                                                    className="object-cover group-hover:scale-105 transition-transform duration-500 will-change-transform"
                                                />
                                                <div className="absolute inset-0 transition-opacity duration-300" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)' }} />

                                                <div className="absolute top-4 right-4 flex flex-col gap-2">
                                                    <Badge className="bg-white/20 backdrop-blur-md text-white border-none font-bold px-3 py-1 flex items-center gap-1.5 rounded-full shadow-sm">
                                                        <span className="text-yellow-400">★</span> 4.8
                                                    </Badge>
                                                    <Badge className="bg-[var(--primary)] text-white border-0 font-bold px-3 py-1 rounded-full shadow-sm" style={{ boxShadow: '0 2px 8px var(--primary-glow)' }}>
                                                        {pkgCount}+ Packages
                                                    </Badge>
                                                </div>

                                                <div className="absolute bottom-6 left-6 right-6 flex flex-col items-start overflow-hidden">
                                                    <h3 className="font-bold text-white font-display leading-tight mb-2 transition-transform duration-300 group-hover:-translate-y-1" style={{ fontSize: '28px', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                                                        {city}
                                                    </h3>
                                                    <div className="translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-out flex items-center h-8">
                                                        <span className="bg-[var(--primary)] text-white px-5 py-2 rounded-full font-bold text-sm tracking-wide shadow-lg flex items-center gap-2">
                                                            EXPLORE PACKAGES <ArrowRight className="h-4 w-4" />
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </section>
                        )}

                        {/* Footer Gradient Buffer Strip - replaces harsh wave */}
                        <div className="absolute bottom-0 left-0 w-full h-[80px]" style={{ background: 'linear-gradient(to bottom, transparent, #111111)' }} />
                    </div>
                </>
            )}

            {/* Main Content Area - Only shown after filtering or searching */}
            <AnimatePresence>
                {hasSearched && (
                    <motion.div
                        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                        className="container mx-auto px-4 mt-28 pb-16 relative z-10"
                    >
                        {/* RESULTS CONTEXT SECTION - Alternate BG */}
                        <div className="relative -mx-4 px-4 py-8 bg-white/30 backdrop-blur-sm rounded-t-[48px] border-t border-orange-100">
                            <div className="flex flex-col md:flex-row gap-8">

                                {/* Desktop Sidebar Filter */}
                                <div className="hidden md:block w-[280px] shrink-0">
                                    <div className="glass-filter-panel shadow-[0_8px_32px_var(--primary-glow)] bg-white/50 backdrop-blur-xl sticky top-24 flex flex-col z-10 border border-white/40 rounded-3xl">
                                        <FilterPanel />
                                    </div>
                                </div>

                                {/* Main Results Area */}
                                <div className="flex-1 min-w-0">
                                    {/* Top Search Bar */}
                                    <div className="mb-6 relative z-50 overflow-visible">
                                        {renderSearchBar(true)}
                                    </div>
                                    {/* Context Header & Mobile Filter Trigger */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                        <div className="bg-[#FFE4CC]/20 backdrop-blur-md rounded-2xl h-[90px] pt-4 px-6 border border-white/20 shadow-[0_4px_24px_var(--primary-glow)] flex-1 flex flex-col justify-center relative overflow-hidden">
                                            {/* faint texture overlay */}
                                            <div className="absolute inset-0 opacity-[0.02] pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/noise-pattern-with-subtle-cross-lines.png')]" />

                                            <div className="flex items-center gap-4 relative z-10">
                                                <div className="bg-white/60 p-2.5 rounded-xl shadow-sm">
                                                    <Search className="h-5 w-5 text-indigo-500 stroke-[2.5]" />
                                                </div>
                                                <div className="flex items-baseline gap-3">
                                                    <h2 className="text-2xl md:text-3xl tracking-tight font-bold text-[#3A1A08] font-display capitalize">
                                                        {searching ? 'Searching...' : (searchQuery || 'All Destinations')}
                                                    </h2>
                                                    {!searching && (
                                                        <span className="text-[13px] font-bold text-[#8B5030]/60 uppercase tracking-widest border-l border-[var(--primary)]/50 pl-3">
                                                            {packages.length} {packages.length === 1 ? 'Result' : 'Results'} Found
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 self-start sm:self-auto h-[80px]">
                                            {/* Mobile Filter Sheet */}
                                            <div className="md:hidden">
                                                <Sheet>
                                                    <SheetTrigger asChild>
                                                        <Button variant="outline" className="flex items-center gap-2 h-14 rounded-full border-none shadow-sm bg-white/70">
                                                            <Filter className="h-4 w-4" /> Filters
                                                            {(filters.trip_styles.length > 0 || filters.activities.length > 0) && (
                                                                <span className="bg-[var(--primary)] text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">!</span>
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
                                                <SelectContent className="rounded-xl border-white/50 bg-white/95 backdrop-blur-md shadow-[0_8px_32px_var(--primary-glow)]">
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
                                        <div className="bg-white/30 backdrop-blur-xl rounded-[48px] border border-orange-100/50 p-16 md:p-24 text-center shadow-sm relative overflow-hidden">
                                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')] opacity-[0.03] pointer-events-none" />
                                            <div className="relative z-10">
                                                <div className="w-24 h-24 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border border-white/50">
                                                    <div className="relative">
                                                        <Search className="h-10 w-10 text-[var(--primary)] animate-pulse" />
                                                        <MapPin className="absolute -top-2 -right-2 h-5 w-5 text-indigo-400" />
                                                    </div>
                                                </div>
                                                <h3 className="text-3xl font-bold text-[#3A1A08] mb-4 font-display">No hidden gems found</h3>
                                                <p className="text-[#8B5030] max-w-sm mx-auto mb-10 text-lg font-medium leading-relaxed opacity-80">
                                                    We couldn&apos;t find any packages matching your current filters. Try broadening your search!
                                                </p>
                                                <Button
                                                    onClick={clearAllFilters}
                                                    className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] text-white px-10 py-7 rounded-full font-black shadow-[0_12px_24px_var(--primary-glow)] hover:shadow-[0_12px_32px_var(--primary-glow)] hover:-translate-y-1 transition-all active:scale-95 flex items-center gap-3 mx-auto"
                                                >
                                                    <RotateCcw className="h-5 w-5" />
                                                    Clear All & Refresh
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-12">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[32px] items-stretch grid-auto-rows-[1fr]">
                                                {packages.slice(0, visibleCount).map((pkg, idx) => (
                                                    <motion.div
                                                        key={pkg.id}
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ duration: 0.5, delay: idx % 9 * 0.1 }}
                                                        className="glass-pkg-card group flex flex-col h-full relative overflow-hidden"
                                                    >
                                                        <div className="flex flex-col flex-1 h-full p-2 overflow-hidden rounded-2xl">
                                                            {/* Image Header */}
                                                            <div className="relative h-56 overflow-hidden bg-gray-100 cursor-pointer rounded-2xl" onClick={() => handleContinueToBook(pkg)}>

                                                                {pkg.feature_image_url || pkg.destination_image_url || (pkg.images && pkg.images.length > 0) ? (
                                                                    <>
                                                                        <img
                                                                            src={pkg.feature_image_url || pkg.destination_image_url || pkg.images![0]?.url}
                                                                            alt={pkg.title}
                                                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                                        />
                                                                        <div className="absolute inset-0 bg-gradient-to-t from-[#2a1106]/80 via-transparent to-transparent opacity-80" />
                                                                    </>
                                                                ) : (
                                                                    <div className="absolute inset-0 bg-gradient-to-br from-[#FFD4A8]/40 to-[var(--primary)]/40 flex items-center justify-center p-6 text-center z-0">
                                                                        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/topography.png')] mix-blend-overlay"></div>
                                                                        {/* Fallback real-world image based on destination if available */}
                                                                        <img
                                                                            src={`https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&q=80&w=1200`}
                                                                            alt="Destination fallback"
                                                                            className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-multiply"
                                                                        />
                                                                        <div className="relative z-10 drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                                                                            <div className="text-white font-black text-xl mb-1.5 drop-shadow-md font-display leading-tight uppercase tracking-tight">
                                                                                {pkg.package_mode === 'multi' && pkg.destinations?.length > 0
                                                                                    ? pkg.destinations.length > 1
                                                                                        ? `${pkg.destinations[0].city} → ${pkg.destinations[pkg.destinations.length - 1].city}`
                                                                                        : pkg.destinations[0].city
                                                                                    : pkg.destination}
                                                                            </div>
                                                                            {pkg.package_mode !== 'multi' && (
                                                                                <div className="text-orange-50 font-black tracking-[0.14em] text-[10px] flex items-center justify-center gap-1.5 uppercase drop-shadow-sm opacity-90">
                                                                                    📍 {pkg.country || 'Destination'}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Overlays */}
                                                                {pkg.package_mode === 'multi' && (
                                                                    <div className="absolute top-4 left-4 z-10">
                                                                        <Badge className="bg-gradient-to-r from-[#FFB347] to-[#FF8C00] text-white border-0 shadow-lg font-bold flex items-center gap-1.5 rounded-full px-3.5 py-1.5">
                                                                            🌐 Multi-City Tour
                                                                        </Badge>
                                                                    </div>
                                                                )}

                                                                <div className="absolute top-4 right-4 flex flex-col gap-2 items-end z-10">
                                                                    <div className="flex flex-col gap-2 items-end">
                                                                        <Badge className="bg-black text-white hover:bg-black/80 border border-white/20 shadow-[0_4px_10px_rgba(0,0,0,0.1)] font-bold rounded-full px-3 py-1">
                                                                            {formatDuration(pkg.duration_days)}
                                                                        </Badge>
                                                                        <Badge className="bg-[var(--primary)] text-white border-0 shadow-[0_4px_10px_rgba(0,0,0,0.1)] font-bold rounded-full px-3 py-1">
                                                                            ₹{pkg.price_per_person.toLocaleString('en-IN')}
                                                                        </Badge>
                                                                    </div>
                                                                    {/* Wishlist Button */}
                                                                    <button
                                                                        className="group/wishlist mt-1"
                                                                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                                                                    >
                                                                        <div className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md border border-white/30 flex items-center justify-center transition-all hover:bg-white/40 hover:scale-110 active:scale-90 shadow-sm">
                                                                            <Heart className="h-5 w-5 text-white group-hover/wishlist:text-red-400 transition-colors" />
                                                                        </div>
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Content */}
                                                            <div className="p-4 pt-2.5 flex flex-col flex-1 cursor-pointer bg-transparent justify-between" onClick={() => handleContinueToBook(pkg)}>
                                                                <div className="flex flex-col gap-1">
                                                                    <div className="flex items-start justify-between gap-3 mb-1.5">
                                                                        <div className="custom-tooltip-container mb-1.5 h-auto">
                                                                            <h3 className="font-bold text-black text-xl line-clamp-2 leading-tight transition-colors font-display min-h-[2.5rem] overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }} title={pkg.title}>
                                                                                {pkg.title}
                                                                            </h3>
                                                                            <span className="custom-tooltip-content">{pkg.title}</span>
                                                                        </div>
                                                                    </div>

                                                                    {/* Destination Route */}
                                                                    <div className="mb-2 text-sm text-black mt-0.5 flex items-center gap-2 line-clamp-1 font-medium">
                                                                        <MapPin className="h-4 w-4 shrink-0 text-[var(--primary)]" />
                                                                        {pkg.package_mode === 'multi' && pkg.destinations && pkg.destinations.length > 0 ? (
                                                                            <span className="truncate">
                                                                                {pkg.destinations.length > 1
                                                                                    ? `${pkg.destinations[0].city} → ${pkg.destinations[pkg.destinations.length - 1].city}`
                                                                                    : pkg.destinations[0].city}
                                                                            </span>
                                                                        ) : (
                                                                            <span>{pkg.destination} · {pkg.country || "Asia"}</span>
                                                                        )}
                                                                    </div>

                                                                    {/* Tags */}
                                                                    <div className="flex flex-wrap gap-2 mb-1.5 min-h-[24px] items-center">
                                                                        {pkg.trip_style && (
                                                                            <Badge variant="outline" className="bg-white/50 text-black border-orange-100/50 font-bold whitespace-nowrap rounded-full px-3 py-1 uppercase text-[10px] tracking-wider flex items-center gap-1.5 backdrop-blur-sm">
                                                                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]"></span>
                                                                                {pkg.trip_style}
                                                                            </Badge>
                                                                        )}
                                                                        {pkg.activities && pkg.activities.slice(0, 2).map((act, idx) => (
                                                                            typeof act === 'string' ? ( // Handle JSON string edge cases if any
                                                                                <Badge key={idx} variant="outline" className="text-black border-orange-100/50 font-bold whitespace-nowrap rounded-full px-3 py-1 uppercase text-[10px] tracking-wider bg-white/40 flex items-center gap-1.5 backdrop-blur-sm">
                                                                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-300"></span>
                                                                                    {act.replace(/["\[\]]/g, '')}
                                                                                </Badge>
                                                                            ) : null
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Price and Action Section */}
                                                        <div className="p-4 pt-1 mt-auto relative z-20 bg-transparent" onClick={(e) => e.stopPropagation()}>
                                                            <div className="pt-3 border-t border-[var(--primary)]/40 flex items-center justify-between gap-2 w-full flex-nowrap">
                                                                <div className="flex flex-col flex-1">
                                                                    <span className="text-xs font-black text-[var(--primary)] uppercase tracking-[0.15em] mb-0.5 drop-shadow-sm">Starting From</span>
                                                                    <div className="flex items-baseline gap-1">
                                                                        <span className="text-xl font-bold text-black">₹{pkg.price_per_person.toLocaleString('en-IN')}</span>
                                                                        <span className="text-xs text-black/70 font-medium uppercase tracking-widest">/ pp</span>
                                                                    </div>
                                                                </div>
                                                                <Button
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        setSelectedPackageForBooking(pkg);
                                                                        setIsBookingModalOpen(true);
                                                                    }}
                                                                    className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light,var(--primary))] hover:opacity-90 text-white min-w-[110px] px-4 py-2 h-10 rounded-full text-sm font-bold shadow-[0_4px_15px_var(--primary-glow)] transition-all hover:scale-105 active:scale-95 group/btn flex items-center gap-2 overflow-hidden relative flex-shrink-0"
                                                                >
                                                                    <span className="relative z-10 flex items-center gap-2">
                                                                        Book Now
                                                                        <ArrowRight className="h-3 w-3 group-hover/btn:translate-x-1 transition-transform" />
                                                                    </span>
                                                                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700 ease-in-out z-0"></div>
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>

                                            {/* Infinite Scroll Sentinel & Loader */}
                                            <div ref={loaderRef} className="py-12 flex flex-col items-center justify-center gap-4">
                                                {isLoadingMore ? (
                                                    <div className="flex flex-col items-center gap-3 animate-in fade-in duration-500">
                                                        <Loader2 className="h-8 w-8 text-[var(--primary)] animate-spin" />
                                                        <p className="text-sm font-bold text-black animate-pulse uppercase tracking-[0.2em]">Exploring more packages...</p>
                                                    </div>
                                                ) : visibleCount >= packages.length ? (
                                                    <div className="flex flex-col items-center gap-3 py-6 px-12 bg-white/40 backdrop-blur-xl rounded-full border border-orange-100/50 shadow-sm animate-in zoom-in duration-500">
                                                        <div className="flex items-center gap-3 text-black">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                                                            <p className="text-[11px] font-black uppercase tracking-[0.2em]">All {packages.length} hidden gems loaded</p>
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sticky CTA Removed as per user request */}

            {/* Booking Modal Redesign */}
            <Dialog open={isBookingModalOpen} onOpenChange={setIsBookingModalOpen}>
                <DialogContent
                    className="max-w-md p-5 overflow-hidden border border-white/60 shadow-[0_32px_80px_rgba(0,0,0,0.2)] rounded-[32px] bg-white/40 backdrop-blur-2xl z-[1001]"
                    overlayClass="z-[1000] bg-black/40 backdrop-blur-sm"
                    hideClose={true}
                >
                    <div className="relative flex flex-col h-full max-h-[90vh]">
                        {/* Glassy Header Card */}
                        <div className="bg-gradient-to-br from-[var(--primary-light,var(--primary))] to-[var(--primary)] py-4 px-5 text-center relative shrink-0 rounded-[24px] mb-2 border border-white/30 backdrop-blur-md shadow-lg">
                            <DialogClose className="absolute top-2 right-2 text-white/90 hover:text-white hover:bg-white/20 p-2.5 rounded-full transition-all z-[1010] outline-none border-none shadow-none">
                                <X className="h-5 w-5" />
                                <span className="sr-only">Close</span>
                            </DialogClose>

                            <h2 className="text-xl font-extrabold text-white mb-1 font-display tracking-tight drop-shadow-md">Trip Details</h2>
                            <p className="text-orange-50/90 text-[10px] font-bold leading-relaxed max-w-[240px] mx-auto opacity-90 drop-shadow-sm uppercase tracking-wider">
                                {selectedPackageForBooking?.title}
                            </p>
                        </div>

                        {/* Modal Body */}
                        <div className="pt-4 p-2 space-y-6 overflow-y-auto custom-scrollbar">
                            {/* Travel Date Section */}
                            <div className="space-y-4">
                                <Label className="text-xs font-bold text-black uppercase tracking-[0.15em] px-1">
                                    Travel Date
                                </Label>
                                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                    <PopoverTrigger asChild>
                                        <div className="relative group cursor-pointer">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--primary)] z-10">
                                                <CalendarIcon className="h-5 w-5" />
                                            </div>
                                            <div className="h-14 pl-12 pr-4 bg-white/50 backdrop-blur-md border border-white/40 rounded-2xl font-bold text-slate-800 flex items-center shadow-inner group-hover:bg-white/60 transition-all">
                                                {selectedDate ? format(new Date(selectedDate), 'dd-MM-yyyy') : 'Select Date'}
                                            </div>
                                        </div>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 border-0 bg-transparent shadow-none p-0 z-[1100]" align="start">
                                        <PremiumCalendar
                                            mode="single"
                                            selected={selectedDate ? new Date(selectedDate) : undefined}
                                            onSelect={(date) => {
                                                if (date) {
                                                    setSelectedDate(format(date, 'yyyy-MM-dd'));
                                                    setIsCalendarOpen(false);
                                                }
                                            }}
                                            onClear={() => {
                                                setSelectedDate('');
                                                setIsCalendarOpen(false);
                                            }}
                                            onToday={() => {
                                                const today = new Date();
                                                setSelectedDate(format(today, 'yyyy-MM-dd'));
                                                setIsCalendarOpen(false);
                                            }}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Travelers Section */}
                            <div className="space-y-4">
                                <Label className="text-xs font-bold text-black uppercase tracking-[0.15em] px-1">
                                    Travelers
                                </Label>
                                <div className="space-y-3">
                                    <PassengerCounter
                                        label="Adults"
                                        sublabel="Age 13+"
                                        value={travelers.adults}
                                        min={1}
                                        max={10}
                                        compact={true}
                                        className="bg-white/40 backdrop-blur-sm border-white/30 rounded-2xl p-3"
                                        onChange={(val) => setTravelers(prev => ({ ...prev, adults: val }))}
                                    />
                                    <PassengerCounter
                                        label="Children"
                                        sublabel="Age 2-12"
                                        value={travelers.children}
                                        min={0}
                                        max={5}
                                        compact={true}
                                        className="bg-white/40 backdrop-blur-sm border-white/30 rounded-2xl p-3"
                                        onChange={(val) => setTravelers(prev => ({ ...prev, children: val }))}
                                    />
                                    <PassengerCounter
                                        label="Infants"
                                        sublabel="Under 2"
                                        value={travelers.infants}
                                        min={0}
                                        max={3}
                                        compact={true}
                                        className="bg-white/40 backdrop-blur-sm border-white/30 rounded-2xl p-3"
                                        onChange={(val) => setTravelers(prev => ({ ...prev, infants: val }))}
                                    />
                                </div>
                            </div>

                            {/* Origin City Section - Condition rendering based on flights_enabled */}
                            {selectedPackageForBooking?.flights_enabled && (
                                <div className="space-y-4">
                                    <Label className="text-xs font-bold text-black uppercase tracking-[0.15em] px-1">
                                        Starting From
                                    </Label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--primary)] z-10 pointer-events-none">
                                            <Plane className="h-5 w-5" />
                                        </div>
                                        <Select
                                            value={originCity}
                                            onValueChange={setOriginCity}
                                        >
                                            <SelectTrigger className="h-14 pl-12 pr-4 bg-white/50 backdrop-blur-md border-white/40 rounded-2xl font-bold text-slate-800 focus:ring-var(--primary) focus:border-[var(--primary)] transition-all shadow-inner">
                                                <SelectValue placeholder="Select Origin City" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white/90 backdrop-blur-xl border-orange-100 rounded-2xl shadow-xl">
                                                {selectedPackageForBooking.flight_origin_cities?.map((city) => (
                                                    <SelectItem key={city} value={city} className="font-bold text-slate-700 focus:bg-orange-50 focus:text-[var(--primary)] rounded-xl m-1">
                                                        {city}
                                                    </SelectItem>
                                                ))}
                                                {(!selectedPackageForBooking.flight_origin_cities || selectedPackageForBooking.flight_origin_cities.length === 0) && (
                                                    <SelectItem value="MAA" className="font-bold text-slate-700">Chennai (MAA)</SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-2 pt-4 mt-auto">
                            <Button
                                className="w-full h-auto py-3 bg-[var(--primary)] hover:opacity-90 text-white rounded-xl text-sm font-black shadow-[0_8px_16px_var(--primary-glow)] transition-all active:scale-[0.98] border-none"
                                disabled={!selectedDate || travelers.adults < 1 || (selectedPackageForBooking?.flights_enabled && !originCity)}
                                onClick={() => {
                                    if (selectedPackageForBooking) {
                                        const url = new URL(`/plan-trip/${selectedPackageForBooking.slug}`, window.location.origin);
                                        url.searchParams.set('date', selectedDate);
                                        url.searchParams.set('adults', travelers.adults.toString());
                                        url.searchParams.set('children', travelers.children.toString());
                                        url.searchParams.set('infants', travelers.infants.toString());
                                        if (originCity) url.searchParams.set('origin', originCity);
                                        url.searchParams.set('ref', 'listing');
                                        router.push(url.toString());
                                    }
                                }}
                            >
                                Start Planning Journey
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Footer Removed - Using Global Footer with fixed socials */}

            <style dangerouslySetInnerHTML={{
                __html: `
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
                    border-color: var(--primary-glow) !important;
                    box-shadow: 0 0 0 3px var(--primary-glow) !important;
                }
            ` }} />
        </div>
    )
}
