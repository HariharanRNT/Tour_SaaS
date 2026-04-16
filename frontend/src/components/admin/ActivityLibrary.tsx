'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { Search, MapPin, Clock, Plus, LayoutGrid, GripVertical, ChevronDown, ChevronUp, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { activitiesAPI } from '@/lib/api'
import { Activity } from '@/types/activities'
import { cn } from '@/lib/utils'
import ReactDOM from 'react-dom'

// ─── Activity Preview Popup (Portal-based, fixed positioning) ─────────────────
interface PreviewPopupProps {
    activity: Activity
    cardRect: DOMRect
    panelRect: DOMRect
    onClose: () => void
    isVisible: boolean
}

function ActivityPreviewPopup({ activity, cardRect, panelRect, onClose, isVisible }: PreviewPopupProps) {
    const popupRef = useRef<HTMLDivElement>(null)
    const POPUP_WIDTH = 280
    const POPUP_HEIGHT = 340 // estimated max height

    // Decide vertical placement: above or below the card
    const spaceBelow = window.innerHeight - cardRect.bottom
    const spaceAbove = cardRect.top
    const showAbove = spaceBelow < POPUP_HEIGHT && spaceAbove > spaceBelow

    // Horizontal: center over the card, but clamp within panel
    let left = cardRect.left + cardRect.width / 2 - POPUP_WIDTH / 2
    left = Math.max(panelRect.left + 8, Math.min(panelRect.right - POPUP_WIDTH - 8, left))

    const topPosition = showAbove
        ? cardRect.top - POPUP_HEIGHT - 12
        : cardRect.bottom + 12

    // Arrow horizontal offset relative to popup left
    const arrowLeft = cardRect.left + cardRect.width / 2 - left - 8

    // Close on outside click
    useEffect(() => {
        if (!isVisible) return
        const handleOutside = (e: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
                onClose()
            }
        }
        // slight delay to avoid same-click close
        const t = setTimeout(() => document.addEventListener('mousedown', handleOutside), 50)
        return () => {
            clearTimeout(t)
            document.removeEventListener('mousedown', handleOutside)
        }
    }, [isVisible, onClose])

    const popup = (
        <div
            ref={popupRef}
            style={{
                position: 'fixed',
                top: `${topPosition}px`,
                left: `${left}px`,
                width: `${POPUP_WIDTH}px`,
                zIndex: 9999,
                background: 'rgba(255,255,255,0.65)',
                backdropFilter: 'blur(32px) saturate(150%)',
                WebkitBackdropFilter: 'blur(32px) saturate(150%)',
                border: '1.5px solid rgba(255,255,255,0.70)',
                borderRadius: '20px',
                boxShadow: '0 16px 48px var(--primary-glow), 0 4px 16px rgba(0,0,0,0.10)',
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'scale(1)' : 'scale(0.92)',
                transformOrigin: showAbove ? 'bottom center' : 'top center',
                transition: 'opacity 200ms ease-out, transform 200ms ease-out',
                pointerEvents: isVisible ? 'auto' : 'none',
                overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
        >
            {/* Arrow pointing toward the card */}
            <div
                style={{
                    position: 'absolute',
                    left: `${Math.max(12, Math.min(POPUP_WIDTH - 28, arrowLeft))}px`,
                    ...(showAbove ? { bottom: '-7px' } : { top: '-7px' }),
                    width: '14px',
                    height: '14px',
                    background: 'rgba(255,255,255,0.65)',
                    border: '1.5px solid rgba(255,255,255,0.70)',
                    borderTop: showAbove ? '1.5px solid rgba(255,255,255,0.70)' : 'none',
                    borderRight: showAbove ? '1.5px solid rgba(255,255,255,0.70)' : 'none',
                    borderBottom: showAbove ? 'none' : '1.5px solid rgba(255,255,255,0.70)',
                    borderLeft: showAbove ? 'none' : '1.5px solid rgba(255,255,255,0.70)',
                    transform: 'rotate(45deg)',
                    zIndex: -1 }}
            />

            {/* Image */}
            {activity.images && activity.images.length > 0 ? (
                <div style={{ height: '140px', overflow: 'hidden', borderRadius: '18px 18px 0 0' }}>
                    <img
                        src={activity.images[0].image_url}
                        alt={activity.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                </div>
            ) : (
                <div
                    style={{
                        height: '100px',
                        borderRadius: '18px 18px 0 0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--primary-glow)' }}
                >
                    <LayoutGrid style={{ width: '32px', height: '32px', color: 'var(--primary)', opacity: 0.25 }} />
                </div>
            )}

            {/* Close button */}
            <button
                onClick={onClose}
                style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.80)',
                    border: '1px solid rgba(255,255,255,0.60)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                    zIndex: 10 }}
            >
                <X style={{ width: '12px', height: '12px', color: 'black' }} />
            </button>

            {/* Content */}
            <div style={{ padding: '12px 16px 4px' }}>
                <h4 style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    color: 'black',
                    lineHeight: 1.3,
                    marginBottom: '6px',
                    fontFamily: 'serif' }}>
                    {activity.name}
                </h4>
            </div>

            {/* Category + Duration */}
            <div style={{ padding: '0 16px 8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: 'black',
                    background: 'rgba(255,255,255,0.55)',
                    border: '1px solid rgba(255,255,255,0.65)',
                    borderRadius: '999px',
                    padding: '2px 8px' }}>
                    {activity.category}
                </span>
                <span style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: 'black',
                    background: 'rgba(255,255,255,0.35)',
                    borderRadius: '999px',
                    padding: '2px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px' }}>
                    <Clock style={{ width: '10px', height: '10px', color: 'black' }} />
                    {activity.duration_hours}h
                </span>
            </div>


            {/* Description */}
            {activity.description && (
                <div style={{ padding: '0 16px 12px' }}>
                    <p style={{
                        fontSize: '12px',
                        color: 'rgba(92,37,0,0.65)',
                        lineHeight: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical' as const,
                        overflow: 'hidden' }}>
                        {activity.description}
                    </p>
                </div>
            )}

            {/* Drag hint footer */}
            <div style={{
                padding: '8px 16px',
                borderTop: '1px solid rgba(255,255,255,0.50)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                background: 'rgba(255,255,255,0.20)' }}>
                <GripVertical style={{ width: '12px', height: '12px', color: 'var(--primary)', opacity: 0.5 }} />
                <span style={{ fontSize: '11px', color: 'rgba(160,82,45,0.65)', fontStyle: 'italic' }}>
                    Drag to add to itinerary
                </span>
            </div>
        </div>
    )

    if (typeof document === 'undefined') return null
    return ReactDOM.createPortal(popup, document.body)
}

