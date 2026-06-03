
import re

file_path = 'd:/Hariharan/G-Project/RNT_Tour/frontend/src/app/agent/bookings/page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Extract getStatusColor
status_match = re.search(r'    const getStatusColor = useCallback\(\(status: string\) => \{.*?    \}, \[\]\)', content, re.DOTALL)
if status_match:
    content = content.replace(status_match.group(0), '')
    status_func = status_match.group(0).replace('    const getStatusColor = useCallback(', 'const getStatusColor = ').replace('    }, [])', '}')

# 2. Extract getPaymentStatusIcon
payment_match = re.search(r'    const getPaymentStatusIcon = useCallback\(\(status: string\) => \{.*?    \}, \[\]\)', content, re.DOTALL)
if payment_match:
    content = content.replace(payment_match.group(0), '')
    payment_func = payment_match.group(0).replace('    const getPaymentStatusIcon = useCallback(', 'const getPaymentStatusIcon = ').replace('    }, [])', '}')

# 3. Extract BookingCard
bc_match = re.search(r'    const BookingCard = useCallback\(\(\{ booking \}: \{ booking: Booking \}\) => \{.*?    \}, \[getStatusColor, getPaymentStatusIcon\]\)', content, re.DOTALL)
if bc_match:
    content = content.replace(bc_match.group(0), '')
    bc_func = bc_match.group(0).replace('    const BookingCard = useCallback(({ booking }: { booking: Booking }) => {', 'function BookingCard({ booking, onDetailsClick }: { booking: Booking, onDetailsClick: (b: Booking) => void }) {').replace('    }, [getStatusColor, getPaymentStatusIcon])', '}')
    bc_func = bc_func.replace('onClick={() => { setSelectedBooking(booking); setIsDetailsOpen(true); }}', 'onClick={() => onDetailsClick(booking)}')

# 4. Extract BookingDetailsModal
bdm_match = re.search(r'    const BookingDetailsModal = useCallback\(\(\{ booking, isOpen, onClose \}: \{ booking: Booking \| null, isOpen: boolean, onClose: \(\) => void \}\) => \{.*?    \}, \[hasPermission, cancelMutation, sendReviewMutation\]\)', content, re.DOTALL)
if bdm_match:
    content = content.replace(bdm_match.group(0), '')
    bdm_func = bdm_match.group(0).replace('    const BookingDetailsModal = useCallback(({ booking, isOpen, onClose }: { booking: Booking | null, isOpen: boolean, onClose: () => void }) => {', 'function BookingDetailsModal({ booking, isOpen, onClose }: { booking: Booking | null, isOpen: boolean, onClose: () => void }) {')
    bdm_func = bdm_func.replace('    }, [hasPermission, cancelMutation, sendReviewMutation])', '}')
    
    # Add hooks inside BookingDetailsModal
    hooks_to_add = '''
    const { hasPermission } = useAuth()
    const queryClient = useQueryClient()
    const cancelMutation = useMutation({
        mutationFn: (bookingId: string) => bookingsAPI.cancel(bookingId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agent-bookings'] })
            toast.success('Booking cancelled successfully')
            onClose()
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to cancel booking')
        }
    })
    const sendReviewMutation = useMutation({
        mutationFn: (bookingId: string) => bookingsAPI.sendReview(bookingId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agent-bookings'] })
            toast.success('Review form sent to customer successfully!')
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to send review form')
        }
    })
'''
    bdm_func = bdm_func.replace('function BookingDetailsModal({ booking, isOpen, onClose }: { booking: Booking | null, isOpen: boolean, onClose: () => void }) {\n        const [isDownloading, setIsDownloading] = useState(false);', 'function BookingDetailsModal({ booking, isOpen, onClose }: { booking: Booking | null, isOpen: boolean, onClose: () => void }) {\n        const [isDownloading, setIsDownloading] = useState(false);\n' + hooks_to_add)

# 5. Fix BookingCard usage in content
content = content.replace('<BookingCard key={booking.id} booking={booking} />', '<BookingCard key={booking.id} booking={booking} onDetailsClick={(b) => { setSelectedBooking(b); setIsDetailsOpen(true); }} />')

# 6. Remove cancelMutation and sendReviewMutation from AgentBookingsPage
# These are a bit tricky to remove precisely with regex if they vary. 
# They look like:
#    const cancelMutation = useMutation({ ... })
#    const sendReviewMutation = useMutation({ ... })
cancel_match = re.search(r'    const cancelMutation = useMutation\(\{.*?    \}\)\n', content, re.DOTALL)
if cancel_match:
    content = content.replace(cancel_match.group(0), '')

send_match = re.search(r'    const sendReviewMutation = useMutation\(\{.*?    \}\)\n', content, re.DOTALL)
if send_match:
    content = content.replace(send_match.group(0), '')

# 7. Remove handleCancelBooking
handle_cancel_match = re.search(r'    const handleCancelBooking = \(bookingId: string\) => \{.*?    \}\n', content, re.DOTALL)
if handle_cancel_match:
    content = content.replace(handle_cancel_match.group(0), '')

# Append extracted functions to the end of the file
final_append = '\n' + status_func + '\n' + payment_func + '\n' + bc_func + '\n' + bdm_func + '\n'
content += final_append

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Refactoring complete')

