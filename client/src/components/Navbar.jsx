import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { LogOut, LayoutDashboard, Shield } from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🕌</span>
            <span className="font-bold text-xl text-emerald-800 tracking-tight">
              Tabunganku <span className="text-amber-600">Umroh</span>
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <Link to="/" className="hover:text-emerald-700 transition">Beranda</Link>
            <a href="#paket" className="hover:text-emerald-700 transition">Pilihan Paket</a>
            <a href="#tentang" className="hover:text-emerald-700 transition">Tentang Kami</a>
            <a href="#faq" className="hover:text-emerald-700 transition">FAQ</a>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                {user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' ? (
                  <Link
                    to="/admin"
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-50 text-emerald-800 text-sm font-semibold hover:bg-emerald-100 transition"
                  >
                    <Shield className="w-4 h-4" /> Admin Panel
                  </Link>
                ) : (
                  <Link
                    to="/dashboard"
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-50 text-emerald-800 text-sm font-semibold hover:bg-emerald-100 transition"
                  >
                    <LayoutDashboard className="w-4 h-4" /> Dashboard Saya
                  </Link>
                )}
                <Link
                  to="/profile"
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-sm font-bold hover:opacity-90 transition"
                  title="Profil Saya"
                >
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="Keluar"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-emerald-800 transition"
                >
                  Masuk
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm shadow-emerald-700/20 transition"
                >
                  Mulai Menabung
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}