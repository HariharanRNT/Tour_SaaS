'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Plane,
    MessageSquare,
    Users,
    Calendar,
    Wallet,
    FileText,
    UserCheck,
    MapPin,
    CreditCard,
    Sparkles,
    CheckCircle2,
    ArrowRight,
    ChevronRight,
    Globe,
    Zap,
    Shield,
    BarChart3,
    Clock,
    XCircle,
    Layout,
    Smartphone,
    Download,
    Star,
    Plus,
    Mail,
    Minus,
    TrendingUp,
    Briefcase,
    Settings,
    Search,
    Send,
    HelpCircle,
    Check,
    ArrowUpRight,
    MousePointer2,
    Target
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

const LandingPage = () => {
    const router = useRouter()

    const modules = [
        { title: 'Tour Package Management', description: 'Create, customize, and manage complex multi-day itineraries with ease.', icon: Plane, color: 'bg-blue-600' },
        { title: 'AI Assistant Chatbot', description: '24/7 automated customer support and personalized travel recommendations.', icon: MessageSquare, color: 'bg-indigo-600' },
        { title: 'Agent Management', description: 'Role-based access control for your entire team of travel specialists.', icon: Users, color: 'bg-blue-500' },
        { title: 'Booking Management', description: 'Track every reservation from enquiry to departure in one central hub.', icon: Calendar, color: 'bg-blue-700' },
        { title: 'Billing & Finance', description: 'Automated invoicing, payment tracking, and real-time revenue analytics.', icon: Wallet, color: 'bg-sky-600' },
        { title: 'Enquiry Management', description: 'Convert more leads with our intelligent lead tracking and follow-up system.', icon: Zap, color: 'bg-blue-400' },
        { title: 'Subscription Plans', description: 'Flexible tiered pricing models to scale with your agency’s growth.', icon: CreditCard, color: 'bg-blue-800' },
        { title: 'PDF Quote Generation', description: 'Generate professional, branded PDF quotations in seconds.', icon: FileText, color: 'bg-blue-600' },
        { title: 'Customer Management', description: 'Comprehensive CRM to manage traveler preferences and history.', icon: UserCheck, color: 'bg-blue-500' },
        { title: 'Activity & Destination Management', description: 'Curated database of local activities and global destinations.', icon: MapPin, color: 'bg-blue-700' }
    ]

    const faqs = [
        { q: "How long does it take to set up my agency?", a: "You can be up and running in less than 10 minutes. Our onboarding wizard guides you through white-labelling, package creation, and team setup." },
        { q: "Can I use my own domain for the travel website?", a: "Yes! All our paid plans include custom domain support (e.g., travel.yourbrand.com) with free SSL certificates." },
        { q: "How does the AI search work?", a: "Our AI uses natural language processing. Your customers can simply type 'Beach trip to Goa for 4 people under 50k' and get instant, relevant results." },
        { q: "Is there a limit on the number of bookings?", a: "Our Growth and Enterprise plans offer unlimited bookings. The Starter plan includes up to 50 bookings per month." },
        { q: "Can I manage both Domestic and International tours?", a: "Absolutely. TourSaaS is built for global operations with multi-currency support and localized tax (GST/VAT) configurations." },
        { q: "What happens after the 14-day free trial?", a: "You can choose a plan that fits your needs. If you don't choose, your account will be paused but your data will remain safe for 30 days." }
    ]

    const pricingPlans = [
        {
            name: "Starter",
            price: "₹1,999",
            description: "Perfect for boutique agencies starting their digital journey.",
            features: ["Up to 50 Bookings/mo", "Basic Itinerary Builder", "Email Support", "Standard PDF Quotes", "Single Agent Login"],
            cta: "Start Free Trial",
            popular: false
        },
        {
            name: "Growth",
            price: "₹4,999",
            description: "Best for growing agencies scaling their operations.",
            features: ["Unlimited Bookings", "Advanced AI Search", "Priority Support", "Full White-Labelling", "Up to 10 Agents", "Automated Billing"],
            cta: "Start Free Trial",
            popular: true
        },
        {
            name: "Enterprise",
            price: "Custom",
            description: "Custom solutions for large-scale tour operators.",
            features: ["Dedicated Account Manager", "Custom Integrations", "Unlimited Agents", "Advanced Analytics", "SLA Guarantee", "On-premise Deployment Options"],
            cta: "Contact Sales",
            popular: false
        }
    ]
    return (
        <div className="min-h-screen text-slate-900 font-sans selection:bg-violet-100 selection:text-violet-600 overflow-x-hidden"
            style={{
                background: "linear-gradient(135deg, #EEF2FF 0%, #FAF5FF 50%, #EFF6FF 100%)"
            }}>
            <style>{`
                @keyframes float1 {
                    0%, 100% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -30px) scale(1.05); }
                    66% { transform: translate(-20px, 20px) scale(0.95); }
                }
                @keyframes float2 {
                    0%, 100% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(-25px, 25px) scale(1.05); }
                    66% { transform: translate(20px, -15px) scale(0.95); }
                }
                @keyframes glowPulse {
                    0%, 100% { box-shadow: 0 0 20px rgba(124,58,237,0.3); }
                    50% { box-shadow: 0 0 40px rgba(124,58,237,0.6); }
                }
                @keyframes shimmer {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                .glass-card {
                    background: rgba(255,255,255,0.55);
                    backdrop-filter: blur(20px) saturate(180%);
                    -webkit-backdrop-filter: blur(20px) saturate(180%);
                    border: 1px solid rgba(255,255,255,0.85);
                    box-shadow: 
                    0 8px 32px rgba(124,58,237,0.08),
                    0 2px 8px rgba(0,0,0,0.04),
                    inset 0 1px 0 rgba(255,255,255,0.95);
                }
                .glass-card-dark {
                    background: rgba(15,10,40,0.75);
                    backdrop-filter: blur(24px) saturate(160%);
                    -webkit-backdrop-filter: blur(24px) saturate(160%);
                    border: 1px solid rgba(255,255,255,0.12);
                    box-shadow: 
                    0 8px 32px rgba(0,0,0,0.3),
                    inset 0 1px 0 rgba(255,255,255,0.1);
                }
                .glass-inner {
                    background: rgba(255,255,255,0.65);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255,255,255,0.9);
                    box-shadow: inset 0 1px 0 rgba(255,255,255,1);
                }
                .tilt-card {
                    transform-style: preserve-3d;
                    transition: transform 0.4s cubic-bezier(0.23,1,0.32,1), 
                                box-shadow 0.4s ease;
                    perspective: 1000px;
                }
                .tilt-card:hover {
                    transform: rotateX(4deg) rotateY(4deg) translateZ(16px) scale(1.02);
                    box-shadow: 
                    0 25px 50px rgba(124,58,237,0.15),
                    0 8px 20px rgba(0,0,0,0.08),
                    inset 0 1px 0 rgba(255,255,255,0.95);
                }
                .gradient-text {
                    background: linear-gradient(135deg, #7C3AED, #EC4899);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
                .gradient-btn {
                    background: linear-gradient(135deg, #7C3AED, #EC4899);
                    box-shadow: 0 8px 30px rgba(124,58,237,0.35);
                    transition: all 0.3s ease;
                }
                .gradient-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 12px 40px rgba(124,58,237,0.5);
                }
                * { position: relative; z-index: 1; }
                nav, .fixed { z-index: 100 !important; }
                .fixed.inset-0 { z-index: 0 !important; }
            `}</style>

            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div style={{
                    position: 'absolute', top: '-10%', left: '-5%',
                    width: '600px', height: '600px',
                    background: 'radial-gradient(circle, rgba(167,139,250,0.35) 0%, transparent 70%)',
                    borderRadius: '50%',
                    animation: 'float1 25s ease-in-out infinite'
                }} />
                <div style={{
                    position: 'absolute', top: '5%', right: '-10%',
                    width: '500px', height: '500px',
                    background: 'radial-gradient(circle, rgba(251,191,236,0.3) 0%, transparent 70%)',
                    borderRadius: '50%',
                    animation: 'float2 30s ease-in-out infinite'
                }} />
                <div style={{
                    position: 'absolute', bottom: '20%', left: '30%',
                    width: '400px', height: '400px',
                    background: 'radial-gradient(circle, rgba(186,230,253,0.25) 0%, transparent 70%)',
                    borderRadius: '50%',
                    animation: 'float1 20s ease-in-out infinite reverse'
                }} />
                <div style={{
                    position: 'absolute', bottom: '-5%', right: '10%',
                    width: '350px', height: '350px',
                    background: 'radial-gradient(circle, rgba(221,214,254,0.3) 0%, transparent 70%)',
                    borderRadius: '50%',
                    animation: 'float2 22s ease-in-out infinite'
                }} />
            </div>

            {/* Custom SaaS Navbar */}
            <nav className="glass-card fixed top-0 left-0 right-0 z-[100] border-b border-white/80">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/landing')}>
                            <div className="p-2 rounded-xl" style={{ background: 'linear-gradient(135deg,#7C3AED,#EC4899)' }}>
                                <Globe className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-2xl font-black tracking-tight text-slate-900 gradient-text">TourSaaS</span>
                        </div>

                        <div className="hidden md:flex items-center gap-8">
                            <a href="#features" className="text-sm font-semibold text-slate-900 hover:text-violet-600 transition-colors">Features</a>
                            <a href="#modules" className="text-sm font-semibold text-slate-900 hover:text-violet-600 transition-colors">Modules</a>
                            <a href="#pricing" className="text-sm font-semibold text-slate-900 hover:text-violet-600 transition-colors">Pricing</a>
                            <a href="#faq" className="text-sm font-semibold text-slate-900 hover:text-violet-600 transition-colors">FAQ</a>
                        </div>

                        <div className="flex items-center gap-4">
                            <Button
                                className="gradient-btn text-white font-bold rounded-full px-6 transition-all hover:scale-105"
                                onClick={() => router.push('/register/agent')}
                            >
                                Start Free Trial
                            </Button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-24 pb-20 lg:pt-32 lg:pb-32">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none -z-10">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px]" style={{ background: 'radial-gradient(circle, #C4B5FD 0%, transparent 70%)', opacity: 0.4 }} />
                    <div className="absolute bottom-[10%] right-[-10%] w-[35%] h-[35%] rounded-full blur-[100px]" style={{ background: 'radial-gradient(circle, #FBCFE8 0%, transparent 70%)', opacity: 0.3 }} />
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        <div className="flex-1 text-center lg:text-left">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                            >
                                <span className="inline-block px-4 py-1.5 mb-6 text-xs font-black tracking-widest text-violet-600 uppercase bg-violet-50 rounded-full border border-violet-100">
                                    ✦ Stop Losing Leads to Manual Processes
                                </span>
                                <h1 className="text-5xl lg:text-7xl font-[1000] leading-[1.1] text-slate-900 mb-8 tracking-tight">
                                    Transform Your Agency into an <span className="gradient-text">AI-Powered</span> Powerhouse
                                </h1>
                                <p className="text-xl text-slate-900 mb-10 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                                    Are you tired of slow bookings and manual invoicing? TourSaaS automates your entire workflow—saving you 15+ hours a week while boosting conversions by 40%.
                                </p>

                                <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                                    <Button
                                        size="lg"
                                        className="gradient-btn h-16 px-10 text-lg text-white font-black rounded-full group"
                                        onClick={() => router.push('/register/agent')}
                                    >
                                        Start Your 14-Day Free Trial
                                        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        className="h-16 px-10 text-lg border-2 border-violet-200 font-bold rounded-full hover:bg-violet-50 transition-all text-slate-900"
                                    >
                                        Watch Demo
                                    </Button>
                                </div>

                                <div className="mt-8 flex items-center justify-center lg:justify-start gap-2 text-sm font-bold text-slate-900 uppercase tracking-widest">
                                    <Check className="h-4 w-4 text-violet-500" /> No Credit Card Required
                                    <span className="mx-2">•</span>
                                    <Check className="h-4 w-4 text-violet-500" /> Cancel Anytime
                                </div>
                            </motion.div>
                        </div>

                        <div className="flex-1 relative">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.8, delay: 0.2 }}
                                className="relative"
                            >
                                <div className="glass-card tilt-card rounded-[40px] overflow-hidden border-8 border-white/80">
                                    <Image
                                        src="/images/saas-hero.png"
                                        alt="TourSaaS Dashboard"
                                        width={800}
                                        height={600}
                                        className="w-full h-auto"
                                    />
                                </div>

                                {/* Floating Badges */}
                                <div className="glass-card tilt-card p-4 rounded-2xl absolute -top-6 -right-6 animate-bounce-slow">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg" style={{ background: 'rgba(124,58,237,0.1)' }}><TrendingUp className="h-5 w-5 text-violet-600" /></div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Conversions</p>
                                            <p className="text-lg font-black gradient-text">+40%</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 1: Pain Points Banner */}
            <section className="glass-card-dark text-white py-20 relative overflow-hidden">
                <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%,-50%)',
                    width: '600px', height: '400px',
                    background: 'radial-gradient(ellipse,rgba(124,58,237,0.15) 0%,transparent 70%)',
                    pointerEvents: 'none'
                }} />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <h2 className="text-3xl md:text-4xl font-[1000] mb-12 tracking-tight">Still Managing Tours Manually?</h2>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { title: "Lost Leads", desc: "Slow response times mean customers book elsewhere before you even send a quote.", icon: XCircle, color: "text-red-400", bg: "rgba(239,68,68,0.12)" },
                            { title: "Manual Invoicing", desc: "Spending hours on Excel and manual emails instead of growing your business.", icon: FileText, color: "text-blue-400", bg: "rgba(167,139,250,0.12)" },
                            { title: "Slow Bookings", desc: "Paperwork and phone calls shouldn't take days. We make it happen in seconds.", icon: Clock, color: "text-yellow-400", bg: "rgba(245,158,11,0.12)" }
                        ].map((pain, i) => (
                            <div key={i} className="glass-card tilt-card p-8 rounded-[32px] group transition-all text-left">
                                <div className="p-3 rounded-2xl mb-6 inline-block" style={{ background: pain.bg }}>
                                    <pain.icon className={`h-12 w-12 ${pain.color}`} />
                                </div>
                                <h3 className="text-xl font-bold mb-3 text-white">{pain.title}</h3>
                                <p className="text-slate-900 text-sm leading-relaxed">{pain.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Core Modules Grid */}
            <section id="modules" className="py-24 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-20">
                    <span className="inline-block px-4 py-1.5 mb-6 text-xs font-black tracking-widest text-violet-600 uppercase bg-violet-50 rounded-full border border-violet-100">
                        Powerful Core Modules
                    </span>
                    <h2 className="text-4xl md:text-6xl font-[1000] text-slate-900 mb-8 tracking-tight">
                        The All-in-One <span className="gradient-text">Powerhouse</span>
                    </h2>
                    <p className="text-xl text-slate-900 max-w-3xl mx-auto leading-relaxed">
                        Every tool you need to run a high-growth travel agency, fully integrated into a single, seamless platform.
                    </p>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {modules.map((module, i) => (
                            <div key={i} className="glass-card tilt-card p-8 rounded-[32px] group hover:scale-[1.02] transition-all duration-300">
                                <div className={`p-4 rounded-2xl mb-6 inline-block bg-white shadow-sm group-hover:bg-gradient-to-br from-violet-600 to-pink-500 transition-colors`}>
                                    <module.icon className={`h-8 w-8 text-violet-600 group-hover:text-white transition-colors`} />
                                </div>
                                <h3 className="text-xl font-bold mb-4 text-slate-900">{module.title}</h3>
                                <p className="text-slate-900 text-sm leading-relaxed mb-6">
                                    {module.description}
                                </p>
                                <div className="flex items-center gap-2 text-xs font-black text-violet-600 uppercase tracking-widest group-hover:gap-4 transition-all">
                                    Learn More <ArrowRight className="h-4 w-4" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Section 2: White-Labelling */}
            <section className="pt-24 pb-12 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row items-center gap-20">
                        <div className="flex-1 order-2 lg:order-1">
                            <div className="glass-card tilt-card rounded-[32px] overflow-hidden">
                                <div className="glass-inner rounded-t-[32px] p-4 flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-400" /><div className="w-3 h-3 rounded-full bg-yellow-400" /><div className="w-3 h-3 rounded-full bg-green-400" />
                                    <div className="ml-4 glass-inner rounded-lg px-4 py-1 text-[10px] text-slate-900 font-bold">your-brand-settings.toursaas.com</div>
                                </div>
                                <div className="p-10">
                                    <h4 className="text-lg font-black mb-6">Visual Identity Settings</h4>
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between p-4 glass-inner rounded-2xl">
                                            <span className="text-sm font-bold">Brand Logo</span>
                                            <div className="p-2 rounded-xl" style={{ background: 'linear-gradient(135deg,#7C3AED,#EC4899)' }}><Globe className="h-5 w-5 text-white" /></div>
                                        </div>
                                        <div className="flex items-center justify-between p-4 glass-inner rounded-2xl">
                                            <span className="text-sm font-bold">Primary Theme Color</span>
                                            <div className="flex gap-2">
                                                <div className="w-6 h-6 rounded-full bg-blue-600 border-2 border-white shadow-sm" style={{ boxShadow: '0 0 8px rgba(124,58,237,0.6)' }} />
                                                <div className="w-6 h-6 rounded-full bg-emerald-600" style={{ boxShadow: '0 0 8px rgba(16,185,129,0.6)' }} />
                                                <div className="w-6 h-6 rounded-full bg-indigo-600" style={{ boxShadow: '0 0 8px rgba(99,102,241,0.6)' }} />
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between p-4 glass-inner rounded-2xl">
                                            <span className="text-sm font-bold">Custom Favicon</span>
                                            <div className="w-8 h-8 rounded-full border-2 border-dashed border-slate-900 flex items-center justify-center"><Plus className="h-4 w-4 text-slate-900" /></div>
                                        </div>
                                    </div>
                                    <div className="mt-8 pt-8 border-t border-slate-100 text-center">
                                        <Button className="gradient-btn w-full font-bold rounded-2xl text-white border-0">Save & Publish to Domain</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 order-1 lg:order-2">
                            <Badge className="bg-violet-50 text-violet-600 border-violet-100 font-black mb-6">100% WHITE-LABEL</Badge>
                            <h2 className="text-4xl lg:text-5xl font-[1000] text-slate-900 mb-8 tracking-tight">Your Brand. Your Platform. <span className="gradient-text">Our Tech.</span></h2>
                            <p className="text-lg text-slate-900 mb-10 leading-relaxed">
                                Put your agency front and center. Customize logos, colors, favicons, and even your custom domain. Your customers will only see your brand, while we handle the complex backend.
                            </p>
                            <ul className="space-y-4 mb-10">
                                {["Custom Domain Support (travel.youragency.com)", "Branded PDF Quotations", "Agency-Specific Navbar & Footer"].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 font-bold text-slate-700">
                                        <CheckCircle2 className="h-5 w-5 text-violet-500" /> {item}
                                    </li>
                                ))}
                            </ul>
                            <Button className="gradient-btn h-14 px-8 text-white font-black rounded-full" onClick={() => router.push('/register/agent')}>Build Your Brand Now</Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 3: Package Builder */}
            <section className="py-12 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-8">
                        <h2 className="text-4xl md:text-5xl font-[1000] text-slate-900 tracking-tight">World-Class <span className="gradient-text">Itinerary Builder</span></h2>
                        <p className="mt-6 text-lg text-slate-900 max-w-2xl mx-auto">Create stunning day-wise itineraries for domestic and international trips in minutes, not hours.</p>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-12 items-start">
                        <div className="w-full lg:w-1/3 space-y-6">
                            {[
                                { title: "Multi-Destination Support", desc: "Easily chain multiple cities and countries in a single trip.", icon: Globe },
                                { title: "Inclusions/Exclusions Config", desc: "One-click templates for flights, hotels, and sightseeing.", icon: Settings },
                                { title: "Instant GST/Tax Calculation", desc: "Automated pricing including all taxes", icon: Wallet }
                            ].map((feature, i) => (
                                <Card key={i} className="glass-card tilt-card border-0 rounded-[24px] p-6 group">
                                    <div className="flex gap-4">
                                        <div className="bg-violet-50 p-3 rounded-xl group-hover:bg-gradient-to-br from-violet-600 to-pink-500 transition-colors">
                                            <feature.icon className="h-6 w-6 text-violet-600 group-hover:text-white" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 mb-1">{feature.title}</h4>
                                            <p className="text-xs text-slate-900 leading-relaxed">{feature.desc}</p>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        <div className="w-full lg:w-2/3 glass-card tilt-card rounded-[40px] p-8">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="gradient-btn rounded-2xl w-12 h-12 flex items-center justify-center text-white font-black">7D</div>
                                    <div>
                                        <h4 className="font-black text-slate-900">Bali Wellness Retreat</h4>
                                        <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">7 Days • 6 Nights • Ubud & Seminyak</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Badge className="bg-violet-50 text-violet-600 border-violet-100 font-bold uppercase text-[9px]">International</Badge>
                                    <Badge className="bg-pink-50 text-pink-600 border-pink-100 font-bold uppercase text-[9px]">Available</Badge>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {[1, 2, 3].map((day) => (
                                    <div key={day} className="relative pl-12 border-l-2 border-slate-100 pb-6 last:pb-0">
                                        <div className="absolute left-[-11px] top-0 w-5 h-5 rounded-full border-4 border-white shadow-sm"
                                            style={{
                                                background: 'linear-gradient(135deg,#7C3AED,#EC4899)',
                                                boxShadow: '0 0 8px rgba(124,58,237,0.5)'
                                            }} />
                                        <h5 className="font-black text-slate-900 mb-2">Day {day}: {day === 1 ? 'Arrival & Ubud Transfer' : day === 2 ? 'Kintamani Volcano Tour' : 'Ubud Rice Terrace Trek'}</h5>
                                        <div className="glass-inner rounded-2xl p-4 flex gap-4 items-center">
                                            <div className="w-12 h-12 bg-slate-200 rounded-xl overflow-hidden">
                                                <Image
                                                    src={
                                                        day === 1 ? "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=100&h=100&fit=crop" :
                                                            day === 2 ? "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=100&h=100&fit=crop" :
                                                                "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=100&h=100&fit=crop"
                                                    }
                                                    alt="Activity"
                                                    width={48}
                                                    height={48}
                                                    className="object-cover"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs font-bold text-slate-700">Luxury Garden Villa Stay</p>
                                                <div className="flex gap-2 mt-1">
                                                    <span className="text-[9px] font-black bg-violet-100 text-violet-600 px-1.5 rounded uppercase">Breakfast</span>
                                                    <span className="text-[9px] font-black bg-emerald-100 text-emerald-600 px-1.5 rounded uppercase">Free Wi-Fi</span>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="icon" className="text-slate-900"><Settings className="h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 4: AI Features Section */}
            <section className="pt-4 pb-12 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-20">
                        <h2 className="text-sm font-black tracking-[0.3em] gradient-text uppercase mb-4">The Power of Intelligence</h2>
                        <h3 className="text-4xl md:text-5xl font-[1000] text-slate-900 tracking-tight">AI Built for <span className="gradient-text">Travel Conversions</span></h3>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-12">
                        {/* AI Search Card */}
                        <div className="glass-card tilt-card rounded-[48px] p-10 relative group overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Search className="w-32 h-32 text-violet-600" />
                            </div>
                            <h4 className="text-2xl font-black text-slate-900 mb-4">Semantic AI Search</h4>
                            <p className="text-slate-900 mb-10 text-sm leading-relaxed">Let your customers find their dream trip using natural language. No more complex filters.</p>

                            <div className="glass-inner rounded-3xl p-6 shadow-xl">
                                <div className="glass-card flex items-center gap-3 mb-6 p-4 rounded-2xl">
                                    <Sparkles className="h-5 w-5 text-violet-600" />
                                    <span className="text-sm font-bold text-slate-900 italic">"Find me a family trip to Bali under 1 lakh for June"</span>
                                    <Send className="h-4 w-4 text-violet-500 ml-auto" />
                                </div>
                                <div className="space-y-4">
                                    {[
                                        { title: "Bali Family Bliss", price: "₹89,500", rating: 4.8 },
                                        { title: "Ubud Nature Escape", price: "₹72,000", rating: 4.9 }
                                    ].map((res, i) => (
                                        <div key={i} className="flex justify-between items-center p-3 border border-slate-100 rounded-xl hover:bg-violet-50 transition-colors cursor-pointer">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-slate-100 rounded-lg" />
                                                <div>
                                                    <p className="text-xs font-black text-slate-900">{res.title}</p>
                                                    <p className="text-[10px] text-yellow-500 flex items-center">{"★".repeat(5)} <span className="text-slate-900 ml-1">({res.rating})</span></p>
                                                </div>
                                            </div>
                                            <p className="gradient-text font-black text-xs">{res.price}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* AI Chatbot Card */}
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(124,58,237,0.85), rgba(236,72,153,0.75))',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255,255,255,0.2)'
                        }} className="tilt-card rounded-[48px] p-10 relative overflow-hidden text-white">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <MessageSquare className="w-32 h-32" />
                            </div>
                            <h4 className="text-2xl font-black mb-4">24/7 AI Concierge</h4>
                            <p className="text-blue-100 mb-10 text-sm leading-relaxed">Automatically handle enquiries, suggest packages, and answer FAQs even while you sleep.</p>

                            <div className="bg-white rounded-3xl overflow-hidden shadow-2xl relative z-10 max-w-sm mx-auto">
                                <div style={{ background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(10px)' }} className="p-4 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-black text-xs text-white">AI</div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-200">TourSaaS Assistant</p>
                                        <p className="text-xs font-bold text-white">Online & Ready to Help</p>
                                    </div>
                                </div>
                                <div className="p-6 h-48 flex flex-col gap-4">
                                    <div className="bg-slate-100 p-3 rounded-2xl rounded-tl-none text-xs text-slate-900 font-medium max-w-[80%]">
                                        Hello! I'm looking for a honeymoon trip to Maldives. Any suggestions?
                                    </div>
                                    <div style={{ background: 'rgba(124,58,237,0.8)', backdropFilter: 'blur(8px)' }} className="p-3 rounded-2xl rounded-tr-none text-xs text-white font-medium max-w-[80%] self-end">
                                        Congratulations! 🥂 For honeymoons, our 'Maldives Overwater Bliss' is the most popular. It includes a private candlelit dinner. Want to see details?
                                    </div>
                                </div>
                                <div className="p-4 border-t border-slate-100 flex gap-2">
                                    <div className="flex-1 bg-slate-50 rounded-full px-4 py-2 text-[10px] text-slate-900 font-bold">Type your message...</div>
                                    <Button size="icon" className="gradient-btn rounded-full h-8 w-8 text-white"><Send className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 5: Instant Booking + Refund Engine */}
            <section className="glass-card-dark text-white py-24 overflow-hidden relative">
                <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%,-50%)',
                    width: '800px', height: '600px',
                    background: 'radial-gradient(circle, rgba(124,58,237,0.1), rgba(236,72,153,0.1), transparent 70%)',
                    pointerEvents: 'none'
                }} />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div className="space-y-12">
                            <div>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="gradient-btn p-3 rounded-2xl"><Zap className="h-6 w-6 text-white" /></div>
                                    <h3 className="text-3xl font-black tracking-tight">Instant Booking Engine</h3>
                                </div>
                                <p className="text-slate-100 text-lg leading-relaxed mb-8">Reduce your response time from hours to seconds. Let customers book and pay instantly with automated inventory checks.</p>
                                <div className="glass-card tilt-card p-8 rounded-[32px]">
                                    <div className="flex gap-8 items-center">
                                        <div className="flex flex-col items-center">
                                            <span className="gradient-text text-4xl font-black">02s</span>
                                            <span className="text-[10px] font-black uppercase text-slate-100 mt-2">Wait Time</span>
                                        </div>
                                        <div className="h-12 w-[1px] bg-white/10" />
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-10 h-5 bg-violet-600 rounded-full relative">
                                                    <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                                                </div>
                                                <span className="text-xs font-black text-slate-200">AUTO-CONFIRMATION ON</span>
                                            </div>
                                            <p className="text-xs text-slate-100 font-bold">"Zero human intervention needed for standard packages"</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="bg-emerald-600 p-3 rounded-2xl"><Shield className="h-6 w-6 text-white" /></div>
                                    <h3 className="text-3xl font-black tracking-tight">Smart Refund Engine</h3>
                                </div>
                                <p className="text-slate-100 text-lg leading-relaxed mb-8">Set complex cancellation policies once and let the system handle refunds automatically. Zero disputes, 100% transparency.</p>
                                <div className="flex gap-6 flex-wrap">
                                    {["Full Refund < 48h", "50% Refund < 1w", "Zero Dispute Record"].map((tag, i) => (
                                        <div key={i} className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-full border border-emerald-500/20 text-xs font-black">
                                            <CheckCircle2 className="h-4 w-4" /> {tag}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="glass-card tilt-card rounded-[48px] p-8" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                <div style={{ background: 'rgba(255,255,255,0.95)' }} className="rounded-[32px] p-10 text-slate-900 shadow-2xl relative">
                                    <h4 className="text-lg font-black mb-8 border-b border-slate-100 pb-6">Payment & Policy Summary</h4>
                                    <div className="space-y-6 mb-8">
                                        <div className="flex justify-between items-center font-bold">
                                            <span className="text-slate-900">Package Total</span>
                                            <span className="text-lg">₹1,24,000.00</span>
                                        </div>
                                        <div className="h-[1px] bg-slate-100" />
                                        <div className="flex justify-between items-center font-black text-2xl">
                                            <span>Final Price</span>
                                            <span className="gradient-text">₹1,36,400.00</span>
                                        </div>
                                    </div>
                                    <div className="p-6 glass-inner rounded-2xl border border-slate-100 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Refund Status</span>
                                            <span className="px-2 py-1 bg-green-100 text-green-700 text-[9px] font-black rounded-lg">CALCULATED</span>
                                        </div>
                                        <p className="text-[11px] text-slate-900 font-bold leading-relaxed">Based on your policy (Cancel {"<"} 7 Days before travel), the customer is eligible for a <span className="text-slate-900">75% refund</span>.</p>
                                        <Button style={{ background: 'linear-gradient(135deg,#1a1a2e,#2d1b69)' }} className="w-full text-white rounded-xl h-12 font-black text-xs uppercase tracking-widest">Process Refund Now</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 6: Notifications & Dashboard */}
            <section className="pt-24 pb-12 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row items-center gap-20">
                        <div className="flex-1">
                            <Badge className="bg-violet-50 text-violet-600 border-violet-100 font-black mb-6">REAL-TIME ANALYTICS</Badge>
                            <h2 className="text-4xl lg:text-5xl font-[1000] text-slate-900 mb-8 tracking-tight">Your Agency Pulse. <span className="gradient-text">Always On.</span></h2>
                            <p className="text-lg text-slate-900 mb-10 leading-relaxed">
                                Get instant mobile notifications for new enquiries, successful bookings, and pending payments. Export full reports to Excel/CSV with a single click.
                            </p>
                            <div className="grid grid-cols-2 gap-6 mb-10">
                                {[
                                    { label: "Bookings Today", val: "12", icon: Calendar },
                                    { label: "Pending Leads", val: "45", icon: MousePointer2 },
                                    { label: "Revenue Growth", val: "22%", icon: TrendingUp },
                                    { label: "New Enquiries", val: "08", icon: MessageSquare }
                                ].map((stat, i) => (
                                    <div key={i} className="glass-card tilt-card p-6 rounded-3xl group hover:scale-105 transition-all cursor-default overflow-hidden">
                                        <div className="absolute inset-0 group-hover:opacity-100 opacity-0 transition-opacity" style={{ background: 'linear-gradient(135deg,#7C3AED,#EC4899)' }} />
                                        <stat.icon className="h-5 w-5 text-violet-600 mb-3 group-hover:text-white transition-colors relative z-10" />
                                        <p className="text-[10px] font-black text-slate-900 group-hover:text-violet-100 uppercase tracking-widest transition-colors relative z-10">{stat.label}</p>
                                        <p className="text-2xl font-black text-slate-900 group-hover:text-white transition-colors relative z-10">{stat.val}</p>
                                    </div>
                                ))}
                            </div>
                            <Button variant="outline" className="h-14 px-8 border-2 border-violet-200 font-black rounded-full hover:bg-violet-50 flex items-center gap-3 text-slate-900">
                                <Download className="h-5 w-5" /> Export All Reports to Excel
                            </Button>
                        </div>

                        <div className="flex-1 relative">
                            {/* Dashboard Mockup */}
                            <div className="glass-card-dark tilt-card rounded-[40px] p-6 shadow-2xl relative z-10">
                                <div className="bg-white/10 p-4 border-b border-white/5 flex justify-between items-center mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-violet-600" />
                                        <span className="text-xs font-bold text-white">Dashboard Overview</span>
                                    </div>
                                    <Smartphone className="h-4 w-4 text-white/40" />
                                </div>
                                <div className="space-y-4">
                                    <div className="h-32 bg-white/5 rounded-2xl flex items-end p-4 gap-2">
                                        {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                                            <div key={i} style={{ height: `${h}%`, background: 'linear-gradient(to top,#7C3AED,#EC4899)' }} className="flex-1 rounded-t-lg opacity-60 hover:opacity-100 transition-opacity" />
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-white/5 rounded-2xl space-y-2">
                                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Active Users</p>
                                            <p className="text-xl font-bold text-white">2.4k</p>
                                        </div>
                                        <div className="p-4 bg-white/5 rounded-2xl space-y-2">
                                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Global Reach</p>
                                            <p className="text-xl font-bold text-white">14 Countries</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Notification Toast */}
                            <motion.div
                                animate={{ x: [-10, 0, -10], y: [0, -10, 0] }}
                                transition={{ duration: 6, repeat: Infinity }}
                                className="glass-card tilt-card p-5 rounded-3xl z-20 absolute -top-12 -left-12 max-w-[200px]"
                            >
                                <div className="flex gap-3 items-center mb-2">
                                    <div className="gradient-btn p-1.5 rounded-lg"><Sparkles className="h-4 w-4 text-white" /></div>
                                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Just Now</span>
                                </div>
                                <p className="text-[11px] font-bold text-slate-900 leading-relaxed">New Enquiry: "Luxury 5D/4N Package for 2 Adults" from John Doe.</p>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </section>
            {/* Why Choose TourSaaS */}
            <section id="why-choose" className="py-12 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-10">
                        <h2 className="text-4xl md:text-5xl font-[1000] text-slate-900 tracking-tight">
                            Why the World's Best Agencies <span className="gradient-text">Choose TourSaaS</span>
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                            { title: "100% Secure Payments", desc: "Enterprise-grade encryption for every transaction.", icon: Shield },
                            { title: "AI-Driven Insights", desc: "Predictive analytics to help you grow faster.", icon: Sparkles },
                            { title: "Cloud Scalability", desc: "Grows with your business, from 1 to 1000 agents.", icon: Globe },
                            { title: "Real-time Support", desc: "Expert help whenever you need it, 24/7.", icon: HelpCircle }
                        ].map((item, i) => (
                            <div key={i} className="glass-card tilt-card p-8 rounded-[32px] text-center group">
                                <div className="p-4 rounded-2xl mb-6 inline-block bg-violet-50 group-hover:scale-110 transition-transform">
                                    <item.icon className="h-10 w-10 text-violet-600" />
                                </div>
                                <h4 className="text-lg font-bold mb-3 text-slate-900">{item.title}</h4>
                                <p className="text-slate-900 text-sm leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Section 7: Feature Comparison Table */}
            <section className="pt-4 pb-12 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-[1000] text-slate-900 tracking-tight">The <span className="gradient-text">Ultimate</span> Edge</h2>
                </div>

                <div className="max-w-4xl mx-auto glass-card overflow-hidden rounded-[32px] shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.08),rgba(236,72,153,0.05))' }} className="hover:bg-transparent">
                                <TableHead className="font-black text-slate-900 py-6 px-8">Features</TableHead>
                                <TableHead className="font-black gradient-text text-center py-6 px-8">TourSaaS</TableHead>
                                <TableHead className="font-black text-slate-900 text-center py-6 px-8">Manual Process</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[
                                { f: "Booking Speed", s: "Seconds", m: "Hours/Days" },
                                { f: "AI Search", s: "Instant", m: "None" },
                                { f: "White-Label", s: "Full", m: "None" },
                                { f: "Auto Refund", s: "Smart Engine", m: "Manual Excel" },
                                { f: "Global Reach", s: "Multi-Currency", m: "Single-Region" },
                                { f: "Support", s: "24/7 AI + Priority", m: "Business Hours" }
                            ].map((row, i) => (
                                <TableRow key={i}>
                                    <TableCell className="font-bold text-slate-900 py-6 px-8">{row.f}</TableCell>
                                    <TableCell className="text-center py-6 px-8"><CheckCircle2 className="h-6 w-6 text-violet-600 mx-auto" style={{ filter: 'drop-shadow(0 0 4px rgba(124,58,237,0.4))' }} /></TableCell>
                                    <TableCell className="text-center py-6 px-8 text-slate-900 font-medium italic">{row.m}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </section>


            {/* Section 8: FAQ Section */}
            <section id="faq" className="pt-8 pb-24 relative">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <Badge className="bg-violet-50 text-violet-600 border-violet-100 font-black mb-6">FAQ</Badge>
                        <h2 className="text-4xl md:text-5xl font-[1000] text-slate-900 tracking-tight">Everything You Need to <span className="gradient-text">Know</span></h2>
                    </div>

                    <Accordion type="single" collapsible className="w-full space-y-4">
                        {faqs.map((faq, i) => (
                            <AccordionItem key={i} value={`item-${i}`} className="glass-card tilt-card rounded-[24px] px-8 py-2 overflow-hidden shadow-sm"
                                style={{ borderLeft: '3px solid transparent' }} // Base border
                            >
                                <AccordionTrigger className="text-lg font-black text-slate-900 hover:no-underline text-left hover:text-violet-700 transition-colors">{faq.q}</AccordionTrigger>
                                <AccordionContent className="text-slate-900 leading-relaxed font-medium pb-6">{faq.a}</AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>
            </section>

            {/* Final CTA & Footer */}
            <section className="py-24 relative overflow-hidden"
                style={{
                    background: 'linear-gradient(135deg, rgba(124,58,237,0.9), rgba(236,72,153,0.85))',
                    backdropFilter: 'blur(20px)'
                }}>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white opacity-10 rounded-full blur-[120px] pointer-events-none" style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)' }} />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <h2 className="text-4xl md:text-6xl font-[1000] text-white mb-8 tracking-tight">Ready to Elevate Your Agency?</h2>
                    <p className="text-xl text-blue-50 mb-12 font-medium opacity-90 max-w-2xl mx-auto">
                        Start your 14-day free trial today.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <Button
                            className="bg-white font-black rounded-full h-16 px-12 text-lg transition-all hover:scale-105"
                            style={{ color: '#7C3AED', boxShadow: '0 8px 30px rgba(255,255,255,0.3)' }}
                            onClick={() => router.push('/register/agent')}
                        >
                            Start Free Trial
                        </Button>
                        <Button variant="outline" className="h-16 px-12 text-lg border-2 border-white/30 text-white font-black rounded-full hover:bg-white/10 transition-all">
                            Watch Video Demo
                        </Button>
                    </div>
                </div>
            </section>


        </div>
    )
}

export default LandingPage
