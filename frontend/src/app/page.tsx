'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plane, MapPin, Calendar, Shield, Sparkles, ArrowRight, Sliders, CheckCircle2, PlayCircle, Globe, Users, Clock, Star, Heart, Luggage, Compass, Palmtree, Search } from 'lucide-react'
import { motion } from 'framer-motion'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import PackageSearchChat from '@/components/ai/PackageSearchChat'
import CustomerAIChatCard from '@/components/ai/CustomerAIChatCard'
// import { useTheme } from '@/context/ThemeContext'

interface Destination {
    id: string
    name: string
    country: string
    description: string
    image_url?: string
    min_price?: number
    min_duration?: number
    max_duration?: number
    pkg_count?: number
}

export default function Home() {
    const router = useRouter()
    // const { theme, isLoading } = useTheme()
    const isLoading = false
    const theme: any = {
        id: 'default',
        hero_background_type: 'image',
        home_hero_image: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop',
        home_hero_title: null,
        home_hero_subtitle: null,
        hero_cta_primary_text: null,
        hero_cta_secondary_text: null,
        show_feature_cards: true,
        feature_cards: [],
        show_wcu_section: true,
        wcu_title: null,
        wcu_accent_title: null,
        wcu_cards: []
    }
    const [destinations, setDestinations] = useState<Destination[]>([])
    const [destLoading, setDestLoading] = useState(true)

    const IconMap: Record<string, any> = {
        Sparkles, Sliders, CheckCircle2, Globe, Users, Clock, Shield, Star, Heart, Luggage, Plane, MapPin
    };

    const getIcon = (name: string, fallback: any) => {
        const Icon = IconMap[name];
        return Icon ? <Icon className="h-10 w-10 text-current" /> : fallback;
    };

    const handleSampleItinerary = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/v1/packages/cheapest')
            if (res.ok) {
                const data = await res.json()
                router.push(`/plan-trip/${data.slug}?mode=preview`)
            } else {
                alert("No sample packages available at the moment.")
            }
        } catch (error) {
            console.error("Failed to fetch sample itinerary", error)
            alert("Unable to load sample itinerary.")
        }
    }

    useEffect(() => {
        if (isLoading) return; // Wait for theme to load first

        const fetchDestinations = async () => {
            try {
                const domain = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
                const res = await fetch('http://localhost:8000/api/v1/trip-planner/popular-destinations', {
                    headers: { 'X-Domain': domain }
                })
                if (res.ok) {
                    const data = await res.json()
                    setDestinations(data)
                }
            } catch (error) {
                console.error("Failed to fetch popular destinations", error)
            } finally {
                setDestLoading(false)
            }
        }
        fetchDestinations()
    }, [isLoading])

    const heroBgStyle = { backgroundImage: `url("https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop")` };

    if (isLoading || destLoading) {
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

    const getWcuIconBg = (idx: number, iconBgColor?: string) => {
        const defaults = ['#3B82F6', '#8B5CF6', '#06B6D4', '#10B981'];
        const baseColor = (iconBgColor || defaults[idx % defaults.length]).toUpperCase();

        const presetGradients: Record<string, string[]> = {
            '#3B82F6': ['#60A5FA', '#2563EB'], // Blue
            '#8B5CF6': ['#A78BFA', '#7C3AED'], // Purple
            '#06B6D4': ['#22D3EE', '#0891B2'], // Teal
            '#10B981': ['#34D399', '#059669'], // Green
            'var(--primary)': ['#FB923C', 'var(--primary)'], // Orange
            '#F43F5E': ['#FB7185', '#E11D48'], // Rose
        };

        const colors = presetGradients[baseColor] || [baseColor, baseColor];
        return `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`;
    };

    return (
        <div style={{ "--section-spacing": "var(--section-spacing, 4rem)" } as any}>
            {/* Modernized Hero Section */}
            <section className="relative min-h-[90vh] flex flex-col justify-center overflow-hidden -mt-16">

                {/* Background with Overlay */}
                <div
                    className={`absolute inset-0 z-0 bg-cover bg-center bg-no-repeat bg-fixed`}
                    style={heroBgStyle}
                >
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/20 mix-blend-multiply" />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, var(--primary-glow), rgba(255,180,100,0.2))' }} />
                </div>

                {/* Blurred ambient orbs */}
                <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] rounded-full bg-[var(--primary-glow)] blur-[80px] z-0 pointer-events-none" />
                <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] rounded-full bg-[rgba(255,180,100,0.2)] blur-[100px] z-0 pointer-events-none" />

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

                {/* AI Badge - Upper Right */}
                <div className="absolute top-6 right-6 z-20 hidden md:block">
                    <Badge className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20 px-4 py-2 rounded-full flex items-center gap-2 shadow-xl animate-in fade-in slide-in-from-top-4 duration-1000">
                        <Sparkles className="h-4 w-4 text-amber-300" />
                        <span className="font-semibold tracking-wide shadow-black drop-shadow-md">AI-Powered Trip Planning</span>
                    </Badge>
                </div>

                <div className="container mx-auto px-4 relative z-10 py-20">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="max-w-5xl mx-auto text-center p-8 md:p-14 relative mb-12"
                        style={{
                            // backdropFilter: 'blur(22px)',
                            // background: 'rgba(255,255,255,0.1)',
                            // border: '1px solid rgba(255,255,255,0.3)',
                            // borderRadius: '36px',
                            // boxShadow: '0 25px 80px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.45)'
                        }}
                    >
                        <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight leading-[1.05] text-white drop-shadow-md" style={{ color: "var(--heading, white)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            {isLoading ? (
                                <span className="h-20 w-3/4 bg-white/10 rounded-2xl animate-pulse mx-auto block" />
                            ) : theme.home_hero_title ? (
                                theme.home_hero_title
                            ) : (
                                <>
                                    Adventure Awaits—<br className="hidden md:block" />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary-soft)] via-[var(--primary-light)] to-[var(--primary)] drop-shadow-sm">
                                        Tailored Just for You
                                    </span>
                                </>
                            )}
                        </h1>

                        <p className="text-xl md:text-2xl mb-10 text-white/90 max-w-3xl mx-auto leading-relaxed font-light drop-shadow-sm" style={{ color: "var(--body-text, rgba(255, 255, 255, 0.9))", fontFamily: "'Inter', sans-serif" }}>
                            {isLoading ? (
                                <span className="h-8 w-1/2 bg-white/10 rounded-lg animate-pulse mx-auto inline-block" />
                            ) : (theme.home_hero_subtitle || "Plan, customize, and book your dream trip effortlessly with AI-powered suggestions.")}
                        </p>

                        {/* CTA Section */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-4">
                            <Button
                                onClick={handleSampleItinerary}
                                variant="outline"
                                size="lg"
                                className="h-[56px] px-8 text-[18px] text-white hover:bg-white/10 transition-all font-bold group border-2 border-white bg-transparent rounded-[30px]"
                            >
                                <PlayCircle className="h-5 w-5 mr-3 group-hover:scale-110 transition-transform" />
                                {isLoading ? <span className="h-6 w-32 bg-white/10 rounded animate-pulse inline-block" /> : (theme.hero_cta_secondary_text || "See Sample Itinerary")}
                            </Button>

                            <Link href="/plan-trip">
                                <Button size="lg" className="h-[56px] px-8 text-[18px] text-white hover:scale-[1.03] transition-all duration-300 group font-bold"
                                    style={{
                                        background: 'linear-gradient(135deg, var(--gradient-start), var(--gradient-mid))',
                                        boxShadow: '0 10px 30px var(--primary-glow)',
                                        borderRadius: "30px",
                                        border: 'none',
                                    }}>
                                    {isLoading ? <span className="h-6 w-32 bg-white/20 rounded animate-pulse inline-block" /> : (theme.hero_cta_primary_text || "Start Your Journey")}
                                    <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </Link>
                        </div>
                    </motion.div>



                    {/* Feature Cards */}
                    {theme.show_feature_cards !== false && (
                        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto transform translate-y-8 z-20 relative">
                            {(theme.feature_cards && theme.feature_cards.length > 0 ? theme.feature_cards : [
                                {
                                    icon: "Sparkles",
                                    title: "Smart Recommendations",
                                    description: "Tailored trips based on your unique preferences",
                                },
                                {
                                    icon: "Sliders",
                                    title: "Customize Everything",
                                    description: "Full control to adjust dates, activities, and stays",
                                },
                                {
                                    icon: "CheckCircle2",
                                    title: "Instant Booking",
                                    description: "Save your plan and book securely when ready",
                                }
                            ]).map((card: any, idx: number) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                                    className={`group glass-panel rounded-[20px] p-8 transition-all duration-300 relative overflow-hidden text-center`}
                                    style={{
                                        borderRadius: "20px",
                                        backgroundColor: "rgba(255,255,255,0.18)",
                                        backdropFilter: "blur(18px)",
                                        border: "1px solid rgba(255,255,255,0.3)",
                                        boxShadow: "0 8px 32px rgba(0,0,0,0.1)"
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.transform = 'translateY(-10px)';
                                        e.currentTarget.style.boxShadow = '0 25px 50px rgba(0,0,0,0.2)';
                                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.45)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.transform = 'none';
                                        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.1)';
                                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                                    }}
                                >
                                    <div className="relative z-10 flex flex-col items-center">
                                        <div className="w-[48px] h-[48px] rounded-[12px] flex items-center justify-center mb-6 shadow-inner ring-1 ring-white/20 group-hover:scale-110 group-hover:shadow-[0_10px_40px_var(--primary-glow)] transition-all duration-300" style={{ background: "linear-gradient(135deg, var(--gradient-start), var(--gradient-mid))" }}>
                                            {getIcon(card.icon, <Sparkles className="h-6 w-6 text-white" />)}
                                        </div>
                                        <h3 className="font-bold text-2xl mb-3 text-white">{card.title}</h3>
                                        <p className="text-white/75 leading-relaxed mb-6">{card.description || card.desc}</p>
                                        <div className="opacity-60 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-0">
                                            <span className="text-sm font-semibold text-white flex items-center gap-1 justify-center">
                                                Learn more <ArrowRight className="w-4 h-4" />
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Why Choose Us Section */}
            {
                theme.show_wcu_section !== false && (
                    <section className="bg-[#FFF3E8] relative overflow-hidden" style={{ paddingTop: "var(--section-spacing, 4rem)", paddingBottom: "calc(var(--section-spacing, 4rem) / 2)" }}>
                        {/* Floating Blobs */}
                        <div className="absolute inset-0 pointer-events-none z-0" style={{
                            background: 'radial-gradient(circle at 20% 30%, #FFD8B5 0%, transparent 40%), radial-gradient(circle at 80% 70%, var(--primary-light) 0%, transparent 40%)',
                            opacity: 0.6
                        }} />

                        {/* Wave Separator - Top */}
                        <div className="absolute top-0 left-0 w-full overflow-hidden leading-[0] rotate-180 z-10">
                            <svg className="absolute top-0 w-full h-[120px] rotate-180" viewBox="0 0 1440 120" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="wave-gradient" x1="0" x2="0" y1="0" y2="1">
                                        <stop offset="0%" stopColor="rgba(255,179,138,0.25)" />
                                        <stop offset="100%" stopColor="rgba(255,243,232,1)" />
                                    </linearGradient>
                                </defs>
                                <path
                                    fill="url(#wave-gradient)"
                                    d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,0L1360,0C1280,0,1120,0,960,0C800,0,640,0,480,0C320,0,160,0,80,0L0,0Z"
                                ></path>
                            </svg>
                        </div>

                        <div className="container mx-auto px-4 relative z-10 pt-16">
                            <div className="text-center mb-20">
                                <Badge variant="outline" className="mb-4 border-[var(--primary)] text-[var(--primary)] bg-[var(--primary-soft)] opacity-20 px-4 py-1.5 uppercase tracking-widest text-xs font-bold backdrop-blur-md" style={{ backgroundColor: 'var(--primary-glow)' }}>Why Choose Us</Badge>
                                <h2 className="text-3xl md:text-[42px] font-black text-gray-900 tracking-tight mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: "1.2" }}>
                                    {theme.wcu_title || "Everything You Need"}<br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)]">
                                        {theme.wcu_accent_title || "For a Perfect Trip"}
                                    </span>
                                </h2>
                                <p className="text-gray-500 max-w-2xl mx-auto text-lg">We handle the details so you can focus on making memories.</p>
                            </div>

                            <div className="grid md:grid-cols-4 gap-8">
                                {(theme.wcu_cards && theme.wcu_cards.length > 0 ? theme.wcu_cards : [
                                    {
                                        icon: "Globe",
                                        icon_bg_color: "#3B82F6",
                                        title: "Curated Destinations",
                                        description: "Discover handpicked, verified experiences at the world’s top destinations."
                                    },
                                    {
                                        icon: "Users",
                                        icon_bg_color: "#8B5CF6",
                                        title: "Local Experts",
                                        description: "Authentic experiences guided by seasoned locals who know the hidden gems."
                                    },
                                    {
                                        icon: "Clock",
                                        icon_bg_color: "#06B6D4",
                                        title: "Flexible Plans",
                                        description: "Change dates, activities, or cancel with ease. Your plan adapts to you."
                                    },
                                    {
                                        icon: "Shield",
                                        icon_bg_color: "#10B981",
                                        title: "Safe Payments",
                                        description: "Seamless, secure payments via Razorpay with instant confirmation."
                                    }
                                ]).map((feature: any, idx: number) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.5, delay: idx * 0.1 }}
                                        className="group glass-panel bg-[rgba(255,250,245,0.45)] backdrop-blur-[16px] rounded-[20px] p-8 shadow-lg transition-all duration-300 border border-[rgba(255,255,255,0.65)] relative overflow-hidden"
                                        onMouseEnter={e => {
                                            e.currentTarget.style.transform = 'translateY(-10px)';
                                            e.currentTarget.style.boxShadow = '0 30px 60px rgba(0,0,0,0.12)';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.transform = 'none';
                                            e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)';
                                        }}
                                    >
                                        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 shadow-md group-hover:scale-110 transition-transform duration-500" style={{ background: "linear-gradient(135deg, var(--gradient-start), var(--gradient-mid))" }}>
                                            {getIcon(feature.icon, <Globe className="h-8 w-8 text-white" />)}
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-[var(--primary)] transition-colors" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                            {feature.title}
                                        </h3>
                                        <p className="text-[rgba(80,40,10,0.65)] leading-relaxed font-medium text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
                                            {feature.description || feature.desc}
                                        </p>
                                        <div className="mt-4 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                            <span className="text-sm font-bold text-[var(--primary)] flex items-center gap-1">Learn more <ArrowRight className="w-4 h-4" /></span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </section>
                )
            }

            {/* Popular Destinations */}
            <section className="pt-12 pb-24 bg-[#FFF3E8]">
                <div className="container mx-auto px-4 relative z-10">
                    <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
                        <div className="text-left max-w-2xl">
                            <Badge variant="outline" className="mb-4 border-[var(--primary)] text-[var(--primary)] bg-[var(--primary-soft)] opacity-20 px-4 py-1.5 uppercase tracking-widest text-xs font-bold backdrop-blur-md" style={{ backgroundColor: 'var(--primary-glow)' }}>Trending Now</Badge>
                            <h2 className="text-3xl md:text-[42px] font-black text-gray-900 tracking-tight mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: "1.2" }}>
                                Popular <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)]">Destinations</span>
                            </h2>
                            <p className="text-[rgba(80,40,10,0.65)] text-lg leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
                                Explore our most booked locations and start your next adventure today.
                            </p>
                        </div>
                        <Link href="/plan-trip" className="group flex items-center gap-2 font-bold text-[var(--primary)] hover:opacity-80 transition-opacity">
                            View All Locations
                            <div className="w-8 h-8 rounded-full bg-[var(--primary-glow)] flex items-center justify-center group-hover:translate-x-1 transition-all">
                                <ArrowRight className="w-4 h-4" />
                            </div>
                        </Link>
                    </div>

                    {destLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-500 font-medium">Curating best spots...</p>
                        </div>
                    ) : destinations.length > 0 ? (
                        <div className="grid md:grid-cols-3 gap-6">
                            {destinations.map((dest, i) => (
                                <motion.div
                                    key={dest.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    whileHover={{ y: -5, rotateX: 2, rotateY: -1 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: i * 0.1 }}
                                    style={{ perspective: "1000px" }}
                                >
                                    <Link href={`/plan-trip?destination=${encodeURIComponent(dest.name)}`} className="group block h-full">
                                        <div className="relative h-[420px] rounded-[1.5rem] overflow-hidden shadow-xl shadow-[rgba(255,122,69,0.15)] group-hover:shadow-[rgba(255,122,69,0.25)] hover:scale-[1.03] transition-all duration-500 cursor-pointer">
                                            {/* Image with zoom effect */}
                                            <div className="absolute inset-0 bg-gray-100 overflow-hidden">
                                                {dest.image_url ? (
                                                    <img
                                                        src={dest.image_url}
                                                        alt={dest.name}
                                                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-[#FFF3E8] to-[#FFD1B5] flex flex-col items-center justify-center text-[var(--primary)] opacity-80">
                                                        <Plane className="h-16 w-16 mb-2 animate-pulse" />
                                                        <span className="text-xs font-bold uppercase tracking-widest opacity-60">Photo Coming Soon</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Overlays */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(0,0,0,0.6)] to-transparent transition-opacity duration-300"></div>

                                            {/* Top Badges */}
                                            <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
                                                <Badge className="bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-mid)] text-white border-none px-2.5 py-0.5 font-bold shadow-lg text-[10px] uppercase tracking-wider">
                                                    {i === 0 ? '🔥 Best Seller' : '⭐ Top Rated'}
                                                </Badge>
                                                <button className="h-9 w-9 rounded-full bg-[rgba(255,255,255,0.25)] backdrop-blur-md flex items-center justify-center hover:bg-white hover:text-red-500 text-white transition-all duration-300 group/heart active:scale-95 shadow-md">
                                                    <Heart className="h-4 w-4 fill-transparent group-hover/heart:fill-red-500" />
                                                </button>
                                            </div>

                                            {/* Content Glass Bar */}
                                            <div className="absolute bottom-4 left-4 right-4 p-4 text-white z-10 bg-[rgba(255,255,255,0.15)] backdrop-blur-[14px] rounded-2xl border border-[rgba(255,255,255,0.25)] overflow-hidden transition-all duration-300 group-hover:bg-[rgba(255,255,255,0.2)]">
                                                {/* Rating & Location */}
                                                <div className="flex items-center gap-2 mb-2 text-white/90 font-medium text-[11px] uppercase tracking-wider">
                                                    <div className="bg-white/20 backdrop-blur-sm px-1.5 py-0.5 rounded flex items-center gap-1">
                                                        <Star className="h-3 w-3 fill-white" />
                                                        <span>4.8</span>
                                                    </div>
                                                    <span>•</span>
                                                    <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-1.5 py-0.5 rounded">
                                                        <img src={`https://flagcdn.com/16x12/${(dest.country === 'India' ? 'in' : 'us')}.png`} alt={dest.country} className="w-3.5 h-auto rounded-[2px]" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                                        {dest.country || 'International'}
                                                    </div>
                                                </div>

                                                <h3 className="text-xl font-bold mb-1 leading-tight tracking-tight drop-shadow-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                                    {dest.name}
                                                </h3>

                                                {/* Price & Duration Row */}
                                                <div className="flex items-center justify-between mt-3">
                                                    <div className="bg-white/25 backdrop-blur-md rounded-[20px] px-3 py-1.5 inline-block">
                                                        <p className="text-[10px] text-white/90 uppercase tracking-wider font-bold mb-0.5 shadow-sm">Starting from</p>
                                                        <div className="flex items-baseline gap-1 drop-shadow-sm">
                                                            <span className="text-xl font-bold">₹{dest.min_price || 'N/A'}</span>
                                                            <span className="text-[10px] text-white/80 font-semibold">/person</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] text-white/70 uppercase tracking-wider font-semibold mb-0.5">Duration</p>
                                                        <div className="flex items-center gap-1 justify-end text-sm bg-white/10 px-2 py-0.5 rounded-full border border-white/20">
                                                            <Clock className="h-3 w-3" />
                                                            <span className="font-semibold text-xs">
                                                                {dest.min_duration === dest.max_duration
                                                                    ? `${dest.min_duration} Days`
                                                                    : `${dest.min_duration}-${dest.max_duration} Days`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Hover Action */}
                                                <div className="h-0 group-hover:h-11 transition-all duration-300 overflow-hidden transform group-hover:translate-y-0 translate-y-4 opacity-0 group-hover:opacity-100">
                                                    <Button className="w-full mt-2.5 bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-mid)] text-white hover:opacity-90 font-bold rounded-xl h-9 shadow-lg border-none">
                                                        Explore &rarr;
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 glass-panel rounded-[3rem] border border-white/20">
                            <div className="bg-white/10 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-500 shadow-sm">
                                <Plane className="h-10 w-10" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">No Destinations Found</h3>
                            <p className="text-gray-500 max-w-sm mx-auto mb-8">
                                We're currently curating new packages. Please check back soon or try searching for a custom trip.
                            </p>
                            <Link href="/plan-trip">
                                <Button variant="outline" size="lg" className="rounded-full border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 bg-white">
                                    Start Custom Plan &rarr;
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            </section>
            <CustomerAIChatCard />
        </div>
    )
}
