
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CalendarDays, Loader2, CheckCircle2, MessageCircle, ChevronDown, Info, Users, Plane } from 'lucide-react';
import { createBooking, getFamilies, getBookings } from 'zite-endpoints-sdk';
import { getSession, updateScore } from '../lib/auth';
import { toast } from 'sonner';
import { openWhatsAppShare, buildBookingInviteMessage } from '../lib/whatsapp';

type Props = { preCheckIn?: string | null; preCheckOut?: string | null };

function WhatsAppInvite({ initiatorName, checkInDate, checkOutDate, openEnded }: {
  initiatorName: string;
  checkInDate: string;
  checkOutDate: string | null;
  openEnded: boolean;
}) {
  const handleShare = () => {
    const msg = buildBookingInviteMessage(initiatorName, checkInDate, checkOutDate, openEnded);
    openWhatsAppShare(msg);
  };
  return (
    <button
      onClick={handleShare}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-green-50 text-green-600 text-sm font-semibold border border-green-200 hover:bg-green-100 transition-colors"
    >
      <MessageCircle className="w-4 h-4" /> Share invite on WhatsApp
    </button>
  );
}

function InvoiceDialog({ session, days, costPerDay, totalCost, charge, bookingType, loading, onConfirm, openEnded }: {
  session: ReturnType<typeof getSession>;
  days: number; costPerDay: number; totalCost: number; charge: number; bookingType: string;
  loading: boolean; onConfirm: () => void; openEnded: boolean;
}) {
  const remaining = (session?.priorityScore ?? 0) - charge;
  return (
    <AlertDialogContent className="z-[100] max-w-xs rounded-3xl p-0 overflow-hidden">
      <AlertDialogHeader className="px-6 pt-6 pb-3">
        <AlertDialogTitle className="text-base font-bold">{openEnded ? 'Open-Ended Booking' : 'Trip Score Invoice'}</AlertDialogTitle>
      </AlertDialogHeader>
      <div className="px-6 pb-2 space-y-0">
        <div className="border-t border-border" />
        <div className="flex justify-between py-3 text-sm">
          <span className="text-muted-foreground">Current Score:</span>
          <span className="font-bold">{session?.priorityScore}</span>
        </div>
        {openEnded ? (
          <div className="py-3 text-sm border-t border-border">
            <p className="text-muted-foreground">You'll check out later. Cost will be calculated at checkout based on total days stayed.</p>
            <p className="font-medium mt-1">Rate: {costPerDay} pts/day ({bookingType.toLowerCase()})</p>
          </div>
        ) : (
          <>
            <div className="flex justify-between py-3 text-sm border-t border-border">
              <span className="text-muted-foreground">Rate ({bookingType.toLowerCase()}):</span>
              <span className="font-medium">{costPerDay} x {days} days</span>
            </div>
            <div className="flex justify-between py-3 text-sm border-t border-border">
              <span className="font-semibold">Trip total:</span>
              <span className="font-bold">{totalCost} pts</span>
            </div>
            <div className="flex justify-between py-3 text-sm border-t border-border">
              <span className="font-semibold text-destructive">Your cost:</span>
              <span className="font-bold text-destructive">- {charge} pts</span>
            </div>
          </>
        )}
        <div className="border-t-2 border-border" />
        <div className="flex justify-between py-3 text-sm">
          <span className="font-bold">Remaining Score:</span>
          <span className={`font-bold text-lg ${openEnded || remaining >= 0 ? 'text-primary' : 'text-destructive'}`}>{openEnded ? session?.priorityScore : remaining}</span>
        </div>
      </div>
      <div className="flex border-t border-border">
        <AlertDialogCancel className="flex-1 rounded-none border-0 border-r border-border m-0 h-12 text-muted-foreground">
          Cancel
        </AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          disabled={loading || (!openEnded && remaining < 0)}
          className="flex-1 rounded-none border-0 m-0 h-12 bg-primary text-primary-foreground font-bold"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Booking'}
        </AlertDialogAction>
      </div>
    </AlertDialogContent>
  );
}

