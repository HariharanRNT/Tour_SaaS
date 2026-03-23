'use client'

import { useState } from 'react'
import { Loader2, CreditCard, Lock } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter } from "@/components/ui/dialog"

interface MockPaymentModalProps {
    isOpen: boolean
    amount: number
    currency: string
    orderId: string
    onSuccess: (response: any) => void
    onClose: () => void
}

export function MockPaymentModal({
    isOpen,
    amount,
    currency,
    orderId,
    onSuccess,
    onClose
}: MockPaymentModalProps) {
    const [loading, setLoading] = useState(false)
    const [cardNumber, setCardNumber] = useState('')
    const [expiry, setExpiry] = useState('')
    const [cvv, setCvv] = useState('')
    const [name, setName] = useState('')

    const handlePay = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        // Simulate network delay
        setTimeout(() => {
            setLoading(false)
            const mockResponse = {
                razorpay_payment_id: "pay_mock_" + Math.random().toString(36).substring(7),
                razorpay_order_id: orderId,
                razorpay_signature: "mock_signature_verified"
            }
            onSuccess(mockResponse)
        }, 2000)
    }

    // Basic formatting for card number
    const formatCard = (val: string) => {
        return val.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19)
    }

    // Basic formatting for expiry
    const formatExpiry = (val: string) => {
        return val.replace(/\D/g, '').replace(/(.{2})/, '$1/').trim().slice(0, 5)
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Secure Payment (Test Mode)</DialogTitle>
                    <DialogDescription>
                        Enter dummy card details to simulate payment. No real money will be deducted.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handlePay} className="space-y-4 py-4">

                    <div className="space-y-2">
                        <Label>Card Number</Label>
                        <div className="relative">
                            <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="0000 0000 0000 0000"
                                className="pl-9"
                                value={cardNumber}
                                onChange={e => setCardNumber(formatCard(e.target.value))}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Expiry Date</Label>
                            <Input
                                placeholder="MM/YY"
                                value={expiry}
                                onChange={e => setExpiry(formatExpiry(e.target.value))}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>CVV</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                                <Input
                                    placeholder="123"
                                    type="password"
                                    className="pl-9"
                                    maxLength={3}
                                    value={cvv}
                                    onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Card Holder Name</Label>
                        <Input
                            placeholder="John Doe"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="bg-gray-50 p-4 rounded-md flex justify-between items-center text-sm font-medium">
                        <span>Total to Pay</span>
                        <span className="text-lg">
                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency }).format(amount / 100)}
                        </span>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                            {loading ? <><Loader2 className="animate-spin mr-2 h-4 w-4" /> Processing</> : 'Pay Now'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
