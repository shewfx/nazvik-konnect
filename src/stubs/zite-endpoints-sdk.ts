// Stub for zite-endpoints-sdk — uses Supabase PostgreSQL database

import {
  getFamilies as dbGetFamilies,
  getFamilyById as dbGetFamilyById,
  createFamily as dbCreateFamily,
  updateFamily as dbUpdateFamily,
  deleteFamily as dbDeleteFamily,
  getBookings as dbGetBookings,
  createBooking as dbCreateBooking,
  updateBooking as dbUpdateBooking,
  deleteBooking as dbDeleteBooking,
  getNotificationsByFamily as dbGetNotificationsByFamily,
  markNotificationsReadByFamily as dbMarkNotificationsReadByFamily,
  createNotification as dbCreateNotification,
  createInspection as dbCreateInspection,
  getInspections as dbGetInspections,
  checkoutBooking as dbCheckoutBooking,
  getHouseSettings as dbGetHouseSettings,
  updateHouseSettings as dbUpdateHouseSettings,
  getCheckoutPhotos as dbGetCheckoutPhotos,
  createCheckoutPhoto as dbCreateCheckoutPhoto,
  type Booking,
  type HouseSettings,
} from '../lib/db-supabase';

export type GetFamiliesOutputType = {
  families: {
    id: string;
    familyName: string;
    priorityScore: number;
    role: string;
    avatarUrl: string;
  }[];
};

export type GetBookingsOutputType = {
  bookings: {
    id: string;
    familyId: string;
    familyName: string;
    avatarUrl: string;
    invitedFamilyId: string | null;
    invitedFamilyName: string | null;
    invitedAvatarUrl: string | null;
    checkInDate: string;
    checkOutDate: string | null;
    checkInTime: string | null;
    bookingType: string;
    status: string;
    costPoints: number;
    guestCount: number;
    createdAt: string;
  }[];
};

export type GetLeaderboardOutputType = {
  families: {
    id: string;
    familyName: string;
    priorityScore: number;
    role: string;
    avatarUrl: string;
  }[];
};

function delay(ms = 400) {
  return new Promise(r => setTimeout(r, ms));
}

async function buildFamilyMap() {
  const families = await dbGetFamilies();
  const map: Record<string, { name: string; avatar: string }> = {};
  families.forEach(f => { map[f.id] = { name: f.familyName, avatar: f.avatarUrl }; });
  return map;
}

function getBookingRate(bookingType: string): number {
  if (bookingType === 'Family') return 5;
  if (bookingType === 'Friends') return 8;
  if (bookingType === 'Combined') return 8;
  return 6;
}

function hasDateOverlap(checkIn: string, checkOut: string | null, existingBookings: Booking[]): boolean {
  const newStart = new Date(checkIn).getTime();
  const newEnd = checkOut ? new Date(checkOut).getTime() : new Date(newStart + 30 * 86400000).getTime();
  for (const b of existingBookings) {
    if (b.status === 'Cancelled' || b.status === 'Completed' || b.status === 'Declined') continue;
    const existingStart = new Date(b.checkInDate).getTime();
    const existingEnd = b.checkOutDate ? new Date(b.checkOutDate).getTime() : new Date(existingStart + 30 * 86400000).getTime();
    if (newStart <= existingEnd && newEnd >= existingStart) return true;
  }
  return false;
}

export async function getFamilies(_input: Record<string, unknown> = {}): Promise<GetFamiliesOutputType> {
  await delay();
  return { families: await dbGetFamilies() };
}

export async function loginFamily(input: { familyId: string; pin: string }) {
  await delay();
  const family = await dbGetFamilyById(input.familyId);
  if (!family) throw new Error('Family not found');
  if (family.pinCode !== input.pin) throw new Error('Incorrect PIN');
  return {
    success: true,
    familyId: family.id,
    familyName: family.familyName,
    role: family.role,
    priorityScore: family.priorityScore,
    avatarUrl: family.avatarUrl,
  };
}

