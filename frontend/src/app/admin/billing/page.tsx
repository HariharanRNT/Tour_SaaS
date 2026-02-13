"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Edit, Trash, Check, User, FileText, ArrowLeft, TrendingUp, Users, DollarSign, Calendar, MoreVertical, Search, X, ArrowUpDown, Download, Copy, CheckCircle2, Star, Zap, Shield, Power } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'react-toastify';

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

    // Stats
    const [stats, setStats] = useState({
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        mrr: 0,
        mostPopularPlan: '',
        recentChanges: 0
    });

    // Search & Filter for Subscriptions
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortColumn, setSortColumn] = useState<string>('');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Bulk selection
    const [selectedSubscriptions, setSelectedSubscriptions] = useState<Set<string>>(new Set());

    // New Plan Form State
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

            if (plansRes.ok) {
                const plansData = await plansRes.json();
                console.log('Plans data:', plansData);
                setPlans(plansData);
            } else {
                console.error('Plans fetch failed:', plansRes.status, await plansRes.text());
            }

            if (subsRes.ok) {
                const subsData = await subsRes.json();
                console.log('Subscriptions data:', subsData);
                setSubscriptions(subsData);

                // Calculate stats
                const activeCount = subsData.filter((s: Subscription) => s.status === 'active').length;
                console.log('Active count:', activeCount);

                // Calculate MRR (Monthly Recurring Revenue)
                const mrr = subsData
                    .filter((s: Subscription) => s.status === 'active')
                    .reduce((sum: number, s: Subscription) => {
                        // Ensure price is a valid number
                        const price = Number(s.plan?.price) || 0;
                        if (price === 0) {
                            console.warn('Invalid price for subscription:', s);
                            return sum;
                        }

                        const billingCycle = (s.plan?.billing_cycle || 'monthly').toLowerCase();
                        let monthlyPrice = price;

                        if (billingCycle === 'yearly') {
                            monthlyPrice = price / 12;
                        } else if (billingCycle === 'quarterly') {
                            monthlyPrice = price / 3;
                        }
                        // For 'monthly' or any other value, use price as-is

                        return sum + monthlyPrice;
                    }, 0);
                console.log('MRR:', mrr);

                // Find most popular plan
                const planCounts: { [key: string]: number } = {};
                subsData.forEach((s: Subscription) => {
                    planCounts[s.plan.name] = (planCounts[s.plan.name] || 0) + 1;
                });
                const mostPopular = Object.entries(planCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
                console.log('Most popular plan:', mostPopular, 'Plan counts:', planCounts);

                // Count recent changes (last 30 days)
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                const recentCount = subsData.filter((s: Subscription) =>
                    new Date(s.start_date) > thirtyDaysAgo
                ).length;
                console.log('Recent changes:', recentCount);

                const calculatedStats = {
                    totalSubscriptions: subsData.length,
                    activeSubscriptions: activeCount,
                    mrr: Math.round(mrr),
                    mostPopularPlan: mostPopular,
                    recentChanges: recentCount
                };
                console.log('Setting stats:', calculatedStats);
                setStats(calculatedStats);
            } else {
                console.error('Subscriptions fetch failed:', subsRes.status, await subsRes.text());
            }
        } catch (err) {
            console.error("Failed to fetch admin billing data", err);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingId(null);
        setNewPlan({ name: '', price: '', booking_limit: '', billing_cycle: 'monthly', duration_days: '', features: '', is_active: true });
        setIsCreateOpen(true);
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

    const executeDeletePlan = async (planId: string) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:8000/api/v1/subscriptions/plans/${planId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                await fetchData();
                toast.success("Plan deleted successfully");
            } else {
                const err = await res.json();
                toast.error(`Failed to delete plan: ${err.detail}`);
            }
        } catch (e) {
            console.error(e);
            toast.error("Error deleting plan");
        }
    };

    const handleDeletePlan = (planId: string) => {
        const plan = plans.find(p => p.id === planId);

        const DeleteToast = ({ closeToast }: { closeToast: () => void }) => (
            <div className="space-y-3">
                <div className="flex items-start gap-3">
                    <div className="bg-red-100 p-2 rounded-full text-red-600">
                        <Trash className="h-4 w-4" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-900">Delete Plan?</h4>
                        <p className="text-sm text-gray-500 mt-1">
                            Are you sure you want to delete <span className="font-medium text-gray-900">{plan?.name}</span>?
                            This action cannot be undone.
                        </p>
                    </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={closeToast}
                        className="h-8 text-gray-500 hover:text-gray-900"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        size="sm"
                        className="h-8 bg-red-600 hover:bg-red-700"
                        onClick={() => {
                            executeDeletePlan(planId);
                            closeToast();
                        }}
                    >
                        Delete
                    </Button>
                </div>
            </div>
        );

        toast(({ closeToast }) => <DeleteToast closeToast={closeToast} />, {
            position: "top-center",
            autoClose: false,
            closeOnClick: false,
            draggable: false,
            closeButton: false,
            className: "p-0 min-w-[350px]"
        });
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
                toast.success(`Plan ${plan.is_active ? 'deactivated' : 'activated'} successfully`);
            } else {
                const err = await res.json();
                toast.error(`Failed to update status: ${err.detail}`);
            }
        } catch (e) {
            console.error(e);
            toast.error("Error updating plan status");
        }
    };

    const handleSavePlan = async () => {
        setIsSaving(true);
        console.log("Saving plan...", { isEditing: !!editingId, plan: newPlan });

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

            const url = editingId
                ? `http://localhost:8000/api/v1/subscriptions/plans/${editingId}`
                : 'http://localhost:8000/api/v1/subscriptions/plans';

            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                await fetchData();
                setIsCreateOpen(false);
                setNewPlan({ name: '', price: '', booking_limit: '', billing_cycle: 'monthly', duration_days: '', features: '', is_active: true });
                setEditingId(null);
                toast.success(`Plan ${editingId ? 'updated' : 'created'} successfully!`);
            } else {
                const errorData = await res.json();
                console.error("Save failed:", errorData);
                toast.error(`Failed to ${editingId ? 'update' : 'create'} plan: ${errorData.detail || 'Unknown error'}`);
            }
        } catch (e) {
            console.error("Error saving plan:", e);
            toast.error(`Error ${editingId ? 'updating' : 'creating'} plan. Check console for details.`);
        } finally {
            setIsSaving(false);
        }
    };

    // Helper functions for subscriptions table
    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const handleSelectSubscription = (id: string) => {
        const newSelected = new Set(selectedSubscriptions);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedSubscriptions(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedSubscriptions.size === subscriptions.length) {
            setSelectedSubscriptions(new Set());
        } else {
            setSelectedSubscriptions(new Set(subscriptions.map(s => s.id)));
        }
    };

    // Filter and sort subscriptions
    const filteredAndSortedSubscriptions = subscriptions
        .filter(sub => {
            // Status filter
            if (statusFilter !== 'all' && sub.status !== statusFilter) return false;

            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                return (
                    sub.user_id.toLowerCase().includes(query) ||
                    sub.plan.name.toLowerCase().includes(query) ||
                    sub.status.toLowerCase().includes(query)
                );
            }
            return true;
        })
        .sort((a, b) => {
            if (!sortColumn) return 0;

            let aVal: any, bVal: any;
            switch (sortColumn) {
                case 'plan':
                    aVal = a.plan.name;
                    bVal = b.plan.name;
                    break;
                case 'status':
                    aVal = a.status;
                    bVal = b.status;
                    break;
                case 'start_date':
                    aVal = new Date(a.start_date).getTime();
                    bVal = new Date(b.start_date).getTime();
                    break;
                case 'usage':
                    aVal = a.current_bookings_usage;
                    bVal = b.current_bookings_usage;
                    break;
                default:
                    return 0;
            }

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

    // Pagination
    const totalPages = Math.ceil(filteredAndSortedSubscriptions.length / itemsPerPage);
    const paginatedSubscriptions = filteredAndSortedSubscriptions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const router = useRouter();

    if (loading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin h-8 w-8" /></div>;
    }

    return (
        <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
            <div>
                <Button variant="ghost" className="mb-4 pl-0 hover:bg-transparent hover:text-primary" onClick={() => router.push('/admin/dashboard')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                </Button>
            </div>
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Subscription Management</h1>
                    <p className="text-gray-500 mt-2">Manage subscription plans and view agent subscriptions.</p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={openCreateModal}>
                            <Plus className="mr-2 h-4 w-4" /> Create New Plan
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingId ? 'Edit Subscription Plan' : 'Create Subscription Plan'}</DialogTitle>
                            <DialogDescription>{editingId ? 'Modify existing plan details.' : 'Define a new plan for agents.'}</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="isActive" className="text-right">Active</Label>
                                <div className="flex items-center space-x-2 col-span-3">
                                    <input
                                        type="checkbox"
                                        id="isActive"
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                        checked={newPlan.is_active}
                                        onChange={e => setNewPlan({ ...newPlan, is_active: e.target.checked })}
                                    />
                                    <label htmlFor="isActive" className="text-sm text-gray-700">Make this plan available for new subscriptions</label>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Name</Label>
                                <Input id="name" value={newPlan.name} onChange={e => setNewPlan({ ...newPlan, name: e.target.value })} className="col-span-3" placeholder="e.g. Gold Plan" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="price" className="text-right">Price (₹)</Label>
                                <Input id="price" type="number" value={newPlan.price} onChange={e => setNewPlan({ ...newPlan, price: e.target.value })} className="col-span-3" placeholder="5000" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="bookings" className="text-right">Bookings</Label>
                                <Input id="bookings" type="number" value={newPlan.booking_limit} onChange={e => setNewPlan({ ...newPlan, booking_limit: e.target.value })} className="col-span-3" placeholder="-1 for unlimited" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="cycle" className="text-right">Duration</Label>
                                <select
                                    id="cycle"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 col-span-3"
                                    value={newPlan.billing_cycle}
                                    onChange={e => setNewPlan({ ...newPlan, billing_cycle: e.target.value })}
                                >
                                    <option value="monthly">Monthly (30 Days)</option>
                                    <option value="quarterly">Quarterly (90 Days)</option>
                                    <option value="yearly">Yearly (365 Days)</option>
                                    <option value="custom">Custom Duration</option>
                                </select>
                            </div>
                            {newPlan.billing_cycle === 'custom' && (
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="duration" className="text-right">Days</Label>
                                    <Input
                                        id="duration"
                                        type="number"
                                        value={newPlan.duration_days}
                                        onChange={e => setNewPlan({ ...newPlan, duration_days: e.target.value })}
                                        className="col-span-3"
                                        placeholder="e.g. 15"
                                    />
                                </div>
                            )}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="features" className="text-right">Features</Label>
                                <Textarea id="features" value={newPlan.features} onChange={e => setNewPlan({ ...newPlan, features: e.target.value })} className="col-span-3" placeholder="One feature per line" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" onClick={handleSavePlan} disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editingId ? 'Update Plan' : 'Create Plan'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Subscriptions */}
                <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-blue-100">Total Subscriptions</CardTitle>
                            <Users className="h-5 w-5 text-blue-100" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats.totalSubscriptions}</div>
                        <p className="text-xs text-blue-100 mt-1">All time subscriptions</p>
                    </CardContent>
                </Card>

                {/* Active Subscriptions */}
                <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-green-100">Active Subscriptions</CardTitle>
                            <CheckCircle2 className="h-5 w-5 text-green-100" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats.activeSubscriptions}</div>
                        <p className="text-xs text-green-100 mt-1">
                            {stats.totalSubscriptions > 0
                                ? `${Math.round((stats.activeSubscriptions / stats.totalSubscriptions) * 100)}% of total`
                                : 'No subscriptions yet'}
                        </p>
                    </CardContent>
                </Card>

                {/* Monthly Recurring Revenue */}
                <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-purple-100">Monthly Revenue</CardTitle>
                            <TrendingUp className="h-5 w-5 text-purple-100" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">₹{stats.mrr.toLocaleString()}</div>
                        <p className="text-xs text-purple-100 mt-1">MRR from active plans</p>
                    </CardContent>
                </Card>

                {/* Most Popular Plan */}
                <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-orange-100">Most Popular Plan</CardTitle>
                            <Star className="h-5 w-5 text-orange-100" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold truncate">{stats.mostPopularPlan}</div>
                        <p className="text-xs text-orange-100 mt-1">{stats.recentChanges} new in last 30 days</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="plans" className="space-y-6">
                <TabsList className="bg-white p-1 border rounded-lg shadow-sm">
                    <TabsTrigger value="plans" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                        Plans
                        <Badge variant="secondary" className="ml-2 bg-gray-200 text-gray-700">{plans.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="subscriptions" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                        Active Subscriptions
                        <Badge variant="secondary" className="ml-2 bg-gray-200 text-gray-700">{stats.activeSubscriptions}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="finance" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                        Financials
                    </TabsTrigger>
                </TabsList>

                {/* PLANS MANAGEMENT */}
                <TabsContent value="plans">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {plans.map((plan) => {
                            const subscriberCount = subscriptions.filter(s => s.plan.id === plan.id).length;
                            const isMostPopular = plan.name === stats.mostPopularPlan;

                            return (
                                <Card key={plan.id} className={`relative shadow-lg hover:shadow-xl transition-shadow ${isMostPopular ? 'ring-2 ring-orange-500' : ''}`}>
                                    {isMostPopular && (
                                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                            <Badge className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-1">
                                                <Star className="h-3 w-3 mr-1 inline" />
                                                Most Popular
                                            </Badge>
                                        </div>
                                    )}

                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-xl">{plan.name}</CardTitle>
                                                <Badge variant={plan.is_active ? 'default' : 'secondary'} className="mt-2">
                                                    {plan.is_active ? 'Active' : 'Draft'}
                                                </Badge>
                                            </div>

                                            {/* Dropdown Menu */}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => openEditModal(plan)}>
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        Edit Plan
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleToggleStatus(plan)}>
                                                        <Power className={`mr-2 h-4 w-4 ${plan.is_active ? 'text-orange-600' : 'text-green-600'}`} />
                                                        {plan.is_active ? 'Deactivate' : 'Activate'}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => handleDeletePlan(plan.id)}
                                                        className="text-red-600 focus:text-red-600"
                                                    >
                                                        <Trash className="mr-2 h-4 w-4" />
                                                        Delete Plan
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        <CardDescription className="mt-4">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-4xl font-bold text-gray-900">₹{plan.price.toLocaleString()}</span>
                                                <span className="text-gray-500">/ {
                                                    plan.billing_cycle === 'custom'
                                                        ? `${plan.duration_days} days`
                                                        : plan.billing_cycle
                                                }</span>
                                            </div>
                                        </CardDescription>
                                    </CardHeader>

                                    <CardContent>
                                        <div className="space-y-3 text-sm">
                                            <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                                                <div className="flex items-center">
                                                    <FileText className="h-4 w-4 mr-2 text-blue-600" />
                                                    <span className="font-medium">{plan.booking_limit === -1 ? 'Unlimited' : plan.booking_limit} Bookings</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                                                <div className="flex items-center">
                                                    <Users className="h-4 w-4 mr-2 text-green-600" />
                                                    <span className="font-medium">{subscriberCount} Active Subscriber{subscriberCount !== 1 ? 's' : ''}</span>
                                                </div>
                                            </div>

                                            <div className="border-t pt-3 mt-3">
                                                <p className="font-semibold mb-2 flex items-center">
                                                    <CheckCircle2 className="h-4 w-4 mr-1 text-blue-600" />
                                                    Features
                                                </p>
                                                <ul className="space-y-1 text-gray-600">
                                                    {(typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features).map((f: string, i: number) => (
                                                        <li key={i} className="flex items-start">
                                                            <Check className="h-4 w-4 mr-2 text-green-500 flex-shrink-0 mt-0.5" />
                                                            <span>{f}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </TabsContent>

                {/* SUBSCRIPTIONS LIST */}
                <TabsContent value="subscriptions">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Agent Subscriptions</CardTitle>
                                    <CardDescription>
                                        Showing {paginatedSubscriptions.length} of {filteredAndSortedSubscriptions.length} subscriptions
                                    </CardDescription>
                                </div>
                                <Button variant="outline" size="sm">
                                    <Download className="h-4 w-4 mr-2" />
                                    Export
                                </Button>
                            </div>

                            {/* Search and Filters */}
                            <div className="flex flex-wrap gap-4 mt-4">
                                {/* Search */}
                                <div className="relative flex-1 min-w-64">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Search by User ID, plan, or status..."
                                        className="pl-10 pr-10"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>

                                {/* Status Filter */}
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-40">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                        <SelectItem value="pending_payment">Pending Payment</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Items per page */}
                                <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                                    <SelectTrigger className="w-32">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="10">10 / page</SelectItem>
                                        <SelectItem value="25">25 / page</SelectItem>
                                        <SelectItem value="50">50 / page</SelectItem>
                                        <SelectItem value="100">100 / page</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>

                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50/50">
                                            <TableHead className="font-semibold">User ID</TableHead>
                                            <TableHead className="cursor-pointer select-none" onClick={() => handleSort('plan')}>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold">Plan</span>
                                                    <ArrowUpDown className={`h-4 w-4 ${sortColumn === 'plan' ? 'text-blue-600' : 'text-gray-400'}`} />
                                                </div>
                                            </TableHead>
                                            <TableHead className="cursor-pointer select-none" onClick={() => handleSort('status')}>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold">Status</span>
                                                    <ArrowUpDown className={`h-4 w-4 ${sortColumn === 'status' ? 'text-blue-600' : 'text-gray-400'}`} />
                                                </div>
                                            </TableHead>
                                            <TableHead className="cursor-pointer select-none" onClick={() => handleSort('start_date')}>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold">Start Date</span>
                                                    <ArrowUpDown className={`h-4 w-4 ${sortColumn === 'start_date' ? 'text-blue-600' : 'text-gray-400'}`} />
                                                </div>
                                            </TableHead>
                                            <TableHead className="font-semibold">Bookings Used</TableHead>
                                            <TableHead className="font-semibold">Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedSubscriptions.length > 0 ? paginatedSubscriptions.map((sub, index) => {
                                            const usagePercent = sub.plan.booking_limit === -1
                                                ? 0
                                                : (sub.current_bookings_usage / sub.plan.booking_limit) * 100;

                                            // Status badge colors
                                            let statusVariant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default';
                                            let statusClass = '';
                                            switch (sub.status) {
                                                case 'active':
                                                    statusClass = 'bg-blue-100 text-blue-800 hover:bg-blue-100';
                                                    break;
                                                case 'cancelled':
                                                    statusClass = 'bg-gray-100 text-gray-800 hover:bg-gray-100';
                                                    break;
                                                case 'completed':
                                                    statusClass = 'bg-green-100 text-green-800 hover:bg-green-100';
                                                    break;
                                                case 'pending_payment':
                                                    statusClass = 'bg-orange-100 text-orange-800 hover:bg-orange-100';
                                                    break;
                                            }

                                            return (
                                                <TableRow
                                                    key={sub.id}
                                                    className={`hover:bg-blue-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                                                >
                                                    <TableCell className="font-mono text-xs">
                                                        <div className="flex items-center gap-2">
                                                            <span>{sub.user_id.substring(0, 8)}...</span>
                                                            <button
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(sub.user_id);
                                                                    toast.success('User ID copied!');
                                                                }}
                                                                className="text-gray-400 hover:text-gray-600"
                                                                title="Copy full User ID"
                                                            >
                                                                <Copy className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-semibold text-gray-900">{sub.plan.name}</TableCell>
                                                    <TableCell>
                                                        <Badge className={statusClass}>
                                                            {sub.status.replace('_', ' ')}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-gray-600">
                                                        {format(new Date(sub.start_date), 'MMM dd, yyyy')}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="space-y-1">
                                                            <div className="flex items-center justify-between text-sm">
                                                                <span className="text-gray-600">
                                                                    {sub.current_bookings_usage} / {sub.plan.booking_limit === -1 ? '∞' : sub.plan.booking_limit}
                                                                </span>
                                                                {sub.plan.booking_limit !== -1 && (
                                                                    <span className="text-xs text-gray-500">{Math.round(usagePercent)}%</span>
                                                                )}
                                                            </div>
                                                            {sub.plan.booking_limit !== -1 && (
                                                                <Progress value={usagePercent} className="h-2" />
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-semibold text-gray-900">
                                                        ₹{sub.plan.price.toLocaleString()}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        }) : (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-12">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Users className="h-12 w-12 text-gray-300" />
                                                        <p className="text-gray-500 font-medium">
                                                            {searchQuery || statusFilter !== 'all'
                                                                ? 'No subscriptions match your filters'
                                                                : 'No subscriptions found'}
                                                        </p>
                                                        {(searchQuery || statusFilter !== 'all') && (
                                                            <Button
                                                                variant="link"
                                                                onClick={() => {
                                                                    setSearchQuery('');
                                                                    setStatusFilter('all');
                                                                }}
                                                                className="text-blue-600"
                                                            >
                                                                Clear filters
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            {paginatedSubscriptions.length > 0 && totalPages > 1 && (
                                <div className="flex items-center justify-between mt-4">
                                    <p className="text-sm text-gray-600">
                                        Page {currentPage} of {totalPages}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                        >
                                            Previous
                                        </Button>
                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                let pageNum;
                                                if (totalPages <= 5) {
                                                    pageNum = i + 1;
                                                } else if (currentPage <= 3) {
                                                    pageNum = i + 1;
                                                } else if (currentPage >= totalPages - 2) {
                                                    pageNum = totalPages - 4 + i;
                                                } else {
                                                    pageNum = currentPage - 2 + i;
                                                }
                                                return (
                                                    <Button
                                                        key={pageNum}
                                                        variant={currentPage === pageNum ? 'default' : 'outline'}
                                                        size="sm"
                                                        onClick={() => setCurrentPage(pageNum)}
                                                        className="w-8 h-8 p-0"
                                                    >
                                                        {pageNum}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* FINANCE TAB */}
                <TabsContent value="finance">
                    <div className="flex items-center justify-center p-12 border-2 border-dashed rounded-lg text-gray-400">
                        Financial Reporting Coming Soon
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
