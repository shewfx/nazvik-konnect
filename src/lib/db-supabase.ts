// Supabase database layer for NazVik Farmhouse Booking
// Replaces LocalStorage with real PostgreSQL via Supabase

import { supabase } from './supabase'
import { type HouseInfo } from './house-info'

export type HouseSettings = HouseInfo

export type Family = {
  id: string;
  familyName: string;
  pinCode: string;
  priorityScore: number;
  role: string;
  avatarUrl: string;
};

export type Booking = {
  id: string;
  familyId: string;
  invitedFamilyId: string | null;
  initiatorFamilyId: string | null;
  checkInDate: string;
  checkOutDate: string | null;
  checkInTime: string | null;
  bookingType: string;
  status: string;
  costPoints: number;
  guestCount: number;
  createdAt: string;
};

export type Inspection = {
  id: string;
  bookingId: string;
  inspectorFamilyId: string;
  isClean: boolean;
  evidencePhotoUrl?: string;
  comments?: string;
  checklist?: Record<string, boolean>;
  inspectedAt: string;
};

export type Notification = {
  id: string;
  familyId: string;
  relatedId: string | null;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export type CheckoutPhoto = {
  id: string;
  bookingId: string;
  familyId: string;
  areaName: string;
  photoUrl: string;
  createdAt: string;
};

function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function mapFamily(row: Record<string, unknown>): Family {
  return {
    id: row.id as string,
    familyName: row.family_name as string,
    pinCode: row.pin_code as string,
    priorityScore: row.priority_score as number,
    role: row.role as string,
    avatarUrl: row.avatar_url as string,
  };
}

function mapBooking(row: Record<string, unknown>): Booking {
  return {
    id: row.id as string,
    familyId: row.family_id as string,
    invitedFamilyId: (row.invited_family_id as string | null) ?? null,
    initiatorFamilyId: (row.initiator_family_id as string | null) ?? null,
    checkInDate: row.check_in_date as string,
    checkOutDate: (row.check_out_date as string | null) ?? null,
    checkInTime: (row.check_in_time as string | null) ?? null,
    bookingType: row.booking_type as string,
    status: row.status as string,
    costPoints: row.cost_points as number,
    guestCount: row.guest_count as number,
    createdAt: row.created_at as string,
  };
}

function mapNotification(row: Record<string, unknown>): Notification {
  return {
    id: row.id as string,
    familyId: row.family_id as string,
    relatedId: (row.related_id as string | null) ?? null,
    type: row.type as string,
    message: row.message as string,
    isRead: row.is_read as boolean,
    createdAt: row.created_at as string,
  };
}

function mapInspection(row: Record<string, unknown>): Inspection {
  return {
    id: row.id as string,
    bookingId: row.booking_id as string,
    inspectorFamilyId: row.inspector_family_id as string,
    isClean: row.is_clean as boolean,
    evidencePhotoUrl: row.evidence_photo_url as string | undefined,
    comments: row.comments as string | undefined,
    checklist: row.checklist as Record<string, boolean> | undefined,
    inspectedAt: row.inspected_at as string,
  };
}

function mapCheckoutPhoto(row: Record<string, unknown>): CheckoutPhoto {
  return {
    id: row.id as string,
    bookingId: row.booking_id as string,
    familyId: row.family_id as string,
    areaName: row.area_name as string,
    photoUrl: row.photo_url as string,
    createdAt: row.created_at as string,
  };
}

// Seed data helper — call this once from Supabase SQL Editor if tables are empty
export async function seedFamilies(): Promise<void> {
  const families = [
    { id: 'fam1', family_name: 'Demo Family A', pin_code: '0001', priority_score: 320, role: 'MEMBER', avatar_url: '' },
    { id: 'fam2', family_name: 'Demo Family B', pin_code: '0002', priority_score: 280, role: 'MEMBER', avatar_url: '' },
    { id: 'fam3', family_name: 'Demo Family C', pin_code: '0003', priority_score: 250, role: 'MEMBER', avatar_url: '' },
    { id: 'fam4', family_name: 'Demo Family D', pin_code: '0004', priority_score: 190, role: 'MEMBER', avatar_url: '' },
  ];
  const { data: existing } = await supabase.from('families').select('id');
  if (existing && existing.length > 0) return;
  await supabase.from('families').insert(families);
}

// Families
export async function getFamilies(): Promise<Family[]> {
  try {
    const { data, error } = await supabase.from('families').select('*').order('family_name');
    if (error) { console.error('Supabase error (getFamilies):', error); return []; }
    return (data || []).map(mapFamily);
  } catch (e) {
    console.error('Supabase exception (getFamilies):', e);
    return [];
  }
}

export async function getFamilyById(id: string): Promise<Family | null> {
  try {
    const { data, error } = await supabase.from('families').select('*').eq('id', id).single();
    if (error || !data) return null;
    return mapFamily(data);
  } catch (e) {
    console.error('Supabase exception (getFamilyById):', e);
    return null;
  }
}

export async function createFamily(data: Omit<Family, 'id'>): Promise<Family> {
  try {
    const family = { ...data, id: generateId('fam') };
    const dbRow = {
      id: family.id,
      family_name: family.familyName,
      pin_code: family.pinCode,
      priority_score: family.priorityScore,
      role: family.role,
      avatar_url: family.avatarUrl,
    };
    const { error } = await supabase.from('families').insert(dbRow);
    if (error) { console.error('Supabase error (createFamily):', error); throw error; }
    return family;
  } catch (e) {
    console.error('Supabase exception (createFamily):', e);
    throw e;
  }
}

export async function updateFamily(id: string, updates: Partial<Omit<Family, 'id'>>): Promise<Family | null> {
  try {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.familyName !== undefined) dbUpdates.family_name = updates.familyName;
    if (updates.pinCode !== undefined) dbUpdates.pin_code = updates.pinCode;
    if (updates.priorityScore !== undefined) dbUpdates.priority_score = updates.priorityScore;
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;

    const { error } = await supabase.from('families').update(dbUpdates).eq('id', id);
    if (error) { console.error('Supabase error (updateFamily):', error); return null; }
    return getFamilyById(id);
  } catch (e) {
    console.error('Supabase exception (updateFamily):', e);
    return null;
  }
}

