
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSession, clearSession } from '../lib/auth';
import { getLeaderboard, adminAdjustScore, adminCreateFamily, updateFamilyName, updateFamilyPin, adminDeleteFamily, adminDeleteBooking, getBookings, getAllCheckoutPhotos, GetBookingsOutputType, GetLeaderboardOutputType } from 'zite-endpoints-sdk';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Loader2, Shield, UserPlus, Pencil, Trash2, Home, MapPin, Wifi, Phone, ClipboardCheck, ShieldAlert, Plus, X, Award, CalendarDays, ImageIcon, Settings, LogOut } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import ProfileAvatar from '../components/ProfileAvatar';
import { fetchHouseInfo, saveHouseInfo, type HouseInfo, DEFAULT as DEFAULT_HOUSE_INFO } from '../lib/house-info';

type Family = GetLeaderboardOutputType['families'][0];
type Booking = GetBookingsOutputType['bookings'][0];

/* ─── Admin Bottom Nav ─── */
const ADMIN_TABS = [
  { id: 'scores', icon: Award },
  { id: 'house', icon: Home },
  { id: 'bookings', icon: CalendarDays },
  { id: 'photos', icon: ImageIcon },
  { id: 'settings', icon: Settings },
] as const;

function AdminNav({ active, onChange }: { active: string; onChange: (id: string) => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(id); }, []);

  const activeIndex = ADMIN_TABS.findIndex(t => t.id === active);
  const hasActiveTab = activeIndex !== -1;
  const si = hasActiveTab ? activeIndex : 0;

  const tabCount = ADMIN_TABS.length;
  const tabWidth = 100 / tabCount;
  const pillRatio = 0.72;
  const pillWidth = tabWidth * pillRatio;
  const pillLeft = si * tabWidth + (tabWidth - pillWidth) / 2;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="w-full max-w-md px-4 pb-5 pointer-events-auto">
        <nav className="relative flex items-center bg-card/90 backdrop-blur-md border border-border/60 rounded-full h-14 shadow-lg shadow-black/5">
          {hasActiveTab && (
            <div
              className={`absolute top-1 h-[calc(100%-8px)] rounded-full bg-primary ${mounted ? 'transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]' : ''}`}
              style={{ left: `${pillLeft}%`, width: `${pillWidth}%` }}
            />
          )}
          {ADMIN_TABS.map((tab, i) => {
            const Icon = tab.icon;
            const isActive = i === si;
            return (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                className={`relative z-10 flex flex-1 items-center justify-center h-full transition-colors duration-200 ${
                  isActive ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : 'scale-100'}`} strokeWidth={isActive ? 2.5 : 2} />
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

/* ─── Scores Tab ─── */
function ScoresTab({ families, bookings, onRefresh }: { families: Family[]; bookings: Booking[]; onRefresh: () => void }) {
  const [adjusting, setAdjusting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);

  const [selectedFam, setSelectedFam] = useState('');
  const [adjustment, setAdjustment] = useState('');
  const [reason, setReason] = useState('');

  const [newName, setNewName] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newAvatar, setNewAvatar] = useState('');
  const [newRole, setNewRole] = useState('MEMBER');

  const [editFam, setEditFam] = useState('');
  const [editName, setEditName] = useState('');
  const [editPin, setEditPin] = useState('');

  const handleAdjust = async () => {
    if (!selectedFam || !adjustment || !reason) { toast.error('Fill all fields'); return; }
    setAdjusting(true);
    try {
      const res = await adminAdjustScore({ targetFamilyId: selectedFam, adjustment: Number(adjustment), reason });
      toast.success(`Score updated → ${res.newScore} pts`);
      setAdjustment(''); setReason(''); setSelectedFam('');
      onRefresh();
    } catch { toast.error('Failed to adjust score'); }
    finally { setAdjusting(false); }
  };

  const handleCreate = async () => {
    if (!newName || newPin.length !== 4) { toast.error('Family name and 4-digit PIN required'); return; }
    setCreating(true);
    try {
      await adminCreateFamily({ familyName: newName, pinCode: newPin, avatarUrl: newAvatar, role: newRole });
      toast.success(`${newName} family created!`);
      setNewName(''); setNewPin(''); setNewAvatar('');
      onRefresh();
    } catch { toast.error('Failed to create family'); }
    finally { setCreating(false); }
  };

  const handleEdit = async () => {
    if (!editFam) { toast.error('Select a family'); return; }
    if (!editName && !editPin) { toast.error('Enter a new name or PIN'); return; }
    if (editPin && editPin.length !== 4) { toast.error('PIN must be 4 digits'); return; }
    setEditing(true);
    try {
      if (editName) await updateFamilyName({ familyId: editFam, familyName: editName });
      if (editPin) await updateFamilyPin({ familyId: editFam, pinCode: editPin });
      toast.success('Family updated!');
      setEditName(''); setEditPin(''); setEditFam('');
      onRefresh();
    } catch { toast.error('Failed to update family'); }
    finally { setEditing(false); }
  };

  const [deleteFamilyConfirm, setDeleteFamilyConfirm] = useState<{ id: string; name: string } | null>(null);

  const handleDeleteFamily = async () => {
    if (!deleteFamilyConfirm) return;
    try {
      await adminDeleteFamily({ familyId: deleteFamilyConfirm.id });
      toast.success(`${deleteFamilyConfirm.name} removed`);
      setDeleteFamilyConfirm(null);
      onRefresh();
    } catch { toast.error('Failed to delete family'); }
  };

  return (
    <div className="space-y-5">
      {/* Score adjustment */}
      <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
        <h2 className="font-bold text-foreground mb-4">Adjust Priority Score</h2>
        <div className="space-y-3">
          <div>
            <Label className="text-xs mb-1.5 block">Select Family</Label>
            <select value={selectedFam} onChange={e => setSelectedFam(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">
              <option value="">Choose family...</option>
              {families.map(f => <option key={f.id} value={f.id}>{f.familyName} ({f.priorityScore} pts)</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">Adjustment (use negative for penalty)</Label>
            <Input type="number" placeholder="+25 or -10" value={adjustment} onChange={e => setAdjustment(e.target.value)} className="rounded-xl" />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">Reason</Label>
            <Input placeholder="Bonus for hosting, late cancellation..." value={reason} onChange={e => setReason(e.target.value)} className="rounded-xl" />
          </div>
          <Button onClick={handleAdjust} disabled={adjusting} className="w-full rounded-xl">
            {adjusting && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Apply Adjustment
          </Button>
        </div>
      </div>

      {/* Edit family */}
      <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
        <h2 className="font-bold text-foreground mb-4 flex items-center gap-2"><Pencil className="w-4 h-4" /> Edit Family</h2>
        <div className="space-y-3">
          <div>
            <Label className="text-xs mb-1.5 block">Select Family</Label>
            <select value={editFam} onChange={e => setEditFam(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">
              <option value="">Choose family...</option>
              {families.map(f => <option key={f.id} value={f.id}>{f.familyName}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">New Name (optional)</Label>
            <Input placeholder="Enter family head's name" value={editName} onChange={e => setEditName(e.target.value)} className="rounded-xl" />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">New PIN (optional)</Label>
            <Input placeholder="1234" maxLength={4} value={editPin} onChange={e => setEditPin(e.target.value.replace(/\D/g, '').slice(0, 4))} className="rounded-xl" />
          </div>
          <Button onClick={handleEdit} disabled={editing} className="w-full rounded-xl">
            {editing && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Update Family
          </Button>
        </div>
      </div>

      {/* Create family */}
      <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
        <h2 className="font-bold text-foreground mb-4 flex items-center gap-2"><UserPlus className="w-4 h-4" /> Add New Family</h2>
        <div className="space-y-3">
          <div>
            <Label className="text-xs mb-1.5 block">Family Name</Label>
            <Input placeholder="Enter family head's name" value={newName} onChange={e => setNewName(e.target.value)} className="rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1.5 block">4-digit PIN</Label>
              <Input placeholder="1234" maxLength={4} value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))} className="rounded-xl" />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Profile Photo URL</Label>
              <Input placeholder="https://... or leave blank" value={newAvatar} onChange={e => setNewAvatar(e.target.value)} className="rounded-xl" />
            </div>
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">Role</Label>
            <select value={newRole} onChange={e => setNewRole(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <Button onClick={handleCreate} disabled={creating} className="w-full rounded-xl">
            {creating && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Create Family
          </Button>
        </div>
      </div>

      {/* Families table */}
      <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
        <h2 className="font-bold text-foreground mb-3">All Families ({families.length})</h2>
        <div className="space-y-2">
          {families.map(f => (
            <div key={f.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-2 min-w-0">
                <ProfileAvatar url={f.avatarUrl} name={f.familyName} size={24} />
                <span className="text-sm font-medium truncate">{f.familyName}</span>
                {f.role === 'ADMIN' && <span className="text-xs bg-primary/10 text-primary px-1.5 rounded flex-shrink-0">Admin</span>}
                {f.role === 'MEMBER' && <span className="text-xs bg-muted text-muted-foreground px-1.5 rounded flex-shrink-0">Member</span>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm font-bold text-primary">{f.priorityScore} pts</span>
                <AlertDialog open={!!deleteFamilyConfirm && deleteFamilyConfirm.id === f.id} onOpenChange={open => !open && setDeleteFamilyConfirm(null)}>
                  <AlertDialogTrigger asChild>
                    <button onClick={() => setDeleteFamilyConfirm({ id: f.id, name: f.familyName })} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="z-[100] max-w-xs rounded-3xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Family?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {deleteFamilyConfirm?.name ? `Delete ${deleteFamilyConfirm.name}? This cannot be undone.` : 'This cannot be undone.'}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex border-t border-border mt-4">
                      <AlertDialogCancel className="flex-1 rounded-none border-0 border-r border-border m-0 h-12 text-muted-foreground">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteFamily} className="flex-1 rounded-none border-0 m-0 h-12 bg-destructive text-destructive-foreground font-bold">
                        Delete
                      </AlertDialogAction>
                    </div>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── House Tab ─── */
function HouseTab() {
  const [houseInfo, setHouseInfoState] = useState<HouseInfo>(DEFAULT_HOUSE_INFO);
  const [houseLoading, setHouseLoading] = useState(true);
  const [savingHouse, setSavingHouse] = useState(false);

  useEffect(() => {
    fetchHouseInfo().then(s => { setHouseInfoState(s); setHouseLoading(false); });
  }, []);

  const handleSaveHouse = async () => {
    setSavingHouse(true);
    try {
      await saveHouseInfo(houseInfo);
      toast.success('House settings saved');
    } catch {
      toast.error('Failed to save house settings');
    } finally {
      setSavingHouse(false);
    }
  };

  const updateContact = (i: number, field: 'name' | 'number', value: string) => {
    setHouseInfoState(prev => {
      const next = { ...prev, emergency: [...prev.emergency] };
      next.emergency[i] = { ...next.emergency[i], [field]: value };
      return next;
    });
  };
  const removeContact = (i: number) => setHouseInfoState(prev => ({ ...prev, emergency: prev.emergency.filter((_, idx) => idx !== i) }));
  const addContact = () => setHouseInfoState(prev => ({ ...prev, emergency: [...prev.emergency, { name: '', number: '' }] }));

  const updateChecklist = (i: number, label: string) => {
    setHouseInfoState(prev => {
      const next = { ...prev, checklist: [...prev.checklist] };
      next.checklist[i] = { ...next.checklist[i], label };
      return next;
    });
  };
  const removeChecklist = (i: number) => setHouseInfoState(prev => ({ ...prev, checklist: prev.checklist.filter((_, idx) => idx !== i) }));
  const addChecklist = () => setHouseInfoState(prev => ({ ...prev, checklist: [...prev.checklist, { id: `item-${Date.now()}`, label: '' }] }));

  const updateRule = (i: number, text: string) => {
    setHouseInfoState(prev => {
      const next = [...prev.rules];
      next[i] = text;
      return { ...prev, rules: next };
    });
  };
  const removeRule = (i: number) => setHouseInfoState(prev => ({ ...prev, rules: prev.rules.filter((_, idx) => idx !== i) }));
  const addRule = () => setHouseInfoState(prev => ({ ...prev, rules: [...prev.rules, ''] }));

  if (houseLoading) return <div className="flex justify-center py-10"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5">
      <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
        <h2 className="font-bold text-foreground mb-4 flex items-center gap-2"><Home className="w-4 h-4" /> House Settings</h2>
        <div className="space-y-4">
          {/* WiFi */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Wifi className="w-3 h-3" /> WiFi</h3>
            <Input placeholder="SSID" value={houseInfo.wifi.ssid} onChange={e => setHouseInfoState(p => ({ ...p, wifi: { ...p.wifi, ssid: e.target.value } }))} className="rounded-xl" />
            <Input placeholder="Password" value={houseInfo.wifi.password} onChange={e => setHouseInfoState(p => ({ ...p, wifi: { ...p.wifi, password: e.target.value } }))} className="rounded-xl" />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</h3>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" step="any" placeholder="Latitude" value={houseInfo.location.lat} onChange={e => setHouseInfoState(p => ({ ...p, location: { ...p.location, lat: Number(e.target.value) } }))} className="rounded-xl" />
              <Input type="number" step="any" placeholder="Longitude" value={houseInfo.location.lng} onChange={e => setHouseInfoState(p => ({ ...p, location: { ...p.location, lng: Number(e.target.value) } }))} className="rounded-xl" />
            </div>
            <Input placeholder="Label" value={houseInfo.location.label} onChange={e => setHouseInfoState(p => ({ ...p, location: { ...p.location, label: e.target.value } }))} className="rounded-xl" />
          </div>

          {/* Emergency Contacts */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> Emergency Contacts</h3>
            {houseInfo.emergency.map((c, i) => (
              <div key={i} className="flex gap-2">
                <Input placeholder="Name" value={c.name} onChange={e => updateContact(i, 'name', e.target.value)} className="rounded-xl flex-1" />
                <Input placeholder="Number" value={c.number} onChange={e => updateContact(i, 'number', e.target.value)} className="rounded-xl flex-1" />
                <button onClick={() => removeContact(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl"><X className="w-4 h-4" /></button>
              </div>
            ))}
            <button onClick={addContact} className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
              <Plus className="w-3 h-3" /> Add contact
            </button>
          </div>

          {/* Checklist */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><ClipboardCheck className="w-3 h-3" /> Checklist Items</h3>
            {houseInfo.checklist.map((item, i) => (
              <div key={item.id} className="flex gap-2">
                <Input placeholder="Item label" value={item.label} onChange={e => updateChecklist(i, e.target.value)} className="rounded-xl flex-1" />
                <button onClick={() => removeChecklist(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl"><X className="w-4 h-4" /></button>
              </div>
            ))}
            <button onClick={addChecklist} className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
              <Plus className="w-3 h-3" /> Add item
            </button>
          </div>

          {/* Rules */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> House Rules</h3>
            {houseInfo.rules.map((rule, i) => (
              <div key={i} className="flex gap-2">
                <Input placeholder="Rule text" value={rule} onChange={e => updateRule(i, e.target.value)} className="rounded-xl flex-1" />
                <button onClick={() => removeRule(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl"><X className="w-4 h-4" /></button>
              </div>
            ))}
            <button onClick={addRule} className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
              <Plus className="w-3 h-3" /> Add rule
            </button>
          </div>

          <Button onClick={handleSaveHouse} disabled={savingHouse} className="w-full rounded-xl">
            {savingHouse && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Save House Settings
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Bookings Tab ─── */
function BookingsTab({ bookings, onRefresh }: { bookings: Booking[]; onRefresh: () => void }) {
  const [filter, setFilter] = useState<'all' | 'cancelled'>('all');

  const [deleteBookingId, setDeleteBookingId] = useState<string | null>(null);

  const handleDeleteBooking = async () => {
    if (!deleteBookingId) return;
    try {
      await adminDeleteBooking({ bookingId: deleteBookingId });
      toast.success('Booking removed');
      setDeleteBookingId(null);
      onRefresh();
    } catch { toast.error('Failed to delete booking'); }
  };

  const filtered = filter === 'cancelled'
    ? bookings.filter(b => b.status === 'Cancelled')
    : bookings;

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex bg-card rounded-full p-1 border border-border">
        {(['all', 'cancelled'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2 text-sm font-semibold rounded-full transition-colors ${
              filter === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {f === 'all' ? 'All Bookings' : 'Cancelled'}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
        <h2 className="font-bold text-foreground mb-3">{filter === 'all' ? 'All Bookings' : 'Cancelled Bookings'} ({filtered.length})</h2>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings</p>
          ) : filtered.map(b => (
            <div key={b.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <ProfileAvatar url={b.avatarUrl} name={b.familyName} size={20} />
                  <p className="text-sm font-medium truncate">{b.familyName}</p>
                </div>
                <p className="text-xs text-muted-foreground">{b.checkInDate} → {b.checkOutDate || 'Open'} · {b.status}</p>
              </div>
              <AlertDialog open={deleteBookingId === b.id} onOpenChange={open => !open && setDeleteBookingId(null)}>
                <AlertDialogTrigger asChild>
                  <button onClick={() => setDeleteBookingId(b.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0 ml-2">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="z-[100] max-w-xs rounded-3xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Booking?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this booking? This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="flex border-t border-border mt-4">
                    <AlertDialogCancel className="flex-1 rounded-none border-0 border-r border-border m-0 h-12 text-muted-foreground">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteBooking} className="flex-1 rounded-none border-0 m-0 h-12 bg-destructive text-destructive-foreground font-bold">
                      Delete
                    </AlertDialogAction>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Photos Tab ─── */
function PhotosTab() {
  const [photos, setPhotos] = useState<Awaited<ReturnType<typeof getAllCheckoutPhotos>>['photos']>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllCheckoutPhotos()
      .then(r => setPhotos(r.photos))
      .finally(() => setLoading(false));
  }, []);

  const grouped = photos.reduce((acc, photo) => {
    if (!acc[photo.familyId]) acc[photo.familyId] = { familyName: photo.familyName, avatarUrl: photo.avatarUrl, photos: [] };
    acc[photo.familyId].photos.push(photo);
    return acc;
  }, {} as Record<string, { familyName: string; avatarUrl: string; photos: typeof photos }>);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {Object.keys(grouped).length === 0 ? (
        <div className="bg-card rounded-2xl p-8 border border-border shadow-sm text-center">
          <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No checkout photos yet</p>
        </div>
      ) : (
        Object.entries(grouped).map(([familyId, group]) => (
          <div key={familyId} className="bg-card rounded-2xl p-4 border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <ProfileAvatar url={group.avatarUrl} name={group.familyName} size={28} />
              <h3 className="font-bold text-foreground text-sm">{group.familyName}</h3>
              <span className="text-xs text-muted-foreground ml-auto">{group.photos.length} photo{group.photos.length > 1 ? 's' : ''}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {group.photos.map(photo => (
                <div key={photo.id} className="space-y-1">
                  <div className="relative aspect-square rounded-xl overflow-hidden border border-border bg-background">
                    <img src={photo.photoUrl} alt={photo.areaName} className="w-full h-full object-cover" />
                  </div>
                  <p className="text-[11px] text-muted-foreground text-center">{photo.areaName}</p>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/* ─── Settings Tab ─── */
function SettingsTab() {
  const nav = useNavigate();

  const handleLogout = () => {
    clearSession();
    toast.success('Logged out');
    nav('/login');
  };

  return (
    <div className="space-y-5">
      <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
        <h2 className="font-bold text-foreground text-sm mb-2">Demo admin access</h2>
        <p className="text-sm text-muted-foreground">The demo admin PIN is set in the app configuration before it is built. This screen cannot change it.</p>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-destructive text-destructive-foreground font-semibold text-sm shadow-md hover:opacity-90 transition-opacity"
      >
        <LogOut className="w-4 h-4" /> Logout
      </button>
    </div>
  );
}

/* ─── Main Admin ─── */
export default function Admin() {
  const nav = useNavigate();
  const [activeTab, setActiveTab] = useState('scores');
  const [families, setFamilies] = useState<Family[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const session = getSession();
  if (!session) return null;

  useEffect(() => {
    if (session.role !== 'ADMIN') { nav('/dashboard'); return; }
    Promise.all([
      getLeaderboard({}).then(r => setFamilies(r.families)),
      getBookings({}).then(r => setBookings(r.bookings)),
    ]).finally(() => setLoading(false));
  }, []);

  const refresh = () => {
    getLeaderboard({}).then(r => setFamilies(r.families));
    getBookings({}).then(r => setBookings(r.bookings));
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-background">
      <Toaster />
      <div className="w-full max-w-md min-h-screen flex flex-col">
        {/* Header */}
        <div className="bg-primary px-6 pt-12 pb-6 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-white/5 animate-float-1" />
          <div className="absolute bottom-4 -left-8 w-36 h-36 rounded-full bg-white/5 animate-float-2" />
          <div className="absolute top-20 right-8 w-20 h-20 rounded-full bg-white/5 animate-float-3" />
          <div className="flex items-center gap-2 relative z-10">
            <Shield className="w-6 h-6 text-accent" />
            <h1 className="text-primary-foreground text-2xl font-bold">Admin Panel</h1>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 py-5 pb-28">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
          ) : (
            <>
              {activeTab === 'scores' && <ScoresTab families={families} bookings={bookings} onRefresh={refresh} />}
              {activeTab === 'house' && <HouseTab />}
              {activeTab === 'bookings' && <BookingsTab bookings={bookings} onRefresh={refresh} />}
              {activeTab === 'photos' && <PhotosTab />}
              {activeTab === 'settings' && <SettingsTab />}
            </>
          )}
        </div>
      </div>

      <AdminNav active={activeTab} onChange={setActiveTab} />
    </div>
  );
}
