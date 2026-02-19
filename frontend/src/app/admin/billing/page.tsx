"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { toast } from 'react-toastify';
import { cn } from "@/lib/utils";

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
    plan: SubscriptionPlan;
    status: string;
    start_date: string;
    end_date: string;
    current_bookings_usage: number;
}

export default function AdminBillingPage() {
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('plans');

    // Stats
    const [stats, setStats] = useState({
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        mrr: 0,
        mostPopularPlan: '',
        recentChanges: 0
    });

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

    const router = useRouter();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };

            const [plansRes, subsRes] = await Promise.all([
                fetch('http://localhost:8000/api/v1/subscriptions/admin/plans', { headers }),
                fetch('http://localhost:8000/api/v1/subscriptions/admin/subscriptions', { headers })
            ]);

            if (plansRes.ok) setPlans(await plansRes.json());

            if (subsRes.ok) {
                const subsData = await subsRes.json();
                setSubscriptions(subsData);

                const activeCount = subsData.filter((s: Subscription) => s.status === 'active').length;
                const mrr = subsData
                    .filter((s: Subscription) => s.status === 'active')
                    .reduce((sum: number, s: Subscription) => {
                        const price = Number(s.plan?.price) || 0;
                        const cycle = (s.plan?.billing_cycle || 'monthly').toLowerCase();
                        if (cycle === 'yearly') return sum + (price / 12);
                        if (cycle === 'quarterly') return sum + (price / 3);
                        return sum + price;
                    }, 0);

                // Helper function to check if a date is in the current month
                const isCurrentMonth = (dateString: string) => {
                    const date = new Date(dateString);
                    const now = new Date();
                    return date.getMonth() === now.getMonth() &&
                        date.getFullYear() === now.getFullYear();
                };

                // Filter subscriptions to only current month for Most Popular calculation
                const currentMonthSubs = subsData.filter((s: Subscription) => isCurrentMonth(s.start_date));

                const planCounts: { [key: string]: number } = {};
                currentMonthSubs.forEach((s: Subscription) => {
                    planCounts[s.plan.name] = (planCounts[s.plan.name] || 0) + 1;
                });
                const mostPopular = Object.entries(planCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

                // Count subscriptions in current month (not last 30 days)
                const recentCount = currentMonthSubs.length;

                setStats({
                    totalSubscriptions: subsData.length,
                    activeSubscriptions: activeCount,
                    mrr: Math.round(mrr),
                    mostPopularPlan: mostPopular,
                    recentChanges: recentCount
                });
            }
        } catch (err) {
            console.error("Failed to fetch admin billing data", err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (plan: SubscriptionPlan) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:8000/api/v1/subscriptions/plans/${plan.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_active: !plan.is_active })
            });

            if (res.ok) {
                await fetchData();
                toast.success(`Plan ${plan.is_active ? 'deactivated' : 'activated'} successfully!`);
            } else {
                const err = await res.json();
                toast.error(err.detail);
            }
        } catch (e) {
            toast.error("Error toggling status");
        }
    };

    const handleSavePlan = async () => {
        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
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

            const url = editingId ? `http://localhost:8000/api/v1/subscriptions/plans/${editingId}` : 'http://localhost:8000/api/v1/subscriptions/plans';
            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                await fetchData();
                setIsCreateOpen(false);
                setNewPlan({ name: '', price: '', booking_limit: '', billing_cycle: 'monthly', duration_days: '', features: '', is_active: true });
                setEditingId(null);
                toast.success(`Plan ${editingId ? 'updated' : 'created'} successfully!`);
            } else {
                const error = await res.json();
                toast.error(`Save failed: ${error.detail}`);
            }
        } catch (e) {
            toast.error("Error saving plan");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeletePlan = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete ${name}?`)) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:8000/api/v1/subscriptions/plans/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                await fetchData();
                toast.success("Plan deleted");
            } else {
                const err = await res.json();
                toast.error(err.detail);
            }
        } catch (e) {
            toast.error("Error deleting plan");
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

    if (loading) {
        return (
            <div className="flex flex-col gap-4 justify-center items-center h-screen bg-slate-50">
                <Loader2 className="animate-spin h-12 w-12 text-indigo-600" />
                <p className="font-bold text-indigo-900 text-xl">Loading...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <div className="bg-white border-b border-slate-100 py-8 px-8 sticky top-0 z-10 shadow-sm">
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

                            <p className="text-slate-500 font-normal text-[15px] mt-2 font-['Plus_Jakarta_Sans',sans-serif]">
                                Manage subscription plans and view agent subscriptions
                            </p>

                        </div>

                        <Button
                            onClick={() => {
                                setEditingId(null);
                                setNewPlan({ name: '', price: '', booking_limit: '', billing_cycle: 'monthly', duration_days: '', features: '', is_active: true });
                                setIsCreateOpen(true);
                            }}
                            className="bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] hover:shadow-[0_4px_20px_rgba(99,102,241,0.4)] text-white px-6 h-[44px] rounded-[12px] font-bold text-[14px] tracking-[0.2px] transition-all active:scale-95 flex items-center gap-[6px] border-0"
                        >
                            <Plus className="h-[16px] w-[16px] stroke-[3px]" /> Create New Plan
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto px-8 py-8 space-y-[28px]">
                {/* Stats Dashboard */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[14px]">
                    {/* Total Subscriptions */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="group">
                        <Card className="border-[1.5px] border-[#F1F5F9] shadow-[0_2px_12px_rgba(0,0,0,0.05)] hover:translate-y-[-4px] rounded-[18px] overflow-hidden bg-white relative transition-all duration-300 min-h-[140px]">
                            <CardContent className="p-[20px] pb-0 flex flex-col justify-between h-full">
                                <div className="flex justify-between items-start">
                                    <p className="text-[#94A3B8] font-semibold text-[10px] uppercase tracking-[1px]">Total Subs</p>
                                    <div className="absolute top-[20px] right-[20px] w-[36px] h-[36px] bg-[#EEF2FF] rounded-[10px] flex items-center justify-center text-[#6366F1]">
                                        <Users className="h-[18px] w-[18px]" />
                                    </div>
                                </div>
                                <div className="space-y-1 mt-[16px]">
                                    <h4 className="text-[36px] font-extrabold text-[#0F172A] font-['Outfit'] tracking-[-1px] leading-none">{stats.totalSubscriptions}</h4>
                                    <p className="text-[#94A3B8] font-normal text-[12px] mt-[4px]">All time</p>
                                </div>
                                <div className="h-[3px] bg-gradient-to-r from-[#6366F1] to-[#6366F1]/20 -mx-[20px] mt-[16px]" />
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Active Subscriptions */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="group">
                        <Card className="border-[1.5px] border-[#F1F5F9] shadow-[0_2px_12px_rgba(0,0,0,0.05)] hover:translate-y-[-4px] rounded-[18px] overflow-hidden bg-white relative transition-all duration-300 min-h-[140px]">
                            <CardContent className="p-[20px] pb-0 flex flex-col justify-between h-full">
                                <div className="flex justify-between items-start">
                                    <p className="text-[#94A3B8] font-semibold text-[10px] uppercase tracking-[1px]">Active Subs</p>
                                    <div className="absolute top-[20px] right-[20px] w-[36px] h-[36px] bg-[#DCFCE7] rounded-[10px] flex items-center justify-center text-[#10B981]">
                                        <Activity className="h-[18px] w-[18px]" />
                                    </div>
                                </div>
                                <div className="space-y-1 mt-[16px]">
                                    <h4 className="text-[36px] font-extrabold text-[#0F172A] font-['Outfit'] tracking-[-1px] leading-none">{stats.activeSubscriptions}</h4>
                                    <p className="text-[#94A3B8] font-normal text-[12px] mt-[4px]">
                                        {stats.totalSubscriptions > 0
                                            ? `${Math.round((stats.activeSubscriptions / stats.totalSubscriptions) * 100)}% of total`
                                            : '0% total'}
                                    </p>
                                </div>
                                <div className="h-[3px] bg-gradient-to-r from-[#10B981] to-[#10B981]/20 -mx-[20px] mt-[16px]" />
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* MRR */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="group">
                        <Card className="border-[1.5px] border-[#F1F5F9] shadow-[0_2px_12px_rgba(0,0,0,0.05)] hover:translate-y-[-4px] rounded-[18px] overflow-hidden bg-white relative transition-all duration-300 min-h-[140px]">
                            <CardContent className="p-[20px] pb-0 flex flex-col justify-between h-full">
                                <div className="flex justify-between items-start">
                                    <p className="text-[#94A3B8] font-semibold text-[10px] uppercase tracking-[1px]">Monthly Rev</p>
                                    <div className="absolute top-[20px] right-[20px] w-[36px] h-[36px] bg-[#FFF7ED] rounded-[10px] flex items-center justify-center text-[#F97316]">
                                        <DollarSign className="h-[18px] w-[18px]" />
                                    </div>
                                </div>
                                <div className="space-y-1 mt-[16px]">
                                    <h4 className="text-[36px] font-extrabold text-[#0F172A] font-['Outfit'] tracking-[-1px] leading-none">₹{stats.mrr.toLocaleString()}</h4>
                                    <p className="text-[#94A3B8] font-normal text-[12px] mt-[4px]">MRR from active plans</p>
                                </div>
                                <div className="h-[3px] bg-gradient-to-r from-[#F97316] to-[#F97316]/20 -mx-[20px] mt-[16px]" />
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Popular */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="group">
                        <Card className="border-[1.5px] border-[#F1F5F9] shadow-[0_2px_12px_rgba(0,0,0,0.05)] hover:translate-y-[-4px] rounded-[18px] overflow-hidden bg-white relative transition-all duration-300 min-h-[140px]">
                            <CardContent className="p-[20px] pb-0 flex flex-col justify-between h-full">
                                <div className="flex justify-between items-start">
                                    <p className="text-[#94A3B8] font-semibold text-[10px] uppercase tracking-[1px]">Most Popular</p>
                                    <div className="absolute top-[20px] right-[20px] w-[36px] h-[36px] bg-[#FFFBEB] rounded-[10px] flex items-center justify-center text-[#F59E0B]">
                                        <Star className="h-[18px] w-[18px]" />
                                    </div>
                                </div>
                                <div className="space-y-1 mt-[16px]">
                                    <h4 className="text-[32px] font-bold text-[#0F172A] truncate font-['Plus_Jakarta_Sans'] tracking-[0.5px] leading-none">{stats.mostPopularPlan || 'N/A'}</h4>
                                    <p className="text-[#94A3B8] font-normal text-[13px] mt-[4px]">{stats.recentChanges} new this month</p>
                                </div>
                                <div className="h-[3px] bg-gradient-to-r from-[#3B82F6] to-[#3B82F6]/20 -mx-[20px] mt-[16px]" />

                            </CardContent>
                        </Card>
                    </motion.div>
                </div>

                {/* Main Content Area */}
                <div className="space-y-8">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                        <div className="bg-white border-[1.5px] border-[#F1F5F9] p-[6px] rounded-[12px] w-fit shadow-sm">
                            <TabsList className="bg-transparent h-10 gap-1">
                                {['plans', 'subscriptions', 'finance'].map((tab) => (
                                    <TabsTrigger
                                        key={tab}
                                        value={tab}
                                        className="rounded-[10px] px-6 h-8 transition-all border-0 tracking-normal data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#6366F1] data-[state=active]:to-[#8B5CF6] data-[state=active]:text-white data-[state=active]:shadow-[0_4px_12px_rgba(99,102,241,0.3)] data-[state=active]:font-bold data-[state=inactive]:font-medium data-[state=inactive]:bg-transparent data-[state=inactive]:text-[#64748B] text-[13px]"
                                    >
                                        {tab === 'plans' ? `Plans` : tab === 'subscriptions' ? 'Active Subscriptions' : 'Financials'}
                                        {tab === 'plans' && <span className="ml-2 py-0.5 px-2 bg-slate-100 data-[state=active]:bg-white/25 rounded-full text-[11px] font-bold">{plans.length}</span>}
                                        {tab === 'subscriptions' && <span className="ml-2 py-0.5 px-2 bg-slate-100 data-[state=active]:bg-white/25 rounded-full text-[11px] font-bold">{stats.activeSubscriptions}</span>}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </div>

                        <TabsContent value="plans" className="outline-none pt-2">
                            {/* Calculate most popular plan once, outside the map */}
                            {(() => {
                                // Helper function to check if a date is in the current month
                                const isCurrentMonth = (dateString: string) => {
                                    const date = new Date(dateString);
                                    const now = new Date();
                                    return date.getMonth() === now.getMonth() &&
                                        date.getFullYear() === now.getFullYear();
                                };

                                // Filter subscriptions to only current month
                                const currentMonthSubscriptions = subscriptions.filter(s =>
                                    isCurrentMonth(s.start_date)
                                );

                                const planSubscriberCounts = plans.map(p => ({
                                    id: p.id,
                                    name: p.name,
                                    count: currentMonthSubscriptions.filter(s => s.plan.id === p.id).length,
                                    totalCount: subscriptions.filter(s => s.plan.id === p.id).length
                                }));
                                const maxSubscribers = Math.max(...planSubscriberCounts.map(p => p.count));

                                // Debug logging
                                console.log('Current Month Subscriptions:', currentMonthSubscriptions.length);
                                console.log('Plan Subscriber Counts (This Month):', planSubscriberCounts);
                                console.log('Max Subscribers This Month:', maxSubscribers);

                                return (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
                                        {plans.map((plan, idx) => {
                                            const subscriberCount = subscriptions.filter(s => s.plan.id === plan.id).length;
                                            const monthlySubscriberCount = currentMonthSubscriptions.filter(s => s.plan.id === plan.id).length;
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
                                                    <Card className={cn(
                                                        "group flex flex-col h-full border-[1.5px] border-[#F1F5F9] rounded-[16px] shadow-[0_2px_16px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.10)] transition-all duration-300 bg-white overflow-visible relative",
                                                        isMostPopular && "border-[2px] border-[#F97316] bg-[rgba(249,115,22,0.02)]"
                                                    )}>
                                                        {isMostPopular && (
                                                            <div className="absolute -top-[14px] left-1/2 -translate-x-1/2 z-20">
                                                                <div className="bg-gradient-to-r from-[#F97316] to-[#EF4444] text-white px-[18px] py-[6px] rounded-[20px] font-[700] text-[10px] uppercase tracking-[1px] flex items-center gap-1.5 shadow-[0_4px_12px_rgba(249,115,22,0.40)]">
                                                                    ★ Most Popular
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div
                                                            className="h-[4px] w-full"
                                                            style={{
                                                                background: `linear-gradient(90deg, ${theme.gradientBar.from}, ${theme.gradientBar.to})`
                                                            }}
                                                        />

                                                        <CardHeader className="p-[24px] pb-[16px]">
                                                            <div className="flex justify-between items-start mb-[20px]">
                                                                <div className="space-y-[8px]">
                                                                    <h3 className="text-[17px] font-[700] text-[#0F172A] font-['Plus_Jakarta_Sans',sans-serif] tracking-[-0.1px] leading-tight">{plan.name}</h3>
                                                                    <div className={cn(
                                                                        "inline-flex items-center px-[10px] py-[4px] rounded-[20px] text-[11px] font-[700] uppercase tracking-[0.5px] gap-[5px]",
                                                                        plan.is_active ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-slate-100 text-slate-400"
                                                                    )}>
                                                                        <div className={cn("w-[6px] h-[6px] rounded-full", plan.is_active ? "bg-[#16A34A]" : "bg-slate-400")} />
                                                                        {plan.is_active ? '● Active' : '○ Inactive'}
                                                                    </div>
                                                                </div>
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="rounded-[8px] hover:bg-[#F8FAFC] h-[28px] w-[28px] text-[#94A3B8] hover:text-[#64748B] transition-colors">
                                                                            <MoreVertical className="h-4 w-4" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end" className="rounded-2xl p-2 border-slate-100 shadow-2xl min-w-[180px]">
                                                                        <DropdownMenuItem onClick={() => openEditModal(plan)} className="rounded-xl font-bold py-3 px-4 text-slate-600 focus:bg-slate-50">
                                                                            <Edit className="h-4 w-4 mr-3" /> Edit Plan
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem onClick={() => handleToggleStatus(plan)} className="rounded-xl font-bold py-3 px-4 text-slate-600 focus:bg-slate-50">
                                                                            <Power className="h-4 w-4 mr-3" /> {plan.is_active ? 'Deactivate' : 'Activate'}
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuSeparator className="my-2 bg-slate-50" />
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
                                                                <span className="text-[#94A3B8] font-normal text-[13px] ml-[6px]">/ {plan.billing_cycle === 'monthly' ? 'month' : plan.billing_cycle === 'yearly' ? 'year' : 'day'}</span>
                                                            </div>
                                                        </CardHeader>

                                                        <CardContent className="p-[24px] pt-0 flex flex-col flex-1 gap-[20px]">
                                                            {/* Metric Grid */}
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div className="bg-[#F8FAFC] p-[12px_16px] rounded-[10px] border border-[#F1F5F9]">
                                                                    <p className="text-[10px] font-[600] text-[#94A3B8] uppercase tracking-[1px] mb-[6px]">BOOKINGS</p>
                                                                    <p className="text-[22px] font-[800] text-[#0F172A] font-['Outfit']">
                                                                        {plan.booking_limit === -1 || plan.booking_limit === 0 ? (
                                                                            <span className="text-[28px] text-[#6366F1]">∞</span>
                                                                        ) : (
                                                                            plan.booking_limit
                                                                        )}
                                                                    </p>
                                                                </div>
                                                                <div className="bg-[#F8FAFC] p-[12px_16px] rounded-[10px] border border-[#F1F5F9]">
                                                                    <p className="text-[10px] font-[600] text-[#94A3B8] uppercase tracking-[1px] mb-[6px]">SUBSCRIBERS</p>
                                                                    <p className="text-[22px] font-[800] text-[#0F172A] font-['Outfit']">{subscriberCount}</p>
                                                                </div>
                                                            </div>

                                                            {/* Features */}
                                                            <div className="flex-1 flex flex-col">
                                                                <div className="h-[1px] bg-[#F1F5F9] mb-[16px]" />
                                                                <p className="text-[10px] font-[700] text-[#94A3B8] uppercase tracking-[1.2px] mb-[12px]">FEATURES</p>
                                                                {(() => {
                                                                    const features = typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features;
                                                                    return features && features.length > 0 ? (
                                                                        <ul className="grid gap-[10px] mb-[20px]">
                                                                            {features.map((f: string, i: number) => (
                                                                                <li key={i} className="flex items-center text-[13px] font-normal text-[#475569]">
                                                                                    <div className="mr-[10px]" style={{ color: theme.main }}>
                                                                                        <CheckCircle2 className="h-4 w-4" />
                                                                                    </div>
                                                                                    {f}
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    ) : (
                                                                        <p className="text-[13px] italic text-[#94A3B8] mb-[20px]">No features configured</p>
                                                                    );
                                                                })()}
                                                            </div>

                                                            <div className="mt-auto">
                                                                <Button
                                                                    onClick={() => openEditModal(plan)}
                                                                    className="w-full h-[44px] rounded-[10px] font-[600] text-[14px] text-white transition-all hover:translate-y-[-2px] border-0"
                                                                    style={{
                                                                        background: `linear-gradient(135deg, ${theme.main}, ${theme.dark})`,
                                                                        boxShadow: `0 4px 12px ${theme.main}30`
                                                                    }}
                                                                >
                                                                    Edit Plan
                                                                </Button>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </TabsContent>

                        <TabsContent value="subscriptions">
                            <Card className="border-1.5 border-slate-100 shadow-sm rounded-[24px] overflow-hidden bg-white">
                                <CardHeader className="p-8 border-b border-slate-50">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div>
                                            <CardTitle className="text-xl font-black text-slate-900 font-['Outfit']">Active Subscriptions</CardTitle>
                                            <CardDescription className="text-slate-500 font-bold mt-1 text-xs">Manage and monitor agent subscription status</CardDescription>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="relative w-72">
                                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[16px] w-[16px] text-[#94A3B8]" />
                                                <Input
                                                    className="pl-10 h-[42px] rounded-[12px] border-[1.5px] border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:border-[#6366F1] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] transition-all font-semibold text-[13px] placeholder:text-[#94A3B8]"
                                                    placeholder="Search by agent or ID..."
                                                    value={searchQuery}
                                                    onChange={e => setSearchQuery(e.target.value)}
                                                />
                                            </div>
                                            <Button variant="outline" className="h-[42px] px-4 rounded-[12px] border-[1.5px] border-[#E2E8F0] font-semibold text-[13px] text-[#64748B] flex items-center gap-2 hover:bg-[#F8FAFC]">
                                                <Download className="h-4 w-4" /> Export
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-slate-50/50 hover:bg-slate-50 transition-colors h-12 border-b border-slate-100">
                                                    <TableHead className="pl-8 text-slate-400 font-bold uppercase text-[10px] tracking-wider">Agent</TableHead>
                                                    <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Plan</TableHead>
                                                    <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Status</TableHead>
                                                    <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Started</TableHead>
                                                    <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Expires</TableHead>
                                                    <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Usage</TableHead>
                                                    <TableHead className="pr-8 text-right text-slate-400 font-bold uppercase text-[10px] tracking-wider">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {subscriptions
                                                    .filter(sub => sub.status === 'active')
                                                    .map((sub, i) => (
                                                        <TableRow key={sub.id} className="border-b border-slate-50 hover:bg-slate-50/50 group transition-all h-20">
                                                            <TableCell className="pl-8">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={cn(
                                                                        "h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs",
                                                                        `bg-indigo-50 text-indigo-600`
                                                                    )}>
                                                                        {sub.user_id.substring(0, 2).toUpperCase()}
                                                                    </div>
                                                                    <div className="space-y-0.5">
                                                                        <p className="font-bold text-[#0F172A] text-[14px] font-['Plus_Jakarta_Sans',sans-serif] leading-tight">{sub.user_id}</p>
                                                                        <p className="text-[11px] text-[#94A3B8] font-semibold tracking-[0.5px]">ID: {sub.id.substring(0, 8)}</p>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="p-4">
                                                                <span className="text-[13px] font-medium text-[#64748B] font-['Plus_Jakarta_Sans',sans-serif]">{sub.plan.name}</span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className={cn(
                                                                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                                                    sub.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                                                                )}>
                                                                    {sub.status}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-[#64748B] font-medium text-[13px] font-['Plus_Jakarta_Sans',sans-serif]">{format(new Date(sub.start_date), 'MMM dd, yyyy')}</TableCell>
                                                            <TableCell className="text-[#64748B] font-medium text-[13px] font-['Plus_Jakarta_Sans',sans-serif]">{format(new Date(sub.end_date), 'MMM dd, yyyy')}</TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, (sub.current_bookings_usage / (sub.plan.booking_limit || 1)) * 100)}%` }} />
                                                                    </div>
                                                                    <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-[0.5px] font-['Outfit']">{sub.current_bookings_usage}/{sub.plan.booking_limit === -1 ? '∞' : sub.plan.booking_limit}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="pr-8 text-right">
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-slate-100 h-9 w-9">
                                                                            <MoreVertical className="h-4 w-4 text-slate-400" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end" className="rounded-2xl p-2 border-slate-100 shadow-2xl min-w-[150px]">
                                                                        <DropdownMenuItem className="rounded-xl font-bold py-2.5 px-4 text-xs">Manage Access</DropdownMenuItem>
                                                                        <DropdownMenuItem className="rounded-xl font-bold py-2.5 px-4 text-xs text-orange-600">Suspend Plan</DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="finance">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <Card className="lg:col-span-2 border-[1.5px] border-[#F1F5F9] shadow-sm rounded-[18px] overflow-hidden bg-white p-8">
                                    <div className="text-[20px] font-bold text-[#0F172A] mb-8 font-['Plus_Jakarta_Sans',sans-serif] tracking-[-0.2px]">Revenue Overview</div>
                                    <div className="space-y-6">
                                        {plans.map((plan, idx) => {
                                            const subCount = subscriptions.filter(s => s.plan.id === plan.id).length;
                                            const revenue = subCount * Number(plan.price);
                                            const colors = ['#f97316', '#8b5cf6', '#f59e0b', '#10b981', '#6366f1', '#0ea5e9'];
                                            const color = colors[idx % colors.length];

                                            return (revenue > 0 || idx < 5) && (
                                                <div key={plan.id} className="flex items-center gap-4">
                                                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                                                    <div className="w-32 text-[13px] font-medium text-[#64748B] truncate font-['Plus_Jakarta_Sans',sans-serif]">{plan.name}</div>
                                                    <div className="flex-1 h-2 bg-slate-50 rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${Math.min(100, (revenue / (stats.mrr * 12 || 1)) * 100)}%` }}
                                                            className="h-full rounded-full"
                                                            style={{ backgroundColor: color }}
                                                        />
                                                    </div>
                                                    <div className="w-24 text-right text-[14px] font-extrabold text-[#0F172A] font-['Outfit']">₹{Math.floor(revenue).toLocaleString('en-IN')}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Card>

                                <div className="space-y-4">
                                    {[
                                        { label: 'MRR', value: `₹${stats.mrr.toLocaleString()}`, sub: '+12% this month', color: 'text-emerald-500' },
                                        { label: 'ARR', value: `₹${(stats.mrr * 12).toLocaleString()}`, sub: 'Projected', color: 'text-indigo-500' },
                                        { label: 'Avg Revenue/Agent', value: `₹${stats.activeSubscriptions > 0 ? Math.round(stats.mrr / stats.activeSubscriptions).toLocaleString() : 0}`, sub: 'Per subscriber', color: 'text-orange-500' }
                                    ].map((item, i) => (
                                        <Card key={i} className="border-[1.5px] border-[#F1F5F9] shadow-sm rounded-[18px] bg-white p-6 transition-all hover:translate-y-[-2px]">
                                            <div className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-[1.2px] mb-4">{item.label}</div>
                                            <div className="text-[24px] font-extrabold text-[#0F172A] font-['Outfit'] mb-1 tracking-[-0.5px]">{item.value}</div>
                                            <div className={cn("text-[12px] font-semibold", item.color)}>{item.sub}</div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Modal for Creating/Editing Plans */}
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogContent className="max-w-[560px] rounded-[20px] border-0 shadow-[0_24px_64px_rgba(0,0,0,0.18),0_8px_24px_rgba(0,0,0,0.10)] p-0 overflow-hidden bg-white">
                        <div className="bg-gradient-to-br from-[#4F46E5] via-[#7C3AED] to-[#6D28D9] px-[28px] pt-[28px] pb-[32px] text-white relative min-h-[110px]">
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
                                    <Label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.8px]">Plan Name</Label>
                                    <Input
                                        value={newPlan.name}
                                        onChange={e => setNewPlan({ ...newPlan, name: e.target.value })}
                                        className="h-[44px] rounded-[10px] border-[1.5px] border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:border-[#6366F1] focus:ring-[3px] focus:ring-[rgba(99,102,241,0.12)] font-normal text-[14px] text-[#0F172A] px-3 transition-all duration-200"
                                        placeholder="e.g. Pro Plan"
                                    />
                                </div>

                                {/* Pricing */}
                                <div className="space-y-[4px]">
                                    <Label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.8px]">Pricing (INR)</Label>
                                    <div className="flex h-[44px] rounded-[10px] border-[1.5px] border-[#E2E8F0] bg-[#F8FAFC] focus-within:bg-white focus-within:border-[#6366F1] focus-within:ring-[3px] focus-within:ring-[rgba(99,102,241,0.12)] transition-all duration-200 overflow-hidden">
                                        <div className="flex items-center justify-center bg-[#F1F5F9] border-r-[1.5px] border-[#E2E8F0] px-[12px]">
                                            <span className="text-[13px] font-semibold text-[#64748B]">₹</span>
                                        </div>
                                        <Input
                                            type="number"
                                            value={newPlan.price}
                                            onChange={e => setNewPlan({ ...newPlan, price: e.target.value })}
                                            className="h-full border-0 bg-transparent focus:ring-0 font-normal text-[14px] text-[#0F172A] px-3 flex-1"
                                            placeholder="5,000"
                                        />
                                    </div>
                                    <p className="text-[10px] text-[#94A3B8]">Enter amount in Indian Rupees</p>
                                </div>
                                {/* Booking Limit */}
                                <div className="space-y-[4px]">
                                    <Label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.8px]">Booking Limit</Label>
                                    <Input
                                        type="number"
                                        value={newPlan.booking_limit}
                                        onChange={e => setNewPlan({ ...newPlan, booking_limit: e.target.value })}
                                        className="h-[44px] rounded-[10px] border-[1.5px] border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:border-[#6366F1] focus:ring-[3px] focus:ring-[rgba(99,102,241,0.12)] font-normal text-[14px] text-[#0F172A] px-3 transition-all duration-200"
                                        placeholder="Enter limit (0 = unlimited)"
                                    />
                                </div>

                                {/* Billing Cycle */}
                                <div className="space-y-[4px]">
                                    <Label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.8px]">Billing Cycle</Label>
                                    <Select value={newPlan.billing_cycle} onValueChange={v => setNewPlan({ ...newPlan, billing_cycle: v })}>
                                        <SelectTrigger className="h-[44px] rounded-[10px] border-[1.5px] border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:border-[#6366F1] focus:ring-[3px] focus:ring-[rgba(99,102,241,0.12)] px-3 font-normal text-[14px] text-[#0F172A] transition-all duration-200">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-3.5 w-3.5 text-[#94A3B8]" />
                                                <SelectValue />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent className="rounded-[10px] border-[#F1F5F9] shadow-[0_8px_32px_rgba(0,0,0,0.12)] p-2">
                                            <SelectItem value="monthly" className="rounded-[8px] font-medium">Monthly</SelectItem>
                                            <SelectItem value="quarterly" className="rounded-[8px] font-medium">Quarterly</SelectItem>
                                            <SelectItem value="yearly" className="rounded-[8px] font-medium">Yearly</SelectItem>
                                            <SelectItem value="custom" className="rounded-[8px] font-medium text-indigo-600">Custom Days</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {newPlan.billing_cycle === 'custom' && (
                                <div className="space-y-[4px]">
                                    <Label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.8px]">Duration in Days</Label>
                                    <Input
                                        type="number"
                                        value={newPlan.duration_days}
                                        onChange={e => setNewPlan({ ...newPlan, duration_days: e.target.value })}
                                        className="h-[44px] rounded-[10px] border-[1.5px] border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:border-[#6366F1] focus:ring-[3px] focus:ring-[rgba(99,102,241,0.12)] font-normal text-[14px] text-[#0F172A] px-3 transition-all duration-200"
                                        placeholder="e.g. 15"
                                    />
                                </div>
                            )}

                            {/* Features */}
                            <div className="space-y-[4px]">
                                <Label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-[0.8px]">Features (one per line)</Label>
                                <Textarea
                                    value={newPlan.features}
                                    onChange={e => setNewPlan({ ...newPlan, features: e.target.value })}
                                    className="min-h-[100px] rounded-[10px] border-[1.5px] border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:border-[#6366F1] focus:ring-[3px] focus:ring-[rgba(99,102,241,0.12)] font-normal text-[13px] text-[#0F172A] p-[12px] resize-none leading-[1.6] transition-all duration-200"
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
                                    newPlan.is_active ? "bg-[#10B981]" : "bg-[#94A3B8]"
                                )} />

                                <div className="space-y-0.5 pl-2">
                                    <p className="font-semibold text-[#0F172A] text-[13px]">Active Status</p>
                                    <p className={cn(
                                        "text-[11px] font-normal flex items-center gap-1.5",
                                        newPlan.is_active ? "text-[#10B981]" : "text-[#64748B]"
                                    )}>
                                        <span className={cn(
                                            "inline-block w-1.5 h-1.5 rounded-full",
                                            newPlan.is_active ? "bg-[#10B981]" : "bg-[#94A3B8]"
                                        )} />
                                        {newPlan.is_active ? "Visible to agents" : "Hidden from agents"}
                                    </p>
                                </div>

                                {/* Toggle Switch */}
                                <div
                                    onClick={() => setNewPlan({ ...newPlan, is_active: !newPlan.is_active })}
                                    className={cn(
                                        "w-[44px] h-[24px] rounded-full cursor-pointer transition-all duration-200 relative flex items-center",
                                        newPlan.is_active ? "bg-[#6366F1]" : "bg-[#E2E8F0]"
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
                                        className="flex-[35] h-[44px] rounded-[10px] font-semibold text-[13px] text-[#64748B] border-[1.5px] border-[#E2E8F0] hover:bg-[#F8FAFC] hover:border-[#94A3B8] hover:text-[#475569] transition-all duration-200"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleSavePlan}
                                        disabled={isSaving}
                                        className="flex-[60] h-[44px] rounded-[10px] font-bold text-[14px] bg-gradient-to-r from-[#6366F1] to-[#7C3AED] text-white shadow-[0_4px_20px_rgba(99,102,241,0.35)] hover:translate-y-[-2px] hover:shadow-[0_6px_24px_rgba(99,102,241,0.45)] transition-all duration-200 border-0 flex items-center justify-center gap-2"
                                    >
                                        {isSaving ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                {editingId ? 'Updating...' : 'Creating...'}
                                            </>
                                        ) : (
                                            <>
                                                <Check className="h-4 w-4" />
                                                {editingId ? 'Update Plan' : 'Create Plan'}
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
