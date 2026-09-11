import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, KeyRound } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

export default function LoginPage() {
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(() => !!localStorage.getItem('accessToken'));

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data) => {
    const result = await login(data.email, data.password);
    if (result.success) {
      toast.success('Login berhasil!');
      const role = result.user.role;
      navigate(role === 'ADMIN' || role === 'SUPER_ADMIN' ? '/admin' : '/dashboard');
    } else {
      toast.error(result.message || 'Login gagal');
    }
  };

  const fillDemo = (role) => {
    if (role === 'admin') {
      setValue('email', 'admin@tabunganku.com');
      setValue('password', 'Admin@123456');
      toast.success('Kredensial admin diisi');
    } else {
      setValue('email', 'jamaah@tabunganku.com');
      setValue('password', 'Password123');
      toast.success('Kredensial jamaah diisi');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2">
            <span className="text-3xl">🕌</span>
            <span className="font-bold text-2xl text-emerald-800 tracking-tight">
              Tabunganku <span className="text-amber-600">Umroh</span>
            </span>
          </div>
          <p className="mt-2 text-slate-500 text-sm">Masuk untuk melanjutkan tabungan Anda</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="email">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="nama@email.com"
                  {...register('email')}
                  className={`w-full pl-11 pr-4 py-2.5 rounded-xl border text-sm outline-none transition focus:ring-2 ${
                    errors.email
                      ? 'border-rose-300 focus:ring-rose-200'
                      : 'border-slate-200 focus:ring-emerald-200 focus:border-emerald-400'
                  }`}
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-slate-700" htmlFor="password">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => toast('Hubungi admin untuk reset password.', { icon: '🔑' })}
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-medium"
                >
                  Lupa password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password')}
                  className={`w-full pl-11 pr-11 py-2.5 rounded-xl border text-sm outline-none transition focus:ring-2 ${
                    errors.password
                      ? 'border-rose-300 focus:ring-rose-200'
                      : 'border-slate-200 focus:ring-emerald-200 focus:border-emerald-400'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-rose-600">{errors.password.message}</p>}
            </div>

            {/* Remember */}
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded accent-emerald-700"
              />
              Ingat saya di perangkat ini
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Memproses...
                </>
              ) : (
                <>
                  Masuk <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo hint */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-center text-xs text-slate-400 mb-3 flex items-center justify-center gap-1">
              <KeyRound className="w-3.5 h-3.5" /> Akses cepat peran:
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => fillDemo('admin')}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                🛡️ Admin
              </button>
              <button
                type="button"
                onClick={() => fillDemo('user')}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                🕌 Jamaah
              </button>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Belum punya akun?{' '}
          <Link to="/register" className="font-semibold text-emerald-700 hover:text-emerald-800">
            Daftar gratis sekarang
          </Link>
        </p>
      </div>
    </div>
  );
}