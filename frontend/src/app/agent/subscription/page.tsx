"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Script from 'next/script';
import { Check, Loader2, AlertTriangle, Calendar, CreditCard, PauseCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Plan {
    id: string;
    name: string;
    price: number;
    billing_cycle: string;
    features: string[];
    booking_limit: number;
    user_limit: number;
}

interface Subscription {
    id: string;
    plan_id: string;
    status: string;
    start_date: string;
    end_date: string;
    current_bookings_usage: number;
    updated_at?: string;
    plan: Plan;
}

export default function SubscriptionPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [activeSub, setActiveSub] = useState<Subscription | null>(null);
    const [upcomingSubs, setUpcomingSubs] = useState<Subscription[]>([]);
    const [historySubs, setHistorySubs] = useState<Subscription[]>([]);
    const [pausedSubs, setPausedSubs] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [activatingId, setActivatingId] = useState<string | null>(null);
    const [successPlan, setSuccessPlan] = useState<Plan | null>(null);
    const [isRazorpayLoaded, setIsRazorpayLoaded] = useState(false);

    // New Dialog State
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        title: string;
        description: string;
        action: () => Promise<void> | void;
        confirmText?: string;
    }>({ open: false, title: "", description: "", action: () => { } });

    const router = useRouter();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };

            // Fetch Plans
            const plansRes = await fetch('http://localhost:8000/api/v1/subscriptions/plans');
            if (plansRes.ok) {
                setPlans(await plansRes.json());
            }

            // Fetch Subscriptions
            const subRes = await fetch('http://localhost:8000/api/v1/subscriptions/my-subscription', { headers });
            if (subRes.ok) {
                const subs: Subscription[] = await subRes.json();

                // Categorize
                const active = subs.find(s => s.status === 'active');
                const upcoming = subs.filter(s => s.status === 'upcoming');
                const history = subs.filter(s => ['completed', 'expired', 'cancelled'].includes(s.status));
                const paused = subs.filter(s => s.status === 'on_hold');

                setActiveSub(active || null);
                setUpcomingSubs(upcoming);
                setPausedSubs(paused);
                setHistorySubs(history);
            }
        } catch (error) {
            console.error("Failed to load subscription data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleActivate = (subId: string, isPaused = false) => {
        const confirmMsg = isPaused
            ? "Ready to switch plans? We'll pause your current plan and resume this one immediately."
            : "Activate this plan now? Your current plan will be paused and saved for later.";

        setConfirmDialog({
            open: true,
            title: isPaused ? "Resume Plan" : "Activate Plan",
            description: confirmMsg,
            confirmText: isPaused ? "Resume Plan" : "Activate Plan",
            action: async () => {
                setActivatingId(subId);
                try {
                    const token = localStorage.getItem('token');
                    const res = await fetch(`http://localhost:8000/api/v1/subscriptions/${subId}/activate`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (res.ok) {
                        const updatedSub = await res.json();
                        toast.success(
                            isPaused
                                ? `Welcome back! You've successfully resumed your ${updatedSub.plan.name} plan.`
                                : `Success! Your ${updatedSub.plan.name} plan is now active.`
                        );
                        loadData();
                    } else {
                        const err = await res.json();
                        toast.error(err.detail || "We couldn't activate your plan. Please try again.");
                    }
                } catch (e) {
                    toast.error("Something went wrong. Please check your connection and try again.");
                } finally {
                    setActivatingId(null);
                    setConfirmDialog(prev => ({ ...prev, open: false }));
                }
            }
        });
    };

    const handleSuccess = (plan: Plan, message?: string) => {
        setSuccessPlan(plan);
        if (message) {
            toast.success(message);
        } else {
            toast.success(`Purchase successful! You have subscribed to ${plan.name}.`);
        }
        loadData();
    };

    const handlePurchase = async (plan: Plan) => {


        setProcessingId(plan.id);
        const token = localStorage.getItem('token');

        try {
            // 1. Create Order
            const orderRes = await fetch('http://localhost:8000/api/v1/subscriptions/purchase?plan_id=' + plan.id, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!orderRes.ok) {
                const err = await orderRes.json();
                throw new Error(err.detail || 'Unable to initiate purchase. Please try again.');
            }

            const orderData = await orderRes.json();

            // --- MOCK MODE CHECK ---
            if (orderData.key_id && orderData.key_id.includes('mock')) {
                const isQueue = activeSub ? true : false;
                const action = isQueue ? "QUEUE" : "ACTIVATE";

                setConfirmDialog({
                    open: true,
                    title: "Test Mode Payment",
                    description: `Simulate successful payment of ₹${plan.price}?\nThis will ${action} the plan.`,
                    confirmText: "Simulate Payment",
                    action: async () => {
                        try {
                            const verifyRes = await fetch('http://localhost:8000/api/v1/subscriptions/verify', {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    subscription_id: orderData.subscription_id,
                                    razorpay_order_id: orderData.order_id,
                                    razorpay_payment_id: "pay_mock_" + Math.random().toString(36).substring(7),
                                    razorpay_signature: "sig_mock_" + Math.random().toString(36).substring(7)
                                })
                            });

                            if (verifyRes.ok) {
                                const data = await verifyRes.json();
                                handleSuccess(plan, data.message);
                            } else {
                                toast.error("Simulation failed. Please try again.");
                            }
                        } catch (e) { console.error(e); }
                        setProcessingId(null);
                        setConfirmDialog(prev => ({ ...prev, open: false }));
                    }
                });
                return;
            }
            // -----------------------

            // 2. Open Razorpay (REAL MODE)
            if (!isRazorpayLoaded) {
                toast.error("Payment gateway is loading. Please wait a moment...");
                setProcessingId(null);
                return;
            }

            const options = {
                key: orderData.key_id,
                amount: orderData.amount,
                currency: orderData.currency,
                name: "Tour SaaS Subscription",
                description: `Subscription for ${plan.name}`,
                order_id: orderData.order_id,
                handler: async function (response: any) {
                    try {
                        const verifyRes = await fetch('http://localhost:8000/api/v1/subscriptions/verify', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                subscription_id: orderData.subscription_id,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            })
                        });

                        if (verifyRes.ok) {
                            const data = await verifyRes.json();
                            handleSuccess(plan, data.message);
                        } else {
                            toast.error("We couldn't verify your payment. Please contact support if money was deducted.");
                        }
                    } catch (e) {
                        console.error(e);
                        toast.error("An error occurred during verification. Please try again.");
                    } finally {
                        setProcessingId(null);
                    }
                },
                prefill: { email: "agent@example.com" },
                theme: { color: "#3399cc" },
                modal: {
                    ondismiss: function () {
                        setProcessingId(null);
                    }
                }
            };

            const rzp1 = new (window as any).Razorpay(options);
            rzp1.open();

        } catch (error: any) {
            toast.error(error.message || "Something went wrong. Please try again.");
            setProcessingId(null);
        }
    };

    const getDaysRemaining = (endDate: string) => {
        if (!endDate) return 0;
        const end = new Date(endDate);
        const now = new Date();
        const diff = end.getTime() - now.getTime();
        const days = Math.ceil(diff / (1000 * 3600 * 24));
        return days > 0 ? days : 0;
    };

    if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="container mx-auto py-12 px-4 max-w-6xl">
            <Script
                id="razorpay-checkout-js"
                src="https://checkout.razorpay.com/v1/checkout.js"
                onLoad={() => setIsRazorpayLoaded(true)}
            />

            <div className="mb-6">
                <Link href="/agent/dashboard">
                    <Button variant="ghost" className="pl-0 hover:pl-2 transition-all gap-2 text-gray-500 hover:text-gray-900">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Dashboard
                    </Button>
                </Link>
            </div>

            <h1 className="text-3xl font-bold mb-8 items-center flex gap-2">
                Subscription Management
            </h1>

            {/* 1. Active Plan Section */}
            {activeSub ? (
                <Card className="mb-10 border-blue-200 bg-blue-50/30">
                    <CardHeader className="pb-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <Badge className="mb-2 bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">Current Active Plan</Badge>
                                <CardTitle className="text-2xl text-blue-900">{activeSub.plan.name}</CardTitle>
                                <CardDescription>
                                    Active since {new Date(activeSub.start_date).toLocaleDateString()}
                                </CardDescription>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-gray-500 mb-1">Expires on</div>
                                <div className="font-semibold text-gray-900 flex items-center justify-end gap-2">
                                    <Calendar className="h-4 w-4 text-blue-600" />
                                    {new Date(activeSub.end_date).toLocaleDateString()}
                                </div>
                                <div className={`text-xs mt-1 font-medium ${getDaysRemaining(activeSub.end_date) < 7 ? 'text-red-500' : 'text-green-600'}`}>
                                    {getDaysRemaining(activeSub.end_date)} days remaining
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="font-medium text-gray-700">Monthly Usage</span>
                            <span className="text-gray-500">
                                {activeSub.current_bookings_usage} / {activeSub.plan.booking_limit === -1 ? '∞' : activeSub.plan.booking_limit} bookings
                            </span>
                        </div>
                        <Progress
                            value={activeSub.plan.booking_limit === -1 ? 0 : (activeSub.current_bookings_usage / activeSub.plan.booking_limit) * 100}
                            className="h-2"
                        />
                    </CardContent>
                </Card>
            ) : (
                <div className="mb-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                    <h3 className="text-lg font-semibold text-yellow-800">No Active Subscription</h3>
                    <p className="text-yellow-700">Purchase a plan below to start booking.</p>
                </div>
            )}

            {/* 2. Upcoming Plans Section */}
            {upcomingSubs.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-purple-600" /> Upcoming / Queued Plans
                    </h2>
                    <div className="grid gap-4">
                        {upcomingSubs.map(sub => (
                            <Card key={sub.id} className="border-purple-200 bg-purple-50/20">
                                <CardContent className="flex items-center justify-between p-6">
                                    <div>
                                        <Badge className="bg-purple-100 text-purple-700 mb-2">Upcoming</Badge>
                                        <h3 className="font-bold text-lg">{sub.plan.name}</h3>
                                        <p className="text-sm text-gray-500">Purchased on {new Date(sub.start_date || new Date()).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right mr-4">
                                            <p className="font-medium text-sm">Valid for {sub.plan.billing_cycle}</p>
                                            <p className="text-xs text-gray-500">Auto-activates when current plan ends</p>
                                        </div>
                                        <Button
                                            onClick={() => handleActivate(sub.id)}
                                            disabled={activatingId === sub.id}
                                            variant="outline"
                                            className="border-purple-600 text-purple-700 hover:bg-purple-100"
                                        >
                                            {activatingId === sub.id ? <Loader2 className="animate-spin h-4 w-4" /> : "Activate Now"}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* 3. Paused / On Hold Plans Section */}
            {pausedSubs.length > 0 && (
                <div className="mb-10">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <PauseCircle className="h-5 w-5 text-orange-600" /> Paused Plans
                    </h2>
                    <div className="grid gap-4">
                        {pausedSubs.map(sub => (
                            <Card key={sub.id} className="border-orange-200 bg-orange-50/20">
                                <CardContent className="flex items-center justify-between p-6">
                                    <div>
                                        <Badge className="bg-orange-100 text-orange-700 mb-2">On Hold</Badge>
                                        <h3 className="font-bold text-lg">{sub.plan.name}</h3>
                                        <p className="text-sm text-gray-500">Paused on {new Date(sub.updated_at || new Date()).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right mr-4">
                                            <p className="font-medium text-sm text-orange-800">
                                                {getDaysRemaining(sub.end_date)} days remaining
                                            </p>
                                            <p className="text-xs text-gray-500">Paused to use another plan</p>
                                        </div>
                                        <Button
                                            onClick={() => handleActivate(sub.id, true)}
                                            disabled={activatingId === sub.id}
                                            variant="outline"
                                            className="border-orange-600 text-orange-700 hover:bg-orange-100"
                                        >
                                            {activatingId === sub.id ? <Loader2 className="animate-spin h-4 w-4" /> : "Resume Plan"}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* 4. Available Plans */}
            <h2 className="text-xl font-bold mb-6">Available Plans</h2>
            <div className="grid md:grid-cols-3 gap-8 mb-12">
                {plans.map(plan => {
                    const isCurrent = activeSub?.plan_id === plan.id;
                    return (
                        <Card key={plan.id} className="flex flex-col hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                                <CardDescription className="flex items-baseline mt-2">
                                    <span className="text-3xl font-bold">₹{plan.price}</span>
                                    <span className="ml-1 text-muted-foreground">/{plan.billing_cycle}</span>
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <ul className="space-y-3">
                                    <li className="flex items-center">
                                        <Check className="h-4 w-4 text-green-500 mr-2" />
                                        <span>{plan.booking_limit === -1 ? 'Unlimited' : plan.booking_limit} Bookings/mo</span>
                                    </li>
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-center">
                                            <Check className="h-4 w-4 text-green-500 mr-2" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Button
                                    className="w-full"
                                    onClick={() => handlePurchase(plan)}
                                    disabled={processingId === plan.id}
                                >
                                    {processingId === plan.id ? <Loader2 className="animate-spin mr-2" /> : null}
                                    {activeSub ? 'Buy & Queue' : 'Subscribe Now'}
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>

            {/* 4. History */}
            {historySubs.length > 0 && (
                <div className="mt-12 pt-8 border-t">
                    <h2 className="text-xl font-bold mb-6 text-gray-700">Subscription History</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-600 uppercase">
                                <tr>
                                    <th className="px-4 py-3">Plan</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Dates</th>
                                    <th className="px-4 py-3">Usage</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historySubs.map(sub => (
                                    <tr key={sub.id} className="border-b hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium">{sub.plan.name}</td>
                                        <td className="px-4 py-3">
                                            <Badge variant="outline" className={`
                                                ${sub.status === 'completed' ? 'border-green-200 bg-green-50 text-green-700' :
                                                    sub.status === 'on_hold' ? 'border-orange-200 bg-orange-50 text-orange-700' :
                                                        'bg-gray-100 text-gray-700'}
                                            `}>
                                                {sub.status.replace('_', ' ')}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">
                                            {new Date(sub.start_date).toLocaleDateString()} - {new Date(sub.end_date).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">
                                            {sub.current_bookings_usage} bookings
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog(prev => ({ ...prev, open: false }))}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
                        <AlertDialogDescription className="whitespace-pre-line">
                            {confirmDialog.description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => {
                            setConfirmDialog(prev => ({ ...prev, open: false }));
                            setProcessingId(null);
                        }}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                            confirmDialog.action();
                        }}>
                            {confirmDialog.confirmText || "Confirm"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
