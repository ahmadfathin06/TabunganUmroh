import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';
import { Loader2, Sparkles, X } from 'lucide-react';
import api from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import { extractApiError, extractApiFieldErrors } from '../utils/apiError';
import { parseAmountInput } from '../utils/money';
import { createPlanSchema } from '../validations/savings';

export default function CreatePlanModal({ packages, onClose, onSuccess }) {
  // Paket hanya PATOKAN HARGA — tidak wajib, tidak memesan kuota, tidak mengikat.
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createPlanSchema),
    defaultValues: {
      packageId: '',
      targetAmount: '',
      jamaahName: '',
      jamaahRelation: 'self',
      monthlyTarget: '',
    },
  });

  const packageId = watch('packageId');
  const targetAmountInput = watch('targetAmount');
  const monthlyTargetInput = watch('monthlyTarget');

  const selected = packages.find((p) => p.id === packageId);
  const targetAmount = parseAmountInput(targetAmountInput);
  const monthlyTarget = parseAmountInput(monthlyTargetInput);
  const estimateMonths =
    !Number.isNaN(targetAmount) &&
    !Number.isNaN(monthlyTarget) &&
    targetAmount > 0 &&
    monthlyTarget > 0
      ? Math.max(1, Math.ceil(targetAmount / monthlyTarget))
      : null;

  // Modal ini unmount kapan pun (dashboard bisa di-navigasi), jadi lepaskan
  // scroll lock body supaya halaman di belakang tidak terkunci.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const pickPackage = (id) => {
    setValue('packageId', id, { shouldValidate: true });
    const pkg = packages.find((p) => p.id === id);
    // Patokan harga → isi otomatis target (bisa diubah user).
    if (pkg) setValue('targetAmount', String(pkg.price), { shouldValidate: true });
  };

  const onSubmit = async (data) => {
    try {
      await api.post('/savings', {
        packageId: data.packageId || undefined,
        // null = "belum tahu target" (bukan "belum dikirim"); server memakai
        // null → rencana tanpa target, undefined → fallback ke harga paket.
        targetAmount: data.targetAmount === undefined ? null : data.targetAmount,
        jamaahName: data.jamaahName || undefined,
        jamaahRelation: data.jamaahRelation,
        monthlyTarget: data.monthlyTarget === undefined ? undefined : data.monthlyTarget,
      });
      toast.success('Rencana tabungan dibuat! 🎉');
      onSuccess();
    } catch (err) {
      // Error validasi server (422) → tampilkan inline di field yang salah,
      // bukan toast generik yang tidak informatif.
      const fieldErrors = extractApiFieldErrors(err);
      Object.entries(fieldErrors).forEach(([field, message]) => {
        setError(field, { type: 'server', message });
      });
      toast.error(extractApiError(err, 'Gagal membuat rencana'));
    }
  };

  const inputClass = (hasError) =>
    `w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 transition ${
      hasError
        ? 'border-terra/60 focus:border-terra focus:ring-terra/15'
        : 'border-slate-200 focus:border-emerald-400 focus:ring-emerald-100'
    }`;

  const fieldError = (message) => (message ? <p className="mt-1 text-xs text-terra">{message}</p> : null);

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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {packages.length > 0 ? (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="createPkg">
                  Patokan Harga Paket (opsional)
                </label>
                <select
                  id="createPkg"
                  value={packageId}
                  onChange={(e) => pickPackage(e.target.value)}
                  className={inputClass(errors.packageId)}
                >
                  <option value="">Belum tahu — pilih nanti</option>
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {formatCurrency(p.price)}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-400">
                  Paket hanya jadi patokan harga — tidak mengikat dan tidak memesan kuota.
                </p>
                {fieldError(errors.packageId?.message)}
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Belum ada paket tersedia — tidak masalah, Anda tetap bisa menabung dengan target bebas.
              </p>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="depTarget">
                Target Tabungan (Rp, opsional)
              </label>
              <input
                id="depTarget"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="35000000"
                {...register('targetAmount')}
                className={inputClass(errors.targetAmount)}
              />
              {errors.targetAmount ? (
                fieldError(errors.targetAmount.message)
              ) : (
                <p className="mt-1 text-xs text-slate-400">
                  Boleh dikosongkan bila belum tahu targetnya. Terisi otomatis saat memilih patokan paket.
                </p>
              )}
              {!errors.targetAmount && !Number.isNaN(targetAmount) && targetAmount > 0 && (
                <p className="mt-1 text-xs text-emerald-600">Target terdaftar: {formatCurrency(targetAmount)}</p>
              )}
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
                  maxLength={100}
                  placeholder="Kosongkan = sesuai profil"
                  {...register('jamaahName')}
                  className={inputClass(errors.jamaahName)}
                />
                {fieldError(errors.jamaahName?.message)}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="depRelation">
                  Untuk
                </label>
                <select
                  id="depRelation"
                  {...register('jamaahRelation')}
                  className={inputClass(errors.jamaahRelation)}
                >
                  <option value="self">Diri sendiri</option>
                  <option value="suami">Suami</option>
                  <option value="istri">Istri</option>
                  <option value="ayah">Ayah</option>
                  <option value="ibu">Ibu</option>
                  <option value="anak">Anak</option>
                  <option value="other">Lainnya</option>
                </select>
                {fieldError(errors.jamaahRelation?.message)}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="depMonthly">
                Target Cicilan per Bulan (opsional)
              </label>
              <input
                id="depMonthly"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="500000"
                {...register('monthlyTarget')}
                className={inputClass(errors.monthlyTarget)}
              />
              {errors.monthlyTarget ? (
                fieldError(errors.monthlyTarget.message)
              ) : (
                estimateMonths && (
                  <p className="mt-1 text-xs text-emerald-600">
                    Estimasi lunas sekitar {Math.floor(estimateMonths / 12)} tahun {estimateMonths % 12} bulan ({(estimateMonths)} bulan).
                  </p>
                )
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm transition disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Buat Rencana
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