export async function deleteFamily(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('families').delete().eq('id', id);
    return !error;
  } catch (e) {
    console.error('Supabase exception (deleteFamily):', e);
    return false;
  }
}

// Bookings
export async function getBookings(): Promise<Booking[]> {
  try {
    const { data, error } = await supabase.from('bookings').select('*').order('check_in_date');
    if (error) { console.error('Supabase error (getBookings):', error); return []; }
    return (data || []).map(mapBooking);
  } catch (e) {
    console.error('Supabase exception (getBookings):', e);
    return [];
  }
}

export async function getBookingById(id: string): Promise<Booking | null> {
  try {
    const { data, error } = await supabase.from('bookings').select('*').eq('id', id).single();
    if (error || !data) return null;
    return mapBooking(data);
  } catch (e) {
    console.error('Supabase exception (getBookingById):', e);
    return null;
  }
}

export async function createBooking(data: Omit<Booking, 'id'>): Promise<Booking> {
  try {
    const booking = { ...data, id: generateId('bk') };
    const dbRow = {
      id: booking.id,
      family_id: booking.familyId,
      invited_family_id: booking.invitedFamilyId ?? null,
      initiator_family_id: booking.initiatorFamilyId ?? null,
      check_in_date: booking.checkInDate,
      check_out_date: booking.checkOutDate ?? null,
      check_in_time: booking.checkInTime ?? null,
      booking_type: booking.bookingType,
      status: booking.status,
      cost_points: booking.costPoints,
      guest_count: booking.guestCount,
      created_at: booking.createdAt,
    };
    const { error } = await supabase.from('bookings').insert(dbRow);
    if (error) { console.error('Supabase error (createBooking):', error); throw error; }
    return booking;
  } catch (e) {
    console.error('Supabase exception (createBooking):', e);
    throw e;
  }
}

export async function updateBooking(id: string, updates: Partial<Omit<Booking, 'id'>>): Promise<Booking | null> {
  try {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.familyId !== undefined) dbUpdates.family_id = updates.familyId;
    if (updates.checkInDate !== undefined) dbUpdates.check_in_date = updates.checkInDate;
    if (updates.checkOutDate !== undefined) dbUpdates.check_out_date = updates.checkOutDate ?? null;
    if (updates.checkInTime !== undefined) dbUpdates.check_in_time = updates.checkInTime ?? null;
    if (updates.invitedFamilyId !== undefined) dbUpdates.invited_family_id = updates.invitedFamilyId ?? null;
    if (updates.initiatorFamilyId !== undefined) dbUpdates.initiator_family_id = updates.initiatorFamilyId ?? null;
    if (updates.bookingType !== undefined) dbUpdates.booking_type = updates.bookingType;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.costPoints !== undefined) dbUpdates.cost_points = updates.costPoints;
    if (updates.guestCount !== undefined) dbUpdates.guest_count = updates.guestCount;

    const { error } = await supabase.from('bookings').update(dbUpdates).eq('id', id);
    if (error) { console.error('Supabase error (updateBooking):', error); return null; }
    return getBookingById(id);
  } catch (e) {
    console.error('Supabase exception (updateBooking):', e);
    return null;
  }
}

