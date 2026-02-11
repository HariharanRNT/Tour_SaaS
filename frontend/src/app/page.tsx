'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plane, MapPin, Calendar, Shield, Sparkles, ArrowRight, Sliders, CheckCircle2, PlayCircle, Globe, Users, Clock, Star, Heart } from 'lucide-react'
import { motion } from 'framer-motion'

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
    const [destinations, setDestinations] = useState<Destination[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
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
                setLoading(false)
            }
        }
        fetchDestinations()
    }, [])

    return (
        <div>
            {/* Modernized Hero Section */}
            {/* Modernized Hero Section */}
            <section className="relative min-h-[90vh] flex flex-col justify-center overflow-hidden">
                {/* Background Image with Overlay */}
                <div
                    className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat bg-fixed"
                    style={{
                        backgroundImage: 'url("https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop")'
                    }}
                >
                    <div className="absolute inset-0 bg-black/50 mix-blend-multiply" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-blue-950/90" />
                </div>

                {/* Animated Floating Icons */}
                <div className="absolute inset-0 z-10 overflow-hidden pointer-events-none">
                    <motion.div
                        animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-1/4 left-10 md:left-32 opacity-80"
                    >
                        <Plane className="w-16 h-16 text-white/20 drop-shadow-lg" />
                    </motion.div>
                    <motion.div
                        animate={{ y: [0, 20, 0], rotate: [0, -10, 0] }}
                        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                        className="absolute top-1/3 right-10 md:right-32 opacity-80"
                    >
                        <MapPin className="w-12 h-12 text-white/30 drop-shadow-lg" />
                    </motion.div>
                    <motion.div
                        animate={{ y: [0, -15, 0] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                        className="absolute bottom-1/3 left-1/4 opacity-60 hidden md:block"
                    >
                        <Globe className="w-10 h-10 text-blue-200/20 drop-shadow-lg" />
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
                    <div className="max-w-5xl mx-auto text-center">
                        <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter leading-[1.1] text-white drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]">
                            Adventure Awaits—<br className="hidden md:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-indigo-200 to-white">
                                Tailored Just for You
                            </span>
                        </h1>

                        <p className="text-xl md:text-3xl mb-12 text-blue-100/90 max-w-3xl mx-auto leading-relaxed font-light">
                            Plan, customize, and book your dream trip effortlessly with AI-powered suggestions.
                        </p>

                        {/* CTA Section */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-24">
                            <Link href="/plan-trip">
                                <Button size="lg" className="h-16 px-12 text-xl rounded-full bg-white text-blue-950 hover:bg-blue-50 hover:scale-105 transition-all duration-300 shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)] border-2 border-transparent hover:border-blue-100 group font-bold">
                                    <Sparkles className="h-6 w-6 mr-2 text-indigo-600 animate-pulse" />
                                    Start Your Journey
                                    <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </Link>

                            <Button variant="ghost" size="lg" className="h-16 px-8 text-lg rounded-full text-blue-100 hover:text-white hover:bg-white/10 border border-white/10 hover:border-white/30 backdrop-blur-sm transition-all">
                                <PlayCircle className="h-6 w-6 mr-2" />
                                See Sample Itinerary
                            </Button>
                        </div>

                        {/* Feature Cards - 3 Blue Cards */}
                        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto transform translate-y-8">
                            {[
                                {
                                    icon: <Sparkles className="h-10 w-10 text-blue-300" />,
                                    title: "Smart Recommendations",
                                    desc: "Tailored trips based on your unique preferences",
                                    gradient: "from-blue-500/20 to-blue-600/20",
                                    border: "group-hover:border-blue-400/50"
                                },
                                {
                                    icon: <Sliders className="h-10 w-10 text-indigo-300" />,
                                    title: "Customize Everything",
                                    desc: "Full control to adjust dates, activities, and stays",
                                    gradient: "from-indigo-500/20 to-indigo-600/20",
                                    border: "group-hover:border-indigo-400/50"
                                },
                                {
                                    icon: <CheckCircle2 className="h-10 w-10 text-cyan-300" />,
                                    title: "Instant Booking",
                                    desc: "Save your plan and book securely when ready",
                                    gradient: "from-cyan-500/20 to-cyan-600/20",
                                    border: "group-hover:border-cyan-400/50"
                                }
                            ].map((card, idx) => (
                                <div key={idx} className={`group bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl hover:shadow-blue-900/40 hover:-translate-y-2 transition-all duration-500 relative overflow-hidden ${card.border}`}>
                                    {/* Inner Gradient */}
                                    <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>

                                    <div className="relative z-10 flex flex-col items-center">
                                        <div className="bg-white/10 w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-inner ring-1 ring-white/20 group-hover:scale-110 group-hover:bg-white/20 transition-all duration-300">
                                            {card.icon}
                                        </div>
                                        <h3 className="font-bold text-2xl mb-3 text-white">{card.title}</h3>
                                        <p className="text-blue-100/80 leading-relaxed mb-6">{card.desc}</p>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                                            <span className="text-sm font-semibold text-blue-200 flex items-center gap-1">
                                                Learn more <ArrowRight className="w-4 h-4" />
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-32 bg-gray-50 relative overflow-hidden">
                {/* Wave Separator - Top */}
                <div className="absolute top-0 left-0 w-full overflow-hidden leading-[0]">
                    <svg className="relative block w-[calc(100%+1.3px)] h-[50px] md:h-[100px]" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
                        <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="fill-blue-900"></path>
                    </svg>
                </div>

                <div className="container mx-auto px-4 relative z-10 pt-16">
                    <div className="text-center mb-20">
                        <Badge variant="outline" className="mb-4 border-blue-200 text-blue-600 bg-blue-50 px-4 py-1.5 uppercase tracking-widest text-xs font-bold">Why Choose Us</Badge>
                        <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-4">Everything You Need<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">For a Perfect Trip</span></h2>
                        <p className="text-gray-500 max-w-2xl mx-auto text-lg">We handle the details so you can focus on making memories.</p>
                    </div>

                    <div className="grid md:grid-cols-4 gap-8">
                        {[
                            {
                                icon: <Globe className="h-10 w-10 text-white" />,
                                bg: "bg-gradient-to-br from-blue-400 to-blue-600",
                                shadow: "shadow-blue-200",
                                title: "Curated Destinations",
                                desc: "Discover handpicked, verified experiences at the world’s top destinations."
                            },
                            {
                                icon: <Users className="h-10 w-10 text-white" />,
                                bg: "bg-gradient-to-br from-indigo-400 to-indigo-600",
                                shadow: "shadow-indigo-200",
                                title: "Local Experts",
                                desc: "Authentic experiences guided by seasoned locals who know the hidden gems."
                            },
                            {
                                icon: <Clock className="h-10 w-10 text-white" />,
                                bg: "bg-gradient-to-br from-sky-400 to-sky-600",
                                shadow: "shadow-sky-200",
                                title: "Flexible Plans",
                                desc: "Change dates, activities, or cancel with ease. Your plan adapts to you."
                            },
                            {
                                icon: <Shield className="h-10 w-10 text-white" />,
                                bg: "bg-gradient-to-br from-cyan-400 to-cyan-600",
                                shadow: "shadow-cyan-200",
                                title: "Safe Payments",
                                desc: "Seamless, secure payments via Razorpay with instant confirmation."
                            }
                        ].map((feature, idx) => (
                            <div key={idx} className="group bg-white rounded-[2rem] p-8 shadow-xl shadow-gray-100 hover:shadow-2xl hover:shadow-gray-200 hover:-translate-y-2 transition-all duration-300 border border-gray-100 relative overflow-hidden">
                                <div className={`w-20 h-20 rounded-full ${feature.bg} flex items-center justify-center mb-8 shadow-lg ${feature.shadow} group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`}>
                                    {feature.icon}
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-700 transition-colors">
                                    {feature.title}
                                </h3>
                                <p className="text-gray-500 leading-relaxed font-medium">
                                    {feature.desc}
                                </p>
                                <div className="mt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                                    <div className="w-8 h-1 bg-gray-200 rounded-full group-hover:bg-blue-500 transition-colors duration-500"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Popular Destinations */}
            <section className="py-32 bg-white">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
                        <div className="text-left max-w-2xl">
                            <Badge variant="outline" className="mb-4 border-blue-200 text-blue-600 bg-blue-50 px-4 py-1.5 uppercase tracking-widest text-xs font-bold">Trending Now</Badge>
                            <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-4">Popular <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Destinations</span></h2>
                            <p className="text-gray-500 text-lg leading-relaxed">
                                Explore our most booked locations and start your next adventure today.
                            </p>
                        </div>
                        <Link href="/plan-trip" className="group flex items-center gap-2 font-bold text-blue-600 hover:text-blue-700 transition-colors">
                            View All Locations
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                <ArrowRight className="w-4 h-4" />
                            </div>
                        </Link>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-500 font-medium">Curating best spots...</p>
                        </div>
                    ) : destinations.length > 0 ? (
                        <div className="grid md:grid-cols-3 gap-10">
                            {destinations.map((dest, i) => (
                                <Link key={dest.id} href={`/plan-trip?destination=${encodeURIComponent(dest.name)}`} className="group block h-full">
                                    <div className="relative h-[600px] rounded-[2rem] overflow-hidden shadow-2xl shadow-gray-200 group-hover:shadow-blue-200 hover:-translate-y-3 transition-all duration-500 cursor-pointer">
                                        {/* Image with zoom effect */}
                                        <div className="absolute inset-0 bg-gray-200 overflow-hidden">
                                            {dest.image_url ? (
                                                <img
                                                    src={dest.image_url}
                                                    alt={dest.name}
                                                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-300">
                                                    <MapPin className="h-20 w-20" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Overlays */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-60 group-hover:opacity-70 transition-opacity duration-300"></div>
                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-300"></div>

                                        {/* Top Badges */}
                                        <div className="absolute top-6 left-6 right-6 flex justify-between items-start z-10">
                                            <Badge className="bg-white/90 backdrop-blur-md text-gray-900 border-none px-3 py-1.5 font-bold shadow-lg">
                                                {i === 0 ? '🔥 Best Seller' : '⭐ Top Rated'}
                                            </Badge>
                                            <button className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white hover:text-red-500 text-white transition-all duration-300 group/heart">
                                                <Heart className="h-5 w-5 fill-transparent group-hover/heart:fill-red-500" />
                                            </button>
                                        </div>

                                        {/* Content */}
                                        <div className="absolute bottom-0 left-0 w-full p-8 text-white z-10">
                                            {/* Rating & Location */}
                                            <div className="flex items-center gap-2 mb-3 text-blue-100 font-medium text-sm">
                                                <div className="bg-yellow-400/20 backdrop-blur-sm border border-yellow-400/30 px-2 py-0.5 rounded flex items-center gap-1 text-yellow-300">
                                                    <Star className="h-3 w-3 fill-yellow-300" />
                                                    <span>4.8</span>
                                                </div>
                                                <span>•</span>
                                                <div className="flex items-center gap-1">
                                                    <Globe className="h-3 w-3" />
                                                    {dest.country || 'International'}
                                                </div>
                                            </div>

                                            <h3 className="text-4xl font-black mb-3 leading-tight tracking-tight shadow-black drop-shadow-lg">
                                                {dest.name}
                                            </h3>

                                            <p className="text-gray-200 line-clamp-2 mb-6 font-medium opacity-90 text-sm leading-relaxed max-w-[90%]">
                                                {dest.description || `Discover the amazing experiences waiting for you in ${dest.name}.`}
                                            </p>

                                            {/* Price & Duration Row */}
                                            <div className="flex items-center justify-between border-t border-white/20 pt-6 mt-4">
                                                <div>
                                                    <p className="text-xs text-blue-200 uppercase tracking-wider font-semibold mb-1">Starting from</p>
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-2xl font-bold">₹{dest.min_price || 'N/A'}</span>
                                                        <span className="text-sm text-gray-300 font-normal">/person</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-blue-200 uppercase tracking-wider font-semibold mb-1">Duration</p>
                                                    <div className="flex items-center gap-1.5 justify-end">
                                                        <Clock className="h-4 w-4" />
                                                        <span className="font-bold">
                                                            {dest.min_duration === dest.max_duration
                                                                ? `${dest.min_duration} Days`
                                                                : `${dest.min_duration}-${dest.max_duration} Days`}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Hover Action */}
                                            <div className="h-0 group-hover:h-16 transition-all duration-300 overflow-hidden">
                                                <Button className="w-full mt-6 bg-white text-blue-900 hover:bg-blue-50 font-bold rounded-xl h-12 shadow-lg hover:shadow-xl transition-all">
                                                    Plan Trip to {dest.name}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
                            <div className="bg-white h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300 shadow-sm">
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
        </div>
    )
}