export default function BookingCard({ preCheckIn, preCheckOut }: Props) {
  const session = getSession()!;
  const nav = useNavigate();
  const [bookingType, setBookingType] = useState<'Family' | 'Friends'>('Family');
  const [checkIn, setCheckIn] = useState<Date | undefined>(preCheckIn ? new Date(preCheckIn) : undefined);
  const [checkOut, setCheckOut] = useState<Date | undefined>(preCheckOut ? new Date(preCheckOut) : undefined);
  const [checkInTime, setCheckInTime] = useState<'morning' | 'afternoon' | 'evening' | 'night' | null>(null);
  const [openEnded, setOpenEnded] = useState(false);
  const [combined, setCombined] = useState(false);
  const [families, setFamilies] = useState<{ id: string; familyName: string }[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<{ days: number; cost: number; openEnded: boolean } | null>(null);
  const [bookedDates, setBookedDates] = useState<Set<string>>(new Set());
  const [familyDropdownOpen, setFamilyDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const today = new Date();

  // Fetch existing bookings to prevent overlap
  useEffect(() => {
    getBookings({})
      .then(r => {
        const dates = new Set<string>();
        r.bookings.forEach(b => {
          if (b.status === 'Cancelled' || b.status === 'Completed' || b.status === 'Declined') return;
          const start = new Date(b.checkInDate);
          const end = b.checkOutDate ? new Date(b.checkOutDate) : new Date(start.getTime() + 30 * 86400000);
          let d = new Date(start);
          while (d <= end) {
            dates.add(format(d, 'yyyy-MM-dd'));
            d.setDate(d.getDate() + 1);
          }
        });
        setBookedDates(dates);
      })
      .catch(() => {});
  }, [session.familyId]);

  useEffect(() => {
    if (combined) {
      getFamilies({}).then(r => setFamilies(r.families.filter(f => f.id !== session.familyId)));
    }
  }, [combined, session.familyId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setFamilyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const days = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : 0;
  const costPerDay = combined || bookingType === 'Friends' ? 8 : 5;
  const totalCost = days * costPerDay;
  const sharedCost = combined ? Math.ceil(totalCost / 2) : totalCost;

  const isDateBooked = (d: Date) => bookedDates.has(format(d, 'yyyy-MM-dd'));

  const handleBook = async () => {
    if (!checkIn || (!checkOut && !openEnded)) return;
    if (combined && !selectedFamilyId) { toast.error('Select a family to invite'); return; }
    setLoading(true);
    try {
      const res = await createBooking({
        familyId: session.familyId,
        checkInDate: format(checkIn, 'yyyy-MM-dd'),
        checkOutDate: openEnded ? null : format(checkOut!, 'yyyy-MM-dd'),
        checkInTime: checkInTime ?? null,
        bookingType: combined ? 'Combined' : bookingType,
        guestCount: 1,
        invitedFamilyId: combined ? selectedFamilyId! : undefined,
      });
      if (res.success) {
        if (res.newScore !== undefined) updateScore(res.newScore);
        setSuccessData({ days: openEnded ? 0 : days, cost: openEnded ? 0 : sharedCost, openEnded });
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (successData) {
    return (
      <div className="bg-card rounded-3xl p-8 shadow-lg flex flex-col items-center gap-4 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="w-12 h-12 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">{combined ? 'Invitation Sent!' : 'Booking Confirmed! 🎉'}</h3>
          <p className="text-muted-foreground text-sm mt-1">{combined ? 'Your booking is awaiting the other family’s response.' : 'Your stay at NazVik Farmhouse is reserved.'}</p>
        </div>
        <div className="bg-accent/40 rounded-2xl px-6 py-3 w-full">
          <p className="text-accent-foreground font-bold">
            {successData.openEnded ? 'Open-ended stay · No upfront cost' : `${successData.days} days · ${successData.cost} pts charged to your family`}
          </p>
        </div>
        <div className="flex gap-3 w-full mt-1">
          <Button variant="outline" className="flex-1 rounded-2xl" onClick={() => nav('/upcoming')}>
            View Trips
          </Button>
          <Button className="flex-1 rounded-2xl" onClick={() => { setSuccessData(null); setCheckIn(undefined); setCheckOut(undefined); setCheckInTime(null); setOpenEnded(false); setCombined(false); setSelectedFamilyId(null); }}>
            Got It!
          </Button>
        </div>
        {combined && selectedFamilyId && (
          <WhatsAppInvite
            initiatorName={session.familyName}
            checkInDate={format(checkIn!, 'yyyy-MM-dd')}
            checkOutDate={openEnded ? null : format(checkOut!, 'yyyy-MM-dd')}
            openEnded={openEnded}
          />
        )}
      </div>
    );
  }

  return (
    <div className="bg-card rounded-3xl shadow-lg">
      {/* Booking type tabs */}
      <div className="flex border-b border-border">
        {(['Family', 'Friends'] as const).map(t => (
          <button
            key={t}
            onClick={() => setBookingType(t)}
            className={`flex-1 py-3.5 flex items-center justify-center gap-2 text-sm font-semibold transition-colors ${bookingType === t ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
          >
            {t === 'Family' ? <Users className="w-5 h-5" /> : <Plane className="w-5 h-5" />}
            {t === 'Family' ? 'Family Trip' : 'Friends Visit'}
          </button>
        ))}
      </div>

      <div className="p-5 space-y-4">
        {/* Check-In / Check-Out */}
        <div className="relative">
          {/* Check-In */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="w-full text-left p-4 rounded-2xl border border-border bg-background hover:border-primary transition-colors">
                <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-primary inline-block" /> Check-In
                </p>
                <p className={`text-base font-bold ${checkIn ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {checkIn ? `${format(checkIn, 'd MMM yyyy, EEE')}${checkInTime ? ' · ' + checkInTime.charAt(0).toUpperCase() + checkInTime.slice(1) : ''}` : 'Select date'}
                </p>
              </button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-auto z-[60]">
              <Calendar
                mode="single"
                selected={checkIn}
                onSelect={(date) => { setCheckIn(date); setCheckInTime(null); }}
                disabled={d => d < new Date(today.getFullYear(), today.getMonth(), today.getDate()) || isDateBooked(d)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Timeline: time selector */}
          {!openEnded && checkIn && (
            <div className={`relative ${checkInTime ? 'h-6' : ''}`}>
              <div className="absolute left-6 top-0 bottom-0 w-px border-l-2 border-dashed border-border" />
              {!checkInTime && (
                <div className="ml-12 py-2 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Select Check-In Time</p>
                  <div className="space-y-1.5">
                    {[
                      { label: 'Morning', value: 'morning' as const, icon: '/morning.svg' },
                      { label: 'Afternoon', value: 'afternoon' as const, icon: '/afternoon.svg' },
                      { label: 'Evening', value: 'evening' as const, icon: '/evening.svg' },
                      { label: 'Night', value: 'night' as const, icon: '/night.svg' },
                    ].map(t => (
                      <button
                        key={t.value}
                        onClick={() => setCheckInTime(t.value)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${checkInTime === t.value ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/30'}`}
                      >
                        <img src={t.icon} alt={t.label} className="w-6 h-6 object-contain" style={{ filter: 'invert(32%) sepia(40%) saturate(500%) hue-rotate(55deg) brightness(85%)' }} />
                        <span className={`text-sm font-medium ${checkInTime === t.value ? 'text-primary' : 'text-foreground'}`}>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Check-Out */}
          {!openEnded && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="w-full text-left p-4 rounded-2xl border border-border bg-background hover:border-primary transition-colors mt-2">
                  <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" /> Check-Out
                  </p>
                  <p className={`text-base font-bold ${checkOut ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {checkOut ? format(checkOut, 'd MMM yyyy, EEE') : 'Select date'}
                  </p>
                </button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-auto z-[60]"><Calendar mode="single" selected={checkOut} onSelect={setCheckOut} disabled={d => d <= (checkIn ?? today) || isDateBooked(d)} initialFocus /></PopoverContent>
            </Popover>
          )}

          {/* Open-ended checkbox */}
          <label className="group flex items-center gap-2 px-1 py-2 cursor-pointer mt-2">
            <input
              type="checkbox"
              checked={openEnded}
              onChange={e => { setOpenEnded(e.target.checked); if (e.target.checked) setCheckOut(undefined); }}
              className="sr-only"
            />
            <span className="w-4 h-4 rounded border border-border bg-background flex items-center justify-center transition-colors group-has-[:checked]:bg-primary group-has-[:checked]:border-primary">
              <svg className="w-2.5 h-2.5 text-primary-foreground opacity-0 group-has-[:checked]:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span className="text-sm text-muted-foreground">Open-ended stay (I'll decide checkout later)</span>
          </label>
        </div>

        {/* Combined booking toggle */}
        <label className="group flex items-center gap-2 px-1 py-2 cursor-pointer">
          <input
            type="checkbox"
            checked={combined}
            onChange={e => { setCombined(e.target.checked); if (!e.target.checked) setSelectedFamilyId(null); }}
            className="sr-only"
          />
          <span className="w-4 h-4 rounded border border-border bg-background flex items-center justify-center transition-colors group-has-[:checked]:bg-primary group-has-[:checked]:border-primary">
            <svg className="w-2.5 h-2.5 text-primary-foreground opacity-0 group-has-[:checked]:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <span className="text-sm text-muted-foreground">Going with another family?</span>
        </label>

        {/* Points info */}
        <div className="flex items-center gap-1.5 px-1 -mt-2">
          <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">{session.priorityScore} pts</span> available ·{' '}
            {bookingType === 'Friends' ? (
              <span className="font-semibold">Friends 8 pts/day</span>
            ) : combined ? (
              <span className="font-semibold">Combined 8 pts/day</span>
            ) : (
              <span className="font-semibold">Family 5 pts/day</span>
            )}
          </p>
        </div>

        {/* One invited family, matching the booking data model */}
        {combined && (
          <div className="space-y-2">
            {selectedFamilyId && (
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium">
                  {families.find(f => f.id === selectedFamilyId)?.familyName ?? selectedFamilyId}
                  <button
                    onClick={() => setSelectedFamilyId(null)}
                    className="w-3.5 h-3.5 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors"
                    aria-label="Remove invited family"
                  >
                    <svg className="w-2 h-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </span>
              </div>
            )}
            {/* Theme-styled custom dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setFamilyDropdownOpen(o => !o)}
                className="w-full flex items-center justify-between rounded-xl border border-input bg-background px-3 py-2.5 text-sm hover:border-primary/40 transition-colors"
              >
                <span className={selectedFamilyId ? 'text-foreground' : 'text-muted-foreground'}>
                  {selectedFamilyId ? 'One family selected' : 'Choose a family to invite...'}
                </span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${familyDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {familyDropdownOpen && (
                <div className="absolute z-[60] mt-1 w-full bg-popover border border-border rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
                  {families.length === 0 ? (
                    <div className="px-3 py-3 text-sm text-muted-foreground text-center">No other families</div>
                  ) : (
                    families
                      .map(f => (
                        <button
                          key={f.id}
                          onClick={() => {
                            setSelectedFamilyId(f.id);
                            setFamilyDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent transition-colors flex items-center gap-2"
                        >
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                            {f.familyName.charAt(0).toUpperCase()}
                          </div>
                          {f.familyName}
                        </button>
                      ))
                  )}
                </div>
              )}
            </div>
            {days > 0 && (
              <p className="text-xs text-muted-foreground">
                2 families · ~{sharedCost} pts each ({costPerDay}/day shared)
              </p>
            )}
          </div>
        )}

        {/* Duration + Cost summary */}
        {openEnded && checkIn ? (
          <div className="bg-accent/40 rounded-2xl p-3 flex justify-between items-center">
            <p className="text-accent-foreground font-semibold text-sm">Open-ended</p>
            <p className="text-accent-foreground font-bold text-sm">Cost at checkout</p>
          </div>
        ) : days > 0 && (
          <div className="bg-accent/40 rounded-2xl p-3 flex justify-between items-center">
            <p className="text-accent-foreground font-semibold text-sm">{days} day{days > 1 ? 's' : ''}</p>
            <p className="text-accent-foreground font-bold text-sm">{totalCost} pts · {costPerDay}/day {combined && `(~${sharedCost} each)`}</p>
          </div>
        )}

        {/* Invoice + Book */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              disabled={!checkIn || (!openEnded && !checkOut) || (combined && !selectedFamilyId)}
              className="w-full h-12 rounded-2xl font-bold text-base"
            >
              Review & Book
            </Button>
          </AlertDialogTrigger>
          <InvoiceDialog
            session={session}
            days={days}
            costPerDay={costPerDay}
            totalCost={totalCost}
            charge={sharedCost}
            bookingType={combined ? 'Combined' : bookingType}
            loading={loading}
            onConfirm={handleBook}
            openEnded={openEnded}
          />
        </AlertDialog>


      </div>
    </div>
  );
}
