
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSession } from '../lib/auth';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { ArrowLeft, KeyRound, Loader2 } from 'lucide-react';
import { updateFamilyPin } from 'zite-endpoints-sdk';

export default function Settings() {
  const nav = useNavigate();
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [changingPin, setChangingPin] = useState(false);
  const session = getSession();
  if (!session) return null;

  const handleChangePin = async () => {
    if (newPin.length !== 4) { toast.error('PIN must be 4 digits'); return; }
    if (newPin !== confirmPin) { toast.error('PINs do not match'); return; }
    setChangingPin(true);
    try {
      await updateFamilyPin({ familyId: session.familyId, pinCode: newPin });
      toast.success('PIN updated successfully!');
      setNewPin('');
      setConfirmPin('');
    } catch {
      toast.error('Failed to update PIN');
    } finally {
      setChangingPin(false);
    }
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
          <button onClick={() => nav(-1)} className="flex items-center gap-2 text-primary-foreground/70 text-sm mb-4 hover:text-primary-foreground relative z-10">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-primary-foreground text-2xl font-bold relative z-10">Settings</h1>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 py-5 pb-28">
          <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
            <h2 className="font-bold text-foreground text-sm mb-3 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-primary" /> Security
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">New 4-digit PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={newPin}
                  onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  className="w-full h-12 text-center text-xl tracking-[0.5em] rounded-xl border border-input bg-background px-4 py-2 text-foreground placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Confirm PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={confirmPin}
                  onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  className="w-full h-12 text-center text-xl tracking-[0.5em] rounded-xl border border-input bg-background px-4 py-2 text-foreground placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <button
                onClick={handleChangePin}
                disabled={changingPin || newPin.length !== 4 || confirmPin.length !== 4}
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
              >
                {changingPin ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update PIN'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
