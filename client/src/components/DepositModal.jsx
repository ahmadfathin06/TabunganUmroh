import { useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  ArrowRight,
  Building2,
  Copy,
  Landmark,
  Loader2,
  X,
} from 'lucide-react';
import api from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';
import { QUICK_AMOUNTS } from '../utils/constants';

export default function DepositModal({ plans, bankAccounts, presetPlanId, onClose, onSuccess }) {
  const [planId, setPlanId] = useState(presetPlanId || plans[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [bankId, setBankId] = useState(bankAccounts[0]?.id || '');
  const [submitting, setSubmitting] = useState(false);
  const [transferInfo, setTransferInfo] = useState(null);

  const selectedPlan = plans.find((p) => p.id === planId);
  const selectedBank = bankAccounts.find((b) => b.id === bankId);

  const submit = async (e) => {
    e.preventDefault();
    if (!planId || !bankId || !amount) {
      toast.error('Lengkapi data setoran terlebih dahulu');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/deposits', {
        savingsPlanId: planId,
        amount: Number(amount),
        bankAccountId: bankId,
      });
      setTransferInfo(res.data.data.transferInfo);
      toast.success('Setoran dibuat! Silakan transfer sesuai instruksi.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal membuat setoran');
    } finally {
      setSubmitting(false);
    }
  };

  const copy = (text) => {
    navigator.clipboard?.writeText(String(text));
    toast.success('Disalin ke clipboard');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <h3 className="font-bold text-slate-900">{transferInfo ? 'Instruksi Transfer' : 'Setor Tabungan'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition" aria-label="Tutup">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {transferInfo ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-sm">
                <p className="font-semibold text-emerald-800 mb-1">Transfer tepat sejumlah:</p>
                <p className="text-2xl font-extrabold text-emerald-800">{formatCurrency(transferInfo.totalTransfer)}</p>
                <p className="text-xs text-emerald-600 mt-1">
                  = {formatCurrency(transferInfo.amount)} + kode unik {transferInfo.uniqueCode}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100">
                  <Building2 className="w-5 h-5 text-emerald-700" />
                  <span className="font-semibold text-slate-800">{transferInfo.bank}</span>
                </div>
                <div className="px-4 py-3.5 space-y-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">No. Rekening</span>
                    <span className="flex items-center gap-2 font-bold text-slate-900">
                      {transferInfo.accountNumber}
                      <button onClick={() => copy(transferInfo.accountNumber)} className="text-slate-400 hover:text-emerald-600" aria-label="Salin">
                        <Copy className="w-4 h-4" />
                      </button>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Atas Nama</span>
                    <span className="font-semibold text-slate-800">{transferInfo.accountHolder}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Kode Unik</span>
                    <span className="inline-flex items-center gap-2 font-extrabold text-emerald-700">
                      {transferInfo.uniqueCode}
                      <button onClick={() => copy(transferInfo.uniqueCode)} className="text-slate-400 hover:text-emerald-600" aria-label="Salin">
                        <Copy className="w-4 h-4" />
                      </button>
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-amber-50 border border-amber-100 p-3.5 text-xs text-amber-700">
                Hanya kirim ke rekening atas nama <b>{transferInfo.accountHolder}</b> di atas. Jangan transfer ke rekening
                lain. Simpan bukti transfer untuk diverifikasi.
              </div>

              <button
                onClick={() => {
                  setTransferInfo(null);
                  setAmount('');
                  onSuccess?.();
                  onClose();
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm transition"
              >
                Selesai &amp; Upload Bukti <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="depPlan">
                  Rencana Tabungan
                </label>
                <select
                  id="depPlan"
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                >
                  {plans.filter((p) => p.status === 'ACTIVE').map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.package?.name || p.jamaahName} - sisa {formatCurrency(p.remaining)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedPlan && (
                <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm">
                  <span className="text-slate-500">Sisa target paket ini</span>
                  <span className="font-bold text-slate-900">{formatCurrency(selectedPlan.remaining)}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="depAmount">
                  Nominal Setoran (Rp)
                </label>
                <input
                  id="depAmount"
                  type="number"
                  min="10000"
                  step="10000"
                  placeholder="500000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  required
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {QUICK_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmount(String(amt))}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700 transition"
                    >
                      {amt >= 1000000 ? `${amt / 1000000}jt` : `${amt / 1000}rb`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="depBank">
                  Rekening Tujuan
                </label>
                {bankAccounts.length === 0 ? (
                  <p className="text-xs text-amber-600">Belum ada rekening tersedia. Hubungi admin.</p>
                ) : (
                  <select
                    id="depBank"
                    value={bankId}
                    onChange={(e) => setBankId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  >
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bankName} - a.n {b.accountHolder}
                      </option>
                    ))}
                  </select>
                )}
                {selectedBank && (
                  <p className="mt-1.5 text-xs text-slate-400">
                    No. rek: <b>{selectedBank.accountNumber}</b>
                  </p>
                )}
              </div>

              {amount && (
                <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm">
                  <span className="text-emerald-700">Ke rekening {selectedBank?.bankName}</span>
                  <span className="font-bold text-emerald-800">{formatCurrency(amount)}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm transition disabled:opacity-60"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Landmark className="w-4 h-4" />}
                Buat Instruksi Transfer
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}