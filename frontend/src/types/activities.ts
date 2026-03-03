export type TimeSlotPreference = 'morning' | 'afternoon' | 'evening' | 'full_day';

export interface ActivityImage {
    id: string;
    image_url: string;
    display_order: number;
}

export interface Activity {
    id: string;
    name: string;
    destination_city: string;
    category: string;
    duration_hours: number;
    time_slot_preference: TimeSlotPreference;
    description?: string;
    images: ActivityImage[];
    price_per_person?: number;
    agent_id?: string;
    created_at: string;
    updated_at?: string;
}

export interface ActivityImageCreate {
    image_url: string;
    display_order: number;
}

export interface ActivityCreate {
    name: string;
    destination_city: string;
    category: string;
    duration_hours: number;
    time_slot_preference: TimeSlotPreference;
    description?: string;
    images?: ActivityImageCreate[];
    price_per_person?: number;
}

export type ActivityUpdate = Partial<ActivityCreate>;
