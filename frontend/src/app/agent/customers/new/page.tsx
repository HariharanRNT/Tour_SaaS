'use client'

import { AddCustomerForm } from '@/components/agent/AddCustomerForm'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewCustomerPage() {
    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center space-x-4">
                    <Link href="/agent/customers">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Add New Customer</h1>
                        <p className="text-muted-foreground">Fill in the details to create a new customer account.</p>
                    </div>
                </div>

                <AddCustomerForm />
            </div>
        </div>
    )
}
