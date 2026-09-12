import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Check, FileText, Loader2, X, XCircle } from 'lucide-react';
import api from '../../services/api';
import { formatDate, timeAgo } from '../../utils/formatDate';

const DOC_TYPES = { KTP: 'KTP', PASSPORT: 'Paspor', PHOTO: 'Pas Foto', OTHER: 'Lainnya' };

const STATUS_STYLE = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  VERIFIED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
};

const STATUS_LABEL = { PENDING: 'Menunggu', VERIFIED: 'Terverifikasi', REJECTED: 'Ditolak' };

export default function DocumentsVerifyPanel() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');
  const [rejectFor, setRejectFor] = useState(null);
  const [reason, setReason] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/documents', {
        params: filter ? { status: filter } : {},
      });
      setDocuments(res.data?.data || []);
    } catch {
      toast.error('Gagal memuat dokumen');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const verify = async (id, action, rejectionReason) => {
    setBusyId(id);
    try {
      await api.put(`/documents/${id}/verify`, {
        action,
        ...(action === 'reject' && { rejectionReason }),
      });
      toast.success(action === 'approve' ? 'Dokumen diverifikasi ✅' : 'Dokumen ditolak');
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal verifikasi dokumen');
    } finally {
      setBusyId(null);
    }
  };

  const confirmReject = async () => {
    if (!reason.trim()) {
      toast.error('Alasan penolakan wajib diisi');
      return;
    }
    await verify(rejectFor, 'reject', reason.trim());
    setRejectFor(null);
    setReason('');
  };

  return (
    <div className="space-y-4">
      {/* Filter status */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'PENDING', label: 'Menunggu' },
          { key: 'VERIFIED', label: 'Terverifikasi' },
          { key: 'REJECTED', label: 'Ditolak' },
          { key: '', label: 'Semua' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
              filter === f.key
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-700" />
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-14 text-center">
          <p className="text-5xl mb-4">📄</p>
          <p className="text-lg font-semibold text-slate-700">Tidak ada dokumen pada filter ini</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {documents.map((d) => (
            <div key={d.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${STATUS_STYLE[d.status]}`}>
                  <FileText className="w-3.5 h-3.5" /> {STATUS_LABEL[d.status] || d.status}
                </span>
                <span className="text-xs text-slate-400">{timeAgo(d.createdAt)}</span>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-400">Jamaah</p>
                    <p className="font-semibold text-slate-800">{d.user?.name || '-'}</p>
                    <p className="text-xs text-slate-400">{d.user?.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Tipe Dokumen</p>
                    <p className="font-semibold text-slate-800">{DOC_TYPES[d.type] || d.type}</p>
                    <p className="text-xs text-slate-400">{formatDate(d.createdAt)}</p>
                  </div>
                </div>

                {d.status === 'REJECTED' && d.rejectionReason && (
                  <p className="mt-3 text-xs text-rose-600 bg-rose-50 rounded-lg px-3 py-2">
                    Alasan penolakan: {d.rejectionReason}
                  </p>
                )}

                <a
                  href={d.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  <FileText className="w-4 h-4" /> Lihat dokumen ({d.fileName})
                </a>

                {d.status === 'PENDING' && (
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => verify(d.id, 'approve')}
                      disabled={busyId === d.id}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 text-white text-sm font-bold hover:bg-emerald-800 transition disabled:opacity-60"
                    >
                      {busyId === d.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Verifikasi
                    </button>
                    <button
                      onClick={() => { setRejectFor(d.id); setReason(''); }}
                      disabled={busyId === d.id}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-rose-200 text-rose-600 text-sm font-bold hover:bg-rose-50 transition disabled:opacity-60"
                    >
                      <X className="w-4 h-4" /> Tolak
                    </button>
                  </div>
                )}
              </div>

              {/* Modal alasan penolakan */}
              {rejectFor === d.id && (
                <div className="px-5 pb-5">
                  <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4">
                    <p className="inline-flex items-center gap-1.5 text-sm font-bold text-rose-700 mb-2">
                      <XCircle className="w-4 h-4" /> Alasan Penolakan
                    </p>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={2}
                      maxLength={200}
                      placeholder="Contoh: Foto KTP tidak jelas / blur"
                      className="w-full px-3 py-2 rounded-lg border border-rose-200 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 resize-none"
                    />
                    <div className="mt-2 flex justify-end gap-2">
                      <button
                        onClick={() => setRejectFor(null)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100"
                      >
                        Batal
                      </button>
                      <button
                        onClick={confirmReject}
                        disabled={busyId === d.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60"
                      >
                        Tolak Dokumen
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
