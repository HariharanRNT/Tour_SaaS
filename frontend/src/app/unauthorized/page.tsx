import Link from 'next/link'
import { AlertCircle, Lock } from 'lucide-react'
import { Button } from "@/components/ui/button"

export default function UnauthorizedPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mb-6">
                    <Lock className="h-8 w-8" />
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
                <p className="text-gray-600 mb-8">
                    You do not have permission to access the requested page. This area is restricted to authorized roles only.
                </p>

                <div className="space-y-3">
                    <Link href="/login" className="w-full block">
                        <Button variant="default" className="w-full">
                            Login with Different Account
                        </Button>
                    </Link>

                    <Link href="/" className="w-full block">
                        <Button variant="outline" className="w-full">
                            Return to Home
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    )
}
