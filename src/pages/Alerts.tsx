
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSession } from '../lib/auth';
import { getNotifications, markNotificationsRead } from 'zite-endpoints-sdk';
import { format } from 'date-fns';
import { Bell, ArrowLeft, Loader2 } from 'lucide-react';

type Notification = { id: string; message: string; isRead: boolean; createdAt: string };

export default function Alerts() {
  const nav = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const session = getSession();
  if (!session) return null;

  useEffect(() => {
    getNotifications({ familyId: session.familyId })
      .then(r => setNotifications(r.notifications))
      .catch(() => {})
      .finally(() => setLoading(false));
    markNotificationsRead({ familyId: session.familyId }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center bg-background">
      <div className="w-full max-w-md min-h-screen flex flex-col">
        {/* Header */}
        <div className="bg-primary px-6 pt-12 pb-8 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-white/5 animate-float-1" />
          <div className="absolute bottom-4 -left-8 w-36 h-36 rounded-full bg-white/5 animate-float-2" />
          <div className="absolute top-20 right-8 w-20 h-20 rounded-full bg-white/5 animate-float-3" />
          <button onClick={() => nav(-1)} className="flex items-center gap-2 text-primary-foreground/70 text-sm mb-4 hover:text-primary-foreground relative z-10">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-3 relative z-10">
            <Bell className="w-6 h-6 text-accent" />
            <h1 className="text-primary-foreground text-2xl font-bold">Alerts</h1>
          </div>
          <p className="text-primary-foreground/60 text-sm mt-1 relative z-10">Notifications & Updates</p>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 py-5 pb-28 space-y-2">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No notifications</div>
          ) : (
            notifications.map(n => (
              <div key={n.id} className={`p-3 rounded-xl border text-sm ${n.isRead ? 'bg-card border-border text-muted-foreground' : 'bg-accent/20 border-primary/20 text-foreground font-medium'}`}>
                <p>{n.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{n.createdAt ? (() => { try { const d = new Date(n.createdAt); return isNaN(d.getTime()) ? '' : format(d, 'd MMM yyyy, h:mm a'); } catch { return ''; } })() : ''}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
