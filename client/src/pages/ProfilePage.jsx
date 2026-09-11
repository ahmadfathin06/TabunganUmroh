import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Copy, Loader2, LogIn, Save } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { formatDate } from '../utils/formatDate';

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [profile, setProfile] = useState(user);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [hasPassport, setHasPassport] = useState(!!user?.hasPassport);
  const [passportNumber, setPassportNumber] = useState(user?.passportNumber || '');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/auth/me');
        const data = res.data?.data;
        setProfile(data);
        setName(data.name);
        setPhone(data.phone || '');
        setHasPassport(!!data.hasPassport);
        setPassportNumber(data.passportNumber || '');
      } catch (err) {
        toast.error('Gagal memuat profil');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name };
      if (phone.trim()) payload.phone = phone.trim();
      payload.hasPassport = hasPassport;
      if (hasPassport && passportNumber.trim()) payload.passportNumber = passportNumber.trim();

      const res = await api.put('/auth/profile', payload);
      const updated = res.data?.data;
      setProfile(updated);
      updateUser(updated);
      toast.success('Profil berhasil diperbarui');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memperbarui profil');
    } finally {
      setSaving(false);
    }
  };

  const copy = () => {
    navigator.clipboard?.writeText(profile?.referralCode || '');
    toast.success('Kode referral disalin');
  };

  const initial = (profile?.name || user?.name || '?').charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Profil Saya 👤</h1>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-700" />
          </div>
        ) : (
          <>
            {/* ===== Header profil ===== */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col sm:flex-row sm:items-center gap-5 mb-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-3xl font-bold shadow-sm">
                {initial}
              </div>
              <div className="flex-1">
                <p className="text-xl font-bold text-slate-900">{profile?.name}</p>
                <p className="text-sm text-slate-500">{profile?.email}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                    {profile?.role === 'SUPER_ADMIN' || profile?.role === 'ADMIN' ? '🛡️ Admin' : '🕌 Jamaah'}
                  </span>
                  <span className="text-xs text-slate-400">Bergabung {profile?.createdAt ? formatDate(profile.createdAt) : '-'}</span>
                </div>
              </div>
              <Link
                to={profile?.role === 'SUPER_ADMIN' || profile?.role === 'ADMIN' ? '/admin' : '/dashboard'}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold transition"
              >
                <LogIn className="w-4 h-4" /> Kembali
              </Link>
            </div>

            {/* ===== Kartu referral ===== */}
            {profile?.referralCode && (
              <div className="bg-gradient-to-br from-emerald-700 to-teal-800 rounded-2xl p-6 text-white shadow-sm mb-6">
                <p className="text-emerald-100/90 text-sm font-medium">Kode Referral Anda</p>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-2xl font-extrabold tracking-widest">{profile.referralCode}</p>
                  <button
                    onClick={copy}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-sm font-semibold transition"
                  >
                    <Copy className="w-4 h-4" /> Salin
                  </button>
                </div>
                <p className="mt-3 text-xs text-emerald-100/80">
                  Bagikan kode ini ke keluarga/teman. Pendaftar dengan kode ini akan tercatat sebagai nasabah referral Anda.
                </p>
              </div>
            )}

            {/* ===== Form update ===== */}
            <form onSubmit={save} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
              <h2 className="font-bold text-slate-900">Data Diri</h2>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="pfName">
                  Nama Lengkap
                </label>
                <input
                  id="pfName"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="pfPhone">
                  No. HP / WhatsApp
                </label>
                <input
                  id="pfPhone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                <label className="flex items-center gap-3 text-sm font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasPassport}
                    onChange={(e) => setHasPassport(e.target.checked)}
                    className="w-4 h-4 rounded accent-emerald-700"
                  />
                  Saya sudah memiliki paspor
                </label>
                {hasPassport && (
                  <input
                    type="text"
                    value={passportNumber}
                    onChange={(e) => setPassportNumber(e.target.value)}
                    placeholder="Nomor paspor"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                )}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm transition disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Simpan Perubahan
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}