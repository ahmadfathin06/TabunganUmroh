import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Home, PiggyBank, MoonStar, User } from 'lucide-react';
import { cn } from '../utils/cn';

const ITEMS = [
  { key: 'home', label: 'Beranda', to: '/', icon: Home },
  { key: 'savings', label: 'Tabungan', to: '/dashboard', icon: PiggyBank },
  { key: 'packages', label: 'Paket Umrah', hash: 'paket', icon: MoonStar },
  { key: 'account', label: 'Akun', to: '/profile', icon: User },
];

/**
 * Tab bar bawah — tampil di semua halaman (mobile) kecuali auth & admin.
 * Di desktop disembunyikan karena navigasi dipegang Navbar situs.
 * z-40 sengaja di bawah modal (z-50) agar overlay modal tidak tertutup.
 */
export default function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [packagesInView, setPackagesInView] = useState(false);

  const goToHash = (hash) => {
    if (pathname !== '/') {
      navigate('/');
      setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' }), 80);
    } else {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Scroll-spy: sorot "Paket Umrah" saat section paket di landing terlihat.
  useEffect(() => {
    if (pathname !== '/') {
      setPackagesInView(false);
      return undefined;
    }

    let observer = null;
    let timer = null;
    let tries = 0;

    const attach = () => {
      const section = document.getElementById('paket');
      if (!section) return false;
      observer = new IntersectionObserver(
        ([entry]) => setPackagesInView(entry.isIntersecting),
        { rootMargin: '-88px 0px -45% 0px' }
      );
      observer.observe(section);
      return true;
    };

    // LandingPage di-lazy-load, jadi section-nya bisa belum ada saat mount.
    if (!attach()) {
      timer = setInterval(() => {
        if (attach() || ++tries >= 20) {
          clearInterval(timer);
          timer = null;
        }
      }, 200);
    }

    return () => {
      if (timer) clearInterval(timer);
      observer?.disconnect();
    };
  }, [pathname]);

  const isActive = (item) => {
    if (item.key === 'packages') return packagesInView;
    if (item.key === 'home') return pathname === '/' && !packagesInView;
    return pathname === item.to;
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-emerald-900/8 bg-cream/95 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Navigasi utama"
    >
      <div className="mx-auto flex h-[var(--bottom-nav-height)] max-w-md items-stretch px-2">
        {ITEMS.map((item) => {
          const { label, to, hash, icon: Icon } = item;
          const active = isActive(item);
          const classes = cn(
            'relative flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors',
            active ? 'text-forest' : 'text-sage hover:text-ink'
          );

          const content = (
            <>
              {active && (
                <motion.span
                  layoutId="bottom-nav-indicator"
                  className="absolute top-0 h-0.5 w-8 rounded-full bg-gold-500"
                />
              )}
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </>
          );

          return to ? (
            <Link key={label} to={to} className={classes}>
              {content}
            </Link>
          ) : (
            <button key={label} type="button" onClick={() => goToHash(hash)} className={classes}>
              {content}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
