import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll } from 'motion/react';
import { LogOut, LayoutDashboard, Shield, Menu, X } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { cn } from '../utils/cn';

/* Kaaba mark matching the landing page ornaments */
function LogoMark({ compact = false }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn('transition-all duration-500', compact ? 'h-7 w-7' : 'h-9 w-9')}
      aria-hidden="true"
    >
      <rect x="12" y="10" width="40" height="44" rx="4" fill="#0A3D2E" />
      <rect x="12" y="19" width="40" height="4.5" fill="#D4A24C" />
      <rect x="27" y="33" width="10" height="21" rx="1" fill="#D4A24C" />
    </svg>
  );
}

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { scrollY } = useScroll();

  const isLanding = location.pathname === '/';

  // Shrink-on-scroll threshold
  useEffect(() => {
    return scrollY.on('change', (v) => setScrolled(v > 40));
  }, [scrollY]);

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Transparent-over-hero (landing, top of page) vs solid anywhere else
  const overHero = isLanding && !scrolled && !menuOpen;
  const solid = !overHero;

  const goToHash = (hash) => {
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' }), 80);
    } else {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const links = [
    { label: 'Beranda', to: '/' },
    { label: 'Pilihan Paket', hash: 'paket' },
    { label: 'Tentang Kami', hash: 'tentang' },
    { label: 'FAQ', hash: 'faq' },
  ];

  return (
    <motion.nav
      animate={{
        paddingTop: scrolled ? 8 : 14,
        paddingBottom: scrolled ? 8 : 14,
        backgroundColor: solid ? 'rgba(250,248,245,0.92)' : 'rgba(250,248,245,0)',
      }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'fixed inset-x-0 top-0 z-50 border-b transition-[border-color,box-shadow] duration-500',
        solid
          ? 'border-emerald-900/8 shadow-[0_8px_30px_-12px_rgba(10,61,46,0.18)] backdrop-blur-xl'
          : 'border-transparent'
      )}
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 py-1">
            <LogoMark compact={scrolled} />
            <span
              className={cn(
                'font-serif text-xl font-semibold tracking-tight transition-colors duration-300',
                overHero ? 'text-white' : 'text-ink'
              )}
            >
              Tabunganku <span className="text-gold-500">Umroh</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden items-center gap-8 md:flex">
            {links.map((l) => (
              <Link
                key={l.label}
                to={l.to || '/'}
                onClick={(e) => {
                  if (l.hash) {
                    e.preventDefault();
                    goToHash(l.hash);
                  }
                }}
                className={cn(
                  'relative text-sm font-medium transition-colors after:absolute after:-bottom-1.5 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-gold-500 after:transition-transform after:duration-300 hover:after:scale-x-100',
                  overHero ? 'text-white/85 hover:text-white' : 'text-ink/80 hover:text-ink'
                )}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Desktop auth */}
          <div className="hidden items-center gap-2.5 md:flex">
            {isAuthenticated ? (
              <>
                {user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' ? (
                  <Link
                    to="/admin"
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                      overHero ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-forest/8 text-forest hover:bg-forest/15'
                    )}
                  >
                    <Shield className="h-4 w-4" /> Admin Panel
                  </Link>
                ) : (
                  <Link
                    to="/dashboard"
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                      overHero ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-forest/8 text-forest hover:bg-forest/15'
                    )}
                  >
                    <LayoutDashboard className="h-4 w-4" /> Dashboard Saya
                  </Link>
                )}
                <Link
                  to="/profile"
                  title="Profil Saya"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-gold-500/50 bg-midnight text-sm font-bold text-gold-300 transition-transform hover:scale-105"
                >
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </Link>
                <button
                  onClick={handleLogout}
                  title="Keluar"
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full transition-colors',
                    overHero ? 'text-white/70 hover:bg-white/10 hover:text-white' : 'text-sage hover:bg-terra/10 hover:text-terra'
                  )}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className={cn(
                    'px-4 py-2 text-sm font-medium transition-colors',
                    overHero ? 'text-white/85 hover:text-white' : 'text-ink/80 hover:text-ink'
                  )}
                >
                  Masuk
                </Link>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    to="/register"
                    className={cn(
                      'inline-flex items-center rounded-full px-5 py-2.5 text-sm font-bold transition-shadow',
                      overHero
                        ? 'bg-gradient-to-r from-gold-400 to-gold-600 text-night shadow-glow-gold'
                        : 'bg-midnight text-white hover:bg-forest'
                    )}
                  >
                    Mulai Menabung
                  </Link>
                </motion.div>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full transition-colors md:hidden',
              overHero ? 'bg-white/10 text-white' : 'bg-emerald-900/5 text-ink'
            )}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-emerald-900/8 bg-cream/95 backdrop-blur-xl md:hidden"
          >
            <div className="space-y-1 px-6 py-4">
              {links.map((l) => (
                <Link
                  key={l.label}
                  to={l.to || '/'}
                  onClick={(e) => {
                    if (l.hash) {
                      e.preventDefault();
                      setMenuOpen(false);
                      goToHash(l.hash);
                    }
                  }}
                  className="block rounded-xl px-4 py-3 text-sm font-medium text-ink/80 transition-colors hover:bg-forest/5 hover:text-ink"
                >
                  {l.label}
                </Link>
              ))}

              <div className="mt-3 border-t border-emerald-900/8 pt-3">
                {isAuthenticated ? (
                  <div className="space-y-1">
                    {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' ? ['/admin'] : ['/dashboard']).map((to) => (
                      <Link
                        key={to}
                        to={to}
                        className="block rounded-xl px-4 py-3 text-sm font-semibold text-forest transition-colors hover:bg-forest/5"
                      >
                        {to === '/admin' ? 'Admin Panel' : 'Dashboard Saya'}
                      </Link>
                    ))}
                    <Link to="/profile" className="block rounded-xl px-4 py-3 text-sm font-medium text-ink/80 hover:bg-forest/5">
                      Profil Saya
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-terra transition-colors hover:bg-terra/10"
                    >
                      Keluar
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 px-1 pb-1">
                    <Link
                      to="/login"
                      className="rounded-xl border border-emerald-900/10 px-4 py-3 text-center text-sm font-semibold text-ink"
                    >
                      Masuk
                    </Link>
                    <Link
                      to="/register"
                      className="rounded-xl bg-gradient-to-r from-gold-400 to-gold-600 px-4 py-3 text-center text-sm font-bold text-night shadow-glow-gold"
                    >
                      Mulai Menabung
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}