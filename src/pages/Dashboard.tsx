
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getSession, clearSession, updateAvatar } from '../lib/auth';
import BookingCard from '../components/BookingCard';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Bell, LogOut, Camera, Loader2, Users, CheckCircle2, XCircle, MessageCircle } from 'lucide-react';
import { getNotifications, updateFamilyAvatar, getPendingInvitations, respondToInvitation } from 'zite-endpoints-sdk';
import { openWhatsAppShare, buildResponseMessage } from '../lib/whatsapp';
import { uploadFile } from 'zite-file-upload-sdk';
import ProfileAvatar from '../components/ProfileAvatar';

function WhatsAppNotifyBanner({ responderName, checkInDate, action, onDismiss }: {
  responderName: string;
  checkInDate: string;
  action: 'accepted' | 'declined';
  onDismiss: () => void;
}) {
  const handleShare = () => {
    const msg = buildResponseMessage(responderName, checkInDate, action);
    openWhatsAppShare(msg);
  };
  return (
    <div className="space-y-2">
      <button
        onClick={handleShare}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-100 text-green-700 text-xs font-semibold hover:bg-green-200 transition-colors"
      >
        <MessageCircle className="w-4 h-4" /> Notify on WhatsApp
      </button>
      <button onClick={onDismiss} className="w-full text-xs text-green-600/70 hover:text-green-700 py-1">Dismiss</button>
    </div>
  );
}

