import { Clock, CheckCircle2, XCircle, Search, Upload, X, ChevronLeft, ChevronRight, Loader2, CalendarDays } from 'lucide-react';
import { formatCurrency, formatCurrencyShort } from '../../utils/formatCurrency';
import { formatDate, timeAgo } from '../../utils/formatDate';
import { DEPOSIT_STATUS } from '../../utils/constants';
import { openProtectedFile } from '../../utils/openProtectedFile';

const STATUS_BADGE = {
  PENDING: 'bg-gold-100 text-gold-700',
  APPROVED: 'bg-forest/10 text-forest',
  REJECTED: 'bg-terra/10 text-terra',
};

const dateInputClass =
  'rounded-xl border border-emerald-900/10 bg-white px-3 py-2 text-xs text-ink outline-none transition focus:border-gold-500 focus:ring-2 focus:ring-gold-300/30';

/**
 * Deposit history table — server-driven.
 * All filtering (search, date range) and pagination happen on the API via
 * query params; this component is fully controlled by the parent.
 */
export default function DepositHistoryTable({ items, summary, pagination, loading, filters, onFiltersChange, onUploadProof }) {
  const { q = '', from = '', to = '', page = 1 } = filters;
  const hasActiveFilters = q.trim() !== '' || from !== '' || to !== '';
  const totalPages = pagination?.totalPages || 1;

  const update = (patch) => onFiltersChange((f) => ({ ...f, ...patch }));

  return (
    <div>
      {/* filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-sage" />
          <input
            type="search"
            value={q}
            onChange={(e) => update({ q: e.target.value, page: 1 })}
            placeholder="Cari paket, bank, atau kode unik..."
            className="w-full rounded-full border border-emerald-900/10 bg-white py-2.5 pl-11 pr-4 text-sm text-ink outline-none transition placeholder:text-sage/60 focus:border-gold-500 focus:ring-2 focus:ring-gold-300/30"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-900/5 text-sage" aria-hidden="true">
            <CalendarDays className="h-4 w-4" />
          </span>
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => update({ from: e.target.value, page: 1 })}
            aria-label="Tanggal mulai"
            className={dateInputClass}
          />
          <span className="text-xs text-sage">s/d</span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => update({ to: e.target.value, page: 1 })}
            aria-label="Tanggal akhir"
            className={dateInputClass}
          />
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => update({ q: '', from: '', to: '', page: 1 })}
            className="inline-flex items-center gap-1.5 rounded-full bg-terra/10 px-3.5 py-2 text-xs font-bold text-terra transition hover:bg-terra/20"
          >
            <X className="h-3.5 w-3.5" /> Hapus Filter
          </button>
        )}
      </div>

      {/* result meta */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-sage">
          {pagination ? `${pagination.totalItems} transaksi ditemukan` : 'Memuat...'}
        </p>
        {summary && summary.count > 0 && (
          <p className="text-xs font-semibold text-forest">
            Total (difilter): {formatCurrency(summary.totalAmount)} · {summary.count} transaksi
          </p>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-3 rounded-3xl border border-emerald-900/5 bg-white py-16 text-sm text-sage shadow-card">
          <Loader2 className="h-5 w-5 animate-spin text-forest" /> Memuat histori setoran...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-[2rem] border-2 border-dashed border-emerald-900/12 bg-sand/30 p-12 text-center">
          <p className="font-serif text-xl text-ink">
            {hasActiveFilters ? 'Tidak ada transaksi cocok' : 'Belum ada transaksi'}
          </p>
          <p className="mt-1 text-sm text-sage">
            {hasActiveFilters
              ? 'Coba ubah kata kunci atau rentang tanggal.'
              : 'Setoran pertama Anda akan muncul di sini.'}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => update({ q: '', from: '', to: '', page: 1 })}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-midnight px-5 py-2.5 text-xs font-bold text-white transition hover:bg-forest"
            >
              <X className="h-3.5 w-3.5" /> Hapus Semua Filter
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-emerald-900/5 bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-sand/40 text-left text-[10px] uppercase tracking-[0.2em] text-sage">
                  <th className="px-6 py-4 font-bold">Tanggal</th>
                  <th className="px-6 py-4 font-bold">Paket</th>
                  <th className="px-6 py-4 font-bold">Nominal</th>
                  <th className="px-6 py-4 font-bold">Kode</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold">Bukti</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/5">
                {items.map((d) => {
                  const st = DEPOSIT_STATUS[d.status] || DEPOSIT_STATUS.PENDING;
                  return (
                    <tr key={d.id} className="transition-colors hover:bg-cream">
                      <td className="whitespace-nowrap px-6 py-4 text-sage">
                        {formatDate(d.createdAt, true)}
                        <span className="block text-xs text-sage/70">{timeAgo(d.createdAt)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-ink">{d.savingsPlan?.package?.name || '-'}</p>
                        <p className="text-xs text-sage">via {d.bankAccount?.bankName || 'Bank'}</p>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 font-grotesk font-bold text-ink">
                        {formatCurrency(d.amount)}
                        {d.uniqueCode > 0 && (
                          <span className="block text-xs font-normal text-sage">+ kode {d.uniqueCode}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-grotesk text-sage">{d.uniqueCode}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_BADGE[d.status] || STATUS_BADGE.PENDING}`}
                        >
                          {d.status === 'PENDING' && <Clock className="h-3.5 w-3.5" />}
                          {d.status === 'APPROVED' && <CheckCircle2 className="h-3.5 w-3.5" />}
                          {d.status === 'REJECTED' && <XCircle className="h-3.5 w-3.5" />}
                          {st.label}
                        </span>
                        {d.rejectionReason && (
                          <span className="mt-1 block text-xs text-terra">{d.rejectionReason}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {d.proofImage ? (
                          <button
                            type="button"
                            onClick={() => openProtectedFile(`/deposits/${d.id}/proof`)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-forest hover:text-gold-600"
                          >
                            Lihat
                          </button>
                        ) : d.status === 'PENDING' ? (
                          <button
                            onClick={() => onUploadProof(d.savingsPlanId)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-gold-600 hover:text-gold-700"
                          >
                            <Upload className="h-3.5 w-3.5" /> Upload
                          </button>
                        ) : (
                          <span className="text-xs text-sage/50">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* server pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-emerald-900/5 px-6 py-4">
              <p className="text-xs text-sage">
                Halaman {pagination.currentPage} dari {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => update({ page: Math.max(1, page - 1) })}
                  disabled={page <= 1}
                  aria-label="Halaman sebelumnya"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-900/10 bg-white text-ink transition hover:border-gold-400 hover:text-gold-600 disabled:opacity-40 disabled:hover:border-emerald-900/10 disabled:hover:text-ink"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => update({ page: Math.min(totalPages, page + 1) })}
                  disabled={page >= totalPages}
                  aria-label="Halaman berikutnya"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-900/10 bg-white text-ink transition hover:border-gold-400 hover:text-gold-600 disabled:opacity-40 disabled:hover:border-emerald-900/10 disabled:hover:text-ink"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
