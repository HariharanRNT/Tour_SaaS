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
import { Loader2, Plus, Edit, Trash, Check, User, FileText, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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

            if (plansRes.ok) setPlans(await plansRes.json());
            if (subsRes.ok) setSubscriptions(await subsRes.json());
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

    const handleDeletePlan = async (planId: string) => {
        if (!confirm("Are you sure you want to delete this plan? This action cannot be undone.")) return;

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

            <Tabs defaultValue="plans" className="space-y-6">
                <TabsList className="bg-white p-1 border rounded-lg">
                    <TabsTrigger value="plans">Plans</TabsTrigger>
                    <TabsTrigger value="subscriptions">Active Subscriptions</TabsTrigger>
                    <TabsTrigger value="finance">Financials</TabsTrigger>
                </TabsList>

                {/* PLANS MANAGEMENT */}
                <TabsContent value="plans">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {plans.map((plan) => (
                            <Card key={plan.id}>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <CardTitle>{plan.name}</CardTitle>
                                        <Badge variant={plan.is_active ? 'default' : 'secondary'}>{plan.is_active ? 'Active' : 'Draft'}</Badge>
                                    </div>
                                    <CardDescription>
                                        <span className="text-2xl font-bold text-gray-900">₹{plan.price}</span>
                                        <span className="text-gray-500"> / {
                                            plan.billing_cycle === 'custom'
                                                ? `${plan.duration_days} days`
                                                : plan.billing_cycle
                                        }</span>
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2 text-sm">
                                        <p className="flex items-center"><FileText className="h-4 w-4 mr-2" /> {plan.booking_limit === -1 ? 'Unlimited' : plan.booking_limit} Bookings</p>
                                        <div className="border-t pt-2 mt-2">
                                            <p className="font-semibold mb-1">Features:</p>
                                            <ul className="list-disc list-inside text-gray-500">
                                                {(typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features).map((f: string, i: number) => (
                                                    <li key={i}>{f}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="flex justify-end space-x-2">
                                    <Button variant="outline" size="sm" onClick={() => openEditModal(plan)}>
                                        <Edit className="h-4 w-4 mr-1" /> Edit
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => handleDeletePlan(plan.id)}>
                                        <Trash className="h-4 w-4 mr-1" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* SUBSCRIPTIONS LIST */}
                <TabsContent value="subscriptions">
                    <Card>
                        <CardHeader>
                            <CardTitle>Agent Subscriptions</CardTitle>
                            <CardDescription>Overview of all active subscriptions</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User ID</TableHead>
                                        <TableHead>Plan</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Start Date</TableHead>
                                        <TableHead>Usage</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {subscriptions.length > 0 ? subscriptions.map(sub => (
                                        <TableRow key={sub.id}>
                                            <TableCell className="font-mono text-xs">{sub.user_id.substring(0, 8)}...</TableCell>
                                            <TableCell className="font-medium">{sub.plan.name}</TableCell>
                                            <TableCell>
                                                <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>{sub.status}</Badge>
                                            </TableCell>
                                            <TableCell>{format(new Date(sub.start_date), 'MMM dd, yyyy')}</TableCell>
                                            <TableCell>
                                                {sub.current_bookings_usage} / {sub.plan.booking_limit === -1 ? '∞' : sub.plan.booking_limit}
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-gray-500">No active subscriptions</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
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
