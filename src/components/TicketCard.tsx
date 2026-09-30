
import { useState, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { Users, Plane, XCircle, Info } from 'lucide-react';
import ticketSvg from '../lib/ticket.svg';
import ProfileAvatar from './ProfileAvatar';
import { calculateDuration } from '../lib/utils';
import { generateICS } from '../lib/calendar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type Booking = {
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
};

export default function TicketCard({ b, showFamily = true, onCancel, onCheckout, isMine = false }: { b: Booking; showFamily?: boolean; onCancel?: () => void; onCheckout?: () => void; isMine?: boolean }) {
  const days = calculateDuration(b.checkInDate, b.checkOutDate);
  const today = new Date().toISOString().split('T')[0];
  const isOpenEndedActive = b.checkOutDate === null && b.status === 'Active';
  const isCombined = !!b.invitedFamilyId;

  const [familyPopup, setFamilyPopup] = useState(false);
  const [infoPopup, setInfoPopup] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  const startLongPress = useCallback(() => {
    isLongPress.current = false;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      if (isCombined) setFamilyPopup(true);
    }, 600);
  }, [isCombined]);

  const endLongPress = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  const statusStyles: Record<string, string> = {
    Confirmed: 'text-green-600',
    Pending: 'text-amber-500',
    Cancelled: 'text-red-500 line-through',
    Active: 'text-blue-600',
    Completed: 'text-slate-500',
  };

  const cancelButton = (
    <button className="absolute right-0 text-red-500 hover:text-red-600 transition-colors p-0.5">
      <XCircle className="w-5 h-5" />
    </button>
  );

  return (
    <div className="relative w-full drop-shadow-lg">
      {/* SVG ticket background */}
      <img
        src={ticketSvg}
        alt=""
        className="w-full h-auto block select-none pointer-events-none"
        draggable={false}
      />

      {/* Content overlaid on top of SVG */}
      <div className="absolute inset-0 flex flex-col justify-center px-6 py-5">
        {/* Top row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {showFamily && (
              <>
                {/* Facebook-style overlapping avatar group */}
                <div className="relative flex items-center justify-center w-10 h-10">
                  <ProfileAvatar url={b.avatarUrl} name={b.familyName} size={32} />
                  {b.invitedFamilyId && (
                    <div className="absolute -bottom-0.5 -right-1">
                      <div className="w-[22px] h-[22px] rounded-full overflow-hidden border-2 border-white ring-1 ring-border">
                        <ProfileAvatar url={b.invitedAvatarUrl ?? ''} name={b.invitedFamilyName ?? ''} size={22} />
                      </div>
                    </div>
                  )}
                </div>
                <div
                  className="flex flex-col relative"
                  onMouseDown={startLongPress}
                  onMouseUp={endLongPress}
                  onMouseLeave={endLongPress}
                  onTouchStart={startLongPress}
                  onTouchEnd={endLongPress}
                >
                  <span className="text-sm font-extrabold text-primary">{b.familyName}</span>
                  {b.invitedFamilyName && (
                    <span className="text-[10px] font-semibold text-primary/80">
                      + {b.invitedFamilyName}
                    </span>
                  )}
                  {/* Long-press family popup */}
                  {familyPopup && (
                    <div className="absolute left-0 bottom-full mb-1 z-[70] bg-popover border border-border rounded-xl shadow-lg p-3 min-w-[180px] space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">Families on this trip</p>
                      <div className="flex items-center gap-2">
                        <ProfileAvatar url={b.avatarUrl} name={b.familyName} size={24} />
                        <span className="text-sm font-medium">{b.familyName}</span>
                      </div>
                      {b.invitedFamilyName && (
                        <div className="flex items-center gap-2">
                          <ProfileAvatar url={b.invitedAvatarUrl ?? ''} name={b.invitedFamilyName} size={24} />
                          <span className="text-sm font-medium">{b.invitedFamilyName}</span>
                        </div>
                      )}
                      <button onClick={() => setFamilyPopup(false)} className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-1">Dismiss</button>
                    </div>
                  )}
                </div>
              </>
            )}
            {!showFamily && (
              <span className="font-bold text-foreground text-sm">{b.familyName}</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            {b.bookingType === 'Friends Visit' ? (
              <Plane className="w-4 h-4" />
            ) : (
              <Users className="w-4 h-4" />
            )}
            <span className="text-xs">{b.bookingType}</span>
          </div>
        </div>

        {/* Middle row — dates with center divider */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-center flex-1">
            <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wide">Check-In</p>
            <p className="text-base font-bold text-primary leading-tight">
              {format(new Date(b.checkInDate), 'dd/MM')}
            </p>
          </div>

          {!isOpenEndedActive && (
            <div className="flex items-center gap-1.5 px-2">
              <div className="h-px w-4 bg-border" />
              <div className="px-2 py-0.5 rounded-full border border-border bg-background text-[10px] font-semibold text-muted-foreground whitespace-nowrap">
                {days}D
              </div>
              <div className="h-px w-4 bg-border" />
            </div>
          )}

          <div className="text-center flex-1">
            {!isOpenEndedActive && (
              <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wide">Check-Out</p>
            )}
            {isMine && isOpenEndedActive && onCheckout ? (
              <button
                onClick={onCheckout}
                className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                title="Check out"
              >
                <img src="/check-out-calendar.svg" alt="Check out" className="w-5 h-5" style={{ filter: 'brightness(0) invert(1)' }} />
              </button>
            ) : (
              <p className={`text-base font-bold leading-tight ${b.checkOutDate ? 'text-primary' : 'text-blue-500'}`}>
                {b.checkOutDate ? format(new Date(b.checkOutDate), 'dd/MM') : 'Open'}
              </p>
            )}
          </div>
        </div>

        {/* Bottom row — status centered, cancel on right, info on left */}
        <div className="relative flex items-center justify-center pt-2 border-t border-dashed border-border">
          {/* Info button — bottom-left */}
          <button
            onClick={() => setInfoPopup(true)}
            className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-primary hover:text-primary/80 transition-colors"
          >
            <Info className="w-5 h-5" />
          </button>

          {/* Info popup */}
          {infoPopup && (
            <div className="absolute left-0 bottom-8 z-[70] bg-popover border border-border rounded-xl shadow-lg p-3 min-w-[200px] space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Trip Details</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Check-in time:</span>
                  <span className="font-medium">{b.checkInTime ? b.checkInTime.charAt(0).toUpperCase() + b.checkInTime.slice(1) : 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Families:</span>
                  <span className="font-medium">{b.invitedFamilyId ? 2 : 1}</span>
                </div>
                    {b.invitedFamilyName && (
                  <div className="pt-1 border-t border-border">
                    <p className="text-muted-foreground text-xs mb-1">With:</p>
                    <div className="flex items-center gap-2">
                      <ProfileAvatar url={b.avatarUrl} name={b.familyName} size={20} />
                      <span className="text-xs font-medium">{b.familyName}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <ProfileAvatar url={b.invitedAvatarUrl ?? ''} name={b.invitedFamilyName} size={20} />
                      <span className="text-xs font-medium">{b.invitedFamilyName}</span>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => {
                    generateICS({
                      title: `NazVik Farmhouse — ${b.familyName}`,
                      startDate: b.checkInDate,
                      endDate: b.checkOutDate,
                      description: `${b.bookingType} stay at NazVik Konnect Farmhouse. Status: ${b.status}.`,
                      location: 'NazVik Konnect Farmhouse',
                    });
                  }}
                  className="w-full mt-2 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
                >
                  Add to Calendar
                </button>
              </div>
              <button onClick={() => setInfoPopup(false)} className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-1">Dismiss</button>
            </div>
          )}

          <div className="flex flex-col items-center">
            <p className={`text-sm font-semibold ${statusStyles[b.status] ?? 'text-foreground'}`}>
              {b.status}
            </p>
            {b.status === 'Active' && (
              <p className="text-xs font-normal text-muted-foreground">{days}d so far</p>
            )}
          </div>
          {isMine && onCancel && b.status !== 'Cancelled' && b.status !== 'Completed' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-red-500 hover:text-red-600 transition-colors">
                  <XCircle className="w-5 h-5" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="z-[100]">
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {b.status === 'Confirmed' ? '50% of points will be refunded (late cancellation).' : 'Full points will be refunded.'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep It</AlertDialogCancel>
                  <AlertDialogAction onClick={onCancel} className="bg-destructive text-destructive-foreground">Cancel Booking</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </div>
  );
}
