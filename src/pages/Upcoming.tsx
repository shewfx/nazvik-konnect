
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSession, updateScore } from '../lib/auth';
import { getBookings, cancelBooking, checkoutBooking, updateBooking, saveCheckoutPhotos, GetBookingsOutputType } from 'zite-endpoints-sdk';
import { scheduleCheckInReminder } from '../lib/notifications';
import { format } from 'date-fns';
import { Loader2, CalendarDays, Swords, ClipboardCheck, LogOut, Pencil, Camera, X } from 'lucide-react';
import { uploadFile } from 'zite-file-upload-sdk';
import TicketCard from '../components/TicketCard';
import SkeletonTicketCard from '../components/SkeletonTicketCard';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

type Booking = GetBookingsOutputType['bookings'][0];

function BookingActions({ b, session, onChallenge, onInspect, onCheckout, onEdit }: { b: Booking; session: ReturnType<typeof getSession>; onChallenge?: () => void; onInspect?: () => void; onCheckout?: () => void; onEdit?: () => void }) {
  const days = b.checkOutDate ? Math.ceil((new Date(b.checkOutDate).getTime() - new Date(b.checkInDate).getTime()) / 86400000) : 0;
  const isMine = b.familyId === session?.familyId;
  const isInvited = b.invitedFamilyId === session?.familyId;
  const canChallenge = !isMine && !isInvited && b.status === 'Pending' && days > 0 && (session?.priorityScore ?? 0) > b.costPoints / days;
  const today = new Date().toISOString().split('T')[0];
  const isActive = b.status === 'Active';

  if (!isMine && !isInvited && !canChallenge) return null;

  return (
    <div className="flex gap-1.5 mt-3">
      {b.status === 'Pending' && (isMine || isInvited) && (
        <div className="flex-1 text-center py-2 rounded-xl bg-amber-50 text-amber-600 text-xs font-semibold border border-amber-200 whitespace-nowrap">
          Awaiting confirmation
        </div>
      )}
      {isMine && isActive && b.checkOutDate !== null && onCheckout && (
        <button onClick={onCheckout} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-blue-50 text-blue-600 text-xs font-semibold border border-blue-200 whitespace-nowrap">
          <LogOut className="w-3.5 h-3.5 shrink-0" /> Checkout
        </button>
      )}
      {isMine && b.status === 'Confirmed' && b.checkInDate <= today && onInspect && (
        <button onClick={onInspect} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-accent/50 text-accent-foreground text-xs font-semibold whitespace-nowrap">
          <ClipboardCheck className="w-3.5 h-3.5" /> Check-In
        </button>
      )}
      {isMine && b.status === 'Confirmed' && onEdit && (
        <button onClick={onEdit} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-muted text-muted-foreground text-xs font-semibold border border-border whitespace-nowrap">
          <Pencil className="w-3.5 h-3.5" /> Edit
        </button>
      )}
      {canChallenge && (
        <button onClick={onChallenge} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold whitespace-nowrap">
          <Swords className="w-3.5 h-3.5" /> Challenge
        </button>
      )}
    </div>
  );
}

