'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plane, MapPin, Calendar, Shield, Sparkles, ArrowRight, Sliders, CheckCircle2 } from 'lucide-react'

interface Destination {
    id: string
    name: string
    country: string
    description: string
    image_url?: string
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
            <section className="relative bg-gradient-to-br from-blue-900 via-indigo-900 to-blue-800 text-white pt-24 pb-32 overflow-hidden">
                {/* Abstract Background pattern */}
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-5xl mx-auto text-center">
                        <Badge variant="secondary" className="mb-6 bg-blue-500/20 text-blue-100 hover:bg-blue-500/30 border-blue-400/30 px-4 py-1.5 text-sm backdrop-blur-sm">
                            ✨ AI-Powered Trip Planning
                        </Badge>

                        <h1 className="text-5xl md:text-7xl font-extrabold mb-8 tracking-tight leading-tight drop-shadow-lg">
                            Adventure Awaits—<br className="hidden md:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-indigo-200">Tailored Just for You</span>
                        </h1>

                        <p className="text-xl md:text-2xl mb-10 text-blue-100/90 max-w-3xl mx-auto leading-relaxed font-light">
                            Plan, customize, and book your dream trip effortlessly with AI-powered suggestions.
                        </p>

                        {/* CTA Section */}
                        <div className="flex flex-col items-center gap-4 mb-16">
                            <Link href="/plan-trip">
                                <Button size="lg" className="h-16 px-10 text-xl rounded-full bg-white text-blue-900 hover:bg-blue-50 hover:scale-105 transition-all duration-300 shadow-xl shadow-blue-900/50 group font-bold">
                                    <Sparkles className="h-5 w-5 mr-2 text-yellow-500 animate-pulse" />
                                    Start Your Journey
                                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </Link>
                            <span className="text-sm text-blue-200/80 font-medium tracking-wide">
                                Smart & Flexible Planning
                            </span>
                        </div>

                        {/* Supporting Points */}
                        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:bg-white/15 transition-colors">
                                <div className="bg-blue-500/20 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 text-blue-200">
                                    <Sparkles className="h-6 w-6" />
                                </div>
                                <h3 className="font-bold text-lg mb-2">Smart Recommendations</h3>
                                <p className="text-sm text-blue-100/80">Tailored trips based on your unique preferences</p>
                            </div>

                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:bg-white/15 transition-colors">
                                <div className="bg-indigo-500/20 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 text-indigo-200">
                                    <Sliders className="h-6 w-6" />
                                </div>
                                <h3 className="font-bold text-lg mb-2">Customize Everything</h3>
                                <p className="text-sm text-blue-100/80">Full control to adjust dates, activities, and stays</p>
                            </div>

                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:bg-white/15 transition-colors">
                                <div className="bg-emerald-500/20 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 text-emerald-200">
                                    <CheckCircle2 className="h-6 w-6" />
                                </div>
                                <h3 className="font-bold text-lg mb-2">Instant Booking</h3>
                                <p className="text-sm text-blue-100/80">Save your plan and book securely when ready</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-24 bg-gray-50/50 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent"></div>
                <div className="container mx-auto px-4 relative z-10">
                    <div className="text-center mb-16">
                        <Badge variant="outline" className="mb-4 border-blue-200 text-blue-600 bg-blue-50 px-4 py-1">Why Choose Us</Badge>
                        <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">Everything You Need for a Perfect Trip</h2>
                    </div>

                    <div className="grid md:grid-cols-4 gap-8">
                        {[
                            {
                                icon: <Plane className="h-8 w-8 text-white" />,
                                bg: "bg-blue-500",
                                title: "Curated Destinations",
                                desc: "Discover handpicked experiences at the world’s top destinations."
                            },
                            {
                                icon: <MapPin className="h-8 w-8 text-white" />,
                                bg: "bg-indigo-500",
                                title: "Local Experts",
                                desc: "Authentic experiences guided by seasoned locals."
                            },
                            {
                                icon: <Calendar className="h-8 w-8 text-white" />,
                                bg: "bg-purple-500",
                                title: "Flexible Plans",
                                desc: "Change dates, activities, or cancel with ease."
                            },
                            {
                                icon: <Shield className="h-8 w-8 text-white" />,
                                bg: "bg-emerald-500",
                                title: "Safe Payments",
                                desc: "Seamless, secure payments via Razorpay."
                            }
                        ].map((feature, idx) => (
                            <Card key={idx} className="border-none shadow-lg shadow-gray-200/50 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group overflow-hidden bg-white">
                                <CardHeader className="relative pb-0">
                                    <div className={`w-16 h-16 rounded-2xl ${feature.bg} flex items-center justify-center mb-4 shadow-lg shadow-gray-200 group-hover:scale-110 transition-transform duration-300`}>
                                        {feature.icon}
                                    </div>
                                    <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                                        {feature.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <CardDescription className="text-base text-gray-500 font-medium leading-relaxed">
                                        {feature.desc}
                                    </CardDescription>
                                </CardContent>
                                <div className={`absolute bottom-0 left-0 w-full h-1 ${feature.bg} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origins-left`}></div>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Popular Destinations */}
            <section className="py-24 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <Badge variant="outline" className="mb-4 border-blue-200 text-blue-600 bg-blue-50 px-4 py-1">Trending Now</Badge>
                        <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">Popular Destinations</h2>
                        <p className="text-gray-500 mt-4 max-w-2xl mx-auto">
                            Explore our most booked locations and start your next adventure today.
                        </p>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-500 font-medium">Curating best spots...</p>
                        </div>
                    ) : destinations.length > 0 ? (
                        <div className="grid md:grid-cols-3 gap-8">
                            {destinations.map((dest) => (
                                <Link key={dest.id} href={`/plan-trip?destination=${encodeURIComponent(dest.name)}`} className="group">
                                    <div className="relative h-[400px] rounded-3xl overflow-hidden shadow-lg group-hover:shadow-2xl transition-all duration-500 cursor-pointer">
                                        {/* Image with zoom effect */}
                                        <div className="absolute inset-0 bg-gray-200">
                                            {dest.image_url ? (
                                                <img
                                                    src={dest.image_url}
                                                    alt={dest.name}
                                                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-300">
                                                    <MapPin className="h-16 w-16" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Gradient Overlay for Readability */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-300"></div>

                                        {/* Content */}
                                        <div className="absolute bottom-0 left-0 w-full p-8 text-white translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                                            <Badge className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border-none mb-3">
                                                {dest.country || 'International'}
                                            </Badge>
                                            <h3 className="text-3xl font-bold mb-2 leading-tight">
                                                {dest.name}
                                            </h3>
                                            <p className="text-gray-200 line-clamp-2 mb-6 font-light opacity-90 text-sm">
                                                {dest.description || `Discover the amazing experiences waiting for you in ${dest.name}.`}
                                            </p>

                                            <div className="inline-flex items-center gap-2 font-bold text-yellow-400 group-hover:gap-3 transition-all">
                                                Explore {dest.name}
                                                <ArrowRight className="h-5 w-5" />
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                            <div className="bg-gray-100 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                <Plane className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">No Destinations Found</h3>
                            <p className="text-gray-500 max-w-sm mx-auto">
                                We're currently curating new packages. Please check back soon or try searching for a custom trip.
                            </p>
                            <Link href="/plan-trip">
                                <Button variant="link" className="mt-4 text-blue-600">Start Custom Plan &rarr;</Button>
                            </Link>
                        </div>
                    )}
                </div>
            </section>
        </div>
    )
}
