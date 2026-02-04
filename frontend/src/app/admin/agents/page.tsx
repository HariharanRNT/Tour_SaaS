'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Search, UserCheck, UserX, Shield, Trash2 } from 'lucide-react'
import { toast } from 'react-toastify'
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
import { Country, State, City } from 'country-state-city'
import { ICountry, IState, ICity } from 'country-state-city'

interface Agent {
    id: string
    email: string
    first_name: string
    last_name: string
    phone?: string
    is_active: boolean
    created_at: string
}

export default function AdminAgentsPage() {
    const router = useRouter()
    const [agents, setAgents] = useState<Agent[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    // Create Agent Form State
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [creating, setCreating] = useState(false)
    const [newAgent, setNewAgent] = useState({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        phone: '',
        // Extended Fields
        agency_name: '',
        company_legal_name: '',
        business_address: '',
        country: 'IN',
        state: '',
        city: '',
        gst_no: '',
        tax_id: '',
        domain: '',
        currency: 'INR',
        commission_type: 'percentage',
        commission_value: '0'
    })

    // Geographic state
    const [allCountries] = useState<ICountry[]>(Country.getAllCountries())
    const [countryStates, setCountryStates] = useState<IState[]>(State.getStatesOfCountry('IN'))
    const [stateCities, setStateCities] = useState<ICity[]>([])

    // Delete Confirmation State
    const [deleteAgent, setDeleteAgent] = useState<Agent | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        const token = localStorage.getItem('token')
        const userStr = localStorage.getItem('user')

        if (!token || !userStr) {
            router.push('/admin/login')
            return
        }

        try {
            const user = JSON.parse(userStr)
            if (user.role !== 'admin') {
                router.push('/login') // Redirect non-admins
                return
            }
        } catch (e) {
            router.push('/admin/login')
            return
        }

        loadAgents()
    }, [router])

    const loadAgents = async () => {
        setLoading(true)
        try {
            const token = localStorage.getItem('token')
            const response = await fetch('http://localhost:8000/api/v1/admin/agents', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('token')
                    localStorage.removeItem('user')
                    router.push('/admin/login')
                    return
                }
                throw new Error('Failed to load agents')
            }

            const data = await response.json()
            setAgents(data)
        } catch (error) {
            console.error('Failed to load agents:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateAgent = async (e: React.FormEvent) => {
        e.preventDefault()
        setCreating(true)
        try {
            const token = localStorage.getItem('token')
            const payload = {
                ...newAgent,
                country: Country.getCountryByCode(newAgent.country)?.name || newAgent.country,
                state: State.getStateByCodeAndCountry(newAgent.state, newAgent.country)?.name || newAgent.state
            }
            const response = await fetch('http://localhost:8000/api/v1/admin/agents', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            })

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('token')
                    localStorage.removeItem('user')
                    router.push('/admin/login')
                    toast.error('Session expired. Please login again.')
                    return
                }
                const error = await response.json()
                throw new Error(error.detail || 'Failed to create agent')
            }

            await loadAgents()
            setIsCreateOpen(false)
            setNewAgent({
                email: '', password: '', first_name: '', last_name: '', phone: '',
                agency_name: '', company_legal_name: '', business_address: '',
                country: 'IN', state: '', city: '', gst_no: '', tax_id: '', domain: '',
                currency: 'INR', commission_type: 'percentage', commission_value: '0'
            })
            setCountryStates(State.getStatesOfCountry('IN'))
            setStateCities([])
            toast.success('Agent created successfully')
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setCreating(false)
        }
    }

    const toggleStatus = async (agent: Agent) => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`http://localhost:8000/api/v1/admin/agents/${agent.id}/status?is_active=${!agent.is_active}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (!response.ok) throw new Error('Failed to update status')

            loadAgents()
        } catch (error) {
            console.error('Failed to toggle status:', error)
            toast.error('Failed to update status')
        }
    }

    const handleDeleteClick = (agent: Agent) => {
        setDeleteAgent(agent)
    }

    const confirmDelete = async () => {
        if (!deleteAgent) return

        setIsDeleting(true)
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`http://localhost:8000/api/v1/admin/agents/${deleteAgent.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.detail || 'Failed to delete agent')
            }

            await loadAgents()
            toast.success('Agent has been deleted.')
            setDeleteAgent(null)
        } catch (error: any) {
            console.error('Failed to delete agent:', error)
            toast.error(error.message)
        } finally {
            setIsDeleting(false)
        }
    }

    const filteredAgents = agents.filter(agent =>
        agent.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.last_name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push('/admin/dashboard')}
                                className="mb-2"
                            >
                                ← Back to Dashboard
                            </Button>
                            <h1 className="text-3xl font-bold">Agent Management</h1>
                            <p className="text-gray-600 mt-1">Manage travel agents and their access</p>
                        </div>

                        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add New Agent
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Add New Agent</DialogTitle>
                                    <DialogDescription>
                                        Create a new agent account. They will be able to log in immediately.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleCreateAgent} className="space-y-6">
                                    {/* Personal Details */}
                                    <div className="space-y-4">
                                        <h3 className="font-medium border-b pb-2">Personal Details</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="first_name">First Name *</Label>
                                                <Input
                                                    id="first_name"
                                                    required
                                                    value={newAgent.first_name}
                                                    onChange={e => setNewAgent({ ...newAgent, first_name: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="last_name">Last Name *</Label>
                                                <Input
                                                    id="last_name"
                                                    required
                                                    value={newAgent.last_name}
                                                    onChange={e => setNewAgent({ ...newAgent, last_name: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="email">Email *</Label>
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    required
                                                    value={newAgent.email}
                                                    onChange={e => setNewAgent({ ...newAgent, email: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="phone">Mobile Number</Label>
                                                <PhoneInput
                                                    country={'in'}
                                                    value={newAgent.phone}
                                                    onChange={phone => setNewAgent({ ...newAgent, phone })}
                                                    inputProps={{
                                                        name: 'phone',
                                                        id: 'phone'
                                                    }}
                                                    containerClass="w-full !rounded-md"
                                                    inputClass="!w-full !h-10 !text-sm !border-gray-200 !rounded-md"
                                                    buttonClass="!border-gray-200 !rounded-l-md !bg-white"
                                                    dropdownClass="!rounded-md !shadow-lg"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="password">Password *</Label>
                                            <Input
                                                id="password"
                                                type="password"
                                                required
                                                minLength={8}
                                                value={newAgent.password}
                                                onChange={e => setNewAgent({ ...newAgent, password: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    {/* Agency Details */}
                                    <div className="space-y-4">
                                        <h3 className="font-medium border-b pb-2">Agency Details</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="agency_name">Agency Name</Label>
                                                <Input
                                                    id="agency_name"
                                                    value={newAgent.agency_name}
                                                    onChange={e => setNewAgent({ ...newAgent, agency_name: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="company_legal_name">Company Legal Name</Label>
                                                <Input
                                                    id="company_legal_name"
                                                    value={newAgent.company_legal_name}
                                                    onChange={e => setNewAgent({ ...newAgent, company_legal_name: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="domain">Website / Domain Name</Label>
                                            <Input
                                                id="domain"
                                                placeholder="example.com"
                                                value={newAgent.domain}
                                                onChange={e => setNewAgent({ ...newAgent, domain: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="business_address">Business Address</Label>
                                            <Input
                                                id="business_address"
                                                value={newAgent.business_address}
                                                onChange={e => setNewAgent({ ...newAgent, business_address: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="country">Country *</Label>
                                                <select
                                                    id="country"
                                                    required
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                    value={newAgent.country}
                                                    onChange={e => {
                                                        const countryCode = e.target.value;
                                                        setNewAgent({ ...newAgent, country: countryCode, state: '', city: '' });
                                                        setCountryStates(State.getStatesOfCountry(countryCode));
                                                        setStateCities([]);
                                                    }}
                                                >
                                                    {allCountries.map(c => (
                                                        <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="state">State *</Label>
                                                <select
                                                    id="state"
                                                    required
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                    value={newAgent.state}
                                                    onChange={e => {
                                                        const stateCode = e.target.value;
                                                        setNewAgent({ ...newAgent, state: stateCode, city: '' });
                                                        setStateCities(City.getCitiesOfState(newAgent.country, stateCode));
                                                    }}
                                                >
                                                    <option value="">Select State</option>
                                                    {countryStates.map(s => (
                                                        <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="city">City *</Label>
                                                <select
                                                    id="city"
                                                    required
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                    value={newAgent.city}
                                                    onChange={e => setNewAgent({ ...newAgent, city: e.target.value })}
                                                >
                                                    <option value="">Select City</option>
                                                    {stateCities.map(c => (
                                                        <option key={c.name} value={c.name}>{c.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Financial Details */}
                                    <div className="space-y-4">
                                        <h3 className="font-medium border-b pb-2">Financial Details</h3>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="gst_no">GST No</Label>
                                                <Input
                                                    id="gst_no"
                                                    value={newAgent.gst_no}
                                                    onChange={e => setNewAgent({ ...newAgent, gst_no: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="currency">Currency</Label>
                                                <Input
                                                    id="currency"
                                                    value={newAgent.currency}
                                                    onChange={e => setNewAgent({ ...newAgent, currency: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="tax_id">Tax ID (if no GST)</Label>
                                                <Input
                                                    id="tax_id"
                                                    value={newAgent.tax_id}
                                                    onChange={e => setNewAgent({ ...newAgent, tax_id: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="commission_type">Commission Type</Label>
                                                <select
                                                    id="commission_type"
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                    value={newAgent.commission_type}
                                                    onChange={e => setNewAgent({ ...newAgent, commission_type: e.target.value })}
                                                >
                                                    <option value="percentage">Percentage (%)</option>
                                                    <option value="fixed">Fixed Amount</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="commission_value">Commission Value</Label>
                                                <Input
                                                    id="commission_value"
                                                    type="number"
                                                    value={newAgent.commission_value}
                                                    onChange={e => setNewAgent({ ...newAgent, commission_value: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <DialogFooter>
                                        <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={creating}>
                                            {creating ? 'Creating...' : 'Create Agent'}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-4 py-8">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Agents</CardTitle>
                            <div className="relative w-64">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search agents..."
                                    className="pl-10"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                                    </TableRow>
                                ) : filteredAgents.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8">No agents found</TableCell>
                                    </TableRow>
                                ) : (
                                    filteredAgents.map((agent) => (
                                        <TableRow key={agent.id}>
                                            <TableCell className="font-medium">
                                                {agent.first_name} {agent.last_name}
                                            </TableCell>
                                            <TableCell>{agent.email}</TableCell>
                                            <TableCell>{agent.phone || '-'}</TableCell>
                                            <TableCell>
                                                <Badge variant={agent.is_active ? 'default' : 'destructive'}>
                                                    {agent.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{new Date(agent.created_at).toLocaleDateString()}</TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => toggleStatus(agent)}
                                                    className={agent.is_active ? 'text-red-600' : 'text-green-600'}
                                                >
                                                    {agent.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteClick(agent)}
                                                    className="text-gray-500 hover:text-red-600"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteAgent} onOpenChange={() => setDeleteAgent(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Agent?</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete {deleteAgent?.first_name}? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteAgent(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
