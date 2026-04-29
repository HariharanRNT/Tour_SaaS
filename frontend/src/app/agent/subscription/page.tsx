"use client"

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Script from 'next/script';
import { Check, Loader2, AlertTriangle, Calendar, CreditCard, PauseCircle, ArrowLeft, Sparkles, Rocket, ChevronDown, Zap, Clock, Download, Filter, Search, X } from "lucide-react";
import Link from "next/link";
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/lib/api';

interface Plan {
    id: string;
    name: string;
    price: number;
    billing_cycle: string;
    features: { category: string; items: string[] }[];
    booking_limit: number;
    user_limit: number;
    duration_days?: number;
    is_popular?: boolean;
}

interface Subscription {
    id: string;
    plan_id: string;
    status: string;
    start_date: string;
    end_date: string;
    current_bookings_usage: number;
    updated_at?: string;
    created_at?: string;
    plan: Plan;
}

export default function SubscriptionPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { refreshUser } = useAuth();

    // Check if sub-user (they shouldn't be here)
    useEffect(() => {
        const userStr = localStorage.getItem('user')
        if (userStr) {
            const user = JSON.parse(userStr)
            if (user.role?.toLowerCase() === 'sub_user') {
                router.push('/agent/dashboard')
            }
        }
    }, [router])

    const [processingId, setProcessingId] = useState<string | null>(null);
    const [activatingId, setActivatingId] = useState<string | null>(null);
    const [successPlan, setSuccessPlan] = useState<Plan | null>(null);
    const [isRazorpayLoaded, setIsRazorpayLoaded] = useState(false);

    // Live countdown display for plans expiring within 24 hours
    const [countdownText, setCountdownText] = useState<string>('');
    const countdownRef = useRef<NodeJS.Timeout | null>(null);

    // History Table State
    const [historyPage, setHistoryPage] = useState(1);
    const [historyDateFilter, setHistoryDateFilter] = useState<{ start: string; end: string }>({ start: '', end: '' });
    const ITEMS_PER_PAGE = 5;

    // Queries
    const { data: plans = [], isLoading: plansLoading } = useQuery({
        queryKey: ['subscription-plans'],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/api/v1/subscriptions/plans`);
            if (!res.ok) throw new Error('Failed to fetch plans');
            const rawPlans = await res.json();
            return rawPlans.map((p: any) => {
                let period = '/mo';
                if (p.billing_cycle === 'yearly') period = '/yr';
                if (p.billing_cycle === 'lifetime') period = '';
                if (p.duration_days === 1) period = '/day';
                else if (p.duration_days) period = `/${p.duration_days}d`;

                return {
                    ...p,
                    features: Array.isArray(p.features) && typeof p.features[0] === 'string'
                        ? [
                            { category: "USAGE LIMITS", items: [`${p.booking_limit === -1 ? 'Unlimited' : p.booking_limit} Bookings${period}`, `${p.user_limit || 1} User(s)`] },
                            { category: "FEATURES", items: p.features },
                            { category: "PRICING", items: ["Standard Commission"] }
                        ]
                        : p.features
                };
            });
        }
    });

    const { data: subsData, isLoading: subsLoading } = useQuery({
        queryKey: ['my-subscriptions'],
        queryFn: async () => {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };

            // Check expiry first
            await fetch(`${API_URL}/api/v1/subscriptions/check-expiry`, {
                method: 'POST',
                headers
            }).catch(() => { });

            const res = await fetch(`${API_URL}/api/v1/subscriptions/my-subscription`, { headers });
            if (!res.ok) throw new Error('Failed to fetch subscriptions');
            const subs: Subscription[] = await res.json();

            const todayStr = new Date().toISOString().split('T')[0];
            const active = subs.find(s => s.status === 'active' && s.end_date >= todayStr);
            const upcoming = subs.filter(s => s.status === 'upcoming');
            const history = subs.filter(s => ['completed', 'expired', 'cancelled'].includes(s.status)
                || (s.status === 'active' && s.end_date < todayStr));
            const paused = subs.filter(s => s.status === 'on_hold');

            return { active, upcoming, history, paused };
        }
    });

    const activeSub = subsData?.active || null;
    const upcomingSubs = subsData?.upcoming || [];
    const historySubs = subsData?.history || [];
    const pausedSubs = subsData?.paused || [];
    const loading = plansLoading || subsLoading;

    // Mutations
    const activateMutation = useMutation({
        mutationFn: async (subId: string) => {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/v1/subscriptions/${subId}/activate`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Activation failed");
            }
            return res.json();
        },
        onSuccess: async (updatedSub) => {
            queryClient.invalidateQueries({ queryKey: ['my-subscriptions'] });
            
            // Refresh global auth state to update SubscriptionGuard
            await refreshUser();
            
            toast.success(`Success! Your ${updatedSub.plan.name} plan is now active.`);

            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                user.has_active_subscription = true;
                user.subscription_status = 'active';
                localStorage.setItem('user', JSON.stringify(user));
            }
            router.push('/agent/dashboard');
        },
        onError: (error: any) => {
            toast.error(error.message || "We couldn't activate your plan. Please try again.");
        },
        onSettled: () => setActivatingId(null)
    });

    const cancelMutation = useMutation({
        mutationFn: async (subId: string) => {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/v1/subscriptions/${subId}/cancel-request`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Cancellation request failed");
            }
            return res.json();
        },
        onSuccess: (data) => {
            toast.success(data.message || "Cancellation request sent to administrators.");
            queryClient.invalidateQueries({ queryKey: ['my-subscriptions'] });
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to send cancellation request.");
        }
    });

    const getBillingCycleDisplay = (plan: Plan) => {
        if (plan.billing_cycle === 'monthly') return 'Monthly';
        if (plan.billing_cycle === 'yearly') return 'Yearly';
        if (plan.billing_cycle === 'lifetime') return 'Lifetime';
        if (plan.duration_days === 1) return 'Daily';
        if (plan.duration_days) return `${plan.duration_days} Days`;
        return 'Custom';
    };

    const getBillingCycleShort = (plan: Plan) => {
        if (plan.billing_cycle === 'monthly') return '/mo';
        if (plan.billing_cycle === 'yearly') return '/yr';
        if (plan.billing_cycle === 'lifetime') return '';
        if (plan.duration_days === 1) return '/day';
        if (plan.duration_days) return `/${plan.duration_days}d`;
        return '';
    };

    const getPlanTheme = (planName: string) => {
        const lower = planName.toLowerCase();
        if (lower.includes('gold')) return { color: 'amber', hex: '#F59E0B', bg: 'bg-amber-50', border: 'border-amber-500', text: 'text-amber-600', badge: 'bg-amber-100 text-amber-800', gradient: 'from-amber-600 to-[var(--gradient-end)]' };
        if (lower.includes('pro')) return { color: 'indigo', hex: '#6366F1', bg: 'bg-indigo-50', border: 'border-indigo-500', text: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-800', gradient: 'from-indigo-600 to-violet-600' };
        if (lower.includes('enterprise')) return { color: 'violet', hex: '#8B5CF6', bg: 'bg-violet-50', border: 'border-violet-500', text: 'text-violet-600', badge: 'bg-violet-100 text-violet-800', gradient: 'from-violet-600 to-purple-600' };
        return { color: 'blue', hex: '#3B82F6', bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-800', gradient: 'from-blue-600 to-cyan-600' };
    };

    const getPlanIcon = (planName: string) => {
        const lower = planName.toLowerCase();
        if (lower.includes('pro')) return "🚀";
        if (lower.includes('gold')) return "⭐";
        if (lower.includes('enterprise')) return "🏢";
        return "🌱";
    };

    const filteredHistory = historySubs.filter(sub => {
        if (!historyDateFilter.start && !historyDateFilter.end) return true;
        const subDate = new Date(sub.start_date).getTime();
        const start = historyDateFilter.start ? new Date(historyDateFilter.start).getTime() : 0;
        const end = historyDateFilter.end ? new Date(historyDateFilter.end).getTime() : Infinity;
        return subDate >= start && subDate <= end;
    });

    const paginatedHistory = filteredHistory.slice((historyPage - 1) * ITEMS_PER_PAGE, historyPage * ITEMS_PER_PAGE);
    const totalHistoryPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE);

    const exportHistory = () => {
        const headers = ["Plan Name", "Status", "Start Date", "End Date", "Usage"];
        const rows = filteredHistory.map((sub: Subscription) => [
            sub.plan.name,
            sub.status,
            new Date(sub.start_date).toLocaleDateString(),
            new Date(sub.end_date).toLocaleDateString(),
            sub.current_bookings_usage.toString()
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map((e: string[]) => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "subscription_history.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // New Dialog State
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        title: string;
        description: string;
        action: () => Promise<void> | void;
        confirmText?: string;
    }>({ open: false, title: "", description: "", action: () => { } });

    useEffect(() => {
        if (typeof window !== 'undefined' && 'Razorpay' in window) {
            setIsRazorpayLoaded(true);
        }
        // Cleanup countdown interval on unmount
        return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
    }, []);

    // Live countdown: updates every second when plan expires within 24h
    useEffect(() => {
        if (countdownRef.current) clearInterval(countdownRef.current);
        if (!activeSub) return;

        const updateCountdown = () => {
            const msLeft = new Date(activeSub.end_date).getTime() - Date.now();
            if (msLeft <= 0) {
                setCountdownText('Expired');
                clearInterval(countdownRef.current!);
                // Trigger a reload to pick up the new state after expiry
                queryClient.invalidateQueries({ queryKey: ['my-subscriptions'] });
                return;
            }
            const hoursLeft = Math.floor(msLeft / (1000 * 3600));
            const minsLeft = Math.floor((msLeft % (1000 * 3600)) / 60000);
            if (hoursLeft >= 1) {
                setCountdownText(`${hoursLeft} hr${hoursLeft > 1 ? 's' : ''} left`);
            } else if (minsLeft >= 1) {
                setCountdownText(`${minsLeft} min left`);
            } else {
                setCountdownText('Expiring soon');
            }
        };

        const msToExpiry = new Date(activeSub.end_date).getTime() - Date.now();
        if (msToExpiry < 24 * 3600 * 1000) {
            // Less than 24h: start live countdown
            updateCountdown();
            countdownRef.current = setInterval(updateCountdown, 30000); // update every 30s
        } else {
            setCountdownText('');
        }

        return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
    }, [activeSub]);

    const handleActivate = (subId: string, isPaused = false) => {
        const confirmMsg = isPaused
            ? "Ready to switch plans? We'll pause your current plan and resume this one immediately."
            : "Activate this plan now? Your current plan will be paused and saved for later.";

        setConfirmDialog({
            open: true,
            title: isPaused ? "Resume Plan" : "Activate Plan",
            description: confirmMsg,
            confirmText: isPaused ? "Resume Plan" : "Activate Plan",
            action: () => {
                setActivatingId(subId);
                activateMutation.mutate(subId);
                setConfirmDialog(prev => ({ ...prev, open: false }));
            }
        });
    };

    const handleCancelRequest = (subId: string) => {
        setConfirmDialog({
            open: true,
            title: "Cancel Subscription?",
            description: "This will send a cancellation request to our administrators. Your plan will remain active until they process your request or it expires naturally. We may contact you to confirm.",
            confirmText: "Send Cancellation Request",
            action: () => {
                cancelMutation.mutate(subId);
                setConfirmDialog(prev => ({ ...prev, open: false }));
            }
        });
    };

    const handleSuccess = async (plan: Plan, message?: string) => {
        setSuccessPlan(plan);
        if (message) {
            toast.success(message);
        } else {
            toast.success(`Purchase successful! You have subscribed to ${plan.name}.`);
        }

        // Update local user data and redirect
        const userStr = localStorage.getItem('user');
        // Refresh global auth state to update SubscriptionGuard
        await refreshUser();

        // Invalidate queries to update billing UI
        queryClient.invalidateQueries({ queryKey: ['my-subscriptions'] });

        if (userStr) {
            const user = JSON.parse(userStr);
            user.has_active_subscription = true;
            user.subscription_status = 'active';
            localStorage.setItem('user', JSON.stringify(user));
        }

        setTimeout(() => {
            router.push('/agent/dashboard');
        }, 1500);
    };

    const handlePurchase = async (plan: Plan) => {
        setProcessingId(plan.id);
        const token = localStorage.getItem('token');

        try {
            // 1. Create Order / Subscription
            const orderRes = await fetch(`${API_URL}/api/v1/subscriptions/purchase?plan_id=` + plan.id, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!orderRes.ok) {
                const err = await orderRes.json();
                throw new Error(err.detail || 'Unable to initiate purchase. Please try again.');
            }

            const orderData = await orderRes.json();

            // --- MOCK MODE CHECK ---
            if ((orderData.key_id && orderData.key_id.includes('mock')) || (orderData.razorpay_subscription_id && orderData.razorpay_subscription_id.includes('mock'))) {
                const isQueue = activeSub ? true : false;
                const action = isQueue ? "QUEUE" : "ACTIVATE";

                setConfirmDialog({
                    open: true,
                    title: "Test Mode Payment",
                    description: `Simulate successful payment of ₹${plan.price}?\nThis will ${action} the plan.\n(Auto-Renewal Enabled)`,
                    confirmText: "Simulate Payment",
                    action: async () => {
                        try {
                            const verifyRes = await fetch(`${API_URL}/api/v1/subscriptions/verify`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    subscription_id: orderData.subscription_id,
                                    razorpay_order_id: orderData.order_id,
                                    razorpay_payment_id: "pay_mock_" + Math.random().toString(36).substring(7),
                                    razorpay_signature: "sig_mock_" + Math.random().toString(36).substring(7),
                                    razorpay_subscription_id: orderData.razorpay_subscription_id
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

            const options: any = {
                key: orderData.key_id,
                amount: orderData.amount,
                currency: orderData.currency,
                name: "Tour SaaS Subscription",
                description: `Subscription for ${plan.name}`,
                handler: async function (response: any) {
                    console.log("Razorpay Response:", response);
                    try {
                        const verifyRes = await fetch(`${API_URL}/api/v1/subscriptions/verify`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                subscription_id: orderData.subscription_id,
                                razorpay_order_id: response.razorpay_order_id || orderData.order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                razorpay_subscription_id: response.razorpay_subscription_id || orderData.razorpay_subscription_id
                            })
                        });

                        if (verifyRes.ok) {
                            const data = await verifyRes.json();
                            handleSuccess(plan, data.message);
                        } else {
                            const err = await verifyRes.json();
                            console.error("Verification Error:", err);
                            toast.error(err.detail || "We couldn't verify your payment. Please contact support if money was deducted.");
                        }
                    } catch (e) {
                        console.error(e);
                        toast.error("An error occurred during verification. Please try again.");
                    } finally {
                        setProcessingId(null);
                    }
                },
                prefill: { email: "agent@example.com" },
                modal: {
                    ondismiss: function () {
                        setProcessingId(null);
                    }
                }
            };

            // Use subscription_id if available, otherwise order_id
            if (orderData.razorpay_subscription_id) {
                options.subscription_id = orderData.razorpay_subscription_id;
            } else {
                options.order_id = orderData.order_id;
            }

            const rzp1 = new (window as any).Razorpay(options);
            rzp1.open();

        } catch (error: any) {
            toast.error(error.message || "Something went wrong. Please try again.");
            setProcessingId(null);
        }
    };

    const getDaysRemaining = (endDate: string): number => {
        if (!endDate) return 0;
        const diff = new Date(endDate).getTime() - Date.now();
        const days = Math.ceil(diff / (1000 * 3600 * 24));
        return days > 0 ? days : 0;
    };

    // Returns formatted time remaining: days, hours, minutes, or countdown
    const getExpiryLabel = (endDate: string): { text: string; isUrgent: boolean } => {
        const msLeft = new Date(endDate).getTime() - Date.now();
        if (msLeft <= 0) return { text: 'Expired', isUrgent: true };
        const daysLeft = Math.floor(msLeft / (1000 * 3600 * 24));
        if (daysLeft >= 1) return { text: `${daysLeft} day${daysLeft > 1 ? 's' : ''} left`, isUrgent: daysLeft < 7 };
        // < 1 day: use live countdown
        return { text: countdownText || 'Less than a day', isUrgent: true };
    };

    if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="min-h-screen">
            <Script
                id="razorpay-checkout-js"
                src="https://checkout.razorpay.com/v1/checkout.js"
                onLoad={() => setIsRazorpayLoaded(true)}
            />

            <div className="container mx-auto py-8 px-4 max-w-6xl">
                {/* Header Section */}
                <div className="mb-8">
                    {/* Breadcrumb */}
                    <nav className="flex items-center text-sm text-[var(--color-primary-font)]/60 mb-6">
                        <Link href="/agent/dashboard" className="hover:text-[var(--color-primary-font)] transition-colors">
                            Dashboard
                        </Link>
                        <span className="mx-2">/</span>
                        <span className="font-medium text-[var(--color-primary-font)]">Billing</span>
                    </nav>

                    {/* Title Area */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <CreditCard className="h-8 w-8 text-blue-600" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-[var(--color-primary-font)]">Billing</h1>
                                <p className="text-[var(--color-primary-font)]/60 mt-1">Manage your active plans, billing history, and upgrades</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 1. Active Plan Section */}
                {activeSub ? (
                    <div className="mb-12">
                        <div className="flex items-center gap-2 mb-4">
                            <Sparkles className="h-5 w-5 text-indigo-600" />
                            <h2 className="text-lg font-bold text-[var(--color-primary-font)]">Current Subscription</h2>
                        </div>

                        <Card className="glass-agent border-0 overflow-hidden relative">
                            {/* Decorative background element */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                            <CardContent className="p-8 relative z-10">
                                <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white border-0 px-3 py-1 text-sm font-medium shadow-sm flex items-center gap-1.5">
                                                <Rocket className="h-3.5 w-3.5" />
                                                Active Plan
                                            </Badge>
                                            <Badge variant="outline" className="border-indigo-200 text-indigo-700 bg-white/50">
                                                Auto-Renews
                                            </Badge>
                                        </div>
                                        <h3 className="text-3xl font-bold text-[var(--color-primary-font)] mb-1">{activeSub.plan.name}</h3>
                                        <p className="text-[var(--color-primary-font)]/80 font-medium flex items-center gap-2">
                                            {getBillingCycleDisplay(activeSub.plan)} Billing
                                            <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                                            <span className="text-[var(--color-primary-font)] font-bold">₹{activeSub.plan.price.toLocaleString()}</span>
                                            <span className="text-[var(--color-primary-font)]/60">{getBillingCycleShort(activeSub.plan)}</span>
                                        </p>
                                    </div>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button className="bg-white/60 backdrop-blur-sm text-violet-700 hover:bg-white/80 border border-white/70 shadow-sm font-semibold group rounded-full">
                                                Manage Plan
                                                <ChevronDown className="ml-2 h-4 w-4 group-hover:translate-y-0.5 transition-transform" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-56">
                                            <DropdownMenuItem onClick={() => document.getElementById('available-plans')?.scrollIntoView({ behavior: 'smooth' })}>
                                                Upgrade Plan
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                onClick={() => handleCancelRequest(activeSub.id)}
                                                disabled={cancelMutation.isPending}
                                            >
                                                {cancelMutation.isPending ? "Sending Request..." : "Cancel Subscription"}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-indigo-100 shadow-sm">
                                        <div className="flex items-center gap-2 mb-1 text-[var(--color-primary-font)]/60 text-xs font-bold uppercase tracking-wider">
                                            <Calendar className="h-3.5 w-3.5" />
                                            Expires On
                                        </div>
                                        <div className="text-lg font-bold text-[var(--color-primary-font)]">
                                            {new Date(activeSub.end_date).toLocaleDateString()}
                                        </div>
                                        <div className={`text-xs font-semibold mt-1 flex items-center gap-1 ${getExpiryLabel(activeSub.end_date).isUrgent ? 'text-red-600' : 'text-emerald-600'}`}>
                                            {getExpiryLabel(activeSub.end_date).isUrgent && getDaysRemaining(activeSub.end_date) < 1 && (
                                                <Clock className="h-3 w-3 animate-pulse" />
                                            )}
                                            {getExpiryLabel(activeSub.end_date).text}
                                        </div>
                                    </div>

                                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-indigo-100 shadow-sm">
                                        <div className="flex items-center gap-2 mb-1 text-[var(--color-primary-font)]/60 text-xs font-bold uppercase tracking-wider">
                                            <CreditCard className="h-3.5 w-3.5" />
                                            Next Bill
                                        </div>
                                        <div className="text-lg font-bold text-[var(--color-primary-font)]">
                                            ₹{activeSub.plan.price.toLocaleString()}
                                        </div>
                                        <div className="text-xs font-semibold mt-1 text-indigo-600">
                                            {getDaysRemaining(activeSub.end_date) > 0
                                                ? `Due in ${getDaysRemaining(activeSub.end_date)} day${getDaysRemaining(activeSub.end_date) > 1 ? 's' : ''}`
                                                : 'Due today'}
                                        </div>
                                    </div>

                                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-indigo-100 shadow-sm">
                                        <div className="flex items-center gap-2 mb-1 text-[var(--color-primary-font)]/60 text-xs font-bold uppercase tracking-wider">
                                            <Zap className="h-3.5 w-3.5" />
                                            Bookings Usage
                                        </div>
                                        <div className="text-lg font-bold text-[var(--color-primary-font)]">
                                            {activeSub.current_bookings_usage} / {activeSub.plan.booking_limit === -1 ? '∞' : activeSub.plan.booking_limit}
                                        </div>
                                        <div className="text-xs font-semibold mt-1 text-indigo-600">
                                            {activeSub.plan.booking_limit === -1 ?
                                                'Unlimited access' :
                                                `${activeSub.plan.booking_limit - activeSub.current_bookings_usage} remaining`
                                            }
                                        </div>
                                    </div>
                                </div>

                                {/* Billing Cycle Progress */}
                                <div>
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-sm font-semibold text-[var(--color-primary-font)]">Billing Cycle Progress</span>
                                        <span className="text-xs font-medium text-[var(--color-primary-font)]">
                                            {activeSub.plan.booking_limit !== -1 && (
                                                <span className="opacity-75 mr-2">
                                                    {Math.round((activeSub.current_bookings_usage / activeSub.plan.booking_limit) * 100)}% usage
                                                </span>
                                            )}
                                            {(() => {
                                                const start = new Date(activeSub.start_date).getTime();
                                                const end = new Date(activeSub.end_date).getTime();
                                                const now = new Date().getTime();
                                                const total = end - start;
                                                const elapsed = now - start;
                                                const percent = Math.min(Math.round((elapsed / total) * 100), 100);
                                                return `${percent}% cycle complete`;
                                            })()}
                                        </span>
                                    </div>
                                    <div className="h-3 bg-white/50 rounded-full overflow-hidden border border-indigo-100 p-0.5">
                                        <div
                                            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-1000 ease-out shadow-sm"
                                            style={{
                                                width: `${(() => {
                                                    const start = new Date(activeSub.start_date).getTime();
                                                    const end = new Date(activeSub.end_date).getTime();
                                                    const now = new Date().getTime();
                                                    const total = end - start;
                                                    const elapsed = now - start;
                                                    return Math.min(((elapsed / total) * 100), 100);
                                                })()}%`
                                            }}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    <div className="mb-12 p-8 bg-red-50/50 backdrop-blur-sm border border-red-200 rounded-2xl text-center shadow-sm">
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="h-8 w-8" />
                        </div>
                        <h3 className="text-xl font-bold text-red-900 mb-2">
                            {historySubs.length > 0 ? 'Your Plan Has Expired' : 'No Active Subscription'}
                        </h3>
                        <p className="text-red-700/80 mb-6 max-w-md mx-auto">
                            {historySubs.length > 0
                                ? 'Your plan has expired. Please purchase a new plan to continue using the agent portal.'
                                : 'Your account does not have an active subscription. Choose a plan below to get started.'
                            }
                        </p>
                        <Button
                            onClick={() => document.getElementById('available-plans')?.scrollIntoView({ behavior: 'smooth' })}
                            className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full px-8 shadow-lg shadow-red-600/20"
                        >
                            {historySubs.length > 0 ? 'Buy New Plan' : 'View Plans'}
                        </Button>
                    </div>
                )}

                {/* 2. Upcoming Plans Section */}
                {upcomingSubs.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-purple-600" /> Upcoming / Queued Plans
                        </h2>
                        <div className="grid gap-4">
                            {upcomingSubs.map((sub: Subscription) => (
                                <Card key={sub.id} className="border-purple-200 bg-purple-50/20">
                                    <CardContent className="flex items-center justify-between p-6">
                                        <div>
                                            <Badge className="bg-purple-100 text-purple-700 mb-2">Upcoming</Badge>
                                            <h3 className="font-bold text-lg text-[var(--color-primary-font)]">{sub.plan.name}</h3>
                                            <p className="text-sm text-[var(--color-primary-font)]/60">Purchased on {new Date(sub.created_at || sub.start_date || new Date()).toLocaleDateString()}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right mr-4 text-[var(--color-primary-font)]">
                                                <p className="font-medium text-sm">Valid for {getBillingCycleDisplay(sub.plan)}</p>
                                                <p className="text-xs text-[var(--color-primary-font)]/60">Auto-activates when current plan ends</p>
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
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-[var(--color-primary-font)]">
                            <PauseCircle className="h-5 w-5 text-amber-600" /> Paused Plans
                        </h2>
                        <div className="flex flex-col gap-4">
                            {pausedSubs.map((sub: Subscription) => (
                                <div key={sub.id} className="relative overflow-hidden rounded-xl border-l-4 border-amber-500 bg-gradient-to-r from-amber-50 to-orange-50 p-6 shadow-sm">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div className="flex items-start gap-4">
                                            <div className="p-2 bg-amber-100 rounded-lg flex-shrink-0 mt-1">
                                                <AlertTriangle className="h-6 w-6 text-amber-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg text-[var(--color-primary-font)] flex items-center gap-2">
                                                    Subscription Paused
                                                    <Badge className="bg-amber-200 text-amber-800 hover:bg-amber-200 border-0">
                                                        {sub.plan.name}
                                                    </Badge>
                                                </h3>
                                                <p className="text-[var(--color-primary-font)]/80 mt-1 font-medium">
                                                    Your plan is currently on hold.
                                                    {sub.end_date && ` It is scheduled to auto-resume on ${new Date(sub.end_date).toLocaleDateString()}.`}
                                                </p>
                                                <p className="text-sm text-[var(--color-primary-font)]/60 mt-2 flex items-center gap-1.5">
                                                    <PauseCircle className="h-3.5 w-3.5" />
                                                    Paused on {new Date(sub.updated_at || new Date()).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3 md:justify-end">
                                            <Button
                                                onClick={() => handleActivate(sub.id, true)}
                                                disabled={activatingId === sub.id}
                                                className="bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20 shadow-md border-0"
                                            >
                                                {activatingId === sub.id ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                                                Resume Now
                                            </Button>
                                            <Button
                                                variant="outline"
                                                className="bg-white border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                                            >
                                                Change Date
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                className="text-amber-700 hover:bg-amber-100 hover:text-amber-900"
                                            >
                                                Cancel Pause
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 4. Available Plans */}
                <div id="available-plans" className="mb-16 scroll-mt-24">
                    <div className="text-center mb-10">
                        <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 mb-3 border-0">
                            Subscription Plans
                        </Badge>
                        <h2 className="text-3xl font-bold text-[var(--color-primary-font)] mb-3 flex items-center justify-center gap-2">
                            💎 Choose Your Plan
                        </h2>
                        <div className="flex justify-center items-center gap-4 mb-4">
                            <p className="text-[var(--color-primary-font)]/60">
                                Select the perfect plan for your business needs. Upgrade anytime.
                            </p>

                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-2">
                                        <ArrowLeft className="h-4 w-4 rotate-180" /> Compare Plans
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white/70 backdrop-blur-[40px] border border-white/20 rounded-[32px] p-0 shadow-2xl">
                                    <div className="sticky top-0 z-20 bg-white/60 backdrop-blur-3xl px-8 py-6 border-b border-white/10 flex items-center justify-between">
                                        <DialogHeader>
                                            <DialogTitle className="text-2xl font-black text-[var(--color-primary-font)] tracking-tight uppercase flex items-center gap-2">
                                                ⚖️ Compare <span className="text-indigo-600">All Plans</span>
                                            </DialogTitle>
                                            <DialogDescription className="text-[var(--color-primary-font)]/50 font-medium text-xs mt-1 uppercase tracking-wider">
                                                Find the perfect fit for your agency
                                            </DialogDescription>
                                        </DialogHeader>
                                    </div>
                                    <div className="p-8">
                                        <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/20 backdrop-blur-sm">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="bg-white/40 hover:bg-white/40 border-b border-white/40">
                                                        <TableHead className="w-[200px] font-black text-[var(--color-primary-font)]/50 uppercase tracking-widest text-[10px] py-5 pl-6">Feature</TableHead>
                                                        {plans.map((p: Plan) => (
                                                            <TableHead key={p.id} className="text-center font-black text-[var(--color-primary-font)] uppercase tracking-widest text-[10px] py-5 px-4">{p.name}</TableHead>
                                                        ))}
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    <TableRow className="hover:bg-white/30 border-b border-white/20 transition-colors">
                                                        <TableCell className="font-bold text-[var(--color-primary-font)]/60 py-4 pl-6 text-[13px]">Monthly Price</TableCell>
                                                        {plans.map((p: Plan) => (
                                                            <TableCell key={p.id} className="text-center font-black text-indigo-600 text-[15px] py-4">₹{p.price.toLocaleString()}</TableCell>
                                                        ))}
                                                    </TableRow>
                                                    <TableRow className="hover:bg-white/30 border-b border-white/20 transition-colors">
                                                        <TableCell className="font-bold text-[var(--color-primary-font)]/60 py-4 pl-6 text-[13px]">Bookings Limit</TableCell>
                                                        {plans.map((p: Plan) => (
                                                            <TableCell key={p.id} className="text-center font-bold text-[var(--color-primary-font)]/70 py-4">{p.booking_limit === -1 ? 'Unlimited' : p.booking_limit}</TableCell>
                                                        ))}
                                                    </TableRow>
                                                    <TableRow className="hover:bg-white/30 border-b border-white/20 transition-colors">
                                                        <TableCell className="font-bold text-[var(--color-primary-font)]/60 py-4 pl-6 text-[13px]">Users Access</TableCell>
                                                        {plans.map((p: Plan) => (
                                                            <TableCell key={p.id} className="text-center font-bold text-[var(--color-primary-font)]/70 py-4">{p.user_limit || 'Varies'}</TableCell>
                                                        ))}
                                                    </TableRow>
                                                    <TableRow className="hover:bg-white/30 border-0 transition-colors">
                                                        <TableCell className="font-bold text-[var(--color-primary-font)]/60 py-5 pl-6 text-[13px]">Support Level</TableCell>
                                                        {plans.map((p: Plan) => {
                                                            const theme = getPlanTheme(p.name);
                                                            return (
                                                                <TableCell key={p.id} className="text-center py-5">
                                                                    <Badge className={cn("font-black text-[9px] py-1 px-3 rounded-full border shadow-sm uppercase tracking-widest", theme.badge, "border-0")}>
                                                                        {p.name.includes('Pro') ? 'Priority' : p.name.includes('Enterprise') ? '24/7 Dedicated' : 'Standard'}
                                                                    </Badge>
                                                                </TableCell>
                                                            )
                                                        })}
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50/50 backdrop-blur-md px-8 py-5 flex justify-end gap-3 border-t border-white/20">
                                        <DialogTrigger asChild>
                                            <Button className="h-11 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-lg shadow-indigo-600/20 uppercase tracking-widest text-[11px]">
                                                Got it
                                            </Button>
                                        </DialogTrigger>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                        {plans.map((plan: Plan) => {
                            const isCurrent = activeSub?.plan_id === plan.id;
                            const isPopular = plan.is_popular;
                            const theme = getPlanTheme(plan.name);
                            const icon = getPlanIcon(plan.name);

                            return (
                                <div key={plan.id} className="relative group p-2">
                                    {isPopular && (
                                        <div className="absolute -top-1 inset-x-0 flex justify-center z-30">
                                            <div className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-[11px] font-bold px-4 py-1.5 rounded-full shadow-lg shadow-indigo-500/30 flex items-center gap-1.5 backdrop-blur-sm">
                                                <Sparkles className="h-3 w-3 text-white" />
                                                MOST POPULAR
                                            </div>
                                        </div>
                                    )}
                                    <div
                                        className={`
                                        relative rounded-2xl p-5 h-full flex flex-col transition-all duration-300 ease-out
                                        bg-white/50 backdrop-blur-md border border-white/60
                                        ${isPopular
                                                ? `border-violet-400/60 shadow-xl scale-105 z-10`
                                                : `hover:border-violet-300/50 hover:shadow-2xl hover:-translate-y-2`
                                            }
                                    `}
                                        style={isPopular ? { boxShadow: '0 12px 32px rgba(99,102,241,0.15)' } : {}}
                                    >
                                        {/* Header Section */}
                                        <div className="text-center mb-3">
                                            <h3 className="text-lg font-bold text-[var(--color-primary-font)] mb-4 flex items-center justify-center gap-2">
                                                <span className="text-2xl">{icon}</span> {plan.name}
                                            </h3>

                                            <div className="flex flex-col items-center">
                                                <div className={`text-3xl px-2 font-bold mb-2 bg-gradient-to-r ${theme.gradient} bg-clip-text text-transparent`}>
                                                    ₹{plan.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </div>

                                                <div className="w-16 h-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent my-2"></div>

                                                <span className="text-sm font-medium text-[var(--color-primary-font)]/60">
                                                    {getBillingCycleShort(plan).replace('/', '')} billing
                                                </span>

                                                {plan.billing_cycle === 'yearly' && (
                                                    <Badge variant="secondary" className="mt-3 bg-green-100 text-green-700 hover:bg-green-100 border-0 text-xs px-2 py-0.5">
                                                        Save 20% on annual
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>

                                        {/* Features Section */}
                                        <div className="flex-1 space-y-4">
                                            {/* Booking Limit Highlight */}
                                            <div className={`flex items-center justify-center gap-2 bg-white/10 py-3 rounded-xl border border-slate-100`}>
                                                <Zap className={`h-4 w-4 ${theme.text}`} />
                                                <span className="font-semibold text-[var(--color-primary-font)] text-sm">
                                                    {plan.booking_limit === -1 ? 'Unlimited' : plan.booking_limit} Bookings{getBillingCycleShort(plan)}
                                                </span>
                                            </div>

                                            <div className="space-y-4">
                                                {plan.features.map((section, idx) => (
                                                    <div key={idx} className="last:mb-0">
                                                        {section.category !== 'USAGE LIMITS' && ( // Usage limits handled by highlight above usually
                                                            <>
                                                                <h4 className="text-[10px] font-bold text-[var(--color-primary-font)]/40 uppercase tracking-widest mb-3 flex items-center gap-1.5 opacity-80 pl-1">
                                                                    {section.category === 'FEATURES' && <Sparkles className="h-3 w-3" />}
                                                                    {section.category === 'PRICING' && <CreditCard className="h-3 w-3" />}
                                                                    {section.category}
                                                                </h4>
                                                                <ul className="space-y-2">
                                                                    {section.items.map((item, i) => (
                                                                        <li key={i} className="flex items-start group/item">
                                                                            <div className="mt-0.5 mr-3 flex-shrink-0">
                                                                                <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center">
                                                                                    <Check className="h-3 w-3 text-emerald-600" />
                                                                                </div>
                                                                            </div>
                                                                            <span className="text-sm font-medium text-[var(--color-primary-font)]/80 leading-snug group-hover/item:text-[var(--color-primary-font)] transition-colors">
                                                                                {item}
                                                                            </span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Action Button */}
                                        <div className="mt-4 pt-4 border-t border-slate-100">
                                            <Button
                                                className={`w-full font-bold h-10 rounded-xl shadow-lg transition-all duration-300 transform active:scale-95 ${isPopular
                                                    ? `bg-gradient-to-r ${theme.gradient} text-white shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5`
                                                    : 'bg-white hover:bg-transparent text-[var(--color-primary-font)] border-2 border-slate-100 hover:border-slate-200 shadow-none'
                                                    }`}
                                                onClick={() => handlePurchase(plan)}
                                                disabled={processingId === plan.id}
                                            >
                                                {processingId === plan.id ? <Loader2 className="animate-spin mr-2" /> : null}
                                                {activeSub
                                                    ? (isCurrent ? 'Current Plan' : 'Buy & Queue')
                                                    : (isPopular ? 'Subscribe Now' : 'Choose Plan')
                                                }
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 5. History Link Section (Replacing full table for cleaner UI) */}
                {historySubs.length > 0 && (
                    <div className="mt-8 pt-8 border-t border-slate-200">
                        <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                            <h2 className="text-xl font-bold text-[var(--color-primary-font)] flex items-center gap-2">
                                <Clock className="h-5 w-5 text-[var(--color-primary-font)]/40" />
                                Subscription History
                            </h2>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-2 py-1">
                                    <span className="text-xs text-[var(--color-primary-font)]/60 font-medium">From:</span>
                                    <input
                                        type="date"
                                        className="text-xs border-0 p-1 outline-none text-[var(--color-primary-font)]/60"
                                        value={historyDateFilter.start}
                                        max={new Date().toISOString().split('T')[0]}
                                        onChange={(e) => setHistoryDateFilter(prev => ({ ...prev, start: e.target.value }))}
                                    />
                                    <span className="text-slate-300">|</span>
                                    <span className="text-xs text-[var(--color-primary-font)]/60 font-medium">To:</span>
                                    <input
                                        type="date"
                                        className="text-xs border-0 p-1 outline-none text-[var(--color-primary-font)]/60"
                                        value={historyDateFilter.end}
                                        max={new Date().toISOString().split('T')[0]}
                                        onChange={(e) => setHistoryDateFilter(prev => ({ ...prev, end: e.target.value }))}
                                    />
                                    {(historyDateFilter.start || historyDateFilter.end) && (
                                        <Button
                                            variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400 hover:text-red-500"
                                            onClick={() => setHistoryDateFilter({ start: '', end: '' })}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>
                                <Button variant="outline" size="sm" onClick={exportHistory} className="gap-2">
                                    <Download className="h-3.5 w-3.5" /> Export
                                </Button>
                            </div>
                        </div>
                        <div className="glass-agent overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-transparent border-b border-slate-100 text-[var(--color-primary-font)]/60 font-medium">
                                        <tr>
                                            <th className="px-6 py-4">PLAN NAME</th>
                                            <th className="px-6 py-4">STATUS</th>
                                            <th className="px-6 py-4">DATES</th>
                                            <th className="px-6 py-4 text-right">USAGE</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {paginatedHistory.map((sub: Subscription, i: number) => {
                                            const theme = getPlanTheme(sub.plan.name);
                                            return (
                                                <tr key={sub.id} className={`hover:bg-white/20 transition-colors ${i % 2 === 0 ? 'bg-white/10' : 'bg-white/5'}`}>
                                                    <td className="px-6 py-4 font-semibold text-[var(--color-primary-font)] flex items-center gap-2">
                                                        <div className={`p-1 rounded-full ${theme.bg}`}>
                                                            <Sparkles className={`h-3 w-3 ${theme.text}`} />
                                                        </div>
                                                        {sub.plan.name}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <Badge variant="secondary" className={`
                                                            font-medium border-0
                                                            ${sub.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                                sub.status === 'expired' ? 'bg-slate-100 text-slate-600' :
                                                                    'bg-red-50 text-red-600'}
                                                        `}>
                                                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 inline-block ${sub.status === 'completed' ? 'bg-green-500' : sub.status === 'expired' ? 'bg-slate-400' : 'bg-red-500'}`} />
                                                            {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-6 py-4 text-[var(--color-primary-font)]/60">
                                                        {new Date(sub.start_date).toLocaleDateString()}
                                                        <span className="mx-2 text-slate-300">→</span>
                                                        {new Date(sub.end_date).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-[var(--color-primary-font)]/80 font-medium">
                                                        {sub.current_bookings_usage} bookings
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                        {paginatedHistory.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="text-center py-8 text-gray-400">
                                                    No history found matching filters.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalHistoryPages > 1 && (
                                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-white/5">
                                    <div className="text-xs text-[var(--color-primary-font)]/60">
                                        Page {historyPage} of {totalHistoryPages}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline" size="sm"
                                            disabled={historyPage === 1}
                                            onClick={() => setHistoryPage(p => p - 1)}
                                        >
                                            Previous
                                        </Button>
                                        <Button
                                            variant="outline" size="sm"
                                            disabled={historyPage === totalHistoryPages}
                                            onClick={() => setHistoryPage(p => p + 1)}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            )}
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
            {/* Confirmation Dialog */}
            <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog(prev => ({ ...prev, open }))}>
                <AlertDialogContent className="glass-agent border-white/20">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold">{confirmDialog.title}</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-600 font-medium">
                            {confirmDialog.description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                confirmDialog.action();
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6"
                        >
                            {confirmDialog.confirmText || "Confirm"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
