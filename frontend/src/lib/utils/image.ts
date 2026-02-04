
/**
 * Safely processes an image URL to ensure it's valid for display.
 * Handles:
 * 1. URL encoded strings (e.g. containing %2F, %3A)
 * 2. Regular URLs
 * 3. Fallback for potential double encoding
 * 
 * @param url The image URL string to process - can be undefined or null
 * @returns The valid URL string or empty string if invalid
 */
export const getValidImageUrl = (url?: string | null): string => {
    if (!url) return '';

    try {
        // Remove any surrounding quotes or whitespace which might have crept in
        let cleanUrl = url.trim().replace(/^["']|["']$/g, '');

        // Check if it's already a valid URL structure (avoids unnecessary decoding calls)
        if (cleanUrl.match(/^https?:\/\//)) {
            return cleanUrl;
        }

        // Try decoding
        const decoded = decodeURIComponent(cleanUrl);

        // If decoding reveals a valid URL, use it
        if (decoded.match(/^https?:\/\//)) {
            return decoded;
        }

        // If the original (cleaned) URL didn't match http(s) but decoding didn't help either,
        // it might be a relative path or raw base64 data uri (though less likely for this use case).
        // Return cleaned URL as fallback.
        return cleanUrl;
    } catch (e) {
        console.warn('Error processing image URL:', url, e);
        return url || '';
    }
};
