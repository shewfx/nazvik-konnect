
import { useState, useEffect } from 'react';
import { getSession } from '../lib/auth';
import { getBookings, GetBookingsOutputType } from 'zite-endpoints-sdk';
import { format } from 'date-fns';
import { Loader2, CalendarX } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TicketCard from '../components/TicketCard';
import SkeletonTicketCard from '../components/SkeletonTicketCard';

type Booking = GetBookingsOutputType['bookings'][0];

const statusColor: Record<string, string> = {
  Confirmed: 'bg-primary/10 text-primary',
  Pending: 'bg-accent/60 text-accent-foreground',
  Cancelled: 'bg-muted text-muted-foreground',
  Active: 'bg-blue-50 text-blue-600',
  Completed: 'bg-slate-100 text-slate-600',
};



function EmptyState() {
  return (
    <div className="flex flex-col items-center py-16 gap-3">
      <CalendarX className="w-12 h-12 text-muted-foreground" />
      <p className="text-muted-foreground text-sm">No bookings found</p>
    </div>
  );
}

export default function History() {
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [cancelledBookings, setCancelledBookings] = useState<Booking[]>([]);
  const [myLoading, setMyLoading] = useState(true);
  const [allLoading, setAllLoading] = useState(false);
  const [allLoaded, setAllLoaded] = useState(false);
  const [cancelledLoading, setCancelledLoading] = useState(false);
  const [cancelledLoaded, setCancelledLoaded] = useState(false);
  const session = getSession();
  if (!session) return null;

  useEffect(() => {
    getBookings({ familyId: session.familyId, pastOnly: true })
      .then(r => setMyBookings(r.bookings))
      .finally(() => setMyLoading(false));
  }, []);

  const loadAllTrips = () => {
    if (allLoaded) return;
    setAllLoading(true);
    getBookings({ pastOnly: true })
      .then(r => setAllBookings(r.bookings))
      .finally(() => { setAllLoading(false); setAllLoaded(true); });
  };

  const loadCancelledTrips = () => {
    if (cancelledLoaded) return;
    setCancelledLoading(true);
    getBookings({ cancelledOnly: true })
      .then(r => setCancelledBookings(r.bookings))
      .finally(() => { setCancelledLoading(false); setCancelledLoaded(true); });
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-background">
      <div className="w-full max-w-md min-h-screen flex flex-col">
        {/* Header */}
        <div className="bg-primary px-6 pt-12 pb-6 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-white/5 animate-float-1" />
          <div className="absolute bottom-4 -left-8 w-36 h-36 rounded-full bg-white/5 animate-float-2" />
          <div className="absolute top-20 right-8 w-20 h-20 rounded-full bg-white/5 animate-float-3" />
          <h1 className="text-primary-foreground text-2xl font-bold relative z-10">Past Trips</h1>
          <p className="text-primary-foreground/60 text-sm mt-1 relative z-10">Past stays at NazVik Farmhouse</p>
        </div>

        {/* Tabs */}
        <div className="flex-1 px-4 py-4 pb-28">
          <Tabs defaultValue="mine">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="mine" className="flex-1">My Trips</TabsTrigger>
              <TabsTrigger value="all" className="flex-1" onClick={loadAllTrips}>All Trips</TabsTrigger>
              <TabsTrigger value="cancelled" className="flex-1" onClick={loadCancelledTrips}>Cancelled</TabsTrigger>
            </TabsList>

            <TabsContent value="mine" className="space-y-3">
              {myLoading ? (
                <div className="space-y-3">
                  <SkeletonTicketCard />
                  <SkeletonTicketCard />
                </div>
              ) : myBookings.length === 0 ? <EmptyState /> : (
                myBookings.filter(b => b.status !== 'Cancelled').map(b => <TicketCard key={b.id} b={b} showFamily />)
              )}
            </TabsContent>

            <TabsContent value="all" className="space-y-3">
              {allLoading ? (
                <div className="space-y-3">
                  <SkeletonTicketCard />
                  <SkeletonTicketCard />
                </div>
              ) : allBookings.length === 0 && allLoaded ? <EmptyState /> : (
                allBookings.filter(b => b.status !== 'Cancelled').map(b => <TicketCard key={b.id} b={b} showFamily />)
              )}
              {!allLoaded && !allLoading && (
                <div className="space-y-3">
                  <SkeletonTicketCard />
                  <SkeletonTicketCard />
                </div>
              )}
            </TabsContent>

            <TabsContent value="cancelled" className="space-y-3">
              {cancelledLoading ? (
                <div className="space-y-3">
                  <SkeletonTicketCard />
                  <SkeletonTicketCard />
                </div>
              ) : cancelledBookings.length === 0 && cancelledLoaded ? <EmptyState /> : (
                cancelledBookings.map(b => <TicketCard key={b.id} b={b} showFamily />)
              )}
              {!cancelledLoaded && !cancelledLoading && (
                <div className="space-y-3">
                  <SkeletonTicketCard />
                  <SkeletonTicketCard />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
