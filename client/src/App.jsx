import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { motion } from 'motion/react';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import PageLoader from './components/PageLoader';
import { ProtectedRoute } from './components/ProtectedRoute';

/* ---------- Code-split routes (landing stays in the entry chunk) ---------- */
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const UserDashboard = lazy(() => import('./pages/UserDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

/* Fade + slight scale between routes */
function PageTransition({ children }) {
  const location = useLocation();
  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, scale: 0.995 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* Tab bar bawah (mobile) — tampil di semua halaman kecuali auth & admin panel */
function BottomTabBar() {
  const { pathname } = useLocation();
  const hidden =
    pathname.startsWith('/admin') || pathname === '/login' || pathname === '/register';

  return hidden ? null : <BottomNav />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Navbar />
      <Suspense fallback={<PageLoader />}>
        <main>
          <PageTransition>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* User Dashboard Protected */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <UserDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Admin Dashboard Protected */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute roleRequired="ADMIN">
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Profil (login wajib) */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </PageTransition>
        </main>
      </Suspense>
      <BottomTabBar />
    </BrowserRouter>
  );
}