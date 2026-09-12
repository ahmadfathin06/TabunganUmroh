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
import AuthShell, { authInputClass, authLabelClass } from '../components/auth/AuthShell';

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
      toast.success('Registrasi berhasil! Selamat datang');
      navigate('/dashboard');
    } else {
      toast.error(result.message || 'Registrasi gagal');
      fireErrors(result.errors);
    }
  };

  const err = (k) => errors[k] && <p className="mt-1 text-xs text-terra">{errors[k].message}</p>;

  return (
    <AuthShell
      title="Mulai Perjalanan Suci Anda"
      subtitle="Buat akun tabungan umroh — gratis, tanpa biaya administrasi, tanpa riba."
      footer={
        <>
          Sudah punya akun?{' '}
          <Link to="/login" className="font-bold text-forest transition-colors hover:text-gold-600">
            Masuk di sini
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* Nama */}
        <div>
          <label className={authLabelClass} htmlFor="name">
            Nama Lengkap <span className="text-terra">*</span>
          </label>
          <div className="relative">
            <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-sage" />
            <input
              id="name"
              type="text"
              placeholder="Nama sesuai KTP"
              autoComplete="name"
              {...register('name')}
              className={`${authInputClass(errors.name)} pl-11`}
            />
          </div>
          {err('name')}
        </div>

        {/* Email + Phone */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={authLabelClass} htmlFor="email">
              Email <span className="text-terra">*</span>
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-sage" />
              <input
                id="email"
                type="email"
                placeholder="nama@email.com"
                autoComplete="email"
                {...register('email')}
                className={`${authInputClass(errors.email)} pl-11`}
              />
            </div>
            {err('email')}
          </div>

          <div>
            <label className={authLabelClass} htmlFor="phone">
              No. HP <span className="text-terra">*</span>
            </label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-sage" />
              <input
                id="phone"
                type="tel"
                placeholder="08xxxxxxxxxx"
                autoComplete="tel"
                {...register('phone')}
                className={`${authInputClass(errors.phone)} pl-11`}
              />
            </div>
            {err('phone')}
          </div>
        </div>

        {/* Password */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={authLabelClass} htmlFor="password">
              Password <span className="text-terra">*</span>
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-sage" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Min. 8 karakter"
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
            {err('password')}
          </div>

          <div>
            <label className={authLabelClass} htmlFor="confirmPassword">
              Konfirmasi <span className="text-terra">*</span>
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-sage" />
              <input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Ulangi password"
                {...register('confirmPassword')}
                className={`${authInputClass(errors.confirmPassword)} pl-11 pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((s) => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sage transition-colors hover:text-ink"
                aria-label={showConfirm ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {err('confirmPassword')}
          </div>
        </div>

        {/* KTP + Referral */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={authLabelClass} htmlFor="ktpNumber">No. KTP (opsional)</label>
            <div className="relative">
              <IdCard className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-sage" />
              <input
                id="ktpNumber"
                type="text"
                maxLength={16}
                placeholder="16 digit"
                {...register('ktpNumber')}
                className={`${authInputClass(errors.ktpNumber)} pl-11`}
              />
            </div>
            {err('ktpNumber')}
          </div>

          <div>
            <label className={authLabelClass} htmlFor="referralCode">Kode Referral (opsional)</label>
            <div className="relative">
              <Gift className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-sage" />
              <input
                id="referralCode"
                type="text"
                placeholder="Contoh: ABCD1X2Y"
                {...register('referralCode')}
                className={`${authInputClass(errors.referralCode)} pl-11`}
              />
            </div>
            {err('referralCode')}
            <p className="mt-1 text-xs text-sage/80">Bonus Rp50rb untuk pengundang.</p>
          </div>
        </div>

        {/* Alamat */}
        <div>
          <label className={authLabelClass} htmlFor="address">Alamat (opsional)</label>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-4 top-3 h-4 w-4 text-sage" />
            <textarea
              id="address"
              rows={2}
              placeholder="Alamat lengkap domisili"
              {...register('address')}
              className={`${authInputClass(errors.address)} resize-none pl-11`}
            />
          </div>
          {err('address')}
        </div>

        {/* Passport */}
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-emerald-900/10 bg-sand/40 px-4 py-3.5">
          <input
            type="checkbox"
            {...register('hasPassport')}
            className="mt-0.5 h-4 w-4 rounded accent-gold-600"
          />
          <span className="text-sm text-sage">
            Sudah punya paspor
            <span className="block text-xs text-sage/70">Kosongkan jika belum — bisa diurus nanti.</span>
          </span>
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="group flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold-400 to-gold-600 px-6 py-3.5 text-sm font-bold text-night shadow-glow-gold transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Membuat akun...
            </>
          ) : (
            <>
              Daftar &amp; Mulai Menabung
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </>
          )}
        </button>

        <p className="text-center text-xs text-sage/80">
          Dengan mendaftar, Anda menyetujui ketentuan layanan kami.
        </p>
      </form>
    </AuthShell>
  );
}
