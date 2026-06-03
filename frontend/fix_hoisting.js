
const fs = require('fs');
const file = 'd:/Hariharan/G-Project/RNT_Tour/frontend/src/app/agent/bookings/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const returnIndex = content.indexOf('    return (');
if (returnIndex === -1) throw new Error('Return not found');

const bcStart = content.indexOf('    const BookingCard = useCallback(({ booking }: { booking: Booking }) => {');
if (bcStart === -1) throw new Error('BookingCard not found');
const bcEnd = content.indexOf('    }, [getStatusColor, getPaymentStatusIcon])') + 46;

const bcText = content.substring(bcStart, bcEnd);

const bdmStart = content.indexOf('    const BookingDetailsModal = useCallback(({ booking, isOpen, onClose }: { booking: Booking | null, isOpen: boolean, onClose: () => void }) => {');
if (bdmStart === -1) throw new Error('BookingDetailsModal not found');
const bdmEnd = content.indexOf('    }, [hasPermission, cancelMutation, sendReviewMutation])') + 59;

const bdmText = content.substring(bdmStart, bdmEnd);

content = content.substring(0, bcStart) + content.substring(bcEnd, bdmStart) + content.substring(bdmEnd);

const insertText = bcText + '\n\n' + bdmText + '\n\n';
content = content.substring(0, returnIndex) + insertText + content.substring(returnIndex);

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully hoisted variables.');

