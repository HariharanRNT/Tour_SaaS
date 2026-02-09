'use client'

import { useState } from 'react'
import { Activity } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { Clock, MapPin, Star, Users, ChevronLeft, ChevronRight, Plus } from 'lucide-react'

interface ActivityDetailsModalProps {
    activity: Activity
    open: boolean
    onOpenChange: (open: boolean) => void
    onAddToDay?: (activity: Activity) => void
}

export function ActivityDetailsModal({ activity, open, onOpenChange, onAddToDay }: ActivityDetailsModalProps) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0)
    const hasImages = activity.images && activity.images.length > 0

    const nextImage = () => {
        if (hasImages) {
            setCurrentImageIndex((prev) => (prev + 1) % activity.images.length)
        }
    }

    const previousImage = () => {
        if (hasImages) {
            setCurrentImageIndex((prev) => (prev - 1 + activity.images.length) % activity.images.length)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl pr-8">{activity.title}</DialogTitle>
                    <DialogDescription>
                        Complete activity details and information
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Image Gallery */}
                    {hasImages ? (
                        <div className="relative">
                            <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                                <Image
                                    src={activity.images[currentImageIndex]}
                                    alt={`${activity.title} - Image ${currentImageIndex + 1}`}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                />
                            </div>

                            {activity.images.length > 1 && (
                                <>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white"
                                        onClick={previousImage}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white"
                                        onClick={nextImage}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                                        {currentImageIndex + 1} / {activity.images.length}
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="aspect-video bg-gradient-to-r from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
                            <MapPin className="h-24 w-24 text-white opacity-50" />
                        </div>
                    )}

                    {/* Thumbnail Gallery */}
                    {hasImages && activity.images.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {activity.images.map((image, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentImageIndex(index)}
                                    className={`relative w-20 h-20 rounded-md overflow-hidden shrink-0 border-2 transition-all ${index === currentImageIndex ? 'border-primary' : 'border-transparent'
                                        }`}
                                >
                                    <Image
                                        src={image}
                                        alt={`Thumbnail ${index + 1}`}
                                        fill
                                        className="object-cover"
                                        unoptimized
                                    />
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Key Information */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">Duration</p>
                                <p className="font-semibold">{activity.duration || 'Flexible'}</p>
                            </div>
                        </div>

                        {activity.rating > 0 && (
                            <div className="flex items-center gap-2">
                                <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Rating</p>
                                    <p className="font-semibold">{activity.rating.toFixed(1)} / 5.0</p>
                                </div>
                            </div>
                        )}

                        {activity.max_group_size && (
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Group Size</p>
                                    <p className="font-semibold">Up to {activity.max_group_size}</p>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <span className="h-5 w-5 text-muted-foreground flex items-center justify-center font-bold">₹</span>
                            <div>
                                <p className="text-xs text-muted-foreground">Price</p>
                                <p className="font-semibold">{activity.price_per_person}</p>
                            </div>
                        </div>
                    </div>

                    {/* Category */}
                    {activity.category && (
                        <div>
                            <Badge variant="secondary">{activity.category}</Badge>
                        </div>
                    )}

                    {/* Description */}
                    <div>
                        <h3 className="font-semibold text-lg mb-2">Description</h3>
                        <div
                            className="text-muted-foreground prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: activity.description || 'No description available.' }}
                        />
                    </div>

                    {/* Location */}
                    {activity.location && (activity.location.latitude || activity.location.longitude) && (
                        <div>
                            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                                <MapPin className="h-5 w-5" />
                                Location
                            </h3>
                            <p className="text-muted-foreground">
                                Coordinates: {activity.location.latitude}, {activity.location.longitude}
                            </p>
                        </div>
                    )}

                    {/* Included Items */}
                    {activity.included_items && activity.included_items.length > 0 && (
                        <div>
                            <h3 className="font-semibold text-lg mb-2">What's Included</h3>
                            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                {activity.included_items.map((item, index) => (
                                    <li key={index}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Excluded Items */}
                    {activity.excluded_items && activity.excluded_items.length > 0 && (
                        <div>
                            <h3 className="font-semibold text-lg mb-2">What's Not Included</h3>
                            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                {activity.excluded_items.map((item, index) => (
                                    <li key={index}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t">
                        {onAddToDay && (
                            <Button
                                onClick={() => {
                                    onAddToDay(activity)
                                    onOpenChange(false)
                                }}
                                className="flex-1"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add to Itinerary
                            </Button>
                        )}
                        {activity.booking_link && (
                            <Button
                                variant="outline"
                                onClick={() => window.open(activity.booking_link, '_blank')}
                                className="flex-1"
                            >
                                Book Now
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
