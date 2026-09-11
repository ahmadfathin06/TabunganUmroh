import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Loader2, Upload, X } from 'lucide-react';
import api from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';

export default function UploadProofModal({ planId, onClose, onSuccess }) {
  const [pendingDeposits, setPendingDeposits] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/deposits/my?status=PENDING');
        const all = res.data?.data || [];
        const filtered = planId ? all.filter((d) => d.savingsPlanId === planId) : all;
        setPendingDeposits(filtered);
        setSelectedId(filtered[0]?.id || '');
      } catch (err) {
        toast.error('Gagal memuat setoran pending');
      } finally {
        setLoading(false);
      }
    })();
  }, [planId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!selectedId || !file) {
      toast.error('Pilih setoran dan file bukti');
      return;
    }
    setSubmitting(true);
    const fd = new FormData();
    fd.append('proof', file);
    try {
      await api.post(`/deposits/${selectedId}/upload-proof`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Bukti transfer terkirim! Menunggu verifikasi admin.');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal upload bukti');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Upload Bukti Transfer</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition" aria-label="Tutup">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-700" />
            </div>
          ) : pendingDeposits.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-4xl mb-3">🖼️</p>
              <p className="font-semibold text-slate-600">Tidak ada setoran pending</p>
              <p className="mt-1 text-sm text-slate-400">
                Buat setoran terlebih dahulu untuk mengupload bukti transfer.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="upId">
                  Setoran Menunggu
                </label>
                <select
                  id="upId"
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                >
                  {pendingDeposits.map((d) => (
                    <option key={d.id} value={d.id}>
                      {formatCurrency(d.amount)} + kode {d.uniqueCode} - {d.savingsPlan?.package?.name || ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="upFile">
                  File Bukti Transfer
                </label>
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl px-4 py-8 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/40 transition">
                  <Upload className="w-8 h-8 text-slate-300" />
                  <span className="text-sm text-slate-500">
                    {file ? <b className="text-emerald-700">{file.name}</b> : 'Klik untuk pilih file'}
                  </span>
                  <span className="text-xs text-slate-400">JPG, PNG, atau PDF. Maks 2MB.</span>
                  <input
                    id="upFile"
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,application/pdf"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files[0] || null)}
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm transition disabled:opacity-60"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Kirim Bukti
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}