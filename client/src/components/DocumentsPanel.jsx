import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FileCheck2, FileUp, Loader2, Upload } from 'lucide-react';
import api from '../services/api';
import { formatDate } from '../utils/formatDate';

const DOC_TYPES = [
  { value: 'KTP', label: 'KTP' },
  { value: 'PASSPORT', label: 'Paspor' },
  { value: 'PHOTO', label: 'Pas Foto' },
  { value: 'OTHER', label: 'Lainnya' },
];

const STATUS_STYLE = {
  PENDING: 'bg-amber-100 text-amber-700',
  VERIFIED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-rose-100 text-rose-700',
};

const STATUS_LABEL = {
  PENDING: 'Menunggu Verifikasi',
  VERIFIED: 'Terverifikasi',
  REJECTED: 'Ditolak',
};

export default function DocumentsPanel() {
  const [documents, setDocuments] = useState([]);
  const [type, setType] = useState('KTP');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/documents/my');
      setDocuments(res.data?.data || []);
    } catch {
      toast.error('Gagal memuat dokumen');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Pilih file dokumen terlebih dahulu');
      return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.append('document', file);
    fd.append('type', type);
    try {
      await api.post('/documents', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Dokumen terkirim, menunggu verifikasi admin');
      setFile(null);
      e.target.reset?.();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal upload dokumen');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Form upload */}
      <form onSubmit={submit} className="bg-white rounded-2xl border border-emerald-900/5 shadow-card p-5 space-y-4 h-fit">
        <p className="inline-flex items-center gap-2 font-bold text-ink">
          <FileUp className="w-4 h-4 text-forest" /> Upload Dokumen
        </p>
        <div>
          <label htmlFor="doc-type" className="block text-xs font-semibold text-sage uppercase tracking-wide mb-1.5">
            Tipe Dokumen
          </label>
          <select
            id="doc-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-900/10 bg-white text-sm outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-500/20"
          >
            {DOC_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="doc-file" className="block text-xs font-semibold text-sage uppercase tracking-wide mb-1.5">
            File (JPG/PNG/PDF, maks 2MB)
          </label>
          <input
            id="doc-file"
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-sm text-ink file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-forest file:font-semibold file:cursor-pointer"
          />
        </div>
        <button
          type="submit"
          disabled={uploading}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-forest text-white text-sm font-bold hover:bg-midnight transition disabled:opacity-60"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? 'Mengirim...' : 'Kirim Dokumen'}
        </button>
        <p className="text-[11px] text-sage leading-snug">
          Mengunggah dokumen dengan tipe sama akan menggantikan dokumen lama.
        </p>
      </form>

      {/* Daftar dokumen */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-emerald-900/5 shadow-card overflow-hidden h-fit">
        <p className="inline-flex items-center gap-2 font-bold text-ink px-5 pt-5">
          <FileCheck2 className="w-4 h-4 text-forest" /> Dokumen Saya
        </p>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-forest" />
          </div>
        ) : documents.length === 0 ? (
          <p className="py-10 text-center text-sm text-sage">Belum ada dokumen terupload</p>
        ) : (
          <ul className="divide-y divide-emerald-900/5 mt-3">
            {documents.map((d) => (
              <li key={d.id} className="px-5 py-3.5 flex items-start gap-3 text-sm">
                <span className="text-lg leading-none mt-0.5">📄</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink">
                    {DOC_TYPES.find((t) => t.value === d.type)?.label || d.type}
                  </p>
                  <a
                    href={d.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-forest underline underline-offset-2 truncate block max-w-xs"
                  >
                    {d.fileName}
                  </a>
                  <p className="text-[11px] text-sage mt-0.5">Diupload {formatDate(d.createdAt)}</p>
                  {d.status === 'REJECTED' && d.rejectionReason && (
                    <p className="text-xs text-rose-600 mt-1">Alasan: {d.rejectionReason}</p>
                  )}
                </div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${STATUS_STYLE[d.status]}`}>
                  {STATUS_LABEL[d.status] || d.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
