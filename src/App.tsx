import { BrowserRouter, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { getSession } from './lib/auth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Upcoming from './pages/Upcoming';
import Alerts from './pages/Alerts';
import Inspection from './pages/Inspection';
import Admin from './pages/Admin';
import Settings from './pages/Settings';
import HouseInfo from './pages/HouseInfo';
import BottomNav from './components/BottomNav';

function Guard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!getSession()) {
      navigate('/login', { replace: true });
    }
  }, [navigate, location.pathname]);

  if (!getSession()) return null;
  return <>{children}</>;
}

function NavBar() {
  const { pathname } = useLocation();
  const tabRoutes = ['/dashboard', '/history', '/upcoming', '/settings', '/info'];
  // Hide main nav on admin routes
  if (pathname.startsWith('/admin')) return null;
  if (!tabRoutes.includes(pathname)) return null;
  return <BottomNav />;
}

function RootRedirect() {
  if (getSession()) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/login" replace />;
}

function AnimatedRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Guard><Dashboard /></Guard>} />
      <Route path="/history" element={<Guard><History /></Guard>} />
      <Route path="/upcoming" element={<Guard><Upcoming /></Guard>} />
      <Route path="/alerts" element={<Guard><Alerts /></Guard>} />
      <Route path="/inspection" element={<Guard><Inspection /></Guard>} />
      <Route path="/admin" element={<Guard><Admin /></Guard>} />
      <Route path="/settings" element={<Guard><Settings /></Guard>} />
      <Route path="/info" element={<Guard><HouseInfo /></Guard>} />
      {/* Catch-all route to redirect any unknown URLs */}
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
      <NavBar />
    </BrowserRouter>
  );
}
