import { Routes, Route, useLocation } from 'react-router-dom';
import { Suspense, lazy, useState } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LoadingSpinner from './components/LoadingSpinner';
import ProtectedRoute from './components/ProtectedRoute';

const Home = lazy(() => import('./pages/Home'));
const LandMeasurement = lazy(() => import('./pages/LandMeasurement'));
const PlannerWorkspace = lazy(() => import('./pages/PlannerWorkspace'));
const CostCalculator = lazy(() => import('./pages/CostCalculator'));
const Gallery = lazy(() => import('./pages/Gallery'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));

export default function App() {
  const { pathname } = useLocation();
  const workspace = ['/floor-plans', '/3d-designer'].includes(pathname.replace(/\/$/, ''));
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('dream-home-ui-theme') === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
  });
  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try { localStorage.setItem('dream-home-ui-theme', next); } catch { /* The current session still retains the theme. */ }
  }
  const router = (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/land-measurement" element={<LandMeasurement />} />
        <Route path="/floor-plans" element={<PlannerWorkspace key="floor-plans" initialView="2d" theme={theme} toggleTheme={toggleTheme} />} />
        <Route path="/3d-designer" element={<PlannerWorkspace key="3d-designer" initialView="3d" theme={theme} toggleTheme={toggleTheme} />} />
        <Route path="/cost-calculator" element={<CostCalculator />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </Suspense>
  );
  if (workspace) return router;
  return (
    <div className="site-shell min-h-screen flex flex-col" data-ui-theme={theme}>
      <Navbar theme={theme} toggleTheme={toggleTheme} />
      <main className="flex-grow">{router}</main>
      <Footer />
    </div>
  );
}