export async function getBookings(input: { familyId?: string; upcomingOnly?: boolean; pastOnly?: boolean; cancelledOnly?: boolean } = {}): Promise<GetBookingsOutputType> {
  await delay();
  const families = await buildFamilyMap();
  let bookings = await dbGetBookings();
  if (input.familyId) bookings = bookings.filter(b => b.familyId === input.familyId || b.invitedFamilyId === input.familyId);
  const today = new Date().toISOString().split('T')[0];
  if (input.upcomingOnly) bookings = bookings.filter(b =>
    b.status === 'Active' ||
    (b.checkOutDate === null && b.status !== 'Cancelled' && b.status !== 'Completed') ||
    (b.checkOutDate && b.checkOutDate >= today && b.status !== 'Cancelled')
  );
  if (input.pastOnly) bookings = bookings.filter(b => (b.checkOutDate && b.checkOutDate < today) || b.status === 'Completed');
  if (input.cancelledOnly) bookings = bookings.filter(b => b.status === 'Cancelled');
  return {
    bookings: bookings.map(b => ({
      id: b.id,
      familyId: b.familyId,
      familyName: families[b.familyId]?.name ?? 'Unknown',
      avatarUrl: families[b.familyId]?.avatar ?? '',
      invitedFamilyId: b.invitedFamilyId,
      invitedFamilyName: b.invitedFamilyId ? (families[b.invitedFamilyId]?.name ?? 'Unknown') : null,
      invitedAvatarUrl: b.invitedFamilyId ? (families[b.invitedFamilyId]?.avatar ?? '') : null,
      checkInDate: b.checkInDate,
      checkOutDate: b.checkOutDate,
      checkInTime: b.checkInTime,
      bookingType: b.bookingType,
      status: b.status,
      costPoints: b.costPoints,
      guestCount: b.guestCount,
      createdAt: b.createdAt,
    })),
  };
}

export async function getLeaderboard(_input: Record<string, unknown> = {}): Promise<GetLeaderboardOutputType> {
  await delay();
  const families = await dbGetFamilies();
  return {
    families: [...families].sort((a, b) => b.priorityScore - a.priorityScore),
  };
}

