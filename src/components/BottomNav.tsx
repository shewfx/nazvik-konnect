
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Clock, CalendarDays, Settings, Info } from 'lucide-react';

const TABS = [
  { path: '/info', icon: Info },
  { path: '/history', icon: Clock },
  { path: '/dashboard', icon: Home },
  { path: '/upcoming', icon: CalendarDays },
  { path: '/settings', icon: Settings },
];

export default function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  const activeIndex = TABS.findIndex(t => t.path === pathname);
  const hasActiveTab = activeIndex !== -1;
  const si = hasActiveTab ? activeIndex : 2;

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const tabCount = TABS.length;
  const tabWidth = 100 / tabCount;
  const pillRatio = 0.72;
  const pillWidth = tabWidth * pillRatio;
  const pillLeft = si * tabWidth + (tabWidth - pillWidth) / 2;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="w-full max-w-md px-4 pb-5 pointer-events-auto">
        <nav className="relative flex items-center bg-card/90 backdrop-blur-md border border-border/60 rounded-full h-14 shadow-lg shadow-black/5">
          {/* Sliding pill background */}
          {hasActiveTab && (
            <div
              className={`absolute top-1 h-[calc(100%-8px)] rounded-full bg-primary ${mounted ? 'transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]' : ''}`}
              style={{
                left: `${pillLeft}%`,
                width: `${pillWidth}%`,
              }}
            />
          )}
          {TABS.map((tab, i) => {
            const Icon = tab.icon;
            const active = i === si;
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`relative z-10 flex flex-1 items-center justify-center h-full transition-colors duration-200 ${
                  active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-200 ${active ? 'scale-110' : 'scale-100'}`} strokeWidth={active ? 2.5 : 2} />
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
