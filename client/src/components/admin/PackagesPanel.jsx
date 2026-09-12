import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Loader2, Plus, Plane, X, Pencil, Power } from 'lucide-react';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

const EMPTY_PACKAGE_FORM = {
  name: '',
  description: '',
  price: 35000000,
  departureDate: '',
  departureCity: 'Jakarta',
  durationDays: 9,
  hotelMakkah: '',
  hotelMadinah: '',
  airline: 'Garuda Indonesia',
  category: 'Reguler',
  isFeatured: false,
  featuresText: '',
  quota: 40,
};

/**
 * Admin panel: list umroh packages + create form including the premium
 * landing-page fields (category, features, isFeatured).
 */
export default function PackagesPanel() {
  const [packages, setPackages] = useState([]);
  const [loadingPkgs, setLoadingPkgs] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_PACKAGE_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [closingId, setClosingId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const loadPackages = useCallback(async () => {
    setLoadingPkgs(true);
    try {
      const res = await api.get('/packages');
      setPackages(res.data?.data || []);
    } catch (err) {
      toast.error('Gagal memuat daftar paket');
    } finally {
      setLoadingPkgs(false);
    }
  }, []);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  const toForm = (p) => ({
    name: p.name || '',
    description: p.description || '',
    price: Number(p.price) || 0,
    departureDate: p.departureDate ? String(p.departureDate).slice(0, 10) : '',
    departureCity: p.departureCity || '',
    durationDays: p.durationDays || 9,
    hotelMakkah: p.hotelMakkah || '',
    hotelMadinah: p.hotelMadinah || '',
    airline: p.airline || '',
    category: p.category || 'Reguler',
    isFeatured: !!p.isFeatured,
    featuresText: (p.features || []).join('\n'),
    quota: p.quota ?? 40,
  });

  const resetForm = () => {
    setForm(EMPTY_PACKAGE_FORM);
    setEditingId(null);
    setErrors({});
  };

  const startEdit = (p) => {
    setForm(toForm(p));
    setEditingId(p.id);
    setErrors({});
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closePackage = async (p) => {
    if (closingId !== p.id) {
      setClosingId(p.id);
      return;
    }
    setBusyId(p.id);
    try {
      await api.delete(`/packages/${p.id}`);
      toast.success('Paket ditutup (CLOSED)');
      setClosingId(null);
      loadPackages();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menutup paket');
    } finally {
      setBusyId(null);
    }
  };

  const setField = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const parseFeatures = () =>
    form.featuresText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

  const validateForm = () => {
    const errs = {};
    if (!form.name || form.name.trim().length < 3) errs.name = 'Nama paket minimal 3 karakter';
    if (!form.price || Number(form.price) < 1000000) errs.price = 'Harga minimal Rp 1.000.000';
    if (!form.departureDate) errs.departureDate = 'Tanggal berangkat wajib diisi';
    if (!form.departureCity?.trim()) errs.departureCity = 'Kota berangkat wajib diisi';
    if (!form.durationDays || Number(form.durationDays) < 1) errs.durationDays = 'Durasi minimal 1 hari';
    if (!form.quota || Number(form.quota) < 1) errs.quota = 'Kuota minimal 1';
    const feats = parseFeatures();
    if (feats.length > 0 && feats.some((s) => s.length > 200)) errs.featuresText = 'Maksimal 200 karakter per baris';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submitPackage = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        price: Number(form.price),
        departureDate: new Date(form.departureDate).toISOString(),
        departureCity: form.departureCity.trim(),
        durationDays: Number(form.durationDays),
        hotelMakkah: form.hotelMakkah.trim() || undefined,
        hotelMadinah: form.hotelMadinah.trim() || undefined,
        airline: form.airline.trim() || undefined,
        category: form.category,
        isFeatured: form.isFeatured,
        features: parseFeatures(),
        quota: Number(form.quota),
    };
    try {
      if (editingId) {
        await api.put(`/packages/${editingId}`, payload);
        toast.success('Paket berhasil diperbarui');
      } else {
        await api.post('/packages', payload);
        toast.success('Paket berhasil dibuat');
      }
      resetForm();
      setShowForm(false);
      loadPackages();
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (Array.isArray(apiErrors) && apiErrors.length > 0) {
        apiErrors.forEach((er) => toast.error(er.message || 'Validasi gagal'));
        const fieldMap = {};
        apiErrors.forEach((er) => {
          if (er.field) fieldMap[er.field] = er.message;
        });
        setErrors((prev) => ({ ...prev, ...fieldMap }));
      } else {
        toast.error(err.response?.data?.message || 'Gagal membuat paket');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = (k) =>
    `w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 ${
      errors[k] ? 'border-terra focus:ring-terra/20' : 'border-emerald-900/15 focus:ring-gold-300/40 focus:border-gold-500'
    }`;

  const labelCls = 'mb-1.5 block text-xs font-bold uppercase tracking-wider text-sage';

  return (
    <div className="space-y-6">
      {/* header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl text-ink">Kelola Paket Umroh</h2>
          <p className="mt-0.5 text-xs text-sage">{packages.length} paket terdaftar</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (showForm && editingId) {
              resetForm();
              setShowForm(false);
            } else {
              setShowForm((v) => !v);
            }
          }}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition ${
            showForm ? 'bg-emerald-900/5 text-sage hover:bg-emerald-900/10' : 'bg-midnight text-white hover:bg-forest'
          }`}
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Tutup Form' : 'Tambah Paket'}
        </button>
      </div>

      {/* create form */}
      {showForm && (
        <form onSubmit={submitPackage} noValidate className="rounded-3xl border border-emerald-900/10 bg-white p-6 shadow-card md:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold-600">
            {editingId ? 'Edit Paket' : 'Paket Baru'}
          </p>
          <h3 className="mt-1 font-serif text-2xl text-ink">
            {editingId ? 'Perbarui Paket Umroh' : 'Buat Paket Umroh'}
          </h3>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className={labelCls} htmlFor="pkg-name">Nama Paket *</label>
              <input
                id="pkg-name"
                type="text"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="Paket Umroh Reguler 2027"
                className={inputCls('name')}
              />
              {errors.name && <p className="mt-1 text-xs text-terra">{errors.name}</p>}
            </div>

            <div>
              <label className={labelCls} htmlFor="pkg-price">Harga (Rp) *</label>
              <input
                id="pkg-price"
                type="number"
                min="1000000"
                step="500000"
                value={form.price}
                onChange={(e) => setField('price', e.target.value)}
                className={inputCls('price')}
              />
              <p className="mt-1 text-xs text-sage">{formatCurrency(Number(form.price) || 0)}</p>
              {errors.price && <p className="mt-1 text-xs text-terra">{errors.price}</p>}
            </div>

            <div>
              <label className={labelCls} htmlFor="pkg-quota">Kuota *</label>
              <input
                id="pkg-quota"
                type="number"
                min="1"
                value={form.quota}
                onChange={(e) => setField('quota', e.target.value)}
                className={inputCls('quota')}
              />
              {errors.quota && <p className="mt-1 text-xs text-terra">{errors.quota}</p>}
            </div>

            <div>
              <label className={labelCls} htmlFor="pkg-date">Tanggal Berangkat *</label>
              <input
                id="pkg-date"
                type="date"
                value={form.departureDate}
                onChange={(e) => setField('departureDate', e.target.value)}
                className={inputCls('departureDate')}
              />
              {errors.departureDate && <p className="mt-1 text-xs text-terra">{errors.departureDate}</p>}
            </div>

            <div>
              <label className={labelCls} htmlFor="pkg-city">Kota Berangkat *</label>
              <input
                id="pkg-city"
                type="text"
                value={form.departureCity}
                onChange={(e) => setField('departureCity', e.target.value)}
                placeholder="Jakarta"
                className={inputCls('departureCity')}
              />
              {errors.departureCity && <p className="mt-1 text-xs text-terra">{errors.departureCity}</p>}
            </div>

            <div>
              <label className={labelCls} htmlFor="pkg-duration">Durasi (hari) *</label>
              <input
                id="pkg-duration"
                type="number"
                min="1"
                value={form.durationDays}
                onChange={(e) => setField('durationDays', e.target.value)}
                className={inputCls('durationDays')}
              />
              {errors.durationDays && <p className="mt-1 text-xs text-terra">{errors.durationDays}</p>}
            </div>

            <div>
              <label className={labelCls} htmlFor="pkg-airline">Maskapai</label>
              <input
                id="pkg-airline"
                type="text"
                value={form.airline}
                onChange={(e) => setField('airline', e.target.value)}
                placeholder="Garuda Indonesia"
                className={inputCls('airline')}
              />
            </div>

            <div>
              <label className={labelCls} htmlFor="pkg-hotel-makkah">Hotel Makkah</label>
              <input
                id="pkg-hotel-makkah"
                type="text"
                value={form.hotelMakkah}
                onChange={(e) => setField('hotelMakkah', e.target.value)}
                placeholder="Pullman Zamzam (Bintang 4)"
                className={inputCls('hotelMakkah')}
              />
            </div>

            <div>
              <label className={labelCls} htmlFor="pkg-hotel-madinah">Hotel Madinah</label>
              <input
                id="pkg-hotel-madinah"
                type="text"
                value={form.hotelMadinah}
                onChange={(e) => setField('hotelMadinah', e.target.value)}
                placeholder="Millennium Al Aqeeq (Bintang 4)"
                className={inputCls('hotelMadinah')}
              />
            </div>

            <div>
              <label className={labelCls} htmlFor="pkg-category">Kategori</label>
              <select
                id="pkg-category"
                value={form.category}
                onChange={(e) => setField('category', e.target.value)}
                className={inputCls('category')}
              >
                <option>Reguler</option>
                <option>Premium</option>
                <option>VIP</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className={labelCls} htmlFor="pkg-description">Deskripsi</label>
              <textarea
                id="pkg-description"
                rows={2}
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                placeholder="Deskripsi singkat paket untuk halaman landing"
                className={`${inputCls('description')} resize-none`}
              />
            </div>

            <div className="md:col-span-2">
              <label className={labelCls} htmlFor="pkg-features">Fasilitas (satu per baris)</label>
              <textarea
                id="pkg-features"
                rows={5}
                value={form.featuresText}
                onChange={(e) => setField('featuresText', e.target.value)}
                placeholder={'Hotel bintang 4, 150 m dari Masjidil Haram\nVisa umroh + tiket pesawat PP\nMakan 3x sehari'}
                className={`${inputCls('featuresText')} resize-none`}
              />
              {errors.featuresText && <p className="mt-1 text-xs text-terra">{errors.featuresText}</p>}
              <p className="mt-1 text-xs text-sage">Ditampilkan sebagai daftar centang emas di kartu paket.</p>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-emerald-900/10 bg-cream px-4 py-3.5 md:col-span-2">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) => setField('isFeatured', e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded accent-gold-600"
              />
              <span className="text-sm text-ink/80">
                Tandai sebagai <b>Paling Populer</b>
                <span className="block text-xs text-sage">
                  {editingId
                    ? 'Catatan: hanya satu kartu yang tampil sebagai populer di landing.'
                    : 'Kartu akan tampil gelap dengan aksen emas di halaman landing.'}
                </span>
              </span>
            </label>
          </div>

          <div className="mt-7 flex items-center justify-end gap-3 border-t border-emerald-900/8 pt-5">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
              className="rounded-full px-5 py-2.5 text-sm font-semibold text-sage transition hover:bg-emerald-900/5"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold-400 to-gold-600 px-6 py-2.5 text-sm font-bold text-night shadow-glow-gold transition disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plane className="h-4 w-4" />}
              {submitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Paket'}
            </button>
          </div>
        </form>
      )}

      {/* package list */}
      {loadingPkgs ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-forest" />
        </div>
      ) : packages.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-emerald-900/10 p-14 text-center">
          <p className="font-serif text-xl text-ink">Belum ada paket</p>
          <p className="mt-1 text-sm text-sage">Klik &quot;Tambah Paket&quot; untuk membuat paket pertama.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {packages.map((p) => (
            <div key={p.id} className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex rounded-full bg-forest/8 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-forest">
                    {p.category || 'Reguler'}
                  </span>
                  <h4 className="mt-2 font-serif text-lg leading-snug text-ink">{p.name}</h4>
                  <p className="mt-1 font-grotesk text-sm font-bold text-forest">{formatCurrency(Number(p.price))}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    p.status === 'OPEN'
                      ? 'bg-emerald-100 text-emerald-700'
                      : p.status === 'FULL'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {p.status}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-sage">
                <span>Berangkat {formatDate(p.departureDate)}</span>
                <span>{p.durationDays} hari</span>
                <span>{p.departureCity}</span>
                <span>Kuota {p.quotaRemaining}/{p.quota}</span>
              </div>
              {p.isFeatured && (
                <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-gold-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-700">
                  Paling Populer
                </p>
              )}
              <p className="mt-2 text-xs text-sage">{(p.features || []).length} fasilitas terdaftar</p>

              <div className="mt-4 flex items-center gap-2 border-t border-emerald-900/8 pt-4">
                <button
                  type="button"
                  onClick={() => startEdit(p)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-forest/8 px-3 py-2 text-xs font-bold text-forest transition hover:bg-forest/15"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                {p.status !== 'CLOSED' && (
                  <button
                    type="button"
                    onClick={() => closePackage(p)}
                    disabled={busyId === p.id}
                    className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition disabled:opacity-60 ${
                      closingId === p.id
                        ? 'bg-terra text-white hover:bg-terra/90'
                        : 'bg-emerald-900/5 text-sage hover:bg-terra/10 hover:text-terra'
                    }`}
                  >
                    {busyId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
                    {closingId === p.id ? 'Yakin? Klik lagi' : 'Tutup'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