export async function deleteBooking(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('bookings').delete().eq('id', id);
    return !error;
  } catch (e) {
    console.error('Supabase exception (deleteBooking):', e);
    return false;
  }
}

// Inspections
export async function getInspections(): Promise<Inspection[]> {
  try {
    const { data, error } = await supabase.from('inspections').select('*').order('inspected_at', { ascending: false });
    if (error) { console.error('Supabase error (getInspections):', error); return []; }
    return (data || []).map(mapInspection);
  } catch (e) {
    console.error('Supabase exception (getInspections):', e);
    return [];
  }
}

export async function createInspection(data: Omit<Inspection, 'id'>): Promise<Inspection> {
  try {
    const inspection = { ...data, id: generateId('insp') };
    const dbRow = {
      id: inspection.id,
      booking_id: inspection.bookingId,
      inspector_family_id: inspection.inspectorFamilyId,
      is_clean: inspection.isClean,
      evidence_photo_url: inspection.evidencePhotoUrl,
      comments: inspection.comments,
      checklist: inspection.checklist ?? null,
      inspected_at: inspection.inspectedAt,
    };
    const { error } = await supabase.from('inspections').insert(dbRow);
    if (error) { console.error('Supabase error (createInspection):', error); throw error; }
    return inspection;
  } catch (e) {
    console.error('Supabase exception (createInspection):', e);
    throw e;
  }
}

// Notifications
export async function getNotifications(): Promise<Notification[]> {
  try {
    const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
    if (error) { console.error('Supabase error (getNotifications):', error); return []; }
    return (data || []).map(mapNotification);
  } catch (e) {
    console.error('Supabase exception (getNotifications):', e);
    return [];
  }
}

export async function getNotificationsByFamily(familyId: string): Promise<Notification[]> {
  try {
    const { data, error } = await supabase.from('notifications').select('*').eq('family_id', familyId).order('created_at', { ascending: false });
    if (error) { console.error('Supabase error (getNotificationsByFamily):', error); return []; }
    return (data || []).map(mapNotification);
  } catch (e) {
    console.error('Supabase exception (getNotificationsByFamily):', e);
    return [];
  }
}

export async function createNotification(data: Omit<Notification, 'id'>): Promise<Notification> {
  try {
    const notification = { ...data, id: generateId('notif') };
    const dbRow = {
      id: notification.id,
      family_id: notification.familyId,
      related_id: notification.relatedId ?? null,
      type: notification.type,
      message: notification.message,
      is_read: notification.isRead,
      created_at: notification.createdAt,
    };
    const { error } = await supabase.from('notifications').insert(dbRow);
    if (error) { console.error('Supabase error (createNotification):', error); throw error; }
    return notification;
  } catch (e) {
    console.error('Supabase exception (createNotification):', e);
    throw e;
  }
}

export async function markNotificationsReadByFamily(familyId: string): Promise<void> {
  try {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('family_id', familyId);
    if (error) console.error('Supabase error (markNotificationsReadByFamily):', error);
  } catch (e) {
    console.error('Supabase exception (markNotificationsReadByFamily):', e);
  }
}

function getBookingRate(bookingType: string): number {
  if (bookingType === 'Family') return 5;
  if (bookingType === 'Friends') return 8;
  if (bookingType === 'Combined') return 8;
  return 6;
}

// Checkout Photos
export async function getCheckoutPhotos(): Promise<CheckoutPhoto[]> {
  try {
    const { data, error } = await supabase.from('checkout_photos').select('*').order('created_at', { ascending: false });
    if (error) { console.error('Supabase error (getCheckoutPhotos):', error); return []; }
    return (data || []).map(mapCheckoutPhoto);
  } catch (e) {
    console.error('Supabase exception (getCheckoutPhotos):', e);
    return [];
  }
}

export async function createCheckoutPhoto(data: Omit<CheckoutPhoto, 'id'>): Promise<CheckoutPhoto> {
  try {
    const photo = { ...data, id: generateId('cp') };
    const dbRow = {
      id: photo.id,
      booking_id: photo.bookingId,
      family_id: photo.familyId,
      area_name: photo.areaName,
      photo_url: photo.photoUrl,
      created_at: photo.createdAt,
    };
    const { error } = await supabase.from('checkout_photos').insert(dbRow);
    if (error) { console.error('Supabase error (createCheckoutPhoto):', error); throw error; }
    return photo;
  } catch (e) {
    console.error('Supabase exception (createCheckoutPhoto):', e);
    throw e;
  }
}

