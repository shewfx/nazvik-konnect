
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFamilies, loginFamily, GetFamiliesOutputType } from 'zite-endpoints-sdk';
import { getSession, setSession } from '../lib/auth';
import { Loader2, ArrowRight, ChevronDown } from 'lucide-react';
import ProfileAvatar from '../components/ProfileAvatar';
import { isSupabaseConfigured } from '../lib/supabase';

type Family = GetFamiliesOutputType['families'][0];

export default function Login() {
  const nav = useNavigate();
  const [families, setFamilies] = useState<Family[]>([]);
  const [selected, setSelected] = useState<Family | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dbSource, setDbSource] = useState<'loading' | 'configured' | 'unconfigured'>('loading');

  useEffect(() => {
    if (getSession()) {
      nav('/dashboard');
      return;
    }
    if (!isSupabaseConfigured) {
      setDbSource('unconfigured');
      setFetching(false);
      return;
    }
    getFamilies({})
      .then(r => {
        setFamilies(r.families);
        setDbSource('configured');
      })
      .catch(() => {
        setDbSource('unconfigured');
      })
      .finally(() => setFetching(false));
  }, [nav]);

  const handleLogin = async () => {
    setError('');

    // Demo admin access is configured at build time and is not secure authentication.
    if (!selected) {
      const demoAdminPin = import.meta.env.VITE_DEMO_ADMIN_PIN;
      if (/^\d{8}$/.test(demoAdminPin) && pin === demoAdminPin) {
        setSession({ familyId: 'admin', familyName: 'Admin', role: 'ADMIN', priorityScore: 999, avatarUrl: '' });
        nav('/admin');
        return;
      }
      setError('Select a family and enter your PIN');
      return;
    }

    // Family login: must be 4-digit PIN
    if (pin.length !== 4) {
      setError('Enter 4-digit PIN');
      return;
    }

    setLoading(true);
    try {
      const res = await loginFamily({ familyId: selected.id, pin });
      setSession({ familyId: res.familyId, familyName: res.familyName, role: res.role, priorityScore: res.priorityScore, avatarUrl: res.avatarUrl });
      nav('/dashboard');
    } catch {
      setError('Wrong PIN. Try again.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-start overflow-y-auto">
      {/* Header */}
      <div className="w-full max-w-md px-6 pt-16 pb-8 text-center relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-white/5 animate-float-1" />
        <div className="absolute bottom-4 -left-8 w-36 h-36 rounded-full bg-white/5 animate-float-2" />
        <div className="absolute top-20 right-8 w-20 h-20 rounded-full bg-white/5 animate-float-3" />
        <div className="relative z-10">
          <img src="/icon.svg" alt="NazVik" className="w-20 h-20 mx-auto mb-4 object-contain" />
          <h1 className="text-primary-foreground text-3xl font-bold">NazVik Konnect</h1>
          <p className="text-primary-foreground/60 mt-1 text-sm">Family Farmhouse Booking</p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-primary-foreground text-xs font-medium">
            {dbSource === 'loading' && <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />}
            {dbSource === 'configured' && <span className="w-2 h-2 rounded-full bg-green-400" />}
            {dbSource === 'unconfigured' && <span className="w-2 h-2 rounded-full bg-orange-400" />}
            {dbSource === 'loading' && 'Connecting...'}
            {dbSource === 'configured' && 'Demo database configured'}
            {dbSource === 'unconfigured' && 'Demo database not configured'}
          </div>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-card rounded-t-3xl flex-1 px-6 pt-8 pb-10">
        <h2 className="text-foreground font-bold text-lg mb-6 text-center">Family Login</h2>

        {/* Family Dropdown */}
        <div className="mb-5">
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Select Your Family</label>
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center justify-between rounded-xl border border-input bg-background px-4 py-3 text-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className={selected ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                {selected ? (
                  <span className="flex items-center gap-2">
                    <ProfileAvatar url={selected.avatarUrl} name={selected.familyName} size={20} />
                    {selected.familyName}
                  </span>
                ) : '-- Choose Household --'}
              </span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-lg z-50 max-h-60 overflow-auto">
                {fetching ? (
                  <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                ) : families.length === 0 ? (
                  <p className="text-center py-4 text-sm text-muted-foreground">No families registered yet.</p>
                ) : (
                  families.map(f => (
                    <button
                      key={f.id}
                      onClick={() => { setSelected(f); setDropdownOpen(false); setError(''); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-accent transition-colors text-left"
                    >
                      <ProfileAvatar url={f.avatarUrl} name={f.familyName} size={32} />
                      <div>
                        <p className="font-medium text-foreground">{f.familyName}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* PIN Input */}
        <div className="mb-6">
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Secret PIN</label>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, selected ? 4 : 8))}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="••••"
            className="w-full h-14 text-center text-2xl tracking-[0.5em] rounded-xl border border-input bg-background px-4 py-2 text-foreground placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        {error && <p className="text-destructive text-sm mb-4 text-center font-medium">{error}</p>}

        {/* Enter Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full h-14 rounded-xl bg-primary text-primary-foreground font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            <>Enter App <ArrowRight className="w-5 h-5" /></>
          )}
        </button>


      </div>
    </div>
  );
}
