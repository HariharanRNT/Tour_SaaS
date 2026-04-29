'use client'

import { API_URL, api } from '@/lib/api'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate, formatDuration } from '@/lib/utils'
import {
    Plane, MapPin, Calendar, Shield, Sparkles, ArrowRight, Sliders, CheckCircle2, PlayCircle,
    Globe, Users, Clock, Star, Heart, Luggage, Compass, Search, MessageSquare,
    Camera, Car, Hotel, Mountain, Waves, Umbrella, Gift, Award, Zap,
    CheckCircle, Headphones, Wallet, Coffee, Ticket, Navigation, Flag, Package, Map as MapIcon, Palmtree, ChevronRight
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import PackageSearchChat from '@/components/ai/PackageSearchChat'
import CustomerAIChatCard from '@/components/ai/CustomerAIChatCard'
import AISearchModal from '@/components/ai/AISearchModal'
import { useTheme } from '@/context/ThemeContext'
import Image from 'next/image'
import GeneralEnquiryModal from '@/components/modals/GeneralEnquiryModal'

interface Package {
    id: string
    title: string
    slug: string
    destination: string
    country: string
    description: string
    duration_days: number
    price_per_person: number
    feature_image_url?: string
    view_count: number
    is_public?: boolean
}

interface PopularDestination {
    name: string
    country: string
    image_url?: string
    pkg_count: number
}

export default function Home({ searchParams }: { searchParams: { site?: string } }) {
    const site = searchParams.site || 'default';

    const router = useRouter()
    const { themeData: theme, isLoading, publicSettings } = useTheme()
    const [packages, setPackages] = useState<Package[]>([])
    const [popularDestinations, setPopularDestinations] = useState<PopularDestination[]>([])
    const [packagesLoading, setPackagesLoading] = useState(true)
    const [destinationsLoading, setDestinationsLoading] = useState(true)
    const [cheapestPackageSlug, setCheapestPackageSlug] = useState<string | null>(null)
    const [showAISearch, setShowAISearch] = useState(false)
    const [showEnquiryModal, setShowEnquiryModal] = useState(false)
    const hasFetchedRef = useRef(false)
    const destScrollRef = useRef<HTMLDivElement>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [startX, setStartX] = useState(0)
    const [scrollLeftState, setScrollLeftState] = useState(0)

    useEffect(() => {
        const el = destScrollRef.current
        if (!el) return

        const onWheel = (e: WheelEvent) => {
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                e.preventDefault()
                el.scrollLeft += e.deltaY
            }
        }

        el.addEventListener('wheel', onWheel, { passive: false })
        return () => el.removeEventListener('wheel', onWheel)
    }, [])

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!destScrollRef.current) return
        setIsDragging(true)
        setStartX(e.pageX - destScrollRef.current.offsetLeft)
        setScrollLeftState(destScrollRef.current.scrollLeft)
    }

    const handleMouseLeave = () => {
        setIsDragging(false)
    }

    const handleMouseUp = () => {
        setIsDragging(false)
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !destScrollRef.current) return
        e.preventDefault()
        const x = e.pageX - destScrollRef.current.offsetLeft
        const walk = (x - startX) * 2
        destScrollRef.current.scrollLeft = scrollLeftState - walk
    }

    const [hpSettings, setHpSettings] = useState<{
        headline1: string;
        headline2: string;
        subheading: string;
        primaryBtnText: string;
        secondaryBtnText: string;
        backgroundImageUrl: string;
        showAISearch: boolean;
        aiSearchBtnText: string;
        aiSearchTagline: string;
    }>({
        headline1: "Your Gateway to",
        headline2: "Extraordinary Adventures",
        subheading: "Discover handpicked premium tour packages tailored for your perfect getaway.",
        primaryBtnText: "Start Your Journey",
        secondaryBtnText: "See Sample Itinerary",
        backgroundImageUrl: "",
        showAISearch: true,
        aiSearchBtnText: "Try AI Search",
        aiSearchTagline: "— just describe your dream trip"
    })

    const [agentFeatureCards, setAgentFeatureCards] = useState<{
        icon: string; title: string; description: string;
    }[] | null>(null)

    const [wcuCards, setWcuCards] = useState<{
        icon: string; title: string; description: string;
    }[] | null>(null)

    const [cardAppearance, setCardAppearance] = useState<{
        iconStyle: string;
        background: string;
        border: string;
        hover: string;
        titleColor: string;
        layout: string;
        iconColor: string;
        customIconColor: string;
    } | null>(null)

    useEffect(() => {
        // Load from Public Context for accuracy (Sync local states with centralized data)
        if (publicSettings?.homepage_settings) {
            const hs = publicSettings.homepage_settings;
            setHpSettings({
                headline1: hs.headline1 || "Your Gateway to",
                headline2: hs.headline2 || "Extraordinary Adventures",
                subheading: hs.subheading || "Discover handpicked premium tour packages tailored for your perfect getaway.",
                primaryBtnText: hs.primaryBtnText || "Start Your Journey",
                secondaryBtnText: hs.secondaryBtnText || "See Sample Itinerary",
                backgroundImageUrl: hs.backgroundImageUrl || "",
                showAISearch: hs.showAISearch !== false,
                aiSearchBtnText: hs.aiSearchBtnText || "Try AI Search",
                aiSearchTagline: hs.aiSearchTagline || "— just describe your dream trip"
            });
            if (hs.feature_cards) setAgentFeatureCards(hs.feature_cards);
            if (hs.wcu_cards) setWcuCards(hs.wcu_cards);
            if (hs.card_appearance) setCardAppearance(hs.card_appearance);
        }
    }, [publicSettings])

    const IconMap: Record<string, any> = {
        Sparkles, Sliders, CheckCircle2, Globe, Users, Clock, Shield, Star, Heart, Luggage, Plane, MapPin,
        Camera, Car, Hotel, Compass, Mountain, Waves, Umbrella, Gift, Award, Zap,
        CheckCircle, Headphones, Wallet, Coffee, Ticket, Navigation, Flag, Package, Map: MapIcon, Search
    };

    const getIcon = (name: string, fallback: any) => {
        const Icon = IconMap[name];
        if (!Icon) return fallback;

        const isFilled = cardAppearance?.iconStyle === 'filled-circle' || cardAppearance?.iconStyle === 'gradient-circle';
        let iconColor = 'white';

        if (!isFilled) {
            if (cardAppearance?.iconColor === 'custom') iconColor = cardAppearance.customIconColor;
            else iconColor = 'var(--primary)';
        }

        return <Icon className="h-6 w-6" style={{ color: iconColor }} />;
    };



    useEffect(() => {
        if (isLoading) return;
        // Prevent duplicate API calls (React Strict Mode double-mount)
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;

        const fetchPackages = async () => {
            try {
                // Fetch a larger page size to ensure we get all public packages
                const response = await api.get('/packages', {
                    params: { page_size: 100 }
                })
                // Filter to only show packages with public visibility enabled
                const allPackages = response.data.packages || []
                const publicPackages = allPackages.filter((pkg: Package) => pkg.is_public !== false)
                setPackages(publicPackages)
                
                // Fallback: If no cheapest slug yet from dedicated fetch, pick from these packages
                if (response.data.packages && response.data.packages.length > 0 && !cheapestPackageSlug) {
                    const localCheapest = [...response.data.packages].sort((a, b) => a.price_per_person - b.price_per_person)[0];
                    if (localCheapest && localCheapest.slug) {
                        setCheapestPackageSlug(localCheapest.slug);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch popular packages", error)
            } finally {
                setPackagesLoading(false)
            }
        }

        const fetchCheapest = async () => {
            try {
                const response = await api.get('/packages/cheapest')
                if (response.data && response.data.slug) {
                    setCheapestPackageSlug(response.data.slug)
                }
            } catch (err) {
                console.error("Failed to fetch cheapest package", err)
            }
        }

        const fetchDestinations = async () => {
            try {
                const response = await api.get('/locations/popular')
                setPopularDestinations(response.data)
            } catch (error) {
                console.error("Failed to fetch popular destinations", error)
            } finally {
                setDestinationsLoading(false)
            }
        }

        fetchPackages()
        fetchCheapest()
        fetchDestinations()
    }, [isLoading])

    const heroBgImage = hpSettings?.backgroundImageUrl ||
        'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop';
    const heroBgStyle = { backgroundImage: `url("${heroBgImage}")` };

    if (packagesLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] w-full bg-white">
                <div className="relative">
                    <div className="h-16 w-16 rounded-full border-t-4 border-b-4 border-blue-500 animate-spin"></div>
                    <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-t-4 border-b-4 border-blue-300 animate-spin opacity-50" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
                </div>
                <p className="mt-6 text-gray-500 text-sm font-medium animate-pulse">Loading your experience...</p>
            </div>
        )
    }

    return (
        <div style={{ "--section-spacing": "var(--section-spacing, 4rem)" } as any}>
            {/* Modernized Hero Section */}
            <section className="relative flex flex-col justify-center overflow-hidden -mt-16 pb-10">

                {/* Multi-tenant site identifier banner — sits on top of the hero, not above it */}
                {site !== 'default' && (
                    <div className={`absolute top-16 left-0 right-0 z-20 p-2 text-center font-bold tracking-tight shadow-sm
                        ${site === 'site1' ? 'bg-blue-600/80 text-white' :
                            site === 'site2' ? 'bg-emerald-600/80 text-white' : ''}`}>
                        {site === 'site1' && <div className="flex items-center justify-center gap-2"><Globe className="h-4 w-4" /> Site 1 UI</div>}
                        {site === 'site2' && <div className="flex items-center justify-center gap-2"><MapPin className="h-4 w-4" /> Site 2 UI</div>}
                    </div>
                )}

                {/* Background with Overlay */}
                <div className="absolute inset-0 z-0">
                    <Image
                        src={heroBgImage}
                        alt="Hero Background"
                        fill
                        priority
                        className="object-cover bg-fixed"
                        sizes="100vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/5 mix-blend-multiply" />
                    <div className="absolute inset-0 opacity-30" style={{ background: 'linear-gradient(to bottom, var(--primary-glow), var(--primary-soft))' }} />
                </div>

                {/* Blurred ambient orbs */}
                <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] rounded-full bg-[var(--primary-glow)] blur-[80px] z-0 pointer-events-none opacity-30" />
                <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] rounded-full bg-[var(--primary-glow)] blur-[100px] z-0 pointer-events-none opacity-30" />

                {/* Animated Floating Icons */}
                <div className="absolute inset-0 z-10 overflow-hidden pointer-events-none opacity-15">
                    <motion.div animate={{ y: [0, -25, 0], x: [0, 10, 0], rotate: [0, 8, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[18%] left-[8%] md:left-[15%]">
                        <Plane className="w-20 h-20 text-white drop-shadow-xl" />
                    </motion.div>
                    <motion.div animate={{ y: [0, 30, 0], x: [0, -15, 0], rotate: [0, -12, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute bottom-[20%] right-[10%] md:right-[15%]">
                        <MapPin className="w-16 h-16 text-white drop-shadow-xl" />
                    </motion.div>
                    <motion.div animate={{ y: [0, -20, 0], rotate: [0, -15, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }} className="absolute top-[25%] right-[20%] md:right-[25%]">
                        <Compass className="w-12 h-12 text-white drop-shadow-xl" />
                    </motion.div>
                    <motion.div animate={{ y: [0, 35, 0], rotate: [0, 10, 0] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1.5 }} className="absolute bottom-[30%] left-[12%] md:left-[22%]">
                        <Palmtree className="w-14 h-14 text-white drop-shadow-xl" />
                    </motion.div>
                </div>

                {/* AI Badge Moved After Header / Above Headline */}
                <div className="container mx-auto px-4 relative z-10 pt-20">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="max-w-5xl mx-auto text-center p-6 md:p-8 relative mb-0"
                    >
                        {/* AI Badge Removed per request */}
                        <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight leading-[1.05] text-white drop-shadow-md" style={{ color: "var(--heading, white)" }}>
                            {isLoading ? (
                                <span className="h-20 w-3/4 bg-white/10 rounded-2xl animate-pulse mx-auto block" />
                            ) : (
                                <>
                                    {hpSettings?.headline1 || 'Adventure Awaits—'}<br className="hidden md:block" />
                                    <span className="text-white drop-shadow-sm">
                                        {hpSettings?.headline2 || 'Tailored Just for You'}
                                    </span>
                                </>
                            )}
                        </h1>

                        <p className="text-xl md:text-2xl mb-10 text-white/90 max-w-3xl mx-auto leading-relaxed font-light drop-shadow-sm" style={{ color: "var(--body-text, rgba(255, 255, 255, 0.9))" }}>
                            {isLoading ? (
                                <span className="h-8 w-1/2 bg-white/10 rounded-lg animate-pulse mx-auto inline-block" />
                            ) : (hpSettings?.subheading || theme.home_hero_subtitle || "Plan, customize, and book your dream trip effortlessly with AI-powered suggestions.")}
                        </p>

                        {/* CTA Section */}
                        <div className="flex flex-col items-center justify-center gap-4 mb-2">
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Button
                                    onClick={() => router.push(cheapestPackageSlug ? `/plan-trip/${cheapestPackageSlug}?mode=preview` : '/plan-trip?search=all')}
                                    variant="outline"
                                    size="lg"
                                    className="h-[56px] px-8 text-[18px] text-white hover:bg-white/10 transition-all font-bold group border-2 border-white bg-transparent rounded-[30px]"
                                >
                                    <PlayCircle className="h-5 w-5 mr-3 group-hover:scale-110 transition-transform" />
                                    {isLoading ? <span className="h-6 w-32 bg-white/10 rounded animate-pulse inline-block" /> : (hpSettings?.secondaryBtnText || theme.hero_cta_secondary_text || "See Sample Itinerary")}
                                </Button>

                                 <Link href="/plan-trip?search=all">
                                    <Button size="lg" className="h-[56px] px-8 text-[18px] text-white hover:scale-[1.03] transition-all duration-300 group font-bold"
                                        style={{
                                            background: 'linear-gradient(135deg, var(--button-bg), var(--button-bg-light))',
                                            boxShadow: '0 10px 30px var(--button-glow)',
                                            borderRadius: "30px",
                                            border: 'none'
                                        }}>
                                        {isLoading ? <span className="h-6 w-32 bg-white/20 rounded animate-pulse inline-block" /> : (hpSettings?.primaryBtnText || theme.hero_cta_primary_text || "Start Your Journey")}
                                        <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </Link>

                                <Button
                                    onClick={() => setShowEnquiryModal(true)}
                                    variant="outline"
                                    size="lg"
                                    className="h-[56px] px-8 text-[18px] text-white hover:bg-white/10 transition-all font-bold group border-2 border-white/50 bg-white/10 backdrop-blur-md rounded-[30px]"
                                >
                                    <MessageSquare className="h-5 w-5 mr-3 group-hover:scale-110 transition-transform" />
                                    Enquiry
                                </Button>
                            </div>

                            {/* AI Search CTA */}
                            {hpSettings?.showAISearch !== false && (
                                <button
                                    id="homepage-ai-search-btn"
                                    onClick={() => setShowAISearch(true)}
                                    className="flex items-center gap-2.5 px-7 py-3 rounded-full text-white text-[14px] font-bold transition-all hover:-translate-y-[2px] hover:shadow-2xl active:scale-95 border border-white/25 group"
                                    style={{
                                        background: 'rgba(255,255,255,0.15)',
                                        backdropFilter: 'blur(12px)',
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                                    }}
                                >
                                    <span className="w-6 h-6 rounded-full flex items-center justify-center bg-white/20 group-hover:bg-white/30 transition-colors">
                                        <Sparkles className="h-3.5 w-3.5 text-white" />
                                    </span>
                                    {hpSettings?.aiSearchBtnText || 'Try AI Search'}
                                    <span className="text-[11px] font-normal text-white/60">{hpSettings?.aiSearchTagline || '— just describe your dream trip'}</span>
                                </button>
                            )}
                        </div>
                    </motion.div>

                    {/* Feature Cards */}
                    {theme.show_feature_cards !== false && (
                        <div className={`grid ${cardAppearance?.layout === 'horizontal' ? 'grid-cols-1 md:grid-cols-2' : 'md:grid-cols-3'} gap-8 max-w-6xl mx-auto z-20 relative 
                            cards-style-container 
                            ${cardAppearance ? `cards-icon-${cardAppearance.iconStyle} cards-bg-${cardAppearance.background} cards-border-${cardAppearance.border} cards-hover-${cardAppearance.hover} cards-layout-${cardAppearance.layout} cards-title-${cardAppearance.titleColor}` : ''}`}>
                            {(agentFeatureCards && agentFeatureCards.length > 0 ? agentFeatureCards : (theme.feature_cards && theme.feature_cards.length > 0 ? theme.feature_cards : [
                                { icon: 'Sparkles', title: 'Smart Recommendations', description: 'Tailored trips based on your unique preferences' },
                                { icon: 'Sliders', title: 'Customize Everything', description: 'Full control to adjust dates, activities, and stays' },
                                { icon: 'CheckCircle2', title: 'Instant Booking', description: 'Save your plan and book securely when ready' },
                            ])).map((card: any, idx: number) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                                    className={`group feature-card glass-panel rounded-[20px] p-8 transition-all duration-300 relative overflow-hidden text-center`}
                                    style={!cardAppearance ? {
                                        borderRadius: "20px",
                                        backgroundColor: "rgba(255,255,255,0.18)",
                                        backdropFilter: "blur(18px)",
                                        border: "1px solid rgba(255,255,255,0.3)",
                                        boxShadow: "0 8px 32px rgba(0,0,0,0.1)"
                                    } : { borderRadius: "20px" }}
                                >
                                    <div className="relative z-10 flex flex-col items-center">
                                        <div className="card-icon-container w-[48px] h-[48px] rounded-[12px] flex items-center justify-center mb-6 shadow-inner ring-1 ring-white/20 group-hover:scale-110 group-hover:shadow-[0_10px_40px_var(--primary-glow)] transition-all duration-300"
                                            style={!cardAppearance ? { background: "linear-gradient(135deg, var(--gradient-start), var(--gradient-mid))" } : {}}>
                                            {getIcon(card.icon, <Sparkles className="h-6 w-6 text-white" />)}
                                        </div>
                                        <h3 className="card-title font-bold text-2xl mb-3 text-white">{card.title}</h3>
                                        <p className="text-white/75 leading-relaxed mb-6">{card.description || card.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </section>




            {/* AI-Powered Popular Packages */}

            {packages.length > 0 && (
                <section id="popular-packages" className="pt-24 pb-24 bg-white relative overflow-hidden">






                    {/* Background Decorative Elements */}
                    <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-orange-50 rounded-full blur-[120px] -z-10" />
                    <div className="absolute bottom-0 left-0 w-1/4 h-1/4 bg-blue-50 rounded-full blur-[100px] -z-10" />

                    <div className="container mx-auto px-4">
                        <div className="max-w-7xl mx-auto">
                            <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 px-4 md:px-0">
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                >
                                    <Badge variant="outline" className="mb-4 border-[var(--primary)] text-[var(--primary)] bg-[var(--primary-glow)] font-bold px-4 py-1.5 uppercase tracking-wider text-[10px]">
                                        Discover Your Next Adventure
                                    </Badge>
                                    <h2 className="text-4xl md:text-6xl font-black text-slate-900 font-display mb-4 tracking-tight">
                                        Popular <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)]">Packages</span>
                                    </h2>

                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                >
                                    <button
                                        onClick={() => router.push('/plan-trip?search=all')}
                                        className="text-[var(--primary)] font-black text-sm tracking-widest uppercase flex items-center gap-2 group hover:gap-3 transition-all"
                                    >
                                        View All Packages
                                        <ArrowRight className="h-4 w-4" />
                                    </button>
                                </motion.div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                {packages.map((pkg, idx) => {
                                    const fallbackImages = [
                                        "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&q=80&w=2071",
                                        "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&q=80&w=1964",
                                        "https://images.unsplash.com/photo-1603262110263-fb0112e7cc33?auto=format&fit=crop&q=80&w=2071"
                                    ]
                                    const cardImage = pkg.feature_image_url || fallbackImages[idx % fallbackImages.length]
                                    const title = pkg.title

                                    return (
                                        <motion.div
                                            key={pkg.id}
                                            initial={{ opacity: 0, y: 30 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ delay: idx * 0.1 }}
                                            onClick={() => router.push(`/plan-trip?destination=${encodeURIComponent(pkg.destination)}&packageId=${pkg.id}&openPopup=true`)}
                                            className="relative aspect-[4/5] md:aspect-[4/3] rounded-[32px] overflow-hidden cursor-pointer group shadow-2xl"
                                        >
                                            <Image
                                                src={cardImage}
                                                alt={title}
                                                fill
                                                className="absolute inset-0 object-cover group-hover:scale-110 transition-transform duration-1000"
                                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-70 group-hover:opacity-80 transition-opacity" />

                                            <div className="absolute top-4 right-4 flex flex-col gap-2 items-end z-10">
                                                <Badge className="bg-black text-white hover:bg-black/90 border border-white/20 font-bold px-3 py-1 flex items-center gap-1.5 rounded-full shadow-md">
                                                    <Clock className="h-3 w-3" /> {formatDuration(pkg.duration_days)}
                                                </Badge>
                                                <Badge className="bg-[var(--primary)] text-white border-0 font-bold px-3 py-1 flex items-center gap-1.5 rounded-full shadow-md">
                                                    ₹{pkg.price_per_person.toLocaleString('en-IN')}
                                                </Badge>
                                            </div>

                                            <div className="absolute bottom-8 left-8 right-8 z-10">
                                                <p className="text-white/60 text-xs font-black uppercase tracking-[0.2em] mb-1">{pkg.destination}, {pkg.country || 'International'}</p>
                                                <div className="custom-tooltip-container">
                                                    <h3 className="text-3xl font-bold text-white mb-4 font-display drop-shadow-lg line-clamp-2" title={title}>{title}</h3>
                                                    <span className="custom-tooltip-content">{title}</span>
                                                </div>
                                                <div className="relative inline-block group/link">
                                                    <p className="text-white text-sm font-bold flex items-center gap-2 uppercase tracking-widest">
                                                        Book This Trip <ChevronRight className="h-4 w-4 group-hover/link:translate-x-1 transition-transform" />
                                                    </p>
                                                    <div className="absolute -bottom-1 left-0 w-8 h-[2px] bg-[var(--primary)] group-hover/link:w-full transition-all duration-300"></div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* Popular Destinations Section */}
            {popularDestinations.length > 0 && (
                <section id="popular-destinations" className="pb-24 bg-white relative overflow-hidden">
                    <div className="container mx-auto px-4">
                        <div className="max-w-7xl mx-auto">
                            <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 px-4 md:px-0">
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                >
                                    <Badge variant="outline" className="mb-4 border-[var(--primary)] text-[var(--primary)] bg-[var(--primary-glow)] font-bold px-4 py-1.5 uppercase tracking-wider text-[10px]">
                                        Discover Your Next Adventure
                                    </Badge>
                                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 font-display mb-4 tracking-tight">
                                        Popular <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)]">Destinations</span>
                                    </h2>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                >
                                    <button
                                        onClick={() => router.push('/plan-trip?search=all')}
                                        className="text-[var(--primary)] font-black text-xs tracking-widest uppercase flex items-center gap-2 group hover:gap-3 transition-all"
                                    >
                                        View All Destinations
                                        <ArrowRight className="h-4 w-4" />
                                    </button>
                                </motion.div>
                            </div>

                            <div 
                                ref={destScrollRef}
                                onMouseDown={handleMouseDown}
                                onMouseLeave={handleMouseLeave}
                                onMouseUp={handleMouseUp}
                                onMouseMove={handleMouseMove}
                                className={`flex overflow-x-auto pb-6 gap-6 scrollbar-hide snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0 ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
                            >
                                {popularDestinations.map((dest, idx) => (
                                    <motion.div
                                        key={dest.name}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: idx * 0.05 }}
                                        onClick={() => !isDragging && router.push(`/plan-trip?search=${encodeURIComponent(dest.name)}`)}
                                        className="flex-none group relative h-[220px] w-[calc(50%-12px)] md:w-[calc(33.333%-16px)] lg:w-[calc(16.666%-20px)] rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-500 hover:-translate-y-1 snap-start"
                                    >
                                        {dest.image_url ? (
                                            <Image
                                                src={dest.image_url}
                                                alt={dest.name}
                                                fill
                                                className="absolute inset-0 object-cover group-hover:scale-110 transition-transform duration-700"
                                                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 16vw"
                                            />
                                        ) : (
                                            <div className="absolute inset-0 bg-gradient-to-tr from-[var(--primary)] to-[var(--primary-light)]" />
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                        
                                        <div className="absolute top-3 right-3 z-10">
                                            <Badge className="bg-black/40 backdrop-blur-md text-white border-white/10 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                {dest.pkg_count} {dest.pkg_count === 1 ? 'Package' : 'Packages'}
                                            </Badge>
                                        </div>

                                        <div className="absolute bottom-4 left-4 right-4 z-10 transition-all duration-300 group-hover:bottom-6">
                                            <h3 className="text-lg font-bold text-white leading-tight mb-2">{dest.name}</h3>
                                            
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-[#f4f4f6] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                                                Explore <ArrowRight className="h-3 w-3" />
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* Why Choose Us Section */}
            {
                theme.show_wcu_section !== false && (
                    <section className="bg-[#FFF3E8] relative overflow-hidden" style={{ paddingTop: "1rem", paddingBottom: "1rem" }}>
                        {/* Floating Blobs */}
                        <div className="absolute inset-0 pointer-events-none z-0" style={{
                            background: 'radial-gradient(circle at 20% 30%, var(--primary-soft) 0%, transparent 40%), radial-gradient(circle at 80% 70%, var(--primary-glow) 0%, transparent 40%)',
                            opacity: 0.6
                        }} />

                        <div className="container mx-auto px-4 relative z-10">
                            <div className="text-center mb-10">
                                <Badge variant="outline" className="mb-4 border-2 border-[var(--primary)] text-[var(--primary)] bg-[var(--primary-glow)] px-5 py-2 uppercase tracking-widest text-xs font-black shadow-[0_4px_15px_var(--primary-glow)] border-opacity-50">Why Choose Us</Badge>
                            </div>

                            <div className={`grid ${cardAppearance?.layout === 'horizontal' ? 'md:grid-cols-2' : 'md:grid-cols-4'} gap-8 
                                cards-style-container 
                                ${cardAppearance ? `cards-icon-${cardAppearance.iconStyle} cards-bg-${cardAppearance.background} cards-border-${cardAppearance.border} cards-hover-${cardAppearance.hover} cards-layout-${cardAppearance.layout} cards-title-${cardAppearance.titleColor}` : ''}`}>
                                {(wcuCards && wcuCards.length > 0 ? wcuCards : (theme.wcu_cards && theme.wcu_cards.length > 0 ? theme.wcu_cards : [
                                    {
                                        icon: "Globe",
                                        title: "Curated Destinations",
                                        description: "Discover handpicked, verified experiences at the world’s top destinations."
                                    },
                                    {
                                        icon: "Users",
                                        title: "Local Experts",
                                        description: "Authentic experiences guided by seasoned locals who know the hidden gems."
                                    },
                                    {
                                        icon: "Clock",
                                        title: "Flexible Plans",
                                        description: "Change dates, activities, or cancel with ease. Your plan adapts to you."
                                    },
                                    {
                                        icon: "Shield",
                                        title: "Safe Payments",
                                        description: "Seamless, secure payments via Razorpay with instant confirmation."
                                    }
                                ])).map((feature: any, idx: number) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.5, delay: idx * 0.1 }}
                                        className="group feature-card glass-panel rounded-[20px] p-8 shadow-xl hover:shadow-[0_20px_50px_var(--primary-glow)] transition-all duration-500 relative overflow-hidden"
                                        style={!cardAppearance ? {
                                            background: "rgba(255,255,255,0.7)",
                                            backdropFilter: "blur(16px)",
                                            borderRadius: "20px",
                                            border: "1px solid var(--primary-light)",
                                            boxShadow: "0 10px 40px -10px var(--primary-glow)"
                                        } : { borderRadius: "20px" }}
                                    >
                                        <div className="card-icon-container w-16 h-16 rounded-full flex items-center justify-center mb-6 shadow-md group-hover:scale-110 transition-transform duration-500"
                                            style={!cardAppearance ? { background: "linear-gradient(135deg, var(--gradient-start), var(--gradient-mid))" } : {}}>
                                            {getIcon(feature.icon, <Globe className="h-8 w-8 text-white" />)}
                                        </div>
                                        <h3 className="card-title text-xl font-bold text-[var(--color-primary-font)] mb-3 group-hover:text-[var(--primary)] transition-colors">
                                            {feature.title}
                                        </h3>
                                        <p className="leading-relaxed font-medium text-sm text-[var(--color-primary-font)]/90">
                                            {feature.description || feature.desc}
                                        </p>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </section>
                )
            }

            <CustomerAIChatCard />

            {/* AI Search Modal */}
            <AISearchModal open={showAISearch} onClose={() => setShowAISearch(false)} />

            {/* General Enquiry Modal */}
            <GeneralEnquiryModal 
                isOpen={showEnquiryModal} 
                onClose={() => setShowEnquiryModal(false)} 
                agentId={publicSettings?.agent_id}
            />
        </div>
    )
}
