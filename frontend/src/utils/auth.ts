/**
 * Decodes a JWT token payload without validating the signature.
 * (Validation is done by backend)
 */
export function decodeToken(token: string): any {
    try {
        const base64Url = token.split('.')[1]
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        }).join(''))

        return JSON.parse(jsonPayload)
    } catch (e) {
        return null
    }
}

export function getUserRole(): string | null {
    if (typeof window === 'undefined') return null

    const token = localStorage.getItem('token')
    if (!token) return null

    const payload = decodeToken(token)
    return payload?.role || null
}
export function isTokenExpired(token: string | null): boolean {
    if (!token) return true
    try {
        const payload = decodeToken(token)
        if (!payload || !payload.exp) return true

        // Convert to milliseconds and compare with current time
        const currentTime = Math.floor(Date.now() / 1000)
        return payload.exp < currentTime
    } catch (e) {
        return true
    }
}
