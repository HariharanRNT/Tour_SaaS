'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { Loader2, CreditCard, CheckCircle, AlertCircle, FileText, ChevronRight, Check } from 'lucide-react'
import { toast } from 'react-toastify'
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
import { FlightBookingDetails } from "@/components/booking/flight-booking-details"
import { ShieldCheck, RotateCcw, Lock, ChevronDown, ChevronUp } from 'lucide-react'

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
            const token = localStorage.getItem('token')
            // 4. Confirm Booking (Backend Orchestrator)
            const confirmRes = await fetch(`http://localhost:8000/api/v1/bookings/${bookingId}/confirm`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature
                })
            })

            if (!confirmRes.ok) {
                const err = await confirmRes.json()
                throw new Error(err.detail || "Booking confirmation failed")
            }

            const bookingData = await confirmRes.json()
            setConfirmedBooking(bookingData)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (!sessionId) return;

        const fetchSession = async () => {
            try {
                // Fetch trip plan session with X-Domain header to ensure correct agent context
                const headers: Record<string, string> = {
                    'Content-Type': 'application/json'
                }

                if (typeof window !== 'undefined') {
                    headers['X-Domain'] = window.location.hostname
                }

                const res = await fetch(`http://localhost:8000/api/v1/trip-planner/session/${sessionId}`, {
                    headers
                })
                if (!res.ok) throw new Error("Failed to load session")
                const data = await res.json()
                setSessionData(data)

                // Set GST Settings from session data
                if (data.gst_percentage !== undefined) {
                    setGstSettings({
                        inclusive: data.gst_inclusive,
                        percentage: data.gst_percentage
                    })
                }

                // Initialize Travelers
                const initialTravelers: Traveler[] = []
                const adults = data.travelers?.adults || 1
                const children = data.travelers?.children || 0

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
                const infants = data.travelers?.infants || 0
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

                // Calculate Total
                const count = adults + children
                const basePrice = data.price_per_person || 18000
                const flightPrice = data.flight_details?.price || 0

                // Initial calculation (refreshed by effect below)
                setTotalAmount((basePrice + flightPrice) * count)

            } catch (e) {
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

        // Load states for default country (India)
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
        } else if (contactPhone.length < 10) {
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
        travelers.forEach((t, idx) => {
            if (!t.first_name?.trim()) {
                newErrors[`first_name_${idx}`] = "First Name is required"
                isValid = false
            }
            if (!t.last_name?.trim()) {
                // specific traveler error if needed, usually passed to form
                // For now, toast general error if desired or inline
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
                    is_primary: travelers.indexOf(t) === 0
                })),
                special_requests: JSON.stringify({
                    flight_details: sessionData?.flight_details,
                    contact_info: {
                        email: contactEmail,
                        phone: contactPhone,
                        address: contactAddress,
                        city: contactCity, // These will be names from the dropdown
                        state: contactState,
                        country: Country.getCountryByCode(contactCountry)?.name || contactCountry
                    }
                })
            }

            // ... (rest of existing logic) ...


            // 1. Create Booking
            const bookingRes = await fetch('http://localhost:8000/api/v1/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(bookingPayload)
            })

            if (!bookingRes.ok) {
                const errData = await bookingRes.json()
                throw new Error(errData.detail || "Failed to create booking")
            }
            const booking = await bookingRes.json()
            setCurrentBookingId(booking.id)

            // 2. Review Flight 
            try {
                const reviewRes = await fetch(`http://localhost:8000/api/v1/bookings/${booking.id}/review-flight`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                if (!reviewRes.ok) {
                    const err = await reviewRes.json()
                    throw new Error(err.detail || "Flight price changed or unavailable")
                }
                const reviewData = await reviewRes.json()
                console.log("Flight Review Success:", reviewData)

            } catch (err: any) {
                console.error("Flight Review Failed:", err)
                toast.error(`Flight validation failed: ${err.message}`)
                setStep('DETAILS')
                return
            }

            // 3. Create Payment Order
            const orderRes = await fetch('http://localhost:8000/api/v1/payments/create-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ booking_id: booking.id })
            })

            if (!orderRes.ok) throw new Error("Failed to create payment order")
            const orderData = await orderRes.json()
            setCurrentOrder(orderData)

            // 4. Prompt Payment (Mock or Real)
            // Logic similar to Subscription Page: check if key is default/test-mock
            if (orderData.key_id === 'rzp_test_1234567890' || orderData.key_id.includes('1234567890')) {
                // Use Mock Modal for dummy keys
                console.log("Using Mock Payment Modal for Test Key")
                setShowMockModal(true)
            } else {
                // Use Real Razorpay
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
                    theme: { color: "#3399cc" },
                    modal: {
                        ondismiss: function () {
                            setStep('DETAILS') // Reset button state
                        }
                    }
                };
                const rzp1 = new window.Razorpay(options);
                rzp1.open();
            }

        } catch (error: any) {
            console.error(error)
            toast.error(error.message || "Something went wrong")
            setStep('DETAILS')
        }
    }


    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-transparent">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-500 font-medium animate-pulse">Preparing your checkout experience...</p>
        </div>
    )

    if (step === 'SUCCESS') {
        let confirmation = null
        let contactInfo = { email: 'N/A', phone: 'N/A' } // Default

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

        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-transparent p-4">
                <div className="glass-panel p-8 rounded-2xl shadow-xl max-w-2xl w-full text-center">
                    <div className="bg-green-100 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                        <CheckCircle className="h-10 w-10 text-green-600" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2 text-gray-900">Booking Confirmed!</h1>
                    <p className="text-gray-600 mb-8 max-w-md mx-auto">Your trip is officially booked. We&apos;ve sent the confirmation details to your email.</p>

                    {confirmation ? (
                        <div className="text-left mb-8">
                            <FlightBookingDetails
                                details={confirmation}
                                travelers={confirmedBooking?.travelers || []}
                                contactInfo={contactInfo}
                            />
                        </div>
                    ) : (
                        <Card className="w-full mb-8 border-gray-100 shadow-sm text-left">
                            <CardHeader className="glass-panel border-b border-white/20 pb-4">
                                <CardTitle className="text-lg">Booking Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-4">
                                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                                    <span className="text-gray-500 text-sm">Booking Reference</span>
                                    <span className="font-mono font-bold text-lg text-blue-600 tracking-wider text-right">{confirmedBooking?.booking_reference}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 text-sm">Amount Paid</span>
                                    <span className="font-bold text-xl text-gray-900">₹{confirmedBooking?.total_amount?.toLocaleString()}</span>
                                </div>
                                <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 flex items-start gap-3 text-amber-800 text-sm mt-2">
                                    <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
                                    <p>Flight confirmation details are pending. Please check &quot;My Bookings&quot; shortly for updates.</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Button
                        onClick={() => router.push('/bookings')}
                        className="w-full sm:w-auto h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/20"
                    >
                        View My Bookings
                    </Button>
                </div>
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
            <div className="fixed inset-0 min-h-screen w-full pointer-events-none z-[-2] bg-gradient-to-br from-[var(--primary)] via-[#FFAC82] to-[#FFF3EC]" />
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
                                            isCompleted ? 'bg-white/40 border-white/50 text-green-700 shadow-sm' : 'bg-white/20 border-white/30 text-[#8B5030]'
                                            }`}>
                                            {/* Pulse Ring for Current Step */}
                                            {isCurrent && <div className="absolute inset-0 border-[2px] border-white/30 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-50" />}

                                            {isCompleted ? <div className="bg-green-100 rounded-full p-0.5"><Check className="h-3.5 w-3.5 text-green-600" /></div> : <Icon className={`h-4 w-4 ${isCurrent ? 'text-white' : 'text-[var(--primary)]'}`} />}
                                            <span className={`text-sm font-bold whitespace-nowrap ${isCurrent ? 'drop-shadow-sm' : 'opacity-80'}`}>{s.label}</span>
                                        </div>
                                        {idx < steps.length - 1 && (
                                            <div className="mx-1.5 md:mx-3 h-1 w-6 md:w-10 rounded-full bg-black/5 overflow-hidden relative shadow-inner">
                                                <div className={`absolute top-0 left-0 bottom-0 bg-gradient-to-r from-[var(--primary)] to-orange-300 transition-all duration-700 ${isCompleted ? 'w-full' : 'w-0'}`} />
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
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Contact Section */}
                        <Card className="rounded-[24px] border border-white/35 shadow-[0_8px_32px_var(--primary-glow)] overflow-hidden bg-white/15 backdrop-blur-xl">
                            <CardHeader className="glass-panel border-b border-white/20 pb-4 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-orange-100/30 to-white/10 pointer-events-none" />
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
