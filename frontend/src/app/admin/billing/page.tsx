"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    fetchAdminPlans,
    fetchAdminSubscriptions,
    createSubscriptionPlan,
    updateSubscriptionPlan,
    deleteSubscriptionPlan
} from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Loader2, Plus, Edit, Trash, Check, FileText, ArrowLeft,
    TrendingUp, Users, DollarSign, Calendar, MoreVertical,
    Search, X, ArrowUpDown, Download, CheckCircle2, Star,
    Zap, Power, CreditCard, Activity, Sparkles
} from "lucide-react";
import { format } from "date-fns";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'sonner';
import { cn, formatError } from "@/lib/utils";

// Types
interface SubscriptionPlan {
    id: string;
    name: string;
    price: number;
    currency: string;
    billing_cycle: string;
    duration_days: number | null;
    features: any;
    booking_limit: number;
    is_active: boolean;
}

interface Subscription {
    id: string;
    user_id: string;
    user?: {
        agency_name: string;
        first_name: string;
        last_name: string;
        email: string;
    };
    plan: SubscriptionPlan;
    status: string;
    start_date: string;
    end_date: string;
    current_bookings_usage: number;
}

export default function AdminBillingPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('plans');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortColumn, setSortColumn] = useState<string>('');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newPlan, setNewPlan] = useState({
        name: '',
        price: '',
        booking_limit: '',
        billing_cycle: 'monthly',
        duration_days: '',
        features: '',
        is_active: true
    });

    const { data: plans = [], isLoading: isLoadingPlans } = useQuery({
        queryKey: ['admin-plans'],
        queryFn: fetchAdminPlans
    });

    const { data: subscriptions = [], isLoading: isLoadingSubs } = useQuery({
        queryKey: ['admin-subscriptions'],
        queryFn: fetchAdminSubscriptions
    });

    const isLoading = isLoadingPlans || isLoadingSubs;

    const createMutation = useMutation({
        mutationFn: createSubscriptionPlan,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
            setIsCreateOpen(false);
            setNewPlan({ name: '', price: '', booking_limit: '', billing_cycle: 'monthly', duration_days: '', features: '', is_active: true });
            toast.success("Plan created successfully!");
        },
        onError: (err: any) => toast.error(`Save failed: ${formatError(err)}`)
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: any }) => updateSubscriptionPlan(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
            setIsCreateOpen(false);
            setEditingId(null);
            toast.success("Plan updated successfully!");
        },
        onError: (err: any) => toast.error(`Update failed: ${formatError(err)}`)
    });

    const deleteMutation = useMutation({
        mutationFn: deleteSubscriptionPlan,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
            toast.success("Plan deleted successfully");
        },
        onError: (err: any) => toast.error(formatError(err) || "Error deleting plan")
    });

    const isCurrentMonth = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        return date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear();
    };

    const currentMonthSubscriptions = subscriptions.filter((s: Subscription) =>
        isCurrentMonth(s.start_date)
    );

    const planSubscriberCounts = plans.map((p: SubscriptionPlan) => ({
        id: p.id,
        name: p.name,
        count: currentMonthSubscriptions.filter((s: Subscription) => s.plan.id === p.id).length,
        totalCount: subscriptions.filter((s: Subscription) => s.plan.id === p.id).length
    }));

    const maxSubscribers = planSubscriberCounts.length > 0
        ? Math.max(...planSubscriberCounts.map((p: { count: number }) => p.count))
        : 0;

    const stats = (() => {
        const activeCount = subscriptions.filter((s: Subscription) => s.status === 'active').length;
        const mrr = subscriptions
            .filter((s: Subscription) => s.status === 'active')
            .reduce((sum: number, s: Subscription) => {
                const price = Number(s.plan?.price) || 0;
                const cycle = (s.plan?.billing_cycle || 'monthly').toLowerCase();
                if (cycle === 'yearly') return sum + (price / 12);
                if (cycle === 'quarterly') return sum + (price / 3);
                return sum + price;
            }, 0);

        return {
            totalSubscriptions: subscriptions.length,
            activeSubscriptions: activeCount,
            mrr: Math.round(mrr),
            mostPopularPlan: planSubscriberCounts.sort((a: { count: number }, b: { count: number }) => b.count - a.count)[0]?.name || 'N/A',
            recentChanges: currentMonthSubscriptions.length
        };
    })();

    const handleToggleStatus = (plan: SubscriptionPlan) => {
        updateMutation.mutate({
            id: plan.id,
            data: { is_active: !plan.is_active }
        });
    };

    const handleSavePlan = () => {
        const featuresArray = newPlan.features.split('\n').filter(f => f.trim() !== '');
        const payload = {
            name: newPlan.name,
            price: parseFloat(newPlan.price),
            currency: 'INR',
            billing_cycle: newPlan.billing_cycle,
            duration_days: newPlan.billing_cycle === 'custom' ? parseInt(newPlan.duration_days) : null,
            features: featuresArray,
            booking_limit: parseInt(newPlan.booking_limit),
            is_active: newPlan.is_active
        };

        if (editingId) {
            updateMutation.mutate({ id: editingId, data: payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const handleDeletePlan = (id: string, name: string) => {
        if (confirm(`Are you sure you want to delete ${name}?`)) {
            deleteMutation.mutate(id);
        }
    };

    const openEditModal = (plan: SubscriptionPlan) => {
        setEditingId(plan.id);
        const featuresList = typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features;
        setNewPlan({
            name: plan.name,
            price: plan.price.toString(),
            booking_limit: plan.booking_limit.toString(),
            billing_cycle: plan.billing_cycle,
            duration_days: plan.duration_days?.toString() || '',
            features: Array.isArray(featuresList) ? featuresList.join('\n') : '',
            is_active: plan.is_active
        });
        setIsCreateOpen(true);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col gap-4 justify-center items-center h-screen bg-transparent">
                <Loader2 className="animate-spin h-12 w-12 text-indigo-600" />
                <p className="font-bold text-indigo-900 text-xl">Loading...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-transparent pb-20">
            <div className="glass-navbar border-b border-slate-100 py-8 px-8 sticky top-0 z-10 shadow-sm">
                <div className="max-w-[1600px] mx-auto">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 mb-2 text-[#6366F1] hover:text-[#4f46e5] transition-colors cursor-pointer group" onClick={() => router.push('/admin/dashboard')}>
                                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                                <span className="text-[14px] font-medium tracking-tight">Back to Dashboard</span>
                            </div>
                            <h1 className="text-[28px] font-bold text-slate-900 tracking-[-0.3px] font-['Plus_Jakarta_Sans','Outfit',sans-serif] leading-[1.2]">
                                Subscription Management
                            </h1>

                            <p className="text-slate-900 font-bold text-[15px] mt-2 font-['Plus_Jakarta_Sans',sans-serif] opacity-80">
                                Manage subscription plans and view agent subscriptions
                            </p>

                        </div>

                        <Button
                            onClick={() => {
                                setEditingId(null);
                                setNewPlan({ name: '', price: '', booking_limit: '', billing_cycle: 'monthly', duration_days: '', features: '', is_active: true });
                                setIsCreateOpen(true);
                            }}
                            className="bg-gradient-to-r from-[#FF6B2B] to-[#FF8E53] hover:from-[#FF5A1F] hover:to-[#FF7D42] text-white px-8 h-[48px] rounded-[16px] font-black text-[14px] uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_8px_24px_rgba(255,107,43,0.3)] flex items-center gap-3 border-0 group"
                        >
                            <Plus className="h-5 w-5 stroke-[3px] group-hover:rotate-90 transition-transform duration-300" /> Create New Plan
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto px-8 py-8 space-y-[28px]">
                {/* Stats Dashboard */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[14px]">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="group">
                        <Card className="glass-premium !rounded-[32px] relative overflow-hidden group hover:translate-y-[-8px] transition-all duration-500 h-full">
                            <CardContent className="p-7">
                                <div className="flex justify-between items-start mb-4">
                                    <p className="text-[10px] font-black text-[#7c3010] uppercase tracking-[0.2em]">Total Subs</p>
                                    <div className="h-10 w-10 rounded-2xl bg-white/50 backdrop-blur-sm flex items-center justify-center border border-white/40 shadow-sm group-hover:scale-110 transition-transform duration-500">
                                        <Users className="h-5 w-5 text-teal-600" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-[36px] font-black text-[#111111] font-['Outfit'] tracking-tighter leading-none">{stats.totalSubscriptions}</h4>
                                    <p className="text-[10px] font-bold text-[#92400e] uppercase tracking-widest">All time</p>
                                </div>
                                <div className="absolute bottom-0 left-0 w-full h-[4px] bg-teal-400" />
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Active Subscriptions */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="group">
                        <Card className="glass-premium !rounded-[32px] relative overflow-hidden group hover:translate-y-[-8px] transition-all duration-500 h-full">
                            <CardContent className="p-7">
                                <div className="flex justify-between items-start mb-4">
                                    <p className="text-[10px] font-black text-[#7c3010] uppercase tracking-[0.2em]">Active Subs</p>
                                    <div className="h-10 w-10 rounded-2xl bg-white/50 backdrop-blur-sm flex items-center justify-center border border-white/40 shadow-sm group-hover:scale-110 transition-transform duration-500">
                                        <Activity className="h-5 w-5 text-emerald-600" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-[36px] font-black text-[#111111] font-['Outfit'] tracking-tighter leading-none">{stats.activeSubscriptions}</h4>
                                    <p className="text-[10px] font-bold text-[#92400e] uppercase tracking-widest">
                                        {stats.totalSubscriptions > 0
                                            ? `${Math.round((stats.activeSubscriptions / stats.totalSubscriptions) * 100)}% of total`
                                            : '0% total'}
                                    </p>
                                </div>
                                <div className="absolute bottom-0 left-0 w-full h-[4px] bg-emerald-400" />
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* MRR */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="group">
                        <Card className="glass-premium !rounded-[32px] relative overflow-hidden group hover:translate-y-[-8px] transition-all duration-500 h-full">
                            <CardContent className="p-7">
                                <div className="flex justify-between items-start mb-4">
                                    <p className="text-[10px] font-black text-[#7c3010] uppercase tracking-[0.2em]">Monthly Rev</p>
                                    <div className="h-10 w-10 rounded-2xl bg-white/50 backdrop-blur-sm flex items-center justify-center border border-white/40 shadow-sm group-hover:scale-110 transition-transform duration-500">
                                        <DollarSign className="h-5 w-5 text-orange-600" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-[36px] font-black text-[#111111] font-['Outfit'] tracking-tighter leading-none">₹{stats.mrr.toLocaleString()}</h4>
                                    <p className="text-[10px] font-bold text-[#92400e] uppercase tracking-widest">MRR from active plans</p>
                                </div>
                                <div className="absolute bottom-0 left-0 w-full h-[4px] bg-orange-400" />
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Popular */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="group">
                        <Card className="glass-premium !rounded-[32px] relative overflow-hidden group hover:translate-y-[-8px] transition-all duration-500 h-full">
                            <CardContent className="p-7">
                                <div className="flex justify-between items-start mb-4">
                                    <p className="text-[10px] font-black text-[#7c3010] uppercase tracking-[0.2em]">Most Popular</p>
                                    <div className="h-10 w-10 rounded-2xl bg-white/50 backdrop-blur-sm flex items-center justify-center border border-white/40 shadow-sm group-hover:scale-110 transition-transform duration-500">
                                        <Star className="h-5 w-5 text-amber-600" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-[32px] font-black text-[#111111] font-['Plus_Jakarta_Sans'] tracking-tight leading-none truncate">{stats.mostPopularPlan}</h4>
                                    <p className="text-[10px] font-bold text-[#92400e] uppercase tracking-widest">{stats.recentChanges} new this month</p>
                                </div>
                                <div className="absolute bottom-0 left-0 w-full h-[4px] bg-amber-400" />
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>

                {/* Main Content Area */}
                <div className="space-y-8">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                        <div className="bg-white/20 backdrop-blur-xl border border-white/30 p-[6px] rounded-[16px] w-fit shadow-xl">
                            <TabsList className="bg-transparent h-10 gap-1">
                                {['plans', 'subscriptions', 'finance'].map((tab) => (
                                    <TabsTrigger
                                        key={tab}
                                        value={tab}
                                        className="rounded-[10px] px-6 h-8 transition-all border-0 tracking-normal data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF6B2B] data-[state=active]:to-[#FF8E53] data-[state=active]:text-white data-[state=active]:shadow-[0_4px_12px_rgba(255,107,43,0.3)] data-[state=active]:font-black uppercase text-[11px] tracking-widest data-[state=inactive]:font-bold data-[state=inactive]:bg-transparent data-[state=inactive]:text-[#7c3010]"
                                    >
                                        {tab === 'plans' ? `Plans` : tab === 'subscriptions' ? 'Subscriptions' : 'Financials'}
                                        {tab === 'plans' && <span className="ml-2 py-0.5 px-2 bg-white/10 data-[state=active]:bg-white/20 rounded-full text-[10px] font-black">{plans.length}</span>}
                                        {tab === 'subscriptions' && <span className="ml-2 py-0.5 px-2 bg-white/10 data-[state=active]:bg-white/20 rounded-full text-[10px] font-black">{stats.activeSubscriptions}</span>}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </div>

                        <TabsContent value="plans" className="outline-none pt-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
                                {plans.map((plan: SubscriptionPlan, idx: number) => {
                                    const subscriberCount = subscriptions.filter((s: Subscription) => s.plan.id === plan.id).length;
                                    const monthlySubscriberCount = currentMonthSubscriptions.filter((s: Subscription) => s.plan.id === plan.id).length;
                                    const isMostPopular = monthlySubscriberCount === maxSubscribers && maxSubscribers > 0;

                                    // Debug logging for each plan
                                    if (isMostPopular) {
                                        console.log(`${plan.name} is Most Popular with ${monthlySubscriberCount} subscribers this month (${subscriberCount} total)`);
                                    }

                                    // Cycle colors for plans based on design file
                                    const colors = [
                                        { main: '#6366f1', dark: '#4F46E5', gradientBar: { from: '#6366F1', to: '#818CF8' } },
                                        { main: '#0ea5e9', dark: '#0284C7', gradientBar: { from: '#0EA5E9', to: '#38BDF8' } },
                                        { main: '#10b981', dark: '#059669', gradientBar: { from: '#10B981', to: '#34D399' } },
                                        { main: '#f97316', dark: '#EA6C00', gradientBar: { from: '#F97316', to: '#FB923C' } },
                                        { main: '#f59e0b', dark: '#D97706', gradientBar: { from: '#F59E0B', to: '#FCD34D' } },
                                        { main: '#8b5cf6', dark: '#7C3AED', gradientBar: { from: '#8B5CF6', to: '#A78BFA' } },
                                    ];
                                    const theme = colors[idx % colors.length];

                                    return (
                                        <motion.div
                                            key={plan.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            whileHover={{ y: -4 }}
                                            className="relative h-full min-h-[380px]"
                                        >
                                            {isMostPopular && (
                                                <div className="absolute -top-[14px] left-1/2 -translate-x-1/2 z-20">
                                                    <div className="bg-gradient-to-r from-[#F97316] to-[#EF4444] text-white px-[18px] py-[6px] rounded-[20px] font-[700] text-[10px] uppercase tracking-[1px] flex items-center gap-1.5 shadow-[0_4px_12px_rgba(249,115,22,0.40)]">
                                                        ★ Most Popular
                                                    </div>
                                                </div>
                                            )}

                                            <Card className={cn(
                                                "group flex flex-col h-full transition-all duration-300 glass-premium relative overflow-hidden",
                                                isMostPopular && "ring-2 ring-orange-500 bg-white/40"
                                            )}>
                                                <div
                                                    className="h-[4px] w-full shrink-0"
                                                    style={{
                                                        background: `linear-gradient(90deg, ${theme.gradientBar.from}, ${theme.gradientBar.to})`
                                                    }}
                                                />

                                                <CardHeader className="p-[24px] pb-[16px]">
                                                    <div className="flex justify-between items-start mb-[20px]">
                                                        <div className="space-y-[8px]">
                                                            <h3 className="text-[17px] font-[800] font-['Plus_Jakarta_Sans',sans-serif] tracking-[-0.1px] leading-tight" style={{ color: theme.main }}>{plan.name}</h3>
                                                            <div className={cn(
                                                                "inline-flex items-center px-[10px] py-[4px] rounded-[20px] text-[10px] font-black uppercase tracking-[1px] gap-1.5 backdrop-blur-md border",
                                                                plan.is_active ? "bg-emerald-400/10 text-emerald-400 border-emerald-400/20" : "bg-slate-100/10 text-slate-700 border-slate-100/20"
                                                            )}>
                                                                <div className={cn("w-1.5 h-1.5 rounded-full", plan.is_active ? "bg-emerald-400 animate-pulse" : "bg-slate-400")} />
                                                                {plan.is_active ? 'Active' : 'Inactive'}
                                                            </div>
                                                        </div>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="rounded-[8px] hover:bg-[#F8FAFC] h-[28px] w-[28px] text-slate-800 hover:text-slate-900 transition-colors">
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="rounded-2xl p-2 border-slate-100 shadow-2xl min-w-[180px]">
                                                                <DropdownMenuItem onClick={() => openEditModal(plan)} className="rounded-xl font-bold py-3 px-4 text-slate-900 focus:bg-transparent">
                                                                    <Edit className="h-4 w-4 mr-3" /> Edit Plan
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleToggleStatus(plan)} className="rounded-xl font-bold py-3 px-4 text-slate-900 focus:bg-transparent">
                                                                    <Power className="h-4 w-4 mr-3" /> {plan.is_active ? 'Deactivate' : 'Activate'}
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator className="my-2 bg-transparent" />
                                                                <DropdownMenuItem
                                                                    onClick={() => handleDeletePlan(plan.id, plan.name)}
                                                                    className="rounded-xl font-bold py-3 px-4 text-red-500 focus:bg-red-50 focus:text-red-600"
                                                                >
                                                                    <Trash className="h-4 w-4 mr-3" /> Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>

                                                    <div className="flex items-baseline gap-[6px]">
                                                        <span className="text-[32px] font-[800] text-[#0F172A] tracking-[-1px] font-['Outfit']">₹{Math.floor(plan.price).toLocaleString('en-IN')}</span>
                                                        <span className="text-slate-800 font-normal text-[13px] ml-[6px]">/ {plan.billing_cycle === 'monthly' ? 'month' : plan.billing_cycle === 'yearly' ? 'year' : 'day'}</span>
                                                    </div>
                                                </CardHeader>

                                                <CardContent className="p-[24px] pt-0 flex flex-col flex-1 gap-[20px]">
                                                    {/* Metric Grid */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="bg-white/5 backdrop-blur-md p-[12px_16px] rounded-2xl border border-white/10 shadow-inner group/limit transition-all hover:bg-white/10">
                                                            <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.15em] mb-1">Bookings</p>
                                                            <p className="text-[24px] font-black text-white font-['Outfit'] tracking-tighter leading-none group-hover/limit:scale-105 transition-transform origin-left">
                                                                {plan.booking_limit === -1 || plan.booking_limit === 0 ? (
                                                                    <span className="text-[28px] drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]">∞</span>
                                                                ) : (
                                                                    plan.booking_limit
                                                                )}
                                                            </p>
                                                        </div>
                                                        <div className="bg-white/5 backdrop-blur-md p-[12px_16px] rounded-2xl border border-white/10 shadow-inner group/subs transition-all hover:bg-white/10">
                                                            <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.15em] mb-1">Subscribers</p>
                                                            <p className="text-[24px] font-black text-white font-['Outfit'] tracking-tighter leading-none group-hover/subs:scale-105 transition-transform origin-left">{subscriberCount}</p>
                                                        </div>
                                                    </div>

                                                    {/* Features */}
                                                    <div className="flex-1 flex flex-col">
                                                        <div className="h-[1px] bg-[#F1F5F9] mb-[16px]" />
                                                        <p className="text-[10px] font-[700] text-[#1e293b] uppercase tracking-[1.2px] mb-[12px]">FEATURES</p>
                                                        {(() => {
                                                            const features = typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features;
                                                            return features && features.length > 0 ? (
                                                                <ul className="grid gap-[10px] mb-[20px]">
                                                                    {features.map((f: string, i: number) => (
                                                                        <li key={i} className="flex items-center text-[13px] font-normal text-slate-900">
                                                                            <div className="mr-[10px]" style={{ color: theme.main }}>
                                                                                <CheckCircle2 className="h-4 w-4" />
                                                                            </div>
                                                                            {f}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            ) : (
                                                                <p className="text-[13px] italic text-[#1e293b] mb-[20px]">No features configured</p>
                                                            );
                                                        })()}
                                                    </div>

                                                    <div className="mt-auto pt-4 border-t border-white/10">
                                                        <Button
                                                            onClick={() => openEditModal(plan)}
                                                            className="w-full h-[46px] rounded-2xl font-black text-[12px] uppercase tracking-widest text-white transition-all hover:scale-[1.02] active:scale-[0.98] border-0 overflow-hidden relative group/btn shadow-xl"
                                                            style={{
                                                                background: `linear-gradient(135deg, ${theme.gradientBar.from}, ${theme.gradientBar.to})`
                                                            }}
                                                        >
                                                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                                                            <span className="relative z-10 flex items-center justify-center gap-2">
                                                                <Edit className="h-4 w-4" /> Edit Plan
                                                            </span>
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </TabsContent>

                        <TabsContent value="subscriptions">
                            <Card className="border-1.5 border-slate-100 shadow-sm rounded-[24px] overflow-hidden glass-panel">
                                <CardHeader className="p-8 border-b border-slate-50">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div>
                                            <CardTitle className="text-xl font-black text-slate-900 font-['Outfit']">Active Subscriptions</CardTitle>
                                            <CardDescription className="text-slate-900 font-bold mt-1 text-xs">Manage and monitor agent subscription status</CardDescription>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="relative w-72">
                                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[16px] w-[16px] text-slate-800" />
                                                <Input
                                                    className="pl-10 h-[42px] rounded-[12px] border-white/20 bg-white/10 backdrop-blur-md focus:bg-white/20 focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all font-semibold text-[13px] text-slate-900 placeholder:text-slate-700"
                                                    placeholder="Search by agent or ID..."
                                                    value={searchQuery}
                                                    onChange={e => setSearchQuery(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-white/5 hover:bg-transparent transition-colors h-12 border-b border-slate-100">
                                                    <TableHead className="pl-8 !text-[#000000] font-black uppercase text-[10px] tracking-wider">Agent</TableHead>
                                                    <TableHead className="!text-[#000000] font-black uppercase text-[10px] tracking-wider">Plan</TableHead>
                                                    <TableHead className="!text-[#000000] font-black uppercase text-[10px] tracking-wider">Status</TableHead>
                                                    <TableHead className="!text-[#000000] font-black uppercase text-[10px] tracking-wider">Started</TableHead>
                                                    <TableHead className="!text-[#000000] font-black uppercase text-[10px] tracking-wider">Expires</TableHead>
                                                    <TableHead className="!text-[#000000] font-black uppercase text-[10px] tracking-wider">Usage</TableHead>
                                                    <TableHead className="pr-8 text-right !text-[#000000] font-black uppercase text-[10px] tracking-wider">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {subscriptions.filter((sub: Subscription) => sub.status === 'active').length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={7} className="h-72 text-center">
                                                            <div className="flex flex-col items-center justify-center gap-4 opacity-50">
                                                                <div className="p-4 bg-white/5 rounded-full border border-white/10">
                                                                    <CreditCard className="h-10 w-10 text-[#7c3010]" />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <p className="text-[#111111] font-black uppercase text-[12px] tracking-widest">No active subscriptions yet</p>
                                                                    <p className="text-[#92400e] text-xs font-medium">When agents subscribe to plans, they will appear here.</p>
                                                                </div>
                                                                <Button
                                                                    variant="outline"
                                                                    className="mt-2 border-orange-500/30 text-orange-400 hover:bg-orange-500/10 rounded-xl"
                                                                    onClick={() => setActiveTab('plans')}
                                                                >
                                                                    View Available Plans
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    subscriptions
                                                        .filter((sub: Subscription) => {
                                                            if (sub.status !== 'active') return false;
                                                            const endDate = new Date(sub.end_date);
                                                            const today = new Date();
                                                            today.setHours(0, 0, 0, 0);
                                                            return endDate >= today;
                                                        })
                                                        .map((sub: Subscription, i: number) => (
                                                            <TableRow key={sub.id} className="border-b border-white/5 hover:bg-white/5 group transition-all h-20">
                                                                <TableCell className="pl-8">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={cn(
                                                                            "h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs",
                                                                            `bg-indigo-400/10 text-indigo-300 border border-indigo-400/20`
                                                                        )}>
                                                                            {(sub.user?.agency_name || sub.user_id).substring(0, 2).toUpperCase()}
                                                                        </div>
                                                                        <div className="space-y-0.5">
                                                                            <p className="font-bold text-[#1c1c1c] text-[14px] font-['Plus_Jakarta_Sans',sans-serif] leading-tight">
                                                                                {sub.user?.agency_name || sub.user_id}
                                                                            </p>
                                                                            <p className="text-[11px] text-[#92400e] font-semibold tracking-[0.5px]">
                                                                                {sub.user?.agency_name ? `Agent: ${sub.user_id.substring(0, 8)}` : `ID: ${sub.id.substring(0, 8)}`}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="p-4">
                                                                    <span className="text-[13px] font-medium text-[#1c1c1c] font-['Plus_Jakarta_Sans',sans-serif]">{sub.plan.name}</span>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <span className={cn(
                                                                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                                                                        sub.status === 'active' ? "bg-white/60 text-[#166534] border-emerald-400/20" : "bg-slate-100/10 text-slate-700 border-slate-100/20"
                                                                    )}>
                                                                        {sub.status}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell className="text-[#1c1c1c] font-medium text-[13px] font-['Plus_Jakarta_Sans',sans-serif]">{format(new Date(sub.start_date), 'MMM dd, yyyy')}</TableCell>
                                                                <TableCell className="text-[#1c1c1c] font-medium text-[13px] font-['Plus_Jakarta_Sans',sans-serif]">{format(new Date(sub.end_date), 'MMM dd, yyyy')}</TableCell>
                                                                <TableCell>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                                            <div className="h-full bg-slate-900 rounded-full shadow-[0_0_8px_rgba(129,140,248,0.5)]" style={{ width: `${Math.min(100, (sub.current_bookings_usage / (sub.plan.booking_limit || 1)) * 100)}%` }} />
                                                                        </div>
                                                                        <span className="text-[11px] font-bold text-slate-900 uppercase tracking-[0.5px] font-['Outfit']">{sub.current_bookings_usage}/{sub.plan.booking_limit === -1 ? '∞' : sub.plan.booking_limit}</span>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="pr-8 text-right">
                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/10 h-9 w-9">
                                                                                <MoreVertical className="h-4 w-4 text-[#7c3010]" />
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent align="end" className="rounded-2xl p-2 bg-slate-900/90 backdrop-blur-xl border border-white/10 shadow-2xl min-w-[150px]">
                                                                            <DropdownMenuItem className="rounded-xl font-bold py-2.5 px-4 text-xs text-white hover:bg-white/10">Manage Access</DropdownMenuItem>
                                                                            <DropdownMenuItem className="rounded-xl font-bold py-2.5 px-4 text-xs text-red-400 hover:bg-red-400/10">Suspend Plan</DropdownMenuItem>
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="finance">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <Card className="lg:col-span-2 border-[1.5px] border-[#F1F5F9] shadow-sm rounded-[18px] overflow-hidden glass-panel p-8">
                                    <div className="text-[20px] font-bold text-[#111111] mb-8 font-['Plus_Jakarta_Sans',sans-serif] tracking-[-0.2px]">Revenue Overview</div>
                                    <div className="space-y-6">
                                        {plans.map((plan: SubscriptionPlan, idx: number) => {
                                            const subCount = subscriptions.filter((s: Subscription) => s.plan.id === plan.id).length;
                                            const revenue = subCount * Number(plan.price);
                                            const colors = ['#f97316', '#8b5cf6', '#f59e0b', '#10b981', '#6366f1', '#0ea5e9'];
                                            const color = colors[idx % colors.length];

                                            return (revenue > 0 || idx < 5) && (
                                                <div key={plan.id} className="flex items-center gap-4">
                                                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                                                    <div className="w-32 text-[13px] font-medium text-[#1c1c1c] truncate font-['Plus_Jakarta_Sans',sans-serif]">{plan.name}</div>
                                                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${Math.min(100, (revenue / (stats.mrr * 12 || 1)) * 100)}%` }}
                                                            className="h-full rounded-full"
                                                            style={{ backgroundColor: color }}
                                                        />
                                                    </div>
                                                    <div className="w-24 text-right text-[14px] font-semibold text-[#111111] font-['Outfit'] tracking-tight">₹{Math.floor(revenue).toLocaleString('en-IN')}</div>
                                                </div>
                                            );
                                        })}

                                        <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                                            <div className="text-[10px] font-black text-[#7c3010] uppercase tracking-[0.2em]">Total Estimated Revenue</div>
                                            <div className="text-[20px] font-black text-[#111111] font-['Outfit'] tracking-tight">
                                                ₹{plans.reduce((sum: number, p: SubscriptionPlan) => sum + (subscriptions.filter((s: Subscription) => s.plan.id === p.id).length * Number(p.price)), 0).toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                <div className="space-y-4">
                                    {[
                                        { label: 'MRR', value: `₹${stats.mrr.toLocaleString()}`, sub: '+12% this month', color: 'text-emerald-400', icon: TrendingUp },
                                        { label: 'ARR', value: `₹${(stats.mrr * 12).toLocaleString()}`, sub: 'Projected Annual', color: 'text-indigo-400', icon: Calendar },
                                        { label: 'Avg Revenue/Agent', value: `₹${stats.activeSubscriptions > 0 ? Math.round(stats.mrr / stats.activeSubscriptions).toLocaleString() : 0}`, sub: 'Per subscriber', color: 'text-orange-400', icon: Users }
                                    ].map((item, i) => (
                                        <Card key={i} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 transition-all hover:scale-[1.02] active:scale-[0.98] group overflow-hidden relative">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="text-[10px] font-black text-[#92400e] uppercase tracking-[0.2em]">{item.label}</div>
                                                <div className={cn("p-2 rounded-xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform duration-500", item.color)}>
                                                    <item.icon className="h-4 w-4" />
                                                </div>
                                            </div>
                                            <div className="text-[26px] font-bold text-[#111111] font-['Outfit'] mb-1 tracking-tighter leading-none">{item.value}</div>
                                            <div className={cn("text-[11px] font-black uppercase tracking-widest mt-2", i === 0 ? "text-[#15803d]" : "text-[#92400e]")}>{item.sub}</div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogContent className="max-w-[560px] p-0 overflow-hidden glass-premium border-0">
                        <div className="bg-gradient-to-br from-[#FF6B2B] via-[#FF8E53] to-[#FF5A1F] px-[28px] pt-[28px] pb-[32px] text-white relative min-h-[110px]">
                            {/* Decorative Sparkles */}
                            <div className="absolute top-4 right-4 opacity-10">
                                <Sparkles className="h-20 w-20" />
                            </div>
                            <div className="absolute bottom-4 left-4 opacity-40">
                                <Sparkles className="h-12 w-12" />
                            </div>

                            {/* Close Button */}
                            <button
                                onClick={() => setIsCreateOpen(false)}
                                className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-all duration-150 z-20"
                            >
                                <X className="h-4 w-4 text-white" />
                            </button>

                            <DialogHeader className="relative z-10">
                                <DialogTitle className="text-[22px] font-bold font-['Plus_Jakarta_Sans',sans-serif] tracking-[-0.3px] mb-[6px]">{editingId ? 'Update Plan' : 'New Subscription Plan'}</DialogTitle>
                                <DialogDescription className="text-white/70 font-normal text-[14px] max-w-[85%]">Configure plan details and pricing for your agents</DialogDescription>
                            </DialogHeader>
                        </div>

                        <div className="max-h-[calc(100vh-280px)] overflow-y-auto px-[24px] py-[20px] space-y-[16px]">
                            <div className="grid grid-cols-2 gap-[16px]">
                                {/* Plan Name */}
                                <div className="space-y-[4px]">
                                    <Label className="text-[11px] font-semibold text-slate-900 uppercase tracking-[0.8px]">Plan Name</Label>
                                    <Input
                                        value={newPlan.name}
                                        onChange={e => setNewPlan({ ...newPlan, name: e.target.value })}
                                        className="h-[44px] rounded-[10px] border-[1.5px] border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:border-[#FF6B2B] focus:ring-[3px] focus:ring-[rgba(255,107,43,0.12)] font-normal text-[14px] text-[#0F172A] px-3 transition-all duration-200"
                                        placeholder="e.g. Pro Plan"
                                    />
                                </div>

                                {/* Pricing */}
                                <div className="space-y-[4px]">
                                    <Label className="text-[11px] font-semibold text-[#0f172a] uppercase tracking-[0.8px]">Pricing (INR)</Label>
                                    <div className="flex h-[44px] rounded-[10px] border-[1.5px] border-[#E2E8F0] bg-[#F8FAFC] focus-within:bg-white focus-within:border-[#FF6B2B] focus-within:ring-[3px] focus-within:ring-[rgba(255,107,43,0.12)] transition-all duration-200 overflow-hidden">
                                        <div className="flex items-center justify-center bg-[#F1F5F9] border-r-[1.5px] border-[#E2E8F0] px-[12px]">
                                            <span className="text-[13px] font-semibold text-[#0f172a]">₹</span>
                                        </div>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={newPlan.price}
                                            onChange={e => {
                                                const val = parseFloat(e.target.value);
                                                if (val >= 0 || e.target.value === '') {
                                                    setNewPlan({ ...newPlan, price: e.target.value });
                                                }
                                            }}
                                            onKeyDown={e => {
                                                if (e.key === '-' || e.key === 'e') e.preventDefault();
                                            }}
                                            className="h-full border-0 bg-transparent focus:ring-0 font-normal text-[14px] text-[#0F172A] px-3 flex-1"
                                            placeholder="5,000"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-900">Enter amount in Indian Rupees</p>
                                </div>
                                {/* Booking Limit */}
                                <div className="space-y-[4px]">
                                    <Label className="text-[11px] font-semibold text-[#0f172a] uppercase tracking-[0.8px]">Booking Limit</Label>
                                    <Input
                                        type="number"
                                        min={-1}
                                        value={newPlan.booking_limit}
                                        onChange={e => {
                                            const val = parseInt(e.target.value);
                                            if (val >= -1 || e.target.value === '' || e.target.value === '-') {
                                                setNewPlan({ ...newPlan, booking_limit: e.target.value });
                                            }
                                        }}
                                        onKeyDown={e => {
                                            if (e.key === 'e') e.preventDefault();
                                        }}
                                        className="h-[44px] rounded-[10px] border-[1.5px] border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:border-[#FF6B2B] focus:ring-[3px] focus:ring-[rgba(255,107,43,0.12)] font-normal text-[14px] text-[#0F172A] px-3 transition-all duration-200"
                                        placeholder="Enter limit (-1 = unlimited)"
                                    />
                                </div>

                                {/* Billing Cycle */}
                                <div className="space-y-[4px]">
                                    <Label className="text-[11px] font-semibold text-[#0f172a] uppercase tracking-[0.8px]">Billing Cycle</Label>
                                    <Select value={newPlan.billing_cycle} onValueChange={v => setNewPlan({ ...newPlan, billing_cycle: v })}>
                                        <SelectTrigger className="h-[44px] rounded-[10px] border-[1.5px] border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:border-[#FF6B2B] focus:ring-[3px] focus:ring-[rgba(255,107,43,0.12)] px-3 font-normal text-[14px] text-[#0F172A] transition-all duration-200">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-3.5 w-3.5 text-[#1e293b]" />
                                                <SelectValue />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent className="rounded-[10px] border-[#F1F5F9] shadow-[0_8px_32px_rgba(0,0,0,0.12)] p-2">
                                            <SelectItem value="monthly" className="rounded-[8px] font-medium">Monthly</SelectItem>
                                            <SelectItem value="quarterly" className="rounded-[8px] font-medium">Quarterly</SelectItem>
                                            <SelectItem value="yearly" className="rounded-[8px] font-medium">Yearly</SelectItem>
                                            <SelectItem value="custom" className="rounded-[8px] font-medium text-[#FF6B2B]">Custom Days</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {newPlan.billing_cycle === 'custom' && (
                                <div className="space-y-[4px]">
                                    <Label className="text-[11px] font-semibold text-[#0f172a] uppercase tracking-[0.8px]">Duration in Days</Label>
                                    <Input
                                        type="number"
                                        value={newPlan.duration_days}
                                        onChange={e => setNewPlan({ ...newPlan, duration_days: e.target.value })}
                                        className="h-[44px] rounded-[10px] border-[1.5px] border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:border-[#FF6B2B] focus:ring-[3px] focus:ring-[rgba(255,107,43,0.12)] font-normal text-[14px] text-[#0F172A] px-3 transition-all duration-200"
                                        placeholder="e.g. 15"
                                    />
                                </div>
                            )}

                            {/* Features */}
                            <div className="space-y-[4px]">
                                <Label className="text-[11px] font-semibold text-[#0f172a] uppercase tracking-[0.8px]">Features (one per line)</Label>
                                <Textarea
                                    value={newPlan.features}
                                    onChange={e => setNewPlan({ ...newPlan, features: e.target.value })}
                                    className="min-h-[100px] rounded-[10px] border-[1.5px] border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:border-[#FF6B2B] focus:ring-[3px] focus:ring-[rgba(255,107,43,0.12)] font-normal text-[13px] text-[#0F172A] p-[12px] resize-none leading-[1.6] transition-all duration-200"
                                    placeholder={`Feature 1
Feature 2
Feature 3`}
                                />
                            </div>

                            {/* Active Status Toggle */}
                            <div className="relative flex items-center justify-between p-[12px] bg-[#F8FAFC] rounded-[10px] border-[1.5px] border-[#F1F5F9] transition-all overflow-hidden">
                                {/* Left Accent Bar */}
                                <div className={cn(
                                    "absolute left-0 top-0 bottom-0 w-[3px] transition-colors duration-200",
                                    newPlan.is_active ? "bg-[#10B981]" : "bg-[#1e293b]"
                                )} />

                                <div className="space-y-0.5 pl-2">
                                    <p className="font-semibold text-[#0F172A] text-[13px]">Active Status</p>
                                    <p className={cn(
                                        "text-[11px] font-normal flex items-center gap-1.5",
                                        newPlan.is_active ? "text-[#10B981]" : "text-[#0f172a]"
                                    )}>
                                        <span className={cn(
                                            "inline-block w-1.5 h-1.5 rounded-full",
                                            newPlan.is_active ? "bg-[#10B981]" : "bg-[#1e293b]"
                                        )} />
                                        {newPlan.is_active ? "Visible to agents" : "Hidden from agents"}
                                    </p>
                                </div>

                                {/* Toggle Switch */}
                                <div
                                    onClick={() => setNewPlan({ ...newPlan, is_active: !newPlan.is_active })}
                                    className={cn(
                                        "w-[44px] h-[24px] rounded-full cursor-pointer transition-all duration-200 relative flex items-center",
                                        newPlan.is_active ? "bg-[#FF6B2B]" : "bg-[#E2E8F0]"
                                    )}
                                >
                                    <motion.div
                                        className="w-[18px] h-[18px] bg-white rounded-full shadow-[0_1px_4px_rgba(0,0,0,0.2)] mx-[3px]"
                                        animate={{ x: newPlan.is_active ? 20 : 0 }}
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="sticky bottom-0 bg-white pt-3 pb-1 -mx-[24px] px-[24px]">
                                {/* Divider */}
                                <div className="h-[1px] bg-[#F1F5F9] mb-[16px]" />

                                <DialogFooter className="flex flex-row gap-3">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setIsCreateOpen(false)}
                                        className="flex-[35] h-[44px] rounded-[10px] font-semibold text-[13px] text-[#0f172a] border-[1.5px] border-[#E2E8F0] hover:bg-[#F8FAFC] hover:border-[#1e293b] hover:text-[#0f172a] transition-all duration-200"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleSavePlan}
                                        disabled={createMutation.isPending || updateMutation.isPending}
                                        className="rounded-[12px] bg-[#FF6B2B] hover:bg-[#FF5A1F] text-white px-[24px] h-[46px] font-[700] text-[13px] transition-all duration-200 shadow-md flex items-center gap-2"
                                    >
                                        {(createMutation.isPending || updateMutation.isPending) ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span>Saving...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Check className="h-4 w-4" />
                                                <span>{editingId ? 'Update Plan' : 'Create Plan'}</span>
                                            </>
                                        )}
                                    </Button>
                                </DialogFooter>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
