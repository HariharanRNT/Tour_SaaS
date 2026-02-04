'use client'

import { useState } from 'react'
import { getValidImageUrl } from '@/lib/utils/image'
import { Image as ImageIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'

interface ActivityImageGalleryProps {
    images: string[]
    title: string
    className?: string
    aspectRatio?: 'square' | 'video' | 'wide'
}

export function ActivityImageGallery({
    images = [],
    title,
    className = "",
    aspectRatio = 'square'
}: ActivityImageGalleryProps) {
    const [imageError, setImageError] = useState(false)

    // Filter out empty strings
    const validImages = images.filter(img => img && typeof img === 'string' && img.trim().length > 0)
    const hasImages = validImages.length > 0
    const mainImage = hasImages ? getValidImageUrl(validImages[0]) : null
    const remainingCount = Math.max(0, validImages.length - 1)

    // Aspect ratio classes
    const ratioClasses = {
        square: 'aspect-square',
        video: 'aspect-video',
        wide: 'aspect-[2/1]'
    }

    if (!hasImages || imageError || !mainImage) {
        return (
            <div className={`bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 ${ratioClasses[aspectRatio]} ${className}`}>
                <ImageIcon className="h-8 w-8 opacity-50" />
            </div>
        )
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <div
                    className={`relative overflow-hidden rounded-lg cursor-pointer group hover:opacity-95 transition-opacity ${ratioClasses[aspectRatio]} ${className}`}
                >
                    <img
                        src={mainImage}
                        alt={title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={() => setImageError(true)}
                    />

                    {/* Badge for multiple images */}
                    {remainingCount > 0 && (
                        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded-full backdrop-blur-sm flex items-center gap-1">
                            <ImageIcon className="h-3 w-3" />
                            <span>+{remainingCount}</span>
                        </div>
                    )}
                </div>
            </DialogTrigger>

            <DialogContent className="max-w-4xl w-full p-0 overflow-hidden bg-black/95 border-none">
                <div className="relative w-full h-full flex items-center justify-center p-4">
                    <Carousel className="w-full max-w-3xl">
                        <CarouselContent>
                            {validImages.map((img, index) => (
                                <CarouselItem key={index} className="flex items-center justify-center">
                                    <div className="relative aspect-video w-full max-h-[80vh]">
                                        <img
                                            src={getValidImageUrl(img)}
                                            alt={`${title} - ${index + 1}`}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        {validImages.length > 1 && (
                            <>
                                <CarouselPrevious className="left-2" />
                                <CarouselNext className="right-2" />
                            </>
                        )}
                    </Carousel>
                </div>
            </DialogContent>
        </Dialog>
    )
}
