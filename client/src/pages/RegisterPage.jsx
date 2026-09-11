import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import {
  User,
  Mail,
  Lock,
  Phone,
  MapPin,
  IdCard,
  Eye,
  EyeOff,
  Loader2,
  Gift,
  ArrowRight,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

const registerSchema = z
  .object({
    name: z.string().min(3, 'Nama minimal 3 karakter').max(100, 'Nama terlalu panjang'),
    email: z.string().email('Format email tidak valid'),
    password: z
      .string()
      .min(8, 'Password minimal 8 karakter')
      .regex(/[A-Z]/, 'Harus mengandung huruf besar')
      .regex(/[0-9]/, 'Harus mengandung angka'),
    confirmPassword: z.string(),
    phone: z
      .string()
      .min(10, 'No. HP minimal 10 digit')
      .max(15, 'No. HP maksimal 15 digit')
      .regex(/^[0-9]+$/, 'Hanya angka'),
    ktpNumber: z
      .string()
      .optional()
      .refine((v) => !v || /^\d{16}$/.test(v), 'No. KTP harus 16 digit'),
    address: z
      .string()
      .optional()
      .refine((v) => !v || v.length >= 10, 'Alamat minimal 10 karakter'),
    hasPassport: z.boolean().optional(),
    referralCode: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Konfirmasi password tidak cocok',
    path: ['confirmPassword'],
  });

export default function RegisterPage() {
  const { register: registerUser } = useAuthStore();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      hasPassport: false,
      ktpNumber: '',
      address: '',
      referralCode: '',
    },
    resolver: zodResolver(registerSchema),
  });

  const fireErrors = (errs) => {
    if (Array.isArray(errs)) {
      errs.forEach((e) => toast.error(e.message || 'Terjadi kesalahan'));
    }
  };

  const onSubmit = async (data) => {
    const payload = {
      name: data.name,
      email: data.email,
      password: data.password,
      confirmPassword: data.confirmPassword,
      phone: data.phone,
      ktpNumber: data.ktpNumber || undefined,
      address: data.address || undefined,
      hasPassport: data.hasPassport,
      referralCode: data.referralCode || undefined,
    };

    const result = await registerUser(payload);
    if (result.success) {
      toast.success('Registrasi berhasil! Selamat datang 🎉');
      navigate('/dashboard');
    } else {
      toast.error(result.message || 'Registrasi gagal');
      fireErrors(result.errors);
    }
  };

  const inputClass = (name) =>
    `w-full pl-11 pr-4 py-2.5 rounded-xl border text-sm outline-none transition focus:ring-2 ${
      errors[name]
        ? 'border-rose-300 focus:ring-rose-200'
        : 'border-slate-200 focus:ring-emerald-200 focus:border-emerald-400'
    }`;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2">
            <span className="text-3xl">🕌</span>
            <span className="font-bold text-2xl text-emerald-800 tracking-tight">
              Tabunganku <span className="text-amber-600">Umroh</span>
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">Buat Akun Baru</h1>
          <p className="mt-1 text-slate-500 text-sm">
            Mulai tabungan umroh Anda sekarang — gratis tanpa biaya admin.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* Nama */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="name">
                Nama Lengkap <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="name"
                  type="text"
                  placeholder="Nama sesuai KTP"
                  autoComplete="name"
                  {...register('name')}
                  className={inputClass('name')}
                />
              </div>
              {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>}
            </div>

            {/* Email + Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="email">
                  Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    placeholder="nama@email.com"
                    autoComplete="email"
                    {...register('email')}
                    className={inputClass('email')}
                  />
                </div>
                {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="phone">
                  No. HP <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="phone"
                    type="tel"
                    placeholder="08xxxxxxxxxx"
                    autoComplete="tel"
                    {...register('phone')}
                    className={inputClass('phone')}
                  />
                </div>
                {errors.phone && <p className="mt-1 text-xs text-rose-600">{errors.phone.message}</p>}
              </div>
            </div>

            {/* Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="password">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Min. 8 karakter + huruf besar & angka"
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
                    aria-label="Tampilkan password"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-rose-600">{errors.password.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="confirmPassword">
                  Konfirmasi Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Ulangi password"
                    {...register('confirmPassword')}
                    className={`w-full pl-11 pr-11 py-2.5 rounded-xl border text-sm outline-none transition focus:ring-2 ${
                      errors.confirmPassword
                        ? 'border-rose-300 focus:ring-rose-200'
                        : 'border-slate-200 focus:ring-emerald-200 focus:border-emerald-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label="Tampilkan password"
                  >
                    {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-rose-600">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            {/* KTP + Referral */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="ktpNumber">
                  No. KTP (opsional)
                </label>
                <div className="relative">
                  <IdCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="ktpNumber"
                    type="text"
                    maxLength={16}
                    placeholder="16 digit"
                    {...register('ktpNumber')}
                    className={inputClass('ktpNumber')}
                  />
                </div>
                {errors.ktpNumber && <p className="mt-1 text-xs text-rose-600">{errors.ktpNumber.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="referralCode">
                  Kode Referral (opsional)
                </label>
                <div className="relative">
                  <Gift className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="referralCode"
                    type="text"
                    placeholder="Contoh: ABCD1X2Y"
                    {...register('referralCode')}
                    className={inputClass('referralCode')}
                  />
                </div>
                {errors.referralCode && (
                  <p className="mt-1 text-xs text-rose-600">{errors.referralCode.message}</p>
                )}
                <p className="mt-1 text-xs text-slate-400">
                  Dapatkan bonus Rp50rb untuk pengundang.
                </p>
              </div>
            </div>

            {/* Alamat */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="address">
                Alamat (opsional)
              </label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-3 w-5 h-5 text-slate-400" />
                <textarea
                  id="address"
                  rows={2}
                  placeholder="Alamat lengkap domisili"
                  {...register('address')}
                  className={`w-full pl-11 pr-4 py-2.5 rounded-xl border text-sm outline-none transition focus:ring-2 resize-none ${
                    errors.address
                      ? 'border-rose-300 focus:ring-rose-200'
                      : 'border-slate-200 focus:ring-emerald-200 focus:border-emerald-400'
                  }`}
                />
              </div>
              {errors.address && <p className="mt-1 text-xs text-rose-600">{errors.address.message}</p>}
            </div>

            {/* Passport */}
            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                {...register('hasPassport')}
                className="mt-0.5 w-4 h-4 rounded accent-emerald-700"
              />
              <span className="text-sm text-slate-600">
                Sudah punya paspor <span className="block text-xs text-slate-400">Kosongkan jika belum — bisa diurus nanti.</span>
              </span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Membuat akun...
                </>
              ) : (
                <>
                  Daftar & Mulai Menabung <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <p className="text-center text-xs text-slate-400">
              Dengan mendaftar, Anda menyetujui ketentuan layanan kami.
            </p>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Sudah punya akun?{' '}
          <Link to="/login" className="font-semibold text-emerald-700 hover:text-emerald-800">
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  );
}