function CheckoutInvoiceDialog({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const today = new Date().toISOString().split('T')[0];
  const days = Math.max(1, Math.ceil((new Date(today).getTime() - new Date(booking.checkInDate).getTime()) / 86400000));
  const rate = booking.bookingType === 'Family' ? 5 : 8;
  const cost = days * rate;
  return (
    <AlertDialog open onOpenChange={onClose}>
      <AlertDialogContent className="z-[100] max-w-xs rounded-3xl p-0 overflow-hidden">
        <AlertDialogHeader className="px-6 pt-6 pb-3">
          <AlertDialogTitle className="text-base font-bold">Trip Invoice</AlertDialogTitle>
        </AlertDialogHeader>
        <div className="px-6 pb-2 space-y-0">
          <div className="border-t border-border" />
          <div className="flex justify-between py-3 text-sm">
            <span className="text-muted-foreground">Check-in:</span>
            <span className="font-medium">{booking.checkInDate}</span>
          </div>
          <div className="flex justify-between py-3 text-sm border-t border-border">
            <span className="text-muted-foreground">Check-out:</span>
            <span className="font-medium">{today}</span>
          </div>
          <div className="flex justify-between py-3 text-sm border-t border-border">
            <span className="text-muted-foreground">Days stayed:</span>
            <span className="font-medium">{days} days</span>
          </div>
          <div className="flex justify-between py-3 text-sm border-t border-border">
            <span className="text-muted-foreground">Rate:</span>
            <span className="font-medium">{rate} pts/day ({booking.bookingType.toLowerCase()})</span>
          </div>
          <div className="border-t-2 border-border" />
          <div className="flex justify-between py-3 text-sm">
            <span className="font-bold">Total Cost:</span>
            <span className="font-bold text-destructive">- {cost} pts</span>
          </div>
        </div>
        <div className="flex border-t border-border">
          <AlertDialogAction onClick={onClose} className="flex-1 rounded-none border-0 m-0 h-12 bg-primary text-primary-foreground font-bold">
            Done
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const AREAS = ['Bedroom', 'Ladies Room', 'Sitting Area', 'Kitchen', 'Swimming Area', 'Washroom'] as const;

function CheckoutPhotoDialog({ booking, onClose, onConfirm }: { booking: Booking; onClose: () => void; onConfirm: (areaPhotos: Record<string, string>) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [areaPhotos, setAreaPhotos] = useState<Record<string, string>>({});
  const [uploadingArea, setUploadingArea] = useState<string | null>(null);
  const [activeArea, setActiveArea] = useState<string | null>(null);
  const isOpenEnded = booking.checkOutDate === null;

  const handleCaptureClick = (area: string) => {
    setActiveArea(area);
    fileRef.current?.click();
  };

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeArea) return;
    setUploadingArea(activeArea);
    try {
      const { fileUrl } = await uploadFile({ data: file, filename: file.name });
      setAreaPhotos(prev => ({ ...prev, [activeArea]: fileUrl }));
    } catch {
      toast.error('Photo upload failed');
    } finally {
      setUploadingArea(null);
      setActiveArea(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removePhoto = (area: string) => {
    setAreaPhotos(prev => {
      const next = { ...prev };
      delete next[area];
      return next;
    });
  };

  const allAreasDone = AREAS.every(area => areaPhotos[area]);

  return (
    <AlertDialog open onOpenChange={onClose}>
      <AlertDialogContent className="z-[100] max-w-xs rounded-3xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Check Out?</AlertDialogTitle>
          <AlertDialogDescription>
            {isOpenEnded
              ? 'Please upload photos for all areas before checking out of this open-ended stay.'
              : 'Please upload photos for all farmhouse areas before checking out.'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={handleCapture}
          />
          {AREAS.map(area => {
            const photo = areaPhotos[area];
            const isUploading = uploadingArea === area;
            return (
              <div key={area} className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-card">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{area}</p>
                  {photo ? (
                    <p className="text-xs text-green-600 font-medium">Photo added</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Photo required</p>
                  )}
                </div>
                {photo ? (
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-border shrink-0">
                    <img src={photo} alt={area} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removePhoto(area)}
                      className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleCaptureClick(area)}
                    disabled={!!uploadingArea}
                    className="w-12 h-12 rounded-xl border-2 border-dashed border-border bg-background flex items-center justify-center hover:border-primary/40 transition-colors shrink-0"
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Camera className="w-4 h-4 text-primary" />}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>{isOpenEnded ? 'Stay Longer' : 'Cancel'}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm(areaPhotos)}
            disabled={!allAreasDone}
            className="bg-primary text-primary-foreground"
          >
            Check Out
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function Upcoming() {
  const nav = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutPhotos, setCheckoutPhotos] = useState<Booking | null>(null);
  const [checkoutInvoice, setCheckoutInvoice] = useState<Booking | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const session = getSession();
  if (!session) return null;

  useEffect(() => {
    getBookings({ upcomingOnly: true })
      .then(bRes => {
        setBookings(bRes.bookings);
        // Schedule push notifications for upcoming check-ins
        bRes.bookings.forEach(b => {
          if (b.status !== 'Cancelled' && b.status !== 'Completed') {
            scheduleCheckInReminder(b.checkInDate, b.familyName);
          }
        });
      })
      .finally(() => setLoading(false));
  }, []);

  // Booking reminder: toast if any booking starts tomorrow
  useEffect(() => {
    if (bookings.length === 0) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const reminder = bookings.find(b =>
      b.checkInDate === tomorrowStr &&
      b.status !== 'Cancelled' &&
      b.status !== 'Completed'
    );
    if (reminder) {
      toast.info(`Your NazVik stay starts tomorrow (${format(new Date(reminder.checkInDate), 'd MMM')})!`, { duration: 6000 });
    }
  }, [bookings]);

  const handleCancel = async (b: Booking) => {
    try {
      const res = await cancelBooking({ bookingId: b.id, familyId: session.familyId });
      if (res.success) {
        if (res.newScore !== undefined) updateScore(res.newScore);
        toast.success(res.message);
        setBookings(prev => prev.filter(x => x.id !== b.id));
      }
    } catch { toast.error('Failed to cancel booking'); }
  };

  const handleCheckout = async (b: Booking) => {
    try {
      const res = await checkoutBooking({ bookingId: b.id, familyId: session.familyId });
      if (res.success) {
        if (res.newScore !== undefined) updateScore(res.newScore);
        toast.success(res.message);
        setBookings(prev => prev.map(x => x.id === b.id ? { ...x, status: 'Completed', checkOutDate: new Date().toISOString().split('T')[0] } : x));
        if (b.checkOutDate === null) {
          setCheckoutInvoice(b);
        }
      }
    } catch { toast.error('Failed to check out'); }
  };

  const openEdit = (b: Booking) => {
    setEditingBooking(b);
    setEditCheckIn(b.checkInDate);
    setEditCheckOut(b.checkOutDate ?? '');
  };

  const handleEditSave = async () => {
    if (!editingBooking) return;
    if (!editCheckIn) { toast.error('Check-in date is required'); return; }
    if (editCheckOut && editCheckOut <= editCheckIn) { toast.error('Check-out must be after check-in'); return; }
    setEditLoading(true);
    try {
      const res = await updateBooking({
        bookingId: editingBooking.id,
        familyId: session.familyId,
        checkInDate: editCheckIn,
        checkOutDate: editCheckOut || null,
      });
      if (res.success) {
        toast.success(res.message);
        setBookings(prev => prev.map(x => x.id === editingBooking.id ? { ...x, checkInDate: editCheckIn, checkOutDate: editCheckOut || null } : x));
        setEditingBooking(null);
      }
    } catch { toast.error('Failed to update booking'); }
    finally { setEditLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-background">
      <Toaster />
      <div className="w-full max-w-md min-h-screen flex flex-col">
        <div className="bg-primary px-6 pt-12 pb-6 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-white/5 animate-float-1" />
          <div className="absolute bottom-4 -left-8 w-36 h-36 rounded-full bg-white/5 animate-float-2" />
          <div className="absolute top-20 right-8 w-20 h-20 rounded-full bg-white/5 animate-float-3" />
          <div className="flex items-center gap-2 mb-4 relative z-10">
            <CalendarDays className="w-5 h-5 text-primary-foreground/70" />
            <span className="text-primary-foreground/70 text-sm">All Reservations</span>
          </div>
          <h1 className="text-primary-foreground text-2xl font-bold relative z-10">Upcoming Trips</h1>
        </div>

        <div className="flex-1 px-4 py-4 pb-28 space-y-3">
          {loading ? (
            <div className="space-y-3">
              <SkeletonTicketCard />
              <SkeletonTicketCard />
            </div>
          ) : bookings.length === 0 ? <div className="text-center py-12 text-muted-foreground">No upcoming bookings</div>
          : bookings.map(b => (
              <div key={b.id}>
                <TicketCard b={b} showFamily isMine={b.familyId === session.familyId} onCancel={() => handleCancel(b)} onCheckout={() => setCheckoutPhotos(b)} />
                <BookingActions
                  b={b} session={session}
                  onChallenge={() => nav(`/dashboard?checkIn=${b.checkInDate}&checkOut=${b.checkOutDate || ''}`)}
                  onInspect={() => nav(`/inspection?bookingId=${b.id}`)}
                  onCheckout={() => setCheckoutPhotos(b)}
                  onEdit={() => openEdit(b)}
                />
              </div>
            ))
          }
        </div>
      </div>

      {/* Checkout photo upload dialog */}
      {checkoutPhotos && (
        <CheckoutPhotoDialog
          booking={checkoutPhotos}
          onClose={() => setCheckoutPhotos(null)}
          onConfirm={async (areaPhotos) => {
            const b = checkoutPhotos;
            setCheckoutPhotos(null);
            try {
              await saveCheckoutPhotos({
                bookingId: b.id,
                familyId: session.familyId,
                photos: Object.entries(areaPhotos).map(([areaName, photoUrl]) => ({ areaName, photoUrl })),
              });
            } catch {
              toast.error('Failed to save checkout photos');
            }
            handleCheckout(b);
          }}
        />
      )}

      {/* Invoice after open-ended checkout */}
      {checkoutInvoice && (
        <CheckoutInvoiceDialog booking={checkoutInvoice} onClose={() => setCheckoutInvoice(null)} />
      )}

      {/* Edit Booking Dialog */}
      {editingBooking && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50" onClick={() => setEditingBooking(null)}>
          <div className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 space-y-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground">Edit Booking</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Check-In Date</label>
                <input
                  type="date"
                  value={editCheckIn}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setEditCheckIn(e.target.value)}
                  className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Check-Out Date (leave empty for open-ended)</label>
                <input
                  type="date"
                  value={editCheckOut}
                  min={editCheckIn}
                  onChange={e => setEditCheckOut(e.target.value)}
                  className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setEditingBooking(null)}
                className="flex-1 h-11 rounded-xl border border-border bg-card text-foreground font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={editLoading}
                className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2"
              >
                {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
