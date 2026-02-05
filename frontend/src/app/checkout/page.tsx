'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { Loader2, CreditCard, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'react-toastify'
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
import { Country, State, City } from 'country-state-city'
import { ICountry, IState, ICity } from 'country-state-city'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { TravelerForm, Traveler } from "@/components/booking/traveler-form"
import { MockPaymentModal } from "@/components/booking/mock-payment-modal"
import { FlightBookingDetails } from "@/components/booking/flight-booking-details"

// Razorpay Type Definition
declare global {
    interface Window {
        Razorpay: any;
    }
}

export default function CheckoutPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const sessionId = searchParams.get('sessionId')

    const [loading, setLoading] = useState(true)
    const [step, setStep] = useState<'DETAILS' | 'PAYMENT' | 'PROCESSING' | 'SUCCESS'>('DETAILS')

    // Data
    const [sessionData, setSessionData] = useState<any>(null)
    const [travelers, setTravelers] = useState<Traveler[]>([])
    const [totalAmount, setTotalAmount] = useState(0)

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

    const handleTravelerChange = (index: number, field: keyof Traveler, value: string) => {
        const newTravelers = [...travelers]
        newTravelers[index] = { ...newTravelers[index], [field]: value }
        setTravelers(newTravelers)
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


    // Load Session
    useEffect(() => {
        if (!sessionId) return;

        const fetchSession = async () => {
            try {
                // Fetch trip plan session
                const res = await fetch(`http://localhost:8000/api/v1/trip-planner/session/${sessionId}`)
                if (!res.ok) throw new Error("Failed to load session")
                const data = await res.json()
                setSessionData(data)

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
                setTravelers(initialTravelers)

                // Calculate Total
                const count = adults + children
                const basePrice = data.price_per_person || 18000
                const flightPrice = data.flight_details?.price || 0
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


    if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto" /> Loading Checkout...</div>

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
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
                <CheckCircle className="h-20 w-20 text-green-500 mb-4" />
                <h1 className="text-3xl font-bold mb-2">Booking Confirmed!</h1>
                <p className="text-gray-600 mb-8">Your trip and flight tickets have been booked successfully.</p>

                {confirmation ? (
                    <div className="w-full max-w-2xl mb-8">
                        <FlightBookingDetails
                            details={confirmation}
                            travelers={confirmedBooking?.travelers || []}
                            contactInfo={contactInfo}
                        />
                    </div>
                ) : (
                    <Card className="w-full max-w-md mb-8">
                        <CardHeader>
                            <CardTitle>Booking Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-gray-500">Booking Ref</span>
                                <span className="font-mono font-bold">{confirmedBooking?.booking_reference}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-gray-500">Amount Paid</span>
                                <span className="font-bold">₹{confirmedBooking?.total_amount}</span>
                            </div>
                            <div className="bg-yellow-50 p-4 text-yellow-800 rounded">
                                Flight confirmation details pending or unavailable. Please check "My Bookings" later.
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Button onClick={() => router.push('/bookings')}>View My Bookings</Button>
            </div>
        )
    }

    const basePrice = sessionData?.price_per_person || 18000
    const flightPrice = sessionData?.flight_details?.price || 0

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="container mx-auto max-w-4xl">
                <h1 className="text-3xl font-bold mb-8">Checkout</h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        {travelers.map((t, idx) => (
                            <TravelerForm
                                key={t.id}
                                traveler={t}
                                index={idx}
                                onChange={handleTravelerChange}
                                errors={errors}
                            />
                        ))}

                        <Card>
                            <CardHeader>
                                <CardTitle>Contact Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium leading-none">
                                            Mobile Number
                                        </label>
                                        <PhoneInput
                                            country={'in'}
                                            value={contactPhone}
                                            onChange={phone => setContactPhone(phone)}
                                            inputProps={{
                                                name: 'phone',
                                                id: 'phone',
                                                required: true
                                            }}
                                            containerClass="w-full !rounded-md"
                                            inputClass="!w-full !h-10 !text-sm !border-input !rounded-md"
                                            buttonClass="!border-input !rounded-l-md !bg-white"
                                            dropdownClass="!rounded-md !shadow-lg"
                                        />
                                        {errors.phone && <p className="text-sm font-medium text-destructive">{errors.phone}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium leading-none">
                                            Email Address
                                        </label>
                                        <input
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            placeholder="Enter your email"
                                            type="email"
                                            value={contactEmail}
                                            onChange={(e) => setContactEmail(e.target.value)}
                                        />
                                        {errors.email && <p className="text-sm font-medium text-destructive">{errors.email}</p>}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium leading-none">
                                        Address
                                    </label>
                                    <input
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder="Enter your street address"
                                        value={contactAddress}
                                        onChange={(e) => setContactAddress(e.target.value)}
                                    />
                                    {errors.address && <p className="text-sm font-medium text-destructive">{errors.address}</p>}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium leading-none">
                                            Country
                                        </label>
                                        <select
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            value={contactCountry}
                                            onChange={(e) => {
                                                const code = e.target.value
                                                setContactCountry(code)
                                                const states = State.getStatesOfCountry(code)
                                                setCountryStates(states)
                                                setContactState('')
                                                setContactCity('')
                                                setStateCities([])
                                            }}
                                        >
                                            {allCountries.map(c => (
                                                <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
                                            ))}
                                        </select>
                                        {errors.country && <p className="text-sm font-medium text-destructive">{errors.country}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium leading-none">
                                            State
                                        </label>
                                        <select
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            value={contactState}
                                            onChange={(e) => {
                                                const stateCode = e.target.value
                                                setContactState(stateCode)
                                                const cities = City.getCitiesOfState(contactCountry, stateCode)
                                                setStateCities(cities)
                                                setContactCity('')
                                            }}
                                            disabled={!contactCountry}
                                        >
                                            <option value="">Select State</option>
                                            {countryStates.map(s => (
                                                <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
                                            ))}
                                        </select>
                                        {errors.state && <p className="text-sm font-medium text-destructive">{errors.state}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium leading-none">
                                            City
                                        </label>
                                        <select
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            value={contactCity}
                                            onChange={(e) => setContactCity(e.target.value)}
                                            disabled={!contactState}
                                        >
                                            <option value="">Select City</option>
                                            {stateCities.map(c => (
                                                <option key={c.name} value={c.name}>{c.name}</option>
                                            ))}
                                        </select>
                                        {errors.city && <p className="text-sm font-medium text-destructive">{errors.city}</p>}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-1">
                        <Card className="sticky top-4">
                            <CardHeader>
                                <CardTitle>Order Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between">
                                    <span>Package Cost</span>
                                    <span>₹{(basePrice * travelers.length).toLocaleString()}</span>
                                </div>
                                <div className="text-xs text-gray-400 -mt-2">
                                    ₹{basePrice.toLocaleString()} x {travelers.length} Travelers
                                </div>

                                {flightPrice > 0 && (
                                    <>
                                        <div className="flex justify-between text-blue-600">
                                            <span>Flight Add-on</span>
                                            <span>₹{(flightPrice * travelers.length).toLocaleString()}</span>
                                        </div>
                                        <div className="text-xs text-blue-400 -mt-2">
                                            ₹{flightPrice.toLocaleString()} x {travelers.length}
                                        </div>
                                    </>
                                )}

                                <div className="text-xs text-gray-400 pt-2 border-t border-dashed">
                                    <p>Hotels & Transfers: Coming later</p>
                                </div>

                                <div className="border-t pt-4 flex justify-between font-bold text-lg">
                                    <span>Total</span>
                                    <span>₹{totalAmount.toLocaleString()}</span>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button
                                    className="w-full"
                                    size="lg"
                                    onClick={handlePayment}
                                    disabled={step === 'PROCESSING'}
                                >
                                    {step === 'PROCESSING' ? (
                                        <><Loader2 className="animate-spin mr-2" /> Processing</>
                                    ) : (
                                        <><CreditCard className="mr-2" /> Pay & Book</>
                                    )}
                                </Button>
                            </CardFooter>
                        </Card>
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
