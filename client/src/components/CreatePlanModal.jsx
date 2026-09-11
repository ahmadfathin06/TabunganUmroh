import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Loader2, Sparkles, X } from 'lucide-react';
import api from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';

export default function CreatePlanModal({ packages, onClose, onSuccess }) {
  const [packageId, setPackageId] = useState(packages[0]?.id || '');
  const [jamaahName, setJamaahName] = useState('');
  const [jamaahRelation, setJamaahRelation] = useState('self');
  const [monthlyTarget, setMonthlyTarget] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selected = packages.find((p) => p.id === packageId);
  const estimateMonths =
    selected && monthlyTarget && Number(monthlyTarget) > 0
      ? Math.max(1, Math.ceil(Number(selected.price) / Number(monthlyTarget)))
      : null;

  const submit = async (e) => {
    e.preventDefault();
    if (!packageId) {
      toast.error('Pilih paket umroh terlebih dahulu');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/savings', {
        packageId,
        jamaahName: jamaahName || undefined,
        jamaahRelation,
        monthlyTarget: monthlyTarget ? Number(monthlyTarget) : undefined,
      });
      toast.success('Rencana tabungan dibuat! 🎉');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal membuat rencana');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <h3 className="font-bold text-slate-900">Buat Rencana Tabungan</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition" aria-label="Tutup">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {packages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500 font-semibold">Belum ada paket tersedia</p>
              <p className="text-sm text-slate-400 mt-1">Silakan cek kembali nanti.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="createPkg">
                  Pilih Paket Umroh
                </label>
                <select
                  id="createPkg"
                  value={packageId}
                  onChange={(e) => setPackageId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                >
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {formatCurrency(p.price)}
                    </option>
                  ))}
                </select>
              </div>

              {selected && (
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Harga paket</span>
                    <span className="font-bold text-emerald-700">{formatCurrency(selected.price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Keberangkatan</span>
                    <span className="font-semibold text-slate-700">{formatDate(selected.departureDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Durasi</span>
                    <span className="font-semibold text-slate-700">{selected.durationDays} hari</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="depNama">
                    Nama Jamaah
                  </label>
                  <input
                    id="depNama"
                    type="text"
                    placeholder="Kosongkan = sesuai profil"
                    value={jamaahName}
                    onChange={(e) => setJamaahName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="depRelation">
                    Untuk
                  </label>
                  <select
                    id="depRelation"
                    value={jamaahRelation}
                    onChange={(e) => setJamaahRelation(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  >
                    <option value="self">Diri sendiri</option>
                    <option value="suami">Suami</option>
                    <option value="istri">Istri</option>
                    <option value="ayah">Ayah</option>
                    <option value="ibu">Ibu</option>
                    <option value="anak">Anak</option>
                    <option value="other">Lainnya</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="depMonthly">
                  Target Cicilan per Bulan (opsional)
                </label>
                <input
                  id="depMonthly"
                  type="number"
                  min="50000"
                  step="50000"
                  placeholder="500000"
                  value={monthlyTarget}
                  onChange={(e) => setMonthlyTarget(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
                {estimateMonths && (
                  <p className="mt-1 text-xs text-emerald-600">
                    Estimasi lunas sekitar {Math.floor(estimateMonths / 12)} tahun {estimateMonths % 12} bulan ({(estimateMonths)} bulan).
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm transition disabled:opacity-60"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Buat Rencana
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}