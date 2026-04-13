'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { motion, AnimatePresence } from 'framer-motion'

import { formatCurrency, formatDate, formatDuration, formatError } from '@/lib/utils'
import { Loader2, CreditCard, CheckCircle, AlertCircle, FileText, ChevronRight, Check, XCircle, User } from 'lucide-react'
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
    const customerId = searchParams.get('customerId') // Set when agent books on behalf of customer

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
    const [isPackageDetailsOpen, setIsPackageDetailsOpen] = useState(false)


    const handleTravelerChange = (index: number, field: keyof Traveler, value: string) => {
        setTravelers(prev => {
            const newTravelers = [...prev]
            newTravelers[index] = { ...newTravelers[index], [field]: value }
            return newTravelers
        })

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
            toast.error(formatError(err) || "Payment successful but booking failed.")
            setStep('DETAILS')
            setShowMockModal(false)
        }
    }



    // Load Session & Settings
    useEffect(() => {
        if (!sessionId || sessionId === 'null') {
            if (sessionId === 'null') setLoading(false);
            return;
        }

        const fetchSession = async () => {
            try {
                const data = await tripPlannerAPI.getSession(sessionId)
                setSessionData(data)

                // Only set GST if it's explicitly applicable. If gst_applicable is false, suppress GST entirely.
                if (data.gst_applicable === false) {
                    setGstSettings(null)  // No GST — do not show or calculate any GST
                } else if (data.gst_percentage !== undefined && data.gst_percentage > 0) {
                    setGstSettings({
                        inclusive: data.gst_inclusive,
                        percentage: data.gst_percentage
                    })
                } else {
                    setGstSettings(null)
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
                toast.error(formatError(e) || "Could not load trip details")
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

    // Recalculate total when GST settings or travelers change
    useEffect(() => {
        if (!sessionData) return

        // Infants (Under 2) are free
        const chargeableCount = travelers.filter(t => t.type !== 'INFANT').length
        const basePrice = sessionData.price_per_person || 18000
        const flightPrice = sessionData.flight_details?.price || 0

        let subTotal = (basePrice + flightPrice) * chargeableCount

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

            const bookingPayload: Record<string, any> = {
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

            // If agent is booking on behalf of a customer, pass customer_id
            if (customerId) {
                bookingPayload.customer_id = customerId
            }

            // 1. Create Booking
            const booking = await bookingsAPI.create(bookingPayload as any)
            setCurrentBookingId(booking.id)

            // 2. Review Flight 
            try {
                const reviewData = await api.post(`/bookings/${booking.id}/review-flight`)
                console.log("Flight Review Success:", reviewData.data)
            } catch (err: any) {
                console.error("Flight Review Failed:", err)
                toast.error(`Flight validation failed: ${formatError(err)}`)
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
                        ondismiss: async function () {
                            try {
                                await paymentsAPI.markFailed(booking.id)
                            } catch (e) {
                                console.error("Failed to mark payment as failed", e)
                            }
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

            toast.error(formatError(error))
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
                {/* Ambient Deep Mesh Background */}
                <div className="fixed inset-0 min-h-screen w-full pointer-events-none z-[-2] bg-gradient-to-br from-[var(--primary)] via-[var(--primary-light)] to-[#FFF3EC]" />
                
                {/* Ambient Orbs */}
                <div className="fixed top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-[var(--primary)]/40 to-[var(--primary-light)]/40 blur-[120px] pointer-events-none z-[-1]" />
                <div className="fixed bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-[var(--primary-light)]/30 to-[var(--primary-soft)]/40 blur-[100px] pointer-events-none z-[-1]" />

                {/* Subtle Noise Texture */}
                <div className="fixed inset-0 pointer-events-none z-[-1] opacity-[0.04] mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/noise-pattern-with-subtle-cross-lines.png')]" />

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="relative group w-full flex justify-center"
                    style={{ maxWidth: '90%', width: '480px' }}
                >
                    {/* Main Success Card - Premium Glassmorphism Style */}
                    <div className="relative overflow-hidden w-full p-8 md:p-[32px_28px] rounded-[28px] border border-white/25 bg-white/18 backdrop-blur-[20px] shadow-[0_8px_32px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.3)] text-center transition-all flex flex-col gap-5">
                        {/* Interior Glow Enhancement */}
                        <div className="absolute inset-0 pointer-events-none" 
                             style={{ background: 'radial-gradient(circle at top, rgba(255,255,255,0.25), transparent 60%)' }} />

                        {/* Success Icon Badge - Premium Gradient Circular */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{
                                type: "spring",
                                stiffness: 200,
                                damping: 12,
                                delay: 0.2
                            }}
                            className="relative w-[72px] h-[72px] mx-auto"
                        >
                            <motion.div 
                                animate={{ 
                                    boxShadow: ["0 10px 25px rgba(0,200,120,0.25)", "0 10px 35px rgba(0,200,120,0.45)", "0 10px 25px rgba(0,200,120,0.25)"] 
                                }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute inset-0 rounded-full border border-white/40 bg-gradient-to-br from-[#e6f9f0] to-[#c8f7dc] shadow-lg flex items-center justify-center"
                            >
                                <Check className="h-9 w-9 text-[#00a86b] stroke-[3.5px]" />
                            </motion.div>
                        </motion.div>

                        <div className="flex flex-col gap-3">
                            <motion.h1
                                variants={itemVariants}
                                className="text-[30px] font-bold text-[var(--color-primary-font)] drop-shadow-sm font-display"
                            >
                                Booking Confirmed!
                            </motion.h1>

                            <motion.p
                                variants={itemVariants}
                                className="text-[var(--color-primary-font)] opacity-70 text-sm leading-1.6 max-w-[320px] mx-auto"
                            >
                                Your trip is officially booked. We&apos;ve sent the confirmation details to your email.
                            </motion.p>
                        </div>

                        <motion.div variants={itemVariants} className="w-full text-left">
                            <div className="w-full overflow-hidden rounded-[18px] bg-white/25 backdrop-blur-md p-[18px] flex flex-col gap-[14px]">
                                <h3 className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-black/50 border-b border-white/10 pb-2">
                                    Booking Summary
                                </h3>
                                
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="grid grid-template-columns: 1fr auto items-center">
                                        <div className="flex justify-between items-center w-full">
                                            <span className="text-[var(--color-primary-font)]/70 text-sm font-medium">Booking Ref</span>
                                            <span className="text-[var(--color-primary-font)] text-sm font-bold">
                                                {confirmedBooking?.booking_reference || "BKZGD322250"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center w-full">
                                        <span className="text-[var(--color-primary-font)]/70 text-sm font-medium">Amount Paid</span>
                                        <span className="text-lg font-bold text-[var(--color-primary-font)]">
                                            ₹{(confirmedBooking?.total_amount || 1180.00).toLocaleString()}
                                        </span>
                                    </div>

                                    {/* Glass Alert Box */}
                                    <div className="flex items-center gap-2 p-[10px_12px] rounded-[12px] border border-amber-500/30 bg-[rgba(255,200,0,0.15)] mt-1">
                                        <AlertCircle className="h-4 w-4 text-amber-600" />
                                        <p className="text-[var(--color-primary-font)]/80 text-[13px] font-medium">
                                            Flight confirmation is pending
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div variants={itemVariants} className="mt-2">
                            <Button
                                onClick={() => router.push('/bookings')}
                                className="group relative overflow-hidden h-[48px] w-full rounded-[16px] transition-all duration-300 transform hover:-translate-y-0.5 active:scale-[0.98] shadow-[0_10px_25px_var(--primary-glow)] hover:shadow-[0_14px_30px_var(--primary-glow)] bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)] border-none"
                            >
                                <div className="relative z-10 flex items-center justify-center gap-2 text-white font-semibold text-base tracking-[0.3px]">
                                    View My Bookings
                                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
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
    const chargeableCount = travelers.filter((t: any) => t.type !== 'INFANT').length
    const subTotal = (basePrice + flightPrice) * chargeableCount
    const gstAmount = (gstSettings && !gstSettings.inclusive) ? (subTotal * (gstSettings as any).percentage) / 100 : 0

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
                        <h1 className="text-xl font-bold text-[var(--color-primary-font)] drop-shadow-sm font-display tracking-wide">Checkout</h1>

                        {/* Agent Context Banner */}
                        {customerId && (
                            <div className="flex items-center gap-2 px-4 py-1.5 bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-full animate-in fade-in zoom-in duration-500">
                                <User className="w-3.5 h-3.5 text-[var(--primary)]" />
                                <span className="text-xs font-bold text-[var(--primary)]">Booking on Behalf of Customer</span>
                            </div>
                        )}

                        {/* Glowing Glass Stepper */}
                        <div className="flex items-center gap-2 md:gap-4 overflow-x-auto pb-1 md:pb-0 hide-scrollbar scroll-smooth">
                            {steps.map((s, idx) => {
                                const isCompleted = idx < currentStepIdx
                                const isCurrent = idx === currentStepIdx
                                const Icon = s.icon

                                return (
                                    <div key={s.id} className="flex items-center">
                                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 relative overflow-hidden backdrop-blur-md border ${isCurrent ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-[0_0_16px_var(--primary-glow)]' :
                                            isCompleted ? 'bg-[var(--primary-soft)] border-[var(--primary)]/20 text-[var(--primary)] shadow-sm' : 'bg-white/20 border-white/30 text-black'
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
                            <h2 className="text-xl font-bold text-black flex items-center gap-2 px-1 font-display">
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
                                <CardTitle className="text-lg flex items-center gap-2 relative z-10 text-black font-display">
                                    <span className="bg-[var(--primary)]/10 text-[var(--primary)] p-2 rounded-xl border border-[var(--primary)]/20"><CreditCard className="h-5 w-5" /></span>
                                    Contact Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-6 relative">

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
                                                    `!w-full !h-14 !text-sm !border-white/40 !bg-white/25 !backdrop-blur-sm !text-black !rounded-[14px] focus:!bg-white/40 focus:!border-[var(--primary)] focus:!ring-[3px] focus:!ring-[var(--primary)]/25 transition-all font-bold pt-1 ${errors.phone ? '!border-red-500' : ''}`
                                                }
                                                buttonClass="!border-white/30 !rounded-l-[14px] !bg-white/20 hover:!bg-white/40 transition-colors !h-14 !pb-0"
                                                dropdownClass="glass-phone-dropdown"
                                            />

                                            {/* Fake Label for Phone */}
                                            <span className="absolute left-[54px] top-1 text-[10px] text-black font-bold z-10 transition-all uppercase tracking-widest px-1">
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
                                            className="!h-14 !bg-white/25 !border-white/40 !rounded-[14px] focus:!bg-white/40 focus:!border-[var(--primary)] focus:!ring-[3px] focus:!ring-[var(--primary)]/25 !text-black !font-bold transition-all"
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
                                        className="!h-14 !bg-white/25 !border-white/40 !rounded-[14px] focus:!bg-white/40 focus:!border-[var(--primary)] focus:!ring-[3px] focus:!ring-[var(--primary)]/25 !text-black !font-bold transition-all"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                    <div className="space-y-2">
                                        <div className="relative group">
                                            <label className="absolute left-3 top-2 text-[10px] text-black font-bold uppercase tracking-widest z-10 transition-all group-focus-within:text-[var(--primary)]">Country</label>
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
                                                <SelectTrigger className="flex h-14 w-full appearance-none rounded-[14px] border border-white/40 bg-white/25 px-3 pt-5 pb-1 text-sm focus:outline-none focus:bg-white/50 focus:border-[var(--primary)] focus:ring-[3px] focus:ring-[var(--primary)]/25 font-bold text-black transition-all hover:bg-white/40 cursor-pointer backdrop-blur-sm">
                                                    <SelectValue placeholder="Select Country" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white/95 backdrop-blur-md rounded-[14px] border border-white/50">
                                                    {allCountries.map(c => (
                                                        <SelectItem key={c.isoCode} value={c.isoCode} className="text-black font-bold focus:bg-[var(--primary)]/10">{c.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {errors.country && <p className="text-xs font-bold text-red-500 flex items-center gap-1 mt-1"><AlertCircle className="h-3 w-3" /> {errors.country}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <div className="relative group">
                                            <label className="absolute left-3 top-2 text-[10px] text-black font-bold uppercase tracking-widest z-10 transition-all group-focus-within:text-[var(--primary)]">State</label>
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
                                                <SelectTrigger className="flex h-14 w-full appearance-none rounded-[14px] border border-white/40 bg-white/25 px-3 pt-5 pb-1 text-sm focus:outline-none focus:bg-white/50 focus:border-[var(--primary)] focus:ring-[3px] focus:ring-[var(--primary)]/25 font-bold text-black transition-all hover:bg-white/40 cursor-pointer backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed">
                                                    <SelectValue placeholder="Select State" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white/95 backdrop-blur-md rounded-[14px] border border-white/50">
                                                    {countryStates.map(s => (
                                                        <SelectItem key={s.isoCode} value={s.isoCode} className="text-black font-bold focus:bg-[var(--primary)]/10">{s.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {errors.state && <p className="text-xs font-bold text-red-500 flex items-center gap-1 mt-1"><AlertCircle className="h-3 w-3" /> {errors.state}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <div className="relative group">
                                            <label className="absolute left-3 top-2 text-[10px] text-black font-bold uppercase tracking-widest z-10 transition-all group-focus-within:text-[var(--primary)]">City</label>
                                            <Select
                                                value={contactCity}
                                                onValueChange={(val) => setContactCity(val)}
                                                disabled={!contactState || stateCities.length === 0}
                                            >
                                                <SelectTrigger className="flex h-14 w-full appearance-none rounded-[14px] border border-white/40 bg-white/25 px-3 pt-5 pb-1 text-sm focus:outline-none focus:bg-white/50 focus:border-[var(--primary)] focus:ring-[3px] focus:ring-[var(--primary)]/25 font-bold text-black transition-all hover:bg-white/40 cursor-pointer backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed">
                                                    <SelectValue placeholder="Select City" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white/95 backdrop-blur-md rounded-[14px] border border-white/50">
                                                    {stateCities.map(c => (
                                                        <SelectItem key={c.name} value={c.name} className="text-black font-bold focus:bg-[var(--primary)]/10">{c.name}</SelectItem>
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
                                                    <span className="font-bold bg-white/20 px-3 py-1 rounded-full text-white shadow-sm">{formatDuration(sessionData?.duration_days || 0)}</span>
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
                                    <CardTitle className="text-lg text-[var(--color-primary-font)] font-display relative z-10">Order Summary</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-6">
                                    <div className="flex justify-between items-center group">
                                        <span className="text-[var(--color-primary-font)]/80 group-hover:text-[var(--color-primary-font)] font-bold transition-colors">Base Package</span>
                                        <span className="font-bold text-[var(--color-primary-font)]">₹{(basePrice * chargeableCount).toLocaleString()}</span>
                                    </div>
                                    <div className="text-xs text-[var(--color-primary-font)] font-semibold -mt-3 flex justify-between">
                                        <span>₹{basePrice.toLocaleString()} × {chargeableCount} Adults/Children</span>
                                    </div>

                                    {travelers.some(t => t.type === 'INFANT') && (
                                        <div className="flex justify-between items-center group text-[var(--color-primary-font)] font-bold mt-2">
                                            <span className="flex items-center gap-1.5 opacity-60">Infants ({travelers.filter(t => t.type === 'INFANT').length})</span>
                                            <span className="text-[var(--primary)] font-black">FREE</span>
                                        </div>
                                    )}

                                    {flightPrice > 0 && (
                                        <>
                                            <div className="flex justify-between items-center group text-[var(--color-primary-font)] font-bold mt-2">
                                                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] shadow-[0_0_8px_var(--primary-glow)]"></span> Flights</span>
                                                <span>₹{(flightPrice * chargeableCount).toLocaleString()}</span>
                                            </div>
                                            <div className="text-xs text-[var(--color-primary-font)] font-semibold -mt-3 flex justify-between">
                                                <span>₹{flightPrice.toLocaleString()} × {chargeableCount}</span>
                                            </div>
                                        </>
                                    )}

                                    {gstSettings && !gstSettings.inclusive ? (
                                        <div className="group bg-blue-100/40 p-3 rounded-[14px] border border-white/50 flex justify-between items-center text-sm shadow-sm backdrop-blur-sm mt-2">
                                            <span className="flex items-center gap-2 text-[var(--color-primary-font)] font-bold">
                                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] shadow-[0_0_6px_var(--primary-glow)]"></span>
                                                GST ({gstSettings.percentage}%)
                                            </span>
                                            <span className="font-extrabold text-[var(--color-primary-font)]">₹{gstAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                        </div>
                                    ) : (
                                        <div className="glass-panel p-3 rounded-[14px] border border-dashed border-white/30 text-xs font-bold text-[var(--color-primary-font)] text-center mt-2 bg-white/10 backdrop-blur-sm">
                                            Taxes & Fees Included
                                        </div>
                                    )}

                                    <div className="border-t border-white/20 pt-5 flex justify-between items-end">
                                        <div className="w-full">
                                            <span className="text-[var(--color-primary-font)] text-[10px] font-bold uppercase tracking-widest block mb-1">
                                                {gstSettings && !gstSettings.inclusive ? "Total Amount" : "Total Amount"}
                                            </span>
                                            <div className="flex justify-between items-baseline w-full">
                                                <span className="text-4xl font-black text-[var(--color-primary-font)] leading-none drop-shadow-sm font-display tracking-tight">₹{totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                <span className="text-xs font-bold text-[var(--color-primary-font)]">INR</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Trust Badges */}
                                    <div className="flex items-center gap-3 py-3 mt-2">
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-green-800 bg-green-100/60 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-green-200 shadow-sm relative overflow-hidden group">
                                            <div className="absolute inset-0 bg-green-200/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <ShieldCheck className="h-3.5 w-3.5 text-green-600 relative z-10" /> <span className="relative z-10">100% Secure</span>
                                        </div>
                                        {sessionData?.cancellation_enabled === true ? (
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-900 bg-blue-100/60 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-blue-200 shadow-sm relative overflow-hidden group">
                                                <div className="absolute inset-0 bg-blue-200/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                <RotateCcw className="h-3.5 w-3.5 text-blue-600 relative z-10" /> <span className="relative z-10">Refundable</span>
                                            </div>
                                        ) : (
                                            <div 
                                                title="This package cannot be cancelled or refunded"
                                                className="flex items-center gap-1.5 text-[10px] font-bold text-red-900 bg-red-100/60 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-red-200 shadow-sm relative overflow-hidden group cursor-help"
                                            >
                                                <div className="absolute inset-0 bg-red-200/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                <XCircle className="h-3.5 w-3.5 text-red-600 relative z-10" /> <span className="relative z-10">Non-Refundable</span>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                                <CardFooter className="p-5 border-t border-white/20 bg-white/20 backdrop-blur-xl relative">
                                    <Button
                                        className="w-full h-[56px] text-lg font-bold shadow-[0_12px_32px_var(--primary-glow)] bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] hover:shadow-[0_16px_40px_var(--primary-glow)] hover:opacity-90 text-white transition-all transform hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] rounded-full flex items-center justify-center px-6 border border-white/20 relative overflow-hidden group"
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
                                            <div className="flex items-center gap-3 relative z-10">
                                                <div className="bg-white/20 p-1.5 rounded-full"><Lock className="h-4 w-4 text-white" /></div>
                                                <span className="font-display tracking-wide">Pay {totalAmount.toLocaleString()}</span>
                                            </div>
                                        )}
                                    </Button>
                                    <div className="text-[10px] font-bold text-center text-[var(--color-primary-font)] mt-4 w-full flex items-center justify-center gap-1.5">
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
        <Suspense fallback={<div className="flex flex-col items-center justify-center min-h-screen bg-transparent"><Loader2 className="h-12 w-12 animate-spin text-[var(--primary)] mb-4" /><p className="text-gray-500 font-medium animate-pulse">Loading checkout...</p></div>}>
            <CheckoutContent />
        </Suspense>
    )
}
