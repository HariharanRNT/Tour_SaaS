"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"

export default function VerifyPaymentLinkPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    
    const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying")
    const [errorMessage, setErrorMessage] = useState("")

    useEffect(() => {
        const verifyPayment = async () => {
            const razorpay_payment_id = searchParams?.get("razorpay_payment_id")
            const razorpay_payment_link_id = searchParams?.get("razorpay_payment_link_id")
            const razorpay_payment_link_reference_id = searchParams?.get("razorpay_payment_link_reference_id")
            const razorpay_payment_link_status = searchParams?.get("razorpay_payment_link_status")
            const razorpay_signature = searchParams?.get("razorpay_signature")

            if (!razorpay_payment_id || !razorpay_payment_link_id || !razorpay_signature) {
                setStatus("error")
                setErrorMessage("Invalid payment verification parameters.")
                return
            }

            try {
                // Call the new backend endpoint directly
                await api.post("/payments/verify-link", {
                    razorpay_payment_id,
                    razorpay_payment_link_id,
                    razorpay_payment_link_reference_id: razorpay_payment_link_reference_id || "",
                    razorpay_payment_link_status: razorpay_payment_link_status || "",
                    razorpay_signature
                })

                setStatus("success")
                toast.success("Payment verified successfully!")
                
                // Redirect back to bookings page after a short delay
                setTimeout(() => {
                    router.push("/bookings")
                }, 3000)
                
            } catch (err: any) {
                console.error("Payment verification failed:", err)
                setStatus("error")
                setErrorMessage(err.response?.data?.detail || "Failed to verify payment. Please contact support.")
            }
        }

        verifyPayment()
    }, [searchParams, router])

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                {status === "verifying" && (
                    <div className="flex flex-col items-center space-y-4">
                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">Verifying Payment...</h2>
                        <p className="text-gray-500">Please wait while we confirm your payment securely.</p>
                    </div>
                )}

                {status === "success" && (
                    <div className="flex flex-col items-center space-y-4">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">Payment Successful!</h2>
                        <p className="text-gray-500">Your final payment has been successfully verified.</p>
                        <p className="text-sm text-gray-400">Redirecting to your bookings...</p>
                    </div>
                )}

                {status === "error" && (
                    <div className="flex flex-col items-center space-y-4">
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                            <XCircle className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">Verification Failed</h2>
                        <p className="text-red-500">{errorMessage}</p>
                        <button 
                            onClick={() => router.push("/bookings")}
                            className="mt-4 px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                        >
                            Return to Bookings
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
