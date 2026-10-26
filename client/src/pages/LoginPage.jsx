import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import AuthShell, { authInputClass, authLabelClass } from '../components/auth/AuthShell';

const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Email atau No. HP wajib diisi')
    .refine(
      (value) =>
        value.includes('@')
          ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
          : /^\+?[0-9][0-9\s-]{7,19}$/.test(value),
      'Masukkan email atau No. HP yang valid'
    ),
  password: z.string().min(1, 'Password wajib diisi'),
});

export default function LoginPage() {
  const { login } = useAuthStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data) => {
    const result = await login(data.identifier, data.password);
    if (result.success) {
      toast.success('Login berhasil!');
      const role = result.user.role;
      navigate(role === 'ADMIN' || role === 'SUPER_ADMIN' ? '/admin' : '/dashboard');
    } else {
      toast.error(result.message || 'Login gagal');
    }
  };

  // Sudah login → langsung ke halaman sesuai role.
  if (isAuthenticated) {
    return <Navigate to={user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' ? '/admin' : '/dashboard'} replace />;
  }

  return (
    <AuthShell
      title="Selamat Datang Kembali"
      subtitle="Masuk untuk melanjutkan perjalanan tabungan Anda menuju Baitullah."
      footer={
        <>
          Belum punya akun?{' '}
          <Link to="/register" className="font-bold text-forest transition-colors hover:text-gold-600">
            Daftar gratis sekarang
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* Email atau No. HP */}
        <div>
          <label className={authLabelClass} htmlFor="identifier">Email atau No. HP</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-sage" />
            <input
              id="identifier"
              type="text"
              inputMode="email"
              autoComplete="username"
              placeholder="nama@email.com atau 08xxxxxxxxxx"
              {...register('identifier')}
              className={`${authInputClass(errors.identifier)} pl-11`}
            />
          </div>
          {errors.identifier && <p className="mt-1 text-xs text-terra">{errors.identifier.message}</p>}
        </div>

        {/* Password */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-sage" htmlFor="password">
              Password
            </label>
            <button
              type="button"
              onClick={() => toast('Hubungi admin untuk reset password.', { icon: '🔑' })}
              className="text-xs font-semibold text-gold-600 transition-colors hover:text-gold-700"
            >
              Lupa password?
            </button>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-sage" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              {...register('password')}
              className={`${authInputClass(errors.password)} pl-11 pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sage transition-colors hover:text-ink"
              aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-terra">{errors.password.message}</p>}
        </div>

        <p className="flex items-center gap-2.5 text-sm text-sage">
          <Lock className="h-4 w-4 shrink-0 text-sage" />
          Sesi Anda tersimpan otomatis di perangkat ini.
        </p>

        <button
          type="submit"
          disabled={isSubmitting}
          className="group flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold-400 to-gold-600 px-6 py-3.5 text-sm font-bold text-night shadow-glow-gold transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Memproses...
            </>
          ) : (
            <>
              Masuk
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
}