export async function checkoutBooking(id: string, checkOutDate: string): Promise<Booking | null> {
  try {
    const booking = await getBookingById(id);
    if (!booking) return null;
    const days = Math.max(1, Math.ceil((new Date(checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / 86400000));
    const costPoints = days * getBookingRate(booking.bookingType);
    const dbUpdates = {
      check_out_date: checkOutDate,
      status: 'Completed',
      cost_points: costPoints,
    };
    const { error } = await supabase.from('bookings').update(dbUpdates).eq('id', id);
    if (error) { console.error('Supabase error (checkoutBooking):', error); return null; }
    return getBookingById(id);
  } catch (e) {
    console.error('Supabase exception (checkoutBooking):', e);
    return null;
  }
}

export async function resetDB(): Promise<void> {
  // No-op for Supabase — data persists in cloud. Use SQL Editor if you need to reset.
  console.warn('resetDB() is not supported with Supabase. Use the Supabase SQL Editor to truncate tables.');
}

const HOUSE_SETTINGS_KEY = 'nazvik_house_settings_fallback';

const defaultHouseSettings: HouseSettings = {
  wifi: { ssid: 'Demo Wi-Fi', password: 'demo-only-password' },
  emergency: [
    { name: 'Demo contact', number: '000-000-0000' },
  ],
  location: { lat: 0, lng: 0, label: 'Demo location' },
  checklist: [
    { id: 'tv', label: 'TV / Remote working' },
    { id: 'ac', label: 'AC / Heater working' },
    { id: 'fridge', label: 'Fridge clean & running' },
    { id: 'beds', label: 'Bedsheets & pillows clean' },
    { id: 'bath', label: 'Bathroom clean, water heater ok' },
    { id: 'kitchen', label: 'Kitchen utensils intact' },
    { id: 'doors', label: 'All doors & windows lock properly' },
    { id: 'wifi', label: 'WiFi router powered on' },
  ],
  rules: [
    'Check-out by 12:00 PM. Late checkout costs 5 pts/hour.',
    'Clean up before leaving — next family appreciates it.',
    'No smoking inside the house.',
    'Lock all doors and gates when leaving.',
    'Report any damage immediately via the app.',
    'Pets allowed only in the outdoor area.',
  ],
};

export async function getHouseSettings(): Promise<HouseSettings> {
  try {
    const { data, error } = await supabase.from('house_settings').select('*').eq('id', 'default').single();
    if (!error && data) {
      return {
        wifi: data.wifi ?? defaultHouseSettings.wifi,
        emergency: data.emergency ?? defaultHouseSettings.emergency,
        location: data.location ?? defaultHouseSettings.location,
        checklist: data.checklist ?? defaultHouseSettings.checklist,
        rules: data.rules ?? defaultHouseSettings.rules,
      };
    }
  } catch (e) {
    console.error('Supabase exception (getHouseSettings):', e);
  }
  // Fallback to localStorage if Supabase table doesn't exist
  try {
    const raw = localStorage.getItem(HOUSE_SETTINGS_KEY);
    if (raw) return { ...defaultHouseSettings, ...JSON.parse(raw) };
  } catch {}
  return defaultHouseSettings;
}

export async function updateHouseSettings(updates: Partial<HouseSettings>): Promise<HouseSettings> {
  try {
    const { error } = await supabase.from('house_settings').upsert({ id: 'default', ...updates }, { onConflict: 'id' });
    if (!error) {
      const { data } = await supabase.from('house_settings').select('*').eq('id', 'default').single();
      if (data) {
        const result = {
          wifi: data.wifi ?? defaultHouseSettings.wifi,
          emergency: data.emergency ?? defaultHouseSettings.emergency,
          location: data.location ?? defaultHouseSettings.location,
          checklist: data.checklist ?? defaultHouseSettings.checklist,
          rules: data.rules ?? defaultHouseSettings.rules,
        };
        localStorage.setItem(HOUSE_SETTINGS_KEY, JSON.stringify(result));
        return result;
      }
    }
  } catch (e) {
    console.error('Supabase exception (updateHouseSettings):', e);
  }
  // Fallback: save to localStorage and return merged
  const current = await getHouseSettings();
  const result = { ...current, ...updates };
  localStorage.setItem(HOUSE_SETTINGS_KEY, JSON.stringify(result));
  return result;
}
