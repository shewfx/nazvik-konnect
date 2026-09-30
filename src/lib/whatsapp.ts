// WhatsApp share helper — opens WhatsApp with pre-filled message, user picks the contact

const WHATSAPP_SEND = 'https://api.whatsapp.com/send';

export function openWhatsAppShare(message: string) {
  const url = `${WHATSAPP_SEND}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

const appUrl = () => window.location.origin;

export function buildBookingInviteMessage(
  initiatorName: string,
  checkInDate: string,
  checkOutDate: string | null,
  openEnded: boolean
): string {
  return openEnded
    ? `Hi! ${initiatorName} invited you to a combined stay at NazVik Farmhouse starting ${checkInDate}. It's an open-ended stay — you'll decide checkout later together. Open the app to Accept or Decline.\n\n${appUrl()}`
    : `Hi! ${initiatorName} invited you to a combined stay at NazVik Farmhouse from ${checkInDate} to ${checkOutDate}. Open the app to Accept or Decline.\n\n${appUrl()}`;
}

export function buildResponseMessage(
  responderName: string,
  checkInDate: string,
  action: 'accepted' | 'declined'
): string {
  return action === 'accepted'
    ? `Great news! ${responderName} accepted your invitation for the combined stay at NazVik Farmhouse on ${checkInDate}. Booking is now confirmed.\n\n${appUrl()}`
    : `Update: ${responderName} declined your invitation for the combined stay at NazVik Farmhouse on ${checkInDate}. You can proceed solo or cancel the booking in the app.\n\n${appUrl()}`;
}
