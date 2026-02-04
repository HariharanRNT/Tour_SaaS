import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

export interface Traveler {
    id: string
    title: string
    first_name: string
    last_name: string
    date_of_birth: string
    gender: string
    passport_number: string
    passport_expiry: string
    nationality: string
    type: 'ADULT' | 'CHILD' | 'INFANT'
}

interface TravelerFormProps {
    traveler: Traveler
    index: number
    onChange: (index: number, field: keyof Traveler, value: string) => void
    errors?: Record<string, string>
}

export function TravelerForm({ traveler, index, onChange, errors = {} }: TravelerFormProps) {
    return (
        <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
            <h3 className="font-semibold text-lg flex items-center justify-between">
                <span>Traveler {index + 1} ({traveler.type})</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Title */}
                <div className="space-y-2">
                    <Label>Title</Label>
                    <Select
                        value={traveler.title}
                        onValueChange={(val) => onChange(index, 'title', val)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Title" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Mr">Mr</SelectItem>
                            <SelectItem value="Mrs">Mrs</SelectItem>
                            <SelectItem value="Ms">Ms</SelectItem>
                            <SelectItem value="Miss">Miss</SelectItem>
                            <SelectItem value="Mstr">Mstr</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Names */}
                <div className="space-y-2 md:col-span-1">
                    <Label htmlFor={`fname-${index}`}>First Name</Label>
                    <Input
                        id={`fname-${index}`}
                        value={traveler.first_name}
                        onChange={(e) => onChange(index, 'first_name', e.target.value)}
                        placeholder="As on passport"
                    />
                    {errors[`first_name_${index}`] && <span className="text-red-500 text-xs">{errors[`first_name_${index}`]}</span>}
                </div>

                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor={`lname-${index}`}>Last Name</Label>
                    <Input
                        id={`lname-${index}`}
                        value={traveler.last_name}
                        onChange={(e) => onChange(index, 'last_name', e.target.value)}
                        placeholder="Surname"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* DOB */}
                <div className="space-y-2">
                    <Label htmlFor={`dob-${index}`}>Date of Birth</Label>
                    <Input
                        id={`dob-${index}`}
                        type="date"
                        value={traveler.date_of_birth}
                        onChange={(e) => onChange(index, 'date_of_birth', e.target.value)}
                    />
                </div>

                {/* Gender */}
                <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select
                        value={traveler.gender}
                        onValueChange={(val) => onChange(index, 'gender', val)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Gender" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="MALE">Male</SelectItem>
                            <SelectItem value="FEMALE">Female</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Nationality */}
                <div className="space-y-2">
                    <Label htmlFor={`nat-${index}`}>Nationality (ISO Code)</Label>
                    <Input
                        id={`nat-${index}`}
                        value={traveler.nationality}
                        onChange={(e) => onChange(index, 'nationality', e.target.value)}
                        placeholder="IN"
                        maxLength={2}
                    />
                </div>
            </div>

            {/* Passport - Required for International usually, but keeping optional logic in parent */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor={`pass-${index}`}>Passport Number</Label>
                    <Input
                        id={`pass-${index}`}
                        value={traveler.passport_number}
                        onChange={(e) => onChange(index, 'passport_number', e.target.value)}
                        placeholder="Optional for manual Domestic"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor={`pass-exp-${index}`}>Passport Expiry</Label>
                    <Input
                        id={`pass-exp-${index}`}
                        type="date"
                        value={traveler.passport_expiry}
                        onChange={(e) => onChange(index, 'passport_expiry', e.target.value)}
                    />
                </div>
            </div>
        </div>
    )
}
