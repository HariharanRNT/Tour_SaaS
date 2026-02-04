'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plane, MapPin, Calendar, Shield, Sparkles } from 'lucide-react'

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
            {/* Hero Section with Single CTA */}
            <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto text-center">
                        <h1 className="text-5xl font-bold mb-6">
                            Discover Your Next Adventure
                        </h1>
                        <p className="text-xl mb-8 text-blue-100">
                            Plan your perfect trip with smart recommendations and full customization
                        </p>

                        {/* Single Primary CTA */}
                        <div className="max-w-2xl mx-auto">
                            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                                <CardHeader>
                                    <div className="flex items-center justify-center mb-2">
                                        <Sparkles className="h-16 w-16 text-yellow-300" />
                                    </div>
                                    <CardTitle className="text-white text-3xl">Plan Your Trip</CardTitle>
                                    <CardDescription className="text-blue-100 text-lg">
                                        Get smart itinerary suggestions or build from scratch
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Link href="/plan-trip">
                                        <Button size="lg" variant="secondary" className="w-full text-xl py-6">
                                            Start Planning
                                            <Badge className="ml-2 bg-yellow-500">Smart & Flexible</Badge>
                                        </Button>
                                    </Link>
                                    <div className="grid grid-cols-3 gap-4 mt-6 text-sm text-blue-100">
                                        <div className="text-center">
                                            <div className="font-semibold">✓ Smart Matching</div>
                                            <div className="text-xs">Curated suggestions</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="font-semibold">✓ Full Control</div>
                                            <div className="text-xs">Customize everything</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="font-semibold">✓ Save & Book</div>
                                            <div className="text-xs">Book when ready</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-16">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl font-bold text-center mb-12">Why Choose Us</h2>
                    <div className="grid md:grid-cols-4 gap-8">
                        <Card>
                            <CardHeader>
                                <Plane className="h-10 w-10 text-primary mb-2" />
                                <CardTitle>Best Destinations</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CardDescription>
                                    Curated packages to the world's most beautiful destinations
                                </CardDescription>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <MapPin className="h-10 w-10 text-primary mb-2" />
                                <CardTitle>Expert Guides</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CardDescription>
                                    Professional local guides for authentic experiences
                                </CardDescription>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <Calendar className="h-10 w-10 text-primary mb-2" />
                                <CardTitle>Flexible Booking</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CardDescription>
                                    Easy booking process with flexible cancellation policies
                                </CardDescription>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <Shield className="h-10 w-10 text-primary mb-2" />
                                <CardTitle>Secure Payments</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CardDescription>
                                    Safe and secure payment processing with Razorpay
                                </CardDescription>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Popular Destinations */}
            <section className="py-16 bg-gray-50">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl font-bold text-center mb-12">Popular Destinations</h2>

                    {loading ? (
                        <div className="text-center py-10 text-gray-500">Loading destinations...</div>
                    ) : destinations.length > 0 ? (
                        <div className="grid md:grid-cols-3 gap-8">
                            {destinations.map((dest) => (
                                <Card key={dest.id} className="overflow-hidden hover:shadow-lg transition-all transform hover:-translate-y-1">
                                    <div className="h-48 relative overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                                        {dest.image_url ? (
                                            <img
                                                src={dest.image_url}
                                                alt={dest.name}
                                                className="absolute inset-0 w-full h-full object-cover"
                                            />
                                        ) : null}
                                        <div className="absolute inset-0 bg-black/20" />
                                        <h3 className="relative z-10 text-white text-3xl font-bold drop-shadow-md">
                                            {dest.name}
                                        </h3>
                                    </div>
                                    <CardContent className="p-6">
                                        <p className="text-gray-600 mb-4 line-clamp-2">
                                            {dest.description || `Discover amazing tours and experiences in ${dest.name}`}
                                        </p>
                                        <Link href={`/plan-trip?destination=${encodeURIComponent(dest.name)}`}>
                                            <Button variant="outline" className="w-full border-blue-200 hover:bg-blue-50 text-blue-700">
                                                Plan This Trip
                                            </Button>
                                        </Link>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-white rounded-lg border border-dashed border-gray-300">
                            <p className="text-gray-500">No popular destinations available at the moment.</p>
                            <p className="text-sm text-gray-400 mt-2">Publish packages to see them featured here.</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    )
}