function AvatarUpload({ familyId, avatarValue, familyName }: { familyId: string; avatarValue: string; familyName: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [src, setSrc] = useState(avatarValue);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { fileUrl } = await uploadFile({ data: file, filename: file.name });
      await updateFamilyAvatar({ familyId, avatarUrl: fileUrl });
      updateAvatar(fileUrl);
      setSrc(fileUrl);
      toast.success('Profile photo updated!');
    } catch {
      toast.error('Upload failed. Try again.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="relative flex-shrink-0">
      <div className="w-12 h-12 rounded-full overflow-hidden bg-white/20 border-2 border-white/30 flex items-center justify-center">
        <ProfileAvatar url={src} name={familyName} size={48} />
      </div>
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="absolute -bottom-1 -right-1 w-5 h-5 bg-card rounded-full flex items-center justify-center shadow-md border border-border"
      >
        {uploading
          ? <Loader2 className="w-2.5 h-2.5 text-primary animate-spin" />
          : <Camera className="w-2.5 h-2.5 text-primary" />}
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
    </div>
  );
}

export default function Dashboard() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const [unread, setUnread] = useState(0);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [notifyInitiator, setNotifyInitiator] = useState<{ checkInDate: string; action: 'accepted' | 'declined' } | null>(null);
  const session = getSession();
  if (!session) return null;
  const preCheckIn  = searchParams.get('checkIn');
  const preCheckOut = searchParams.get('checkOut');

  useEffect(() => {
    getNotifications({ familyId: session.familyId })
      .then(r => setUnread(r.unreadCount))
      .catch(() => {});
    loadInvitations();
  }, []);

  const loadInvitations = () => {
    getPendingInvitations({ familyId: session.familyId })
      .then(r => setInvitations(r.invitations))
      .catch(() => {})
      .finally(() => setLoadingInvites(false));
  };

  const handleRespond = async (bookingId: string, action: 'accept' | 'decline') => {
    try {
      const res = await respondToInvitation({ bookingId, familyId: session.familyId, action });
      toast.success(res.message);
      // Optimistically remove the invitation card immediately
      setInvitations(prev => prev.filter(inv => inv.relatedId !== bookingId));
      loadInvitations();
      if (res.checkInDate) {
        setNotifyInitiator({
          checkInDate: res.checkInDate,
          action: action === 'accept' ? 'accepted' : 'declined',
        });
      }
    } catch {
      toast.error('Failed to respond');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-background">
      <Toaster />
      <div className="w-full max-w-md min-h-screen flex flex-col">
        {/* Header */}
        <div className="bg-primary px-6 pt-12 pb-28 relative overflow-hidden flex-shrink-0">
          <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-white/5 animate-float-1" />
          <div className="absolute bottom-4 -left-8 w-36 h-36 rounded-full bg-white/5 animate-float-2" />
          <div className="absolute top-20 right-8 w-20 h-20 rounded-full bg-white/5 animate-float-3" />

          {/* Top bar */}
          <div className="flex justify-between items-center mb-8 relative z-10">
            <div className="flex items-center gap-3">
              {/* Uploadable avatar */}
              <AvatarUpload familyId={session.familyId} avatarValue={session.avatarUrl || ''} familyName={session.familyName} />
              <div>
                <p className="text-primary-foreground/60 text-xs">Representing</p>
                {(() => {
                  const parts = session.familyName.split(' ');
                  const first = parts[0].replace(/'s$/i, '') + "'s";
                  const rest = parts.slice(1).join(' ');
                  return (
                    <>
                      <p className="text-primary-foreground font-bold text-sm leading-tight">{first}</p>
                      <p className="text-primary-foreground font-bold text-sm leading-tight">{rest}</p>
                    </>
                  );
                })()}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-start justify-center">
                <span className="text-primary-foreground/60 text-[10px] leading-none">Priority Score</span>
                <span className="text-primary-foreground text-xs font-bold leading-none mt-0.5">{session.priorityScore}</span>
              </div>
              <button onClick={() => nav('/alerts')} className="relative p-2">
                <Bell className="w-5 h-5 text-primary-foreground" />
                {unread > 0 && (
                  <span className="absolute top-1 right-1 bg-destructive text-destructive-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">{unread}</span>
                )}
              </button>
              <button onClick={() => { clearSession(); nav('/login'); }} className="p-2">
                <LogOut className="w-5 h-5 text-primary-foreground/60" />
              </button>
            </div>
          </div>

          <div className="relative z-10">
            <h1 className="text-primary-foreground text-4xl font-extrabold leading-tight">
              Book Your<br />Stay
            </h1>
            <p className="text-primary-foreground/50 text-sm mt-2">NazVik Konnect Farmhouse</p>
          </div>
        </div>

        {/* Booking Card */}
        <div className="mx-4 -mt-20 relative z-10 space-y-4 pb-32">
          <BookingCard preCheckIn={preCheckIn} preCheckOut={preCheckOut} />

          {/* Pending Invitations */}
          {!loadingInvites && invitations.length > 0 && (
            <div className="bg-card rounded-2xl p-4 border border-border shadow-sm space-y-3">
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Combined Stay Invitations
              </h3>
              {invitations.map((inv: any) => (
                <div key={inv.id} className="bg-accent/30 rounded-xl p-3 space-y-2">
                  <p className="text-sm text-foreground">{inv.message}</p>
                  {inv.booking && (
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>Check-in: {inv.booking.checkInDate}</p>
                      {inv.booking.checkOutDate ? <p>Check-out: {inv.booking.checkOutDate}</p> : <p className="text-blue-500">Open-ended stay</p>}
                      {(() => {
                        const days = Math.max(1, Math.ceil((new Date(inv.booking.checkOutDate || new Date().toISOString()).getTime() - new Date(inv.booking.checkInDate).getTime()) / 86400000));
                        const isCombined = !!inv.booking.invitedFamilyId;
                        const rate = inv.booking.bookingType === 'Family' ? 5 : 8;
                        const perFamily = Math.ceil((inv.booking.costPoints || days * rate) / (isCombined ? 2 : 1) / days);
                        return <p>Daily burn: ~{perFamily} pts/day{isCombined ? ' each' : ''}</p>;
                      })()}
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleRespond(inv.relatedId, 'accept')}
                      className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Accept
                    </button>
                    <button
                      onClick={() => handleRespond(inv.relatedId, 'decline')}
                      className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-muted text-muted-foreground text-xs font-semibold"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Notify initiator via WhatsApp after respond */}
          {notifyInitiator && (
            <div className="bg-green-50 rounded-2xl p-4 border border-green-200 space-y-2">
              <p className="text-sm text-green-700 font-medium">
                {notifyInitiator.action === 'accepted' ? 'Booking confirmed!' : 'Invitation declined.'}
              </p>
              <WhatsAppNotifyBanner
                responderName={session.familyName}
                checkInDate={notifyInitiator.checkInDate}
                action={notifyInitiator.action}
                onDismiss={() => setNotifyInitiator(null)}
              />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