// ─── Activity Draggable Card ───────────────────────────────────────────────────
interface ActivityDraggableCardProps {
    activity: Activity
    onPreview: (activity: Activity, cardRect: DOMRect) => void
    activePreviewId: string | null
}

function ActivityDraggableCard({ activity, onPreview, activePreviewId }: ActivityDraggableCardProps) {
    const cardRef = useRef<HTMLDivElement>(null)
    const [hasHovered, setHasHovered] = useState(false)
    const [showFirstHoverTip, setShowFirstHoverTip] = useState(false)
    const tipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `library-${activity.id}`,
        data: { type: 'library-activity', activity }
    })

    const dragStyle = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 1000 } : {}

    const isPreviewOpen = activePreviewId === String(activity.id)

    const setRefs = useCallback((node: HTMLDivElement | null) => {
        (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = node
        setNodeRef(node)
    }, [setNodeRef])

    const handleFirstHover = () => {
        if (!hasHovered) {
            setHasHovered(true)
            setShowFirstHoverTip(true)
            tipTimerRef.current = setTimeout(() => setShowFirstHoverTip(false), 2000)
        }
    }

    useEffect(() => () => { if (tipTimerRef.current) clearTimeout(tipTimerRef.current) }, [])

    const handleClick = (e: React.MouseEvent) => {
        if (isDragging) return
        e.stopPropagation()
        if (cardRef.current) {
            onPreview(activity, cardRef.current.getBoundingClientRect())
        }
    }

    return (
        <div
            ref={setRefs}
            className={cn(
                "group/card relative border rounded-2xl p-3 transition-all select-none",
                "hover:shadow-[0_8px_30px_var(--primary-glow)] hover:-translate-y-0.5",
                isDragging
                    ? "opacity-70 border-dashed border-[var(--primary)] rotate-2 shadow-2xl cursor-grabbing"
                    : isPreviewOpen
                        ? "border-black/50 shadow-[0_4px_20px_var(--primary-glow)]"
                        : "border-white/35 hover:border-black/35 cursor-pointer"
            )}
            style={{
                ...dragStyle,
                background: isDragging ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.18)',
                backdropFilter: 'blur(12px)' }}
            onMouseEnter={handleFirstHover}
            onClick={handleClick}
        >
            {/* First-hover tooltip */}
            {showFirstHoverTip && (
                <div className="absolute -top-9 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap pointer-events-none">
                    <div
                        className="px-3 py-1 rounded-full text-[9px] font-bold text-black shadow-lg"
                        style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid var(--primary-soft)' }}
                    >
                        Drag to add · Click to preview
                    </div>
                </div>
            )}

            <div className="flex gap-3 items-start">
                {/* Drag handle */}
                <div
                    {...listeners}
                    {...attributes}
                    className="flex-shrink-0 self-center opacity-0 group-hover/card:opacity-60 transition-opacity cursor-grab active:cursor-grabbing p-0.5 -ml-1"
                    onClick={e => e.stopPropagation()}
                    title="Drag to itinerary"
                >
                    <GripVertical className="w-4 h-4 text-black" />
                </div>

                {/* Thumbnail */}
                {(activity.images && activity.images.length > 0) ? (
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-white/40 group-hover/card:scale-105 transition-all duration-500">
                        <img src={activity.images[0].image_url} alt={activity.name} className="w-full h-full object-cover" />
                    </div>
                ) : (
                    <div className="w-12 h-12 rounded-xl bg-[var(--primary-soft)]/20 flex items-center justify-center flex-shrink-0 border border-[var(--primary-soft)]/40">
                        <LayoutGrid className="w-4 h-4 text-[var(--primary)]/30" />
                    </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-black truncate mb-1 font-serif">{activity.name}</h4>
                    <div className="flex flex-wrap gap-1 items-center">
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-bold bg-white/30 border-white/50 text-black rounded-full">
                            {activity.category}
                        </Badge>
                        <span className="text-[9px] text-black/60 flex items-center gap-0.5 font-medium">
                            <Clock className="w-2.5 h-2.5 text-black" />
                            {activity.duration_hours}h
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Destination Card ──────────────────────────────────────────────────────────
interface DestinationCardProps {
    city: string
    activities: Activity[]
    isExpanded: boolean
    onToggle: () => void
    onPreview: (activity: Activity, cardRect: DOMRect) => void
    activePreviewId: string | null
}

function DestinationCard({ city, activities, isExpanded, onToggle, onPreview, activePreviewId }: DestinationCardProps) {
    return (
        <div className="rounded-[14px] overflow-hidden transition-all duration-300">
            <button
                onClick={onToggle}
                className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-[14px] border transition-all text-left",
                    isExpanded
                        ? "border-black/40 rounded-b-none border-b-0"
                        : "border-white/35 hover:border-black/40 hover:-translate-y-0.5"
                )}
                style={{ background: isExpanded ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.20)' }}
            >
                <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                    style={{ background: 'var(--primary)' }}
                >
                    <MapPin className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-black truncate">{city}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full text-black"
                        style={{ background: 'rgba(0,0,0,0.05)' }}>
                        {activities.length} {activities.length === 1 ? 'Activity' : 'Activities'}
                    </span>
                    {isExpanded
                        ? <ChevronUp className="w-3.5 h-3.5 text-black" />
                        : <ChevronDown className="w-3.5 h-3.5 text-black/60" />
                    }
                </div>
            </button>

            {isExpanded && (
                <div
                    className="border border-t-0 border-black/40 rounded-b-[14px] p-2 space-y-2"
                    style={{ background: 'rgba(0,0,0,0.02)' }}
                >
                    {activities.map(activity => (
                        <ActivityDraggableCard
                            key={activity.id}
                            activity={activity}
                            onPreview={onPreview}
                            activePreviewId={activePreviewId}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── Main ActivityLibrary ──────────────────────────────────────────────────────
interface ActivityLibraryProps {
    onAddActivity?: (activity: Activity) => void
    currentCity?: string
}

interface PreviewState {
    activity: Activity
    cardRect: DOMRect
}

export function ActivityLibrary({ onAddActivity, currentCity }: ActivityLibraryProps) {
    const [allActivities, setAllActivities] = useState<Activity[]>([])
    const [loading, setLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set())
    const [preview, setPreview] = useState<PreviewState | null>(null)
    const [previewVisible, setPreviewVisible] = useState(false)
    const [showAll, setShowAll] = useState(false)
    const [revealIndex, setRevealIndex] = useState(6)
    const panelRef = useRef<HTMLDivElement>(null)
    const listRef = useRef<HTMLDivElement>(null)
    const DEST_LIMIT = 6

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true)
            try {
                const data = await activitiesAPI.getAll({
                    city: currentCity === 'All Cities' ? undefined : currentCity
                })
                setAllActivities(data)
            } catch (error) {
                console.error('Failed to fetch activities:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchAll()
    }, [currentCity])

    const destinationGroups = useMemo(() => {
        const grouped = new Map<string, Activity[]>()
        for (const activity of allActivities) {
            const city = activity.destination_city || 'Other'
            if (!grouped.has(city)) grouped.set(city, [])
            grouped.get(city)!.push(activity)
        }
        return grouped
    }, [allActivities])

    const filteredDestinations = useMemo(() => {
        const query = searchQuery.toLowerCase().trim()
        if (!query) return Array.from(destinationGroups.entries())
        return Array.from(destinationGroups.entries()).filter(([city, activities]) =>
            city.toLowerCase().includes(query) ||
            activities.some(a =>
                a.name.toLowerCase().includes(query) ||
                (a.description && a.description.toLowerCase().includes(query))
            )
        )
    }, [destinationGroups, searchQuery])

    const toggleCity = (city: string) => {
        setExpandedCities(prev => {
            const next = new Set(prev)
            if (next.has(city)) next.delete(city)
            else next.add(city)
            return next
        })
    }

    const handlePreview = useCallback((activity: Activity, cardRect: DOMRect) => {
        // Toggle: clicking same card closes popup
        if (preview?.activity.id === activity.id) {
            setPreviewVisible(false)
            setTimeout(() => setPreview(null), 160)
            return
        }
        // Open new popup
        setPreview({ activity, cardRect })
        // Trigger entrance animation on next frame
        requestAnimationFrame(() => setPreviewVisible(true))
    }, [preview])

    const closePreview = useCallback(() => {
        setPreviewVisible(false)
        setTimeout(() => setPreview(null), 160)
    }, [])

    // Reset showAll when search query changes
    const isSearching = searchQuery.trim().length > 0
    useEffect(() => { if (isSearching) setShowAll(false) }, [isSearching])

    const visibleDestinations = isSearching || showAll
        ? filteredDestinations
        : filteredDestinations.slice(0, DEST_LIMIT)
    const hiddenCount = filteredDestinations.length - DEST_LIMIT
    const showToggle = !isSearching && filteredDestinations.length > DEST_LIMIT

    const handleShowMore = () => {
        setRevealIndex(filteredDestinations.length)
        setShowAll(true)
    }

    const handleShowLess = () => {
        setRevealIndex(DEST_LIMIT)
        setShowAll(false)
        listRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }

    return (
        <div
            ref={panelRef}
            className="flex flex-col h-full border-r border-white/20 rounded-l-3xl shadow-2xl"
            style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(32px)', overflow: 'hidden' }}
        >
            {/* Preview Popup — rendered into body portal */}
            {preview && panelRef.current && (
                <ActivityPreviewPopup
                    activity={preview.activity}
                    cardRect={preview.cardRect}
                    panelRect={panelRef.current.getBoundingClientRect()}
                    onClose={closePreview}
                    isVisible={previewVisible}
                />
            )}

            {/* Header */}
            <div className="p-5 pb-4 border-b border-white/20 bg-white/10 backdrop-blur-md flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h3 className="text-xs font-bold text-[var(--color-primary-font)] uppercase tracking-[0.15em] flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[var(--primary)] shadow-[0_0_8px_var(--primary-glow)]" />
                            Activity Library
                        </h3>
                        <p className="text-[10px] text-black font-semibold italic mt-0.5 flex items-center gap-1">
                            <GripVertical className="w-3 h-3" />
                            Drag activities into time slots
                        </p>
                    </div>
                    <div className="p-2.5 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)] text-white rounded-xl shadow-[0_4px_12px_var(--primary-glow)]">
                        <LayoutGrid className="w-4 h-4" />
                    </div>
                </div>

                <div className="relative group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black group-focus-within:scale-110 transition-transform z-10" />
                    <Input
                        placeholder="Search destinations..."
                        className="pl-10 h-10 text-xs border-white/40 focus:border-[var(--primary)]/50 transition-all rounded-full placeholder:text-black/40 text-black font-medium"
                        style={{ background: 'rgba(255,255,255,0.22)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.04)' }}
                        onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-glow), inset 0 1px 3px rgba(0,0,0,0.04)' }}
                        onBlur={e => { e.currentTarget.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.04)' }}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Destination list */}
            <div
                ref={listRef}
                className="flex-1 overflow-y-auto p-4 space-y-2"
                style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--primary-soft) transparent' }}
            >
                {/* Stagger keyframes injected once */}
                <style>{`
                    @keyframes dest-fade-up {
                        from { opacity: 0; transform: translateY(10px); }
                        to   { opacity: 1; transform: translateY(0); }
                    }
                    .dest-stagger { animation: dest-fade-up 0.28s ease-out both; }
                `}</style>

                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-14 bg-white/20 rounded-[14px] animate-pulse" />
                        ))}
                    </div>
                ) : filteredDestinations.length > 0 ? (
                    <>
                        {visibleDestinations.map(([city, activities], index) => (
                            <div
                                key={city}
                                className="dest-stagger"
                                style={{
                                    animationDelay: index >= DEST_LIMIT && showAll
                                        ? `${(index - DEST_LIMIT) * 60}ms`
                                        : '0ms'
                                }}
                            >
                                <DestinationCard
                                    city={city}
                                    activities={activities}
                                    isExpanded={expandedCities.has(city)}
                                    onToggle={() => toggleCity(city)}
                                    onPreview={handlePreview}
                                    activePreviewId={preview?.activity.id != null ? String(preview.activity.id) : null}
                                />
                            </div>
                        ))}

                        {/* See More / See Less button */}
                        {showToggle && (
                            <button
                                onClick={showAll ? handleShowLess : handleShowMore}
                                className="group w-full flex items-center justify-center gap-2 py-2.5 rounded-full transition-all duration-200"
                                style={{
                                    background: 'rgba(255,255,255,0.22)',
                                    border: `1.5px ${showAll ? 'solid' : 'dashed'} var(--primary-soft)`,
                                    marginTop: '6px' }}
                                onMouseEnter={e => {
                                    const el = e.currentTarget
                                    el.style.background = 'var(--primary-glow)'
                                    el.style.border = '1.5px solid var(--primary-light)'
                                }}
                                onMouseLeave={e => {
                                    const el = e.currentTarget
                                    el.style.background = 'rgba(255,255,255,0.22)'
                                    el.style.border = `1.5px ${showAll ? 'solid' : 'dashed'} var(--primary-soft)`
                                }}
                            >
                                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)' }}>
                                    {showAll
                                        ? 'Show Less'
                                        : `See All Destinations (${hiddenCount} more)`
                                    }
                                </span>
                                <ChevronDown
                                    style={{
                                        width: '14px',
                                        height: '14px',
                                        color: 'var(--primary)',
                                        transform: showAll ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.25s ease' }}
                                />
                            </button>
                        )}
                    </>
                ) : (
                    <div className="text-center py-10 flex flex-col items-center gap-2">
                        <MapPin className="w-5 h-5 text-[var(--primary)]/40" />
                        <p className="text-xs font-semibold text-black/60">No destinations found</p>
                    </div>
                )}
            </div>


            {/* Footer */}
            <div className="p-4 bg-white/10 backdrop-blur-md border-t border-white/20 flex-shrink-0">
                <Button
                    variant="ghost"
                    className="w-full h-10 text-[11px] font-bold gap-2 border-2 border-dashed border-black/40 text-black hover:bg-black/5 rounded-xl transition-all"
                    onClick={() => window.open('/agent/activities', '_blank')}
                >
                    <Plus className="w-3.5 h-3.5" />
                    Create New Activity Master
                </Button>
            </div>
        </div>
    )
}