export async function createBooking(input: { familyId: string; checkInDate: string; checkOutDate: string | null; checkInTime?: string | null; guestCount: number; bookingType: string; invitedFamilyId?: string }) {
  await delay();

  // Prevent overlapping bookings globally
  const allBookings = await dbGetBookings();
  if (hasDateOverlap(input.checkInDate, input.checkOutDate, allBookings)) {
    return { success: false, bookingId: '', newScore: 0, message: 'Those dates are already booked by another family.' };
  }

  const family = await dbGetFamilyById(input.familyId);
  const days = input.checkOutDate ? Math.max(1, Math.ceil((new Date(input.checkOutDate).getTime() - new Date(input.checkInDate).getTime()) / 86400000)) : 0;
  const rate = getBookingRate(input.bookingType);
  const totalCost = days * rate;
  const isCombined = !!input.invitedFamilyId;
  const initiatorCost = isCombined && days > 0 ? Math.ceil(totalCost / 2) : totalCost;
  const newScore = (family?.priorityScore ?? 250) - initiatorCost;
  const booking = await dbCreateBooking({
    familyId: input.familyId,
    invitedFamilyId: input.invitedFamilyId ?? null,
    initiatorFamilyId: input.invitedFamilyId ? input.familyId : null,
    checkInDate: input.checkInDate,
    checkOutDate: input.checkOutDate,
    checkInTime: input.checkInTime ?? null,
    bookingType: input.bookingType,
    status: input.invitedFamilyId ? 'Pending' : 'Confirmed',
    costPoints: totalCost,
    guestCount: input.guestCount,
    createdAt: new Date().toISOString(),
  });
  if (family) await dbUpdateFamily(family.id, { priorityScore: newScore });
  // Send invitation notification to invited family
  if (input.invitedFamilyId) {
    await dbCreateNotification({
      familyId: input.invitedFamilyId,
      relatedId: booking.id,
      type: 'invitation',
      message: `${family?.familyName ?? 'A family'} invited you to a combined stay at NazVik Farmhouse!`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  }
  return { success: true, bookingId: booking.id, newScore, message: input.invitedFamilyId ? 'Invitation sent! Awaiting confirmation.' : 'Booking created successfully!' };
}

export async function cancelBooking(input: { bookingId: string; familyId: string }) {
  await delay();
  const bookings = await dbGetBookings();
  const booking = bookings.find(b => b.id === input.bookingId);
  const family = await dbGetFamilyById(input.familyId);
  if (!booking || !family) return { success: false, message: 'Booking not found' };
  if (booking.familyId !== input.familyId) return { success: false, message: 'Only the booking owner can cancel' };

  const days = booking.checkOutDate ? Math.max(1, Math.ceil((new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / 86400000)) : 0;
  const rate = getBookingRate(booking.bookingType);
  const totalCost = days * rate;
  const isCombined = !!booking.invitedFamilyId;

  let newScore = family.priorityScore;
  if (isCombined) {
    const share = days > 0 ? Math.ceil(totalCost / 2) : 0;
    // Refund initiator
    const initiator = await dbGetFamilyById(booking.familyId);
    if (initiator && share > 0) {
      const refund = booking.status === 'Confirmed' ? Math.floor(share * 0.5) : share;
      newScore = initiator.priorityScore + refund;
      await dbUpdateFamily(initiator.id, { priorityScore: newScore });
    }
    // Refund invited family if they had accepted
    if (booking.invitedFamilyId && (booking.status === 'Confirmed' || booking.status === 'Active')) {
      const invited = await dbGetFamilyById(booking.invitedFamilyId);
      if (invited && share > 0) {
        const refund = booking.status === 'Confirmed' ? Math.floor(share * 0.5) : share;
        await dbUpdateFamily(invited.id, { priorityScore: invited.priorityScore + refund });
      }
    }
  } else {
    const refund = booking.status === 'Confirmed' ? Math.floor(totalCost * 0.5) : totalCost;
    newScore = family.priorityScore + refund;
    await dbUpdateFamily(input.familyId, { priorityScore: newScore });
  }

  await dbUpdateBooking(input.bookingId, { status: 'Cancelled' });
  return { success: true, newScore, message: `Booking cancelled. ${isCombined ? 'Shared' : ''} points refunded.` };
}

export async function submitInspection(input: { bookingId: string; inspectorFamilyId: string; isClean: boolean; evidencePhotoUrl?: string; comments?: string; checklist?: Record<string, boolean> }) {
  await delay();
  await dbCreateInspection({
    bookingId: input.bookingId,
    inspectorFamilyId: input.inspectorFamilyId,
    isClean: input.isClean,
    evidencePhotoUrl: input.evidencePhotoUrl,
    comments: input.comments,
    checklist: input.checklist,
    inspectedAt: new Date().toISOString(),
  });
  const bookings = await dbGetBookings();
  const booking = bookings.find(b => b.id === input.bookingId);
  if (booking) {
    await dbUpdateBooking(booking.id, { status: 'Active' });
    await dbCreateNotification({
      familyId: booking.familyId,
      relatedId: booking.id,
      type: 'system',
      message: input.isClean ? 'Your checkout inspection passed! +10 bonus points.' : 'Checkout issues found. Please review.',
      isRead: false,
      createdAt: new Date().toISOString(),
    });
    if (input.isClean) {
      const family = await dbGetFamilyById(booking.familyId);
      if (family) await dbUpdateFamily(family.id, { priorityScore: family.priorityScore + 10 });
    }
  }
  return { success: true, message: 'Inspection submitted!' };
}

export async function getLatestInspection(): Promise<{ inspection: { id: string; familyName: string; avatarUrl: string; isClean: boolean; comments?: string; evidencePhotoUrl?: string; checklist?: Record<string, boolean>; inspectedAt: string } | null }> {
  await delay();
  const inspections = await dbGetInspections();
  if (inspections.length === 0) return { inspection: null };
  const latest = inspections[0];
  const families = await buildFamilyMap();
  return {
    inspection: {
      id: latest.id,
      familyName: families[latest.inspectorFamilyId]?.name ?? 'Unknown',
      avatarUrl: families[latest.inspectorFamilyId]?.avatar ?? '',
      isClean: latest.isClean,
      comments: latest.comments,
      evidencePhotoUrl: latest.evidencePhotoUrl,
      checklist: latest.checklist,
      inspectedAt: latest.inspectedAt,
    },
  };
}

export async function getNotifications(input: { familyId: string }) {
  await delay();
  const list = await dbGetNotificationsByFamily(input.familyId);
  return {
    notifications: list,
    unreadCount: list.filter(n => !n.isRead).length,
  };
}

export async function markNotificationsRead(input: { familyId: string }) {
  await delay();
  await dbMarkNotificationsReadByFamily(input.familyId);
  return { success: true };
}

export async function updateFamilyAvatar(input: { familyId: string; avatarUrl: string }) {
  await delay();
  await dbUpdateFamily(input.familyId, { avatarUrl: input.avatarUrl });
  return { success: true };
}

export async function adminAdjustScore(input: { targetFamilyId: string; adjustment: number; reason: string }) {
  await delay();
  const family = await dbGetFamilyById(input.targetFamilyId);
  if (!family) throw new Error('Family not found');
  const newScore = family.priorityScore + input.adjustment;
  dbUpdateFamily(input.targetFamilyId, { priorityScore: newScore });
  await dbCreateNotification({
    familyId: input.targetFamilyId,
    relatedId: input.targetFamilyId,
    type: 'system',
    message: `Score adjusted by ${input.adjustment > 0 ? '+' : ''}${input.adjustment}: ${input.reason}`,
    isRead: false,
    createdAt: new Date().toISOString(),
  });
  return { success: true, newScore };
}

export type CheckoutPhotoOutput = {
  id: string;
  bookingId: string;
  familyId: string;
  familyName: string;
  avatarUrl: string;
  areaName: string;
  photoUrl: string;
  createdAt: string;
};

export async function getLatestCheckoutPhotosByArea(): Promise<{ photos: CheckoutPhotoOutput[] }> {
  await delay();
  const families = await buildFamilyMap();
  const allPhotos = await dbGetCheckoutPhotos();
  // Get the latest photo per area
  const latestByArea = new Map<string, typeof allPhotos[0]>();
  for (const photo of allPhotos) {
    if (!latestByArea.has(photo.areaName)) {
      latestByArea.set(photo.areaName, photo);
    }
  }
  const photos = Array.from(latestByArea.values()).map(p => ({
    id: p.id,
    bookingId: p.bookingId,
    familyId: p.familyId,
    familyName: families[p.familyId]?.name ?? 'Unknown',
    avatarUrl: families[p.familyId]?.avatar ?? '',
    areaName: p.areaName,
    photoUrl: p.photoUrl,
    createdAt: p.createdAt,
  }));
  return { photos };
}

export async function getAllCheckoutPhotos(): Promise<{ photos: (CheckoutPhotoOutput & { familyName: string; avatarUrl: string })[] }> {
  await delay();
  const families = await buildFamilyMap();
  const allPhotos = await dbGetCheckoutPhotos();
  const photos = allPhotos.map(p => ({
    id: p.id,
    bookingId: p.bookingId,
    familyId: p.familyId,
    familyName: families[p.familyId]?.name ?? 'Unknown',
    avatarUrl: families[p.familyId]?.avatar ?? '',
    areaName: p.areaName,
    photoUrl: p.photoUrl,
    createdAt: p.createdAt,
  }));
  return { photos };
}

export async function saveCheckoutPhotos(input: { bookingId: string; familyId: string; photos: { areaName: string; photoUrl: string }[] }) {
  await delay();
  for (const photo of input.photos) {
    await dbCreateCheckoutPhoto({
      bookingId: input.bookingId,
      familyId: input.familyId,
      areaName: photo.areaName,
      photoUrl: photo.photoUrl,
      createdAt: new Date().toISOString(),
    });
  }
  return { success: true };
}

export async function checkoutBooking(input: { bookingId: string; familyId: string }) {
  await delay();
  const bookings = await dbGetBookings();
  const booking = bookings.find(b => b.id === input.bookingId);
  if (!booking) return { success: false, message: 'Booking not found' };
  if (booking.familyId !== input.familyId) return { success: false, message: 'Only the booking owner can check out' };
  const today = new Date().toISOString().split('T')[0];
  const actualDays = Math.max(1, Math.ceil((new Date(today).getTime() - new Date(booking.checkInDate).getTime()) / 86400000));
  const actualTotalCost = actualDays * getBookingRate(booking.bookingType);
  const isCombined = !!booking.invitedFamilyId;

  const updated = await dbCheckoutBooking(input.bookingId, today);

  if (updated) {
    // Only charge the difference from what was already paid at creation/acceptance
    const oldTotalCost = booking.costPoints;
    const costDifference = actualTotalCost - oldTotalCost;

    if (costDifference !== 0) {
      if (isCombined) {
        const shareDiff = Math.ceil(costDifference / 2);
        const initiator = await dbGetFamilyById(booking.familyId);
        const invited = booking.invitedFamilyId ? await dbGetFamilyById(booking.invitedFamilyId) : null;
        if (initiator) await dbUpdateFamily(initiator.id, { priorityScore: initiator.priorityScore - shareDiff });
        if (invited) await dbUpdateFamily(invited.id, { priorityScore: invited.priorityScore - shareDiff });
      } else {
        const family = await dbGetFamilyById(input.familyId);
        if (family) await dbUpdateFamily(input.familyId, { priorityScore: family.priorityScore - costDifference });
      }
    }

    const family = await dbGetFamilyById(input.familyId);
    return { success: true, newScore: family?.priorityScore, message: `Checked out! Total cost: ${actualTotalCost} pts for ${actualDays} days.` };
  }
  return { success: false, message: 'Booking not found' };
}

export async function adminCreateFamily(input: { familyName: string; pinCode: string; role?: string; avatarUrl?: string }) {
  await delay();
  const family = await dbCreateFamily({
    familyName: input.familyName,
    pinCode: input.pinCode,
    priorityScore: 250,
    role: input.role ?? 'MEMBER',
    avatarUrl: input.avatarUrl ?? '',
  });
  return { success: true, familyId: family.id };
}

export async function updateFamilyName(input: { familyId: string; familyName: string }) {
  await delay();
  await dbUpdateFamily(input.familyId, { familyName: input.familyName });
  return { success: true };
}

export async function getPendingInvitations(input: { familyId: string }) {
  await delay();
  const all = await dbGetNotificationsByFamily(input.familyId);
  const bookings = await dbGetBookings();
  // Only show invitations for bookings that are still Pending
  const invitations = all.filter(n => {
    if (n.type !== 'invitation') return false;
    const booking = bookings.find(b => b.id === n.relatedId);
    return booking?.status === 'Pending';
  });
  const enriched = invitations.map(inv => {
    const booking = bookings.find(b => b.id === inv.relatedId);
    return { ...inv, booking };
  });
  return { invitations: enriched };
}

export async function respondToInvitation(input: { bookingId: string; familyId: string; action: 'accept' | 'decline' }) {
  await delay();
  const booking = (await dbGetBookings()).find(b => b.id === input.bookingId);
  const family = await dbGetFamilyById(input.familyId);
  if (!booking || !family) throw new Error('Booking or family not found');

  if (input.action === 'accept') {
    // Deduct invited family's share
    if (booking.invitedFamilyId === input.familyId) {
      const days = booking.checkOutDate ? Math.max(1, Math.ceil((new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / 86400000)) : 0;
      const share = days > 0 ? Math.ceil((days * getBookingRate(booking.bookingType)) / 2) : 0;
      if (share > 0) {
        await dbUpdateFamily(family.id, { priorityScore: family.priorityScore - share });
      }
    }
    await dbUpdateBooking(input.bookingId, { status: 'Confirmed' });
    // Notify initiator
    await dbCreateNotification({
      familyId: booking.familyId,
      relatedId: booking.id,
      type: 'system',
      message: `${family.familyName} accepted your invitation for ${booking.checkInDate}!`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
    return { success: true, message: 'Invitation accepted! Booking confirmed.', checkInDate: booking.checkInDate };
  } else {
    // Refund initiator's share since combined stay is off
    const initiator = await dbGetFamilyById(booking.familyId);
    const days = booking.checkOutDate ? Math.max(1, Math.ceil((new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / 86400000)) : 0;
    const share = days > 0 ? Math.ceil((days * getBookingRate(booking.bookingType)) / 2) : 0;
    if (initiator && share > 0) {
      await dbUpdateFamily(initiator.id, { priorityScore: initiator.priorityScore + share });
    }
    await dbUpdateBooking(input.bookingId, { status: 'Declined' });
    // Notify initiator
    await dbCreateNotification({
      familyId: booking.familyId,
      relatedId: booking.id,
      type: 'system',
      message: `${family.familyName} declined your invitation for ${booking.checkInDate}. You can proceed solo or cancel.`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
    return { success: true, message: 'Invitation declined.', checkInDate: booking.checkInDate };
  }
}

export async function updateFamilyPin(input: { familyId: string; pinCode: string }) {
  await delay();
  await dbUpdateFamily(input.familyId, { pinCode: input.pinCode });
  return { success: true };
}

export async function updateBooking(input: { bookingId: string; familyId: string; checkInDate?: string; checkOutDate?: string | null }) {
  await delay();
  const booking = (await dbGetBookings()).find(b => b.id === input.bookingId);
  if (!booking) throw new Error('Booking not found');
  if (booking.familyId !== input.familyId && booking.invitedFamilyId !== input.familyId) throw new Error('Not authorized');
  const updates: Partial<Omit<Booking, 'id'>> = {};
  if (input.checkInDate !== undefined) updates.checkInDate = input.checkInDate;
  if (input.checkOutDate !== undefined) updates.checkOutDate = input.checkOutDate ?? null;
  await dbUpdateBooking(input.bookingId, updates);
  return { success: true, message: 'Booking updated successfully.' };
}


export async function adminDeleteFamily(input: { familyId: string }) {
  await delay();
  await dbDeleteFamily(input.familyId);
  return { success: true, message: 'Family removed.' };
}

export async function adminDeleteBooking(input: { bookingId: string }) {
  await delay();
  await dbDeleteBooking(input.bookingId);
  return { success: true, message: 'Booking removed.' };
}


export async function getHouseSettings() {
  await delay();
  const settings = await dbGetHouseSettings();
  return { success: true, settings };
}

export async function updateHouseSettings(input: Partial<HouseSettings>) {
  await delay();
  const settings = await dbUpdateHouseSettings(input);
  return { success: true, settings, message: 'House settings updated.' };
}
