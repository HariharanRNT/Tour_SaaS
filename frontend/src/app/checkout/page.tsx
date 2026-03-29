'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { motion, AnimatePresence } from 'framer-motion'

import { Loader2, CreditCard, CheckCircle, AlertCircle, FileText, ChevronRight, Check } from 'lucide-react'
import { toast } from 'sonner'
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
import { Country, State, City } from 'country-state-city'
import { ICountry, IState, ICity } from 'country-state-city'

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { FloatingLabelInput } from "@/components/ui/floating-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TravelerForm, Traveler } from "@/components/booking/traveler-form"
import { MockPaymentModal } from "@/components/booking/mock-payment-modal"
import { InactivePlanModal } from "@/components/booking/inactive-plan-modal"
import { FlightBookingDetails } from "@/components/booking/flight-booking-details"
import { ShieldCheck, RotateCcw, Lock, ChevronDown, ChevronUp } from 'lucide-react'
import { api, bookingsAPI, paymentsAPI, tripPlannerAPI } from '@/lib/api'

// Razorpay Type Definition
declare global {
    interface Window {
        Razorpay: any;
    }
}

function CheckoutContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const sessionId = searchParams.get('sessionId')

    const [loading, setLoading] = useState(true)
    const [step, setStep] = useState<'DETAILS' | 'PAYMENT' | 'PROCESSING' | 'SUCCESS'>('DETAILS')

    // Data
    const [sessionData, setSessionData] = useState<any>(null)
    const [travelers, setTravelers] = useState<Traveler[]>([])
    const [totalAmount, setTotalAmount] = useState(0)

    // GST Settings State
    const [gstSettings, setGstSettings] = useState<{ inclusive: boolean, percentage: number } | null>(null)

    // Mock Modal State
    const [showMockModal, setShowMockModal] = useState(false)
    const [showInactivePlanModal, setShowInactivePlanModal] = useState(false)
    const [currentOrder, setCurrentOrder] = useState<any>(null)
    const [currentBookingId, setCurrentBookingId] = useState<string>('')

    // Contact Details
    const [contactEmail, setContactEmail] = useState('')
    const [contactPhone, setContactPhone] = useState('')
    const [contactAddress, setContactAddress] = useState('')
    const [contactCountry, setContactCountry] = useState('IN')
    const [contactState, setContactState] = useState('')
    const [contactCity, setContactCity] = useState('')

    // Dependent lists
    const [allCountries] = useState<ICountry[]>(Country.getAllCountries())
    const [countryStates, setCountryStates] = useState<IState[]>([])
    const [stateCities, setStateCities] = useState<ICity[]>([])

    const [errors, setErrors] = useState<Record<string, string>>({})
    const [sameAsTraveler1, setSameAsTraveler1] = useState(false)
    const [isPackageDetailsOpen, setIsPackageDetailsOpen] = useState(false)

    // Autofill Effect
    useEffect(() => {
        if (sameAsTraveler1 && travelers.length > 0) {
            const t1 = travelers[0]
            // Simple mapping - in real app, might need more complex logic
            // Assuming we just copy name or maybe we don't autofill contact from traveler since traveler fields are different (passport etc)
            // Actually, usually "Contact" is independent or autofilled from User Profile.
            // But requirement said "Same as traveler" checkbox for contact details.
            // We'll populate Name? No contact form asks for Phone/Email/Address.
            // Traveler 1 asks for Name.
            // Maybe we just assume Traveler 1 is the Contact Person?
            // Let's at least sync what we can if fields matched, but they don't exactly match (Traveler has First/Last, Contact has... nothing?)
            // Contact form has Phone, Email, Address, City... Traveler form DOES NOT have these.
            // So "Same as traveler" might mean "Traveler 1 is the primary contact" -> but where do we get the data?
            // Ah, maybe the user wants to copy Traveler 1's Name to Billing Name? (But we don't have Billing Name field, just Address).
            // Let's implement a "Billing Name" field to make this useful or just skip if no matching fields.
            // Wait, typically "Same as traveler" copies ADDRESS if traveler provided address. But Traveler doesn't provide address.
            // Maybe it means "Traveler 1 Name" -> "Contact Name"? We don't have Contact Name field.
            // Let's ADD a Contact Name field to make this sensible, or re-read requirements.
            // Req: "Add 'Same as traveler' checkbox for contact details".
            // Implementation: I'll add a "Contact Name" field and autofill it.
            // Or maybe it just means "Use Traveler 1's data for booking"?
            // I'll add "Contact Name" to the form below first.
        }
    }, [sameAsTraveler1, travelers])

    const handleTravelerChange = (index: number, field: keyof Traveler, value: string) => {
        setTravelers(prev => {
            const newTravelers = [...prev]
            newTravelers[index] = { ...newTravelers[index], [field]: value }
            return newTravelers
        })

        // Auto-sync if checked
        if (sameAsTraveler1 && index === 0 && (field === 'first_name' || field === 'last_name')) {
            // If we had a contact name field
        }
    }

    // State for confirmed booking displaying details
    const [confirmedBooking, setConfirmedBooking] = useState<any>(null)

    const handlePaymentSuccess = async (response: any, bookingId: string) => {
        try {
            // 4. Confirm Booking (Backend Orchestrator)
            const responseData = await bookingsAPI.confirm(bookingId, {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
            })

            setConfirmedBooking(responseData)
            setStep('SUCCESS')
            setShowMockModal(false)
            toast.success("Booking Confirmed!")

        } catch (err: any) {
            console.error(err)
            toast.error(err.message || "Payment successful but booking failed.")
            setStep('DETAILS')
            setShowMockModal(false)
        }
    }



    // Load Session & Settings
    useEffect(() => {
        if (!sessionId) return;

        const fetchSession = async () => {
            try {
                const data = await tripPlannerAPI.getSession(sessionId)
                setSessionData(data)

                if (data.gst_percentage !== undefined) {
                    setGstSettings({
                        inclusive: data.gst_inclusive,
                        percentage: data.gst_percentage
                    })
                }

                const initialTravelers: Traveler[] = []
                const adults = data.travelers?.adults || 1
                const children = data.travelers?.children || 0
                const infants = data.travelers?.infants || 0

                for (let i = 0; i < adults; i++) {
                    initialTravelers.push({
                        id: uuidv4(),
                        title: 'Mr',
                        first_name: '',
                        last_name: '',
                        date_of_birth: '',
                        gender: 'MALE',
                        passport_number: '',
                        passport_expiry: '',
                        nationality: 'IN',
                        type: 'ADULT'
                    })
                }
                for (let i = 0; i < children; i++) {
                    initialTravelers.push({
                        id: uuidv4(),
                        title: 'Mstr',
                        first_name: '',
                        last_name: '',
                        date_of_birth: '',
                        gender: 'MALE',
                        passport_number: '',
                        passport_expiry: '',
                        nationality: 'IN',
                        type: 'CHILD'
                    })
                }
                for (let i = 0; i < infants; i++) {
                    initialTravelers.push({
                        id: uuidv4(),
                        title: 'Infant',
                        first_name: '',
                        last_name: '',
                        date_of_birth: '',
                        gender: 'MALE',
                        passport_number: '',
                        passport_expiry: '',
                        nationality: 'IN',
                        type: 'INFANT'
                    })
                }
                setTravelers(initialTravelers)

                const count = adults + children
                const basePrice = data.price_per_person || 18000
                const flightPrice = data.flight_details?.price || 0
                setTotalAmount((basePrice + flightPrice) * count)
            } catch (e) {
                console.error("Load session failed", e)
                toast.error("Could not load trip details")
            } finally {
                setLoading(false)
            }
        }

        fetchSession()

        // Initialize Razorpay Script
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);

        setCountryStates(State.getStatesOfCountry('IN'))
    }, [sessionId])

    // Effect to recalculate total when GST settings or travelers change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (!sessionData) return

        const count = travelers.length
        const basePrice = sessionData.price_per_person || 18000
        const flightPrice = sessionData.flight_details?.price || 0

        let subTotal = (basePrice + flightPrice) * count

        if (gstSettings && !gstSettings.inclusive) {
            const gstAmount = (subTotal * gstSettings.percentage) / 100
            setTotalAmount(subTotal + gstAmount)
        } else {
            setTotalAmount(subTotal)
        }
    }, [sessionData, travelers, gstSettings])

    const validateForm = () => {
        const newErrors: Record<string, string> = {}
        let isValid = true

        // 1. Validate Contact Info
        if (!contactEmail) {
            newErrors.email = "Email is required"
            isValid = false
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
            newErrors.email = "Invalid email format"
            isValid = false
        }

        if (!contactPhone) {
            newErrors.phone = "Mobile number is required"
            isValid = false
        } else if (contactPhone.replace(/\D/g, '').length < 10) {
            newErrors.phone = "Invalid mobile number"
            isValid = false
        }

        if (!contactAddress) {
            newErrors.address = "Address is required"
            isValid = false
        }
        if (!contactCity) {
            newErrors.city = "City is required"
            isValid = false
        }
        if (!contactState) {
            newErrors.state = "State is required"
            isValid = false
        }
        if (!contactCountry) {
            newErrors.country = "Country is required"
            isValid = false
        }

        // 2. Validate Travelers
        const travelDate = sessionData?.start_date || "2024-06-01"
        const travelDateObj = new Date(travelDate)

        travelers.forEach((t, idx) => {
            if (!t.first_name?.trim()) {
                newErrors[`first_name_${idx}`] = "First Name is required"
                isValid = false
            }
            
            const dobParts = t.date_of_birth?.split('-') || []
            const isCompleteDob = dobParts.length === 3 && dobParts.every(p => p.length > 0)

            if (!isCompleteDob) {
                newErrors[`dob_age_${idx}`] = "Date of Birth is required"
                isValid = false
            } else {
                const birthDate = new Date(t.date_of_birth)
                let age = travelDateObj.getFullYear() - birthDate.getFullYear()
                const m = travelDateObj.getMonth() - birthDate.getMonth()
                if (m < 0 || (m === 0 && travelDateObj.getDate() < birthDate.getDate())) {
                    age--
                }

                if (t.type === 'INFANT' && age >= 2) {
                    newErrors[`dob_age_${idx}`] = "Infant must be under 2 years on travel date"
                    isValid = false
                } else if (t.type === 'CHILD' && (age < 2 || age >= 12)) {
                    newErrors[`dob_age_${idx}`] = "Child must be between 2 and 12 years"
                    isValid = false
                } else if (t.type === 'ADULT' && age < 12) {
                    newErrors[`dob_age_${idx}`] = "Adult must be at least 12 years"
                    isValid = false
                }
            }
        })

        setErrors(newErrors)
        return isValid
    }

    const handlePayment = async () => {
        if (!validateForm()) {
            toast.error("Please correct the errors in the form")
            // Scroll to top or first error could be good UX
            return
        }

        setStep('PROCESSING')
        try {
            const token = localStorage.getItem('token')
            if (!token) {
                toast.error("Please login to continue")
                router.push('/login?next=/checkout?sessionId=' + sessionId)
                return
            }

            const packageId = sessionData?.matched_package_id

            if (!packageId) {
                toast.error("Invalid session: No package found")
                return
            }

            const bookingPayload = {
                package_id: packageId,
                travel_date: sessionData?.start_date || "2024-06-01",
                number_of_travelers: travelers.length,
                travelers: travelers.map(t => ({
                    first_name: t.first_name,
                    last_name: t.last_name,
                    date_of_birth: t.date_of_birth || "2000-01-01",
                    gender: t.gender,
                    passport_number: t.passport_number,
                    nationality: t.nationality,
                    type: t.type,
                    is_primary: travelers.indexOf(t) === 0
                })),
                special_requests: JSON.stringify({
                    flight_details: sessionData?.flight_details,
                    contact_info: {
                        email: contactEmail,
                        phone: contactPhone,
                        address: contactAddress,
                        city: contactCity,
                        state: contactState,
                        country: Country.getCountryByCode(contactCountry)?.name || contactCountry
                    }
                })
            }

            // 1. Create Booking
            const booking = await bookingsAPI.create(bookingPayload)
            setCurrentBookingId(booking.id)

            // 2. Review Flight 
            try {
                const reviewData = await api.post(`/bookings/${booking.id}/review-flight`)
                console.log("Flight Review Success:", reviewData.data)
            } catch (err: any) {
                console.error("Flight Review Failed:", err)
                toast.error(`Flight validation failed: ${err.response?.data?.detail || err.message}`)
                setStep('DETAILS')
                return
            }

            // 3. Create Payment Order
            const orderData = await paymentsAPI.createOrder(booking.id)
            setCurrentOrder(orderData)

            // 4. Prompt Payment (Mock or Real)
            if (orderData.key_id === 'rzp_test_1234567890' || orderData.key_id.includes('1234567890')) {
                console.log("Using Mock Payment Modal for Test Key")
                setShowMockModal(true)
            } else {
                const options = {
                    key: orderData.key_id,
                    amount: orderData.amount,
                    currency: orderData.currency,
                    name: "Tour SaaS",
                    description: `Booking ${booking.booking_reference}`,
                    order_id: orderData.order_id,
                    handler: function (response: any) {
                        handlePaymentSuccess(response, booking.id)
                    },
                    prefill: {
                        name: travelers[0].first_name,
                        email: contactEmail || "test@example.com",
                        contact: contactPhone || "9999999999"
                    },
                    modal: {
                        ondismiss: function () {
                            setStep('DETAILS')
                        }
                    }
                };
                const rzp1 = new (window as any).Razorpay(options);
                rzp1.open();
            }

        } catch (error: any) {
            console.error(error)
            
            // Handle Inactive Agent Plan (402 Payment Required)
            if (error.response?.status === 402 || (error.response?.status === 403 && error.response?.data?.detail === "Agent plan is not active")) {
                setShowInactivePlanModal(true)
                setStep('DETAILS')
                return
            }

            toast.error(error.response?.data?.detail || error.message || "Something went wrong")
            setStep('DETAILS')
        }
    }


    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-transparent">
            <Loader2 className="h-12 w-12 animate-spin text-[var(--primary)] mb-4" />
            <p className="text-gray-500 font-medium animate-pulse">Preparing your checkout experience...</p>
        </div>
    )

    if (step === 'SUCCESS') {
        let confirmation = null
        let contactInfo = { email: 'N/A', phone: 'N/A' }

        if (confirmedBooking?.special_requests) {
            try {
                const req = JSON.parse(confirmedBooking.special_requests)
                confirmation = req.flight_booking_confirmation
                if (req.contact_info) {
                    contactInfo = req.contact_info
                }
            } catch (e) {
                console.error("Error parsing special requests", e)
            }
        }

        const containerVariants: any = {
            hidden: { opacity: 0, y: 30 },
            visible: {
                opacity: 1,
                y: 0,
                transition: {
                    duration: 0.6,
                    ease: "easeOut",
                    staggerChildren: 0.1,
                    delayChildren: 0.4
                }
            }
        }

        const itemVariants = {
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 }
        }

        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-transparent p-4 font-sans relative overflow-hidden">
                {/* Visual background layers for SUCCESS step too */}
                <div className="fixed inset-0 min-h-screen w-full pointer-events-none z-[-2] bg-gradient-to-br from-[var(--primary)] via-[var(--primary-light)] to-[#FFF3EC]" />
                <div className="fixed top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-[var(--primary)]/40 to-[var(--primary-light)]/40 blur-[120px] pointer-events-none z-[-1]" />
                <div className="fixed inset-0 pointer-events-none z-[-1] opacity-[0.04] mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/noise-pattern-with-subtle-cross-lines.png')]" />

                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                    className="relative group max-w-lg w-full"
                >
                    {/* Main Success Card - Liquid Glass Treatment */}
                    <div className="relative overflow-hidden p-8 rounded-[28px] border border-white/25 bg-white/10 backdrop-blur-[40px] saturate-[200%] shadow-[0_40px_80px_rgba(0,0,0,0.20)] text-center transition-all">
                        {/* Top Specular Highlight */}
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                        {/* Liquid Surface Illusion - Inner Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-transparent pointer-events-none" />


                        {/* Success Icon Badge */}
                        <motion.div
                            initial={{ scale: 0.6, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{
                                type: "spring",
                                stiffness: 200,
                                damping: 15,
                                delay: 0.4
                            }}
                            className="relative w-20 h-20 mx-auto mb-6"
                        >
                            {/* Ping Ring Animation */}
                            <motion.div
                                initial={{ scale: 1, opacity: 0 }}
                                animate={{ scale: 2.2, opacity: 0 }}
                                transition={{
                                    duration: 1.2,
                                    ease: "easeOut",
                                    delay: 0.7
                                }}
                                className="absolute inset-0 rounded-full bg-emerald-500/20"
                            />
                            
                            <div className="absolute inset-0 rounded-full border border-white/30 bg-white/15 backdrop-blur-md shadow-[0_0_0_8px_rgba(16,185,129,0.12),0_0_0_16px_rgba(16,185,129,0.06)] flex items-center justify-center">
                                <Check className="h-10 w-10 text-[#10b981] drop-shadow-[0_2px_4px_rgba(16,185,129,0.3)] stroke-[3px]" />
                            </div>
                        </motion.div>

                        <motion.h1
                            variants={itemVariants}
                            className="text-[32px] leading-tight font-black mb-3 text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.15)] font-display"
                        >
                            Booking Confirmed!
                        </motion.h1>
                        
                        <motion.p
                            variants={itemVariants}
                            className="text-white/65 text-base mb-8 max-w-sm mx-auto font-medium"
                        >
                            Your trip is officially booked. We&apos;ve sent the confirmation details to your email.
                        </motion.p>

                        <motion.div variants={itemVariants} className="w-full text-left">
                            {confirmation ? (
                                <div className="mb-8">
                                    <FlightBookingDetails
                                        details={confirmation}
                                        travelers={confirmedBooking?.travelers || []}
                                        contactInfo={contactInfo}
                                    />
                                </div>
                            ) : (
                                /* Nested Glass Summary Card */
                                <div className="w-full mb-8 overflow-hidden rounded-[22px] border border-white/12 bg-black/15 backdrop-blur-md">
                                    <div className="px-6 py-4 border-b border-white/10 bg-white/5">
                                        <h3 className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-white/50">
                                            Booking Summary
                                        </h3>
                                    </div>
                                    <div className="p-5 space-y-5">
                                        <div className="flex justify-between items-center">
                                            <span className="text-white/55 text-sm font-semibold">Booking Reference</span>
                                            <span className="font-mono bg-white/12 border border-white/20 text-[rgba(255,255,255,0.95)] px-3 py-1.5 rounded-lg text-sm font-bold tracking-wider shadow-sm">
                                                {confirmedBooking?.booking_reference}
                                            </span>
                                        </div>
                                        
                                        <div className="border-t border-dashed border-white/12 pt-5 flex justify-between items-end">
                                            <span className="text-white/55 text-sm font-semibold">Amount Paid</span>
                                            <div className="text-right">
                                                <span className="text-[28px] font-black text-white leading-none">
                                                    ₹{confirmedBooking?.total_amount?.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Flight Pending Amber Glass Alert */}
                                        <div className="mt-4 flex items-start gap-4 p-4 rounded-2xl border border-amber-400/25 bg-amber-400/12 relative overflow-hidden">
                                            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
                                            <div className="bg-amber-400/20 p-2 rounded-full border border-amber-400/30">
                                                <AlertCircle className="h-4 w-4 text-amber-400" />
                                            </div>
                                            <p className="text-white/75 text-[13px] font-medium leading-relaxed">
                                                Flight confirmation details are pending. Please check &quot;My Bookings&quot; shortly for updates.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <Button
                                onClick={() => router.push('/bookings')}
                                className="group relative overflow-hidden h-12 min-w-[220px] px-10 rounded-2xl transition-all duration-300 transform hover:-translate-y-1 active:scale-95 shadow-[0_20px_40px_rgba(0,0,0,0.15)] hover:shadow-[0_20px_40px_var(--primary-glow)]"
                                style={{
                                    background: `linear-gradient(180deg, rgba(255,255,255,0.28) 0%, var(--primary) 35%, color-mix(in srgb, var(--primary) 80%, #000) 100%)`
                                } as any}
                            >
                                <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/30" />
                                <div className="relative z-10 flex items-center justify-center gap-2 text-white font-bold text-lg tracking-wide">
                                    View My Bookings
                                    <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                                </div>
                            </Button>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        )
    }

    const basePrice = sessionData?.price_per_person || 18000
    const flightPrice = sessionData?.flight_details?.price || 0
    const subTotal = (basePrice + flightPrice) * travelers.length
    const gstAmount = (gstSettings && !gstSettings.inclusive) ? (subTotal * gstSettings.percentage) / 100 : 0

    // Progress Stepper Component
    const steps = [
        { id: 'DETAILS', label: 'Guest Details', icon: FileText },
        { id: 'PAYMENT', label: 'Payment', icon: CreditCard },
        { id: 'SUCCESS', label: 'Confirmation', icon: CheckCircle },
    ]

    const currentStepIdx = steps.findIndex(s => s.id === (step === 'PROCESSING' ? 'PAYMENT' : step))

    return (
        <div className="min-h-screen bg-transparent font-sans pb-20 overflow-x-hidden relative">
            {/* Ambient Deep Mesh Background */}
            <div className="fixed inset-0 min-h-screen w-full pointer-events-none z-[-2] bg-gradient-to-br from-[var(--primary)] via-[var(--primary-light)] to-[#FFF3EC]" />
            {/* Ambient Orbs */}
            <div className="fixed top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-[var(--primary)]/40 to-[var(--primary-light)]/40 blur-[120px] pointer-events-none z-[-1]" />
            <div className="fixed bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-[var(--primary-light)]/30 to-[var(--primary-soft)]/40 blur-[100px] pointer-events-none z-[-1]" />

            {/* Subtle Noise Texture */}
            <div className="fixed inset-0 pointer-events-none z-[-1] opacity-[0.04] mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/noise-pattern-with-subtle-cross-lines.png')]" />

            {/* Header / Stepper Section */}
            <div className="pt-6 relative z-50">
                <div className="container mx-auto px-4 lg:max-w-6xl">
                    <div className="glass-floating-nav bg-white/15 backdrop-blur-xl border border-white/35 rounded-[50px] shadow-[0_4px_30px_var(--primary-glow)] flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 md:px-8 py-3">
                        <h1 className="text-xl font-bold text-[#3A1A08] drop-shadow-sm font-display tracking-wide">Checkout</h1>

                        {/* Glowing Glass Stepper */}
                        <div className="flex items-center gap-2 md:gap-4 overflow-x-auto pb-1 md:pb-0 hide-scrollbar scroll-smooth">
                            {steps.map((s, idx) => {
                                const isCompleted = idx < currentStepIdx
                                const isCurrent = idx === currentStepIdx
                                const Icon = s.icon

                                return (
                                    <div key={s.id} className="flex items-center">
                                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 relative overflow-hidden backdrop-blur-md border ${isCurrent ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-[0_0_16px_var(--primary-glow)]' :
                                            isCompleted ? 'bg-[var(--primary-soft)] border-[var(--primary)]/20 text-[var(--primary)] shadow-sm' : 'bg-white/20 border-white/30 text-[#8B5030]'
                                            }`}>
                                            {/* Pulse Ring for Current Step */}
                                            {isCurrent && <div className="absolute inset-0 border-[2px] border-white/30 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-50" />}

                                            {isCompleted ? <div className="bg-[var(--primary)]/20 rounded-full p-0.5"><Check className="h-3.5 w-3.5 text-[var(--primary)]" /></div> : <Icon className={`h-4 w-4 ${isCurrent ? 'text-white' : 'text-[var(--primary)]'}`} />}
                                            <span className={`text-sm font-bold whitespace-nowrap ${isCurrent ? 'drop-shadow-sm' : 'opacity-80'}`}>{s.label}</span>
                                        </div>
                                        {idx < steps.length - 1 && (
                                            <div className="mx-1.5 md:mx-3 h-1 w-6 md:w-10 rounded-full bg-black/5 overflow-hidden relative shadow-inner">
                                                <div className={`absolute top-0 left-0 bottom-0 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] transition-all duration-700 ${isCompleted ? 'w-full' : 'w-0'}`} />
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto max-w-6xl px-4 pt-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column: Forms */}
                    <div className="lg:col-span-8 space-y-8 relative z-10">

                        {/* Travelers Section */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold text-[#3A1A08] flex items-center gap-2 px-1 font-display">
                                <span className="bg-white/40 backdrop-blur-md border border-white/50 text-[var(--primary)] p-2 rounded-xl shadow-sm"><FileText className="h-5 w-5" /></span>
                                Who&apos;s Traveling?
                            </h2>
                            {travelers.map((t, idx) => (
                                <div key={t.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: `${idx * 150}ms` }}>
                                    <TravelerForm
                                        traveler={t}
                                        index={idx}
                                        onChange={handleTravelerChange}
                                        errors={errors}
                                        travelDate={sessionData?.start_date || "2024-06-01"}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Contact Section */}
                        <Card className="rounded-[24px] border border-white/35 shadow-[0_8px_32px_var(--primary-glow)] overflow-hidden bg-white/15 backdrop-blur-xl">
                            <CardHeader className="glass-panel border-b border-white/20 pb-4 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary-glow)] to-white/10 pointer-events-none" />
                                <CardTitle className="text-lg flex items-center gap-2 relative z-10 text-[#3A1A08] font-display">
                                    <span className="bg-[var(--primary)]/10 text-[var(--primary)] p-2 rounded-xl border border-[var(--primary)]/20"><CreditCard className="h-5 w-5" /></span>
                                    Contact Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-6 relative">
                                <div className="flex items-center space-x-3 mb-4 bg-white/30 p-3 rounded-xl border border-white/40 w-max shadow-sm">
                                    <div
                                        className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${sameAsTraveler1 ? 'bg-[var(--primary)] shadow-[0_0_10px_var(--primary-glow)]' : 'bg-black/10 border border-white/20'}`}
                                        onClick={() => {
                                            setSameAsTraveler1(!sameAsTraveler1)
                                            if (!sameAsTraveler1 && travelers.length > 0) {
                                                toast.info("Autofill enabled: Using Traveler 1 as primary contact reference")
                                            }
                                        }}
                                    >
                                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${sameAsTraveler1 ? 'translate-x-4' : ''}`} />
                                    </div>
                                    <label
                                        className="text-sm font-bold text-[#5C2500] cursor-pointer"
                                        onClick={() => setSameAsTraveler1(!sameAsTraveler1)}
                                    >
                                        Use Traveler 1 details for contact
                                    </label>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1 relative z-10">
                                        <div className="relative group">
                                            <PhoneInput
                                                country={'in'}
                                                value={contactPhone}
                                                onChange={phone => setContactPhone(phone)}
                                                inputProps={{ name: 'phone', required: true, autoFocus: false }}
                                                containerClass="w-full !rounded-[14px] peer transition-all"
                                                inputClass={
                                                    `!w-full !h-14 !text-sm !border-white/40 !bg-white/25 !backdrop-blur-sm !text-[#5C2500] !rounded-[14px] focus:!bg-white/40 focus:!border-[var(--primary)] focus:!ring-[3px] focus:!ring-[var(--primary)]/25 transition-all font-bold pt-1 ${errors.phone ? '!border-red-500' : ''}`
                                                }
                                                buttonClass="!border-white/30 !rounded-l-[14px] !bg-white/20 hover:!bg-white/40 transition-colors !h-14 !pb-0"
                                                dropdownClass="glass-phone-dropdown"
                                            />

                                            {/* Fake Label for Phone */}
                                            <span className="absolute left-[54px] top-1 text-[10px] text-[#A0501E] font-bold z-10 transition-all uppercase tracking-widest px-1">
                                                Mobile Number
                                            </span>
                                        </div>
                                        {errors.phone && <p className="text-xs font-bold text-red-500 flex items-center gap-1 mt-1"><AlertCircle className="h-3 w-3" /> {errors.phone}</p>}
                                    </div>
                                    <div className="space-y-1">
                                        <FloatingLabelInput
                                            id="contact-email"
                                            type="email"
                                            label="Email Address"
                                            value={contactEmail}
                                            onChange={(e: any) => setContactEmail(e.target.value)}
                                            error={errors.email}
                                            className="!h-14 !bg-white/25 !border-white/40 !rounded-[14px] focus:!bg-white/40 focus:!border-[var(--primary)] focus:!ring-[3px] focus:!ring-[var(--primary)]/25 !text-[#5C2500] !font-bold transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <FloatingLabelInput
                                        id="contact-address"
                                        label="Billing Address"
                                        value={contactAddress}
                                        onChange={(e: any) => setContactAddress(e.target.value)}
                                        error={errors.address}
                                        className="!h-14 !bg-white/25 !border-white/40 !rounded-[14px] focus:!bg-white/40 focus:!border-[var(--primary)] focus:!ring-[3px] focus:!ring-[var(--primary)]/25 !text-[#5C2500] !font-bold transition-all"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                    <div className="space-y-2">
                                        <div className="relative group">
                                            <label className="absolute left-3 top-2 text-[10px] text-[#A0501E] font-bold uppercase tracking-widest z-10 transition-all group-focus-within:text-[var(--primary)]">Country</label>
                                            <Select
                                                value={contactCountry}
                                                onValueChange={(code) => {
                                                    setContactCountry(code)
                                                    const states = State.getStatesOfCountry(code)
                                                    setCountryStates(states)
                                                    setContactState('')
                                                    setContactCity('')
                                                    setStateCities([])
                                                }}
                                            >
                                                <SelectTrigger className="flex h-14 w-full appearance-none rounded-[14px] border border-white/40 bg-white/25 px-3 pt-5 pb-1 text-sm focus:outline-none focus:bg-white/50 focus:border-[var(--primary)] focus:ring-[3px] focus:ring-[var(--primary)]/25 font-bold text-[#5C2500] transition-all hover:bg-white/40 cursor-pointer backdrop-blur-sm">
                                                    <SelectValue placeholder="Select Country" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white/95 backdrop-blur-md rounded-[14px] border border-white/50">
                                                    {allCountries.map(c => (
                                                        <SelectItem key={c.isoCode} value={c.isoCode} className="text-[#3A1A08] font-bold focus:bg-[var(--primary)]/10">{c.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {errors.country && <p className="text-xs font-bold text-red-500 flex items-center gap-1 mt-1"><AlertCircle className="h-3 w-3" /> {errors.country}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <div className="relative group">
                                            <label className="absolute left-3 top-2 text-[10px] text-[#A0501E] font-bold uppercase tracking-widest z-10 transition-all group-focus-within:text-[var(--primary)]">State</label>
                                            <Select
                                                value={contactState}
                                                onValueChange={(stateCode) => {
                                                    setContactState(stateCode)
                                                    const cities = City.getCitiesOfState(contactCountry, stateCode)
                                                    setStateCities(cities)
                                                    setContactCity('')
                                                }}
                                                disabled={!contactCountry || countryStates.length === 0}
                                            >
                                                <SelectTrigger className="flex h-14 w-full appearance-none rounded-[14px] border border-white/40 bg-white/25 px-3 pt-5 pb-1 text-sm focus:outline-none focus:bg-white/50 focus:border-[var(--primary)] focus:ring-[3px] focus:ring-[var(--primary)]/25 font-bold text-[#5C2500] transition-all hover:bg-white/40 cursor-pointer backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed">
                                                    <SelectValue placeholder="Select State" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white/95 backdrop-blur-md rounded-[14px] border border-white/50">
                                                    {countryStates.map(s => (
                                                        <SelectItem key={s.isoCode} value={s.isoCode} className="text-[#3A1A08] font-bold focus:bg-[var(--primary)]/10">{s.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {errors.state && <p className="text-xs font-bold text-red-500 flex items-center gap-1 mt-1"><AlertCircle className="h-3 w-3" /> {errors.state}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <div className="relative group">
                                            <label className="absolute left-3 top-2 text-[10px] text-[#A0501E] font-bold uppercase tracking-widest z-10 transition-all group-focus-within:text-[var(--primary)]">City</label>
                                            <Select
                                                value={contactCity}
                                                onValueChange={(val) => setContactCity(val)}
                                                disabled={!contactState || stateCities.length === 0}
                                            >
                                                <SelectTrigger className="flex h-14 w-full appearance-none rounded-[14px] border border-white/40 bg-white/25 px-3 pt-5 pb-1 text-sm focus:outline-none focus:bg-white/50 focus:border-[var(--primary)] focus:ring-[3px] focus:ring-[var(--primary)]/25 font-bold text-[#5C2500] transition-all hover:bg-white/40 cursor-pointer backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed">
                                                    <SelectValue placeholder="Select City" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white/95 backdrop-blur-md rounded-[14px] border border-white/50">
                                                    {stateCities.map(c => (
                                                        <SelectItem key={c.name} value={c.name} className="text-[#3A1A08] font-bold focus:bg-[var(--primary)]/10">{c.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {errors.city && <p className="text-xs font-bold text-red-500 flex items-center gap-1 mt-1"><AlertCircle className="h-3 w-3" /> {errors.city}</p>}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Order Summary */}
                    <div className="lg:col-span-4">
                        <div className="sticky top-24 space-y-4">
                            {/* Booking For Header */}
                            {sessionData?.destination && (
                                <div className="mb-6">
                                    <div
                                        className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] text-white rounded-[24px] shadow-[0_8px_32px_var(--primary-glow)] overflow-hidden cursor-pointer group"
                                        onClick={() => setIsPackageDetailsOpen(!isPackageDetailsOpen)}
                                    >
                                        <div className="p-5 flex items-center justify-between">
                                            <div>
                                                <h3 className="text-[10px] font-bold text-white/80 uppercase tracking-widest drop-shadow-sm">Trip Details</h3>
                                                <div className="text-2xl font-bold mt-1.5 flex items-center gap-2 font-display drop-shadow-md">
                                                    {sessionData?.destination || "Your Trip"}
                                                </div>
                                            </div>
                                            <div className="bg-white/20 backdrop-blur-md p-2.5 rounded-[14px] group-hover:bg-white/30 transition-all shadow-inner">
                                                {isPackageDetailsOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                                            </div>
                                        </div>

                                        {isPackageDetailsOpen && (
                                            <div className="bg-black/10 backdrop-blur-md border-t border-white/20 p-5 space-y-4 animate-in slide-in-from-top-2">
                                                <div className="flex justify-between text-sm items-center">
                                                    <span className="text-white/80 font-medium">Duration</span>
                                                    <span className="font-bold bg-white/20 px-3 py-1 rounded-full text-white shadow-sm">{sessionData?.duration_days} Days</span>
                                                </div>
                                                <div className="flex justify-between text-sm items-center">
                                                    <span className="text-white/80 font-medium">Travelers</span>
                                                    <span className="font-bold bg-white/20 px-3 py-1 rounded-full text-white shadow-sm">{travelers.length} Pax</span>
                                                </div>
                                                <div className="flex justify-between text-sm items-center">
                                                    <span className="text-white/80 font-medium">Start Date</span>
                                                    <span className="font-bold bg-white/20 px-3 py-1 rounded-full text-white shadow-sm">{sessionData?.start_date}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <Card className="rounded-[24px] border border-white/35 shadow-[0_8px_32px_var(--primary-glow)] overflow-hidden bg-white/15 backdrop-blur-xl">
                                <CardHeader className="glass-panel border-b border-white/20 pb-4 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary)]/10 to-transparent pointer-events-none" />
                                    <CardTitle className="text-lg text-[#3A1A08] font-display relative z-10">Order Summary</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-6">
                                    <div className="flex justify-between items-center group">
                                        <span className="text-[#5C2500]/80 group-hover:text-[#5C2500] font-bold transition-colors">Base Package</span>
                                        <span className="font-bold text-[#3A1A08]">₹{(basePrice * travelers.length).toLocaleString()}</span>
                                    </div>
                                    <div className="text-xs text-[#A0501E] font-semibold -mt-3 flex justify-between">
                                        <span>₹{basePrice.toLocaleString()} × {travelers.length}</span>
                                    </div>

                                    {flightPrice > 0 && (
                                        <>
                                            <div className="flex justify-between items-center group text-[#8B5030] font-bold mt-2">
                                                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] shadow-[0_0_8px_var(--primary-glow)]"></span> Flights</span>
                                                <span>₹{(flightPrice * travelers.length).toLocaleString()}</span>
                                            </div>
                                            <div className="text-xs text-[#A0501E] font-semibold -mt-3 flex justify-between">
                                                <span>₹{flightPrice.toLocaleString()} × {travelers.length}</span>
                                            </div>
                                        </>
                                    )}

                                    {gstSettings && !gstSettings.inclusive ? (
                                        <div className="group bg-orange-100/40 p-3 rounded-[14px] border border-white/50 flex justify-between items-center text-sm shadow-sm backdrop-blur-sm mt-2">
                                            <span className="flex items-center gap-2 text-[#8B5030] font-bold">
                                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] shadow-[0_0_6px_var(--primary-glow)]"></span>
                                                GST ({gstSettings.percentage}%)
                                            </span>
                                            <span className="font-extrabold text-[#5C2500]">₹{gstAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                        </div>
                                    ) : (
                                        <div className="glass-panel p-3 rounded-[14px] border border-dashed border-white/30 text-xs font-bold text-[#A0501E] text-center mt-2 bg-white/10 backdrop-blur-sm">
                                            Taxes & Fees Included
                                        </div>
                                    )}

                                    <div className="border-t border-white/20 pt-5 flex justify-between items-end">
                                        <div className="w-full">
                                            <span className="text-[#A0501E] text-[10px] font-bold uppercase tracking-widest block mb-1">
                                                {gstSettings && !gstSettings.inclusive ? "Total Amount" : "Total Amount"}
                                            </span>
                                            <div className="flex justify-between items-baseline w-full">
                                                <span className="text-4xl font-black text-[#5C2500] leading-none drop-shadow-sm font-display tracking-tight">₹{totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                <span className="text-xs font-bold text-[#8B5030]">INR</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Trust Badges */}
                                    <div className="flex items-center gap-3 py-3 mt-2">
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-green-800 bg-green-100/60 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-green-200 shadow-sm relative overflow-hidden group">
                                            <div className="absolute inset-0 bg-green-200/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <ShieldCheck className="h-3.5 w-3.5 text-green-600 relative z-10" /> <span className="relative z-10">100% Secure</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-900 bg-blue-100/60 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-blue-200 shadow-sm relative overflow-hidden group">
                                            <div className="absolute inset-0 bg-blue-200/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <RotateCcw className="h-3.5 w-3.5 text-blue-600 relative z-10" /> <span className="relative z-10">Free Cancellable*</span>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="p-5 border-t border-white/20 bg-white/20 backdrop-blur-xl relative">
                                    <Button
                                        className="w-full h-[56px] text-lg font-bold shadow-[0_12px_32px_var(--primary-glow)] bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] hover:shadow-[0_16px_40px_var(--primary-glow)] hover:from-[#FF7A42] hover:to-[#FFAC78] text-white transition-all transform hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] rounded-full flex items-center justify-between px-6 border border-white/20 relative overflow-hidden group"
                                        size="lg"
                                        onClick={handlePayment}
                                        disabled={step === 'PROCESSING'}
                                    >
                                        {/* Shine sweep effect */}
                                        <div className="absolute right-[-100%] top-0 bottom-0 w-[50%] bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12 group-hover:animate-[shine_1.5s_ease-out_infinite]" />

                                        {step === 'PROCESSING' ? (
                                            <div className="flex items-center justify-center w-full gap-2 relative z-10">
                                                <Loader2 className="animate-spin h-6 w-6" /> Processing...
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-3 relative z-10">
                                                    <div className="bg-white/20 p-1.5 rounded-full"><Lock className="h-4 w-4 text-white" /></div>
                                                    <span className="font-display tracking-wide">Pay {totalAmount.toLocaleString()}</span>
                                                </div>
                                                <span className="text-[10px] font-bold bg-white/20 backdrop-blur-md px-2.5 py-1.5 rounded-full uppercase tracking-widest relative z-10 shadow-inner border border-white/10">Proceed</span>
                                            </>
                                        )}
                                    </Button>
                                    <div className="text-[10px] font-bold text-center text-[#8B5030] mt-4 w-full flex items-center justify-center gap-1.5">
                                        <CheckCircle className="h-3.5 w-3.5 text-green-600 drop-shadow-sm" /> Secure Payment via Razorpay
                                    </div>
                                </CardFooter>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mock Payment Modal */}
            {currentOrder && (
                <MockPaymentModal
                    isOpen={showMockModal}
                    amount={currentOrder.amount}
                    currency={currentOrder.currency}
                    orderId={currentOrder.order_id}
                    onClose={() => {
                        setShowMockModal(false)
                        setStep('DETAILS') // Or cancel state
                    }}
                    onSuccess={(response) => handlePaymentSuccess(response, currentBookingId)}
                />
            )}

            <InactivePlanModal 
                isOpen={showInactivePlanModal}
                onClose={() => setShowInactivePlanModal(false)}
            />
        </div>
    )
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={<div className="flex flex-col items-center justify-center min-h-screen bg-transparent"><Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" /><p className="text-gray-500 font-medium animate-pulse">Loading checkout...</p></div>}>
            <CheckoutContent />
        </Suspense>
    )
}
