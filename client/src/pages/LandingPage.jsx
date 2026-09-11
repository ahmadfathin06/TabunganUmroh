import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ShieldCheck,
  Landmark,
  CalendarCheck,
  Wallet,
  BadgeCheck,
  Check,
  Sparkles,
} from 'lucide-react';
import api from '../services/api';
import { formatCurrency, formatCurrencyShort } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import { PACKAGE_STATUS } from '../utils/constants';

const BENEFITS = [
  {
    icon: ShieldCheck,
    title: 'Terdaftar & Terpercaya',
    desc: 'Bekerja sama dengan travel umroh berizin resmi Kemenag RI.',
  },
  {
    icon: Wallet,
    title: 'Cicilan Ringan',
    desc: 'Tabung mulai dari Rp100rb/bulan. Tanpa bunga, tanpa riba.',
  },
  {
    icon: CalendarCheck,
    title: 'Keberangkatan Pasti',
    desc: 'Jadwal jelas dan estimasi keberangkatan bisa dipantau real-time.',
  },
  {
    icon: Landmark,
    title: 'Transfer Bank Aman',
    desc: 'Setiap setoran dilindungi kode unik & diverifikasi admin.',
  },
];

const STEPS = [
  { step: '01', title: 'Daftar Akun', desc: 'Isi data diri singkat, selesai dalam 2 menit.' },
  { step: '02', title: 'Pilih Paket', desc: 'Pilih paket umroh sesuai budget & kebutuhan.' },
  { step: '03', title: 'Tabung Rutin', desc: 'Setor melalui transfer bank dengan kode unik.' },
  { step: '04', title: 'Berangkat', desc: 'Saldo lunas, visa & tiket kami urus sampai berangkat.' },
];

const FAQS = [
  {
    q: 'Berapa minimal setoran tabungan umroh?',
    a: 'Minimal setoran Rp 100.000 per transaksi. Anda bebas menentukan nominal dan frekuensi, misal mingguan atau bulanan.',
  },
  {
    q: 'Apakah ada biaya administrasi / bunga?',
    a: 'Tidak ada. Dana jamaah dikelola secara transparan tanpa bunga (bebas riba), hanya harga paket yang diumumkan.',
  },
  {
    q: 'Bagaimana cara membayar setoran?',
    a: 'Anda akan mendapat rekening bank tujuan + kode unik 3 digit. Transfer sejumlah nominal + kode unik, lalu unggah bukti transfer.',
  },
  {
    q: 'Apakah tabungan bisa dicairkan sebelum lunas?',
    a: 'Bisa dengan prosedur pembatalan. Sebagian biaya pemrosesan mungkin dikenakan sesuai ketentuan.',
  },
  {
    q: 'Bagaimana jika kuota paket sudah penuh?',
    a: 'Paket akan ditandai "Penuh". Anda bisa memilih paket lain atau masuk daftar tunggu.',
  },
];

export default function LandingPage() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Simulasi state
  const [simHarga, setSimHarga] = useState(35000000);
  const [simTabungan, setSimTabungan] = useState(1000000);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.get('/packages?status=OPEN');
        if (active) setPackages(res.data?.data || []);
      } catch (err) {
        console.error('Gagal memuat paket:', err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const totalHarga = simHarga || 0;
  const perBulan = simTabungan || 0;
  const estBulan = perBulan > 0 ? Math.max(1, Math.ceil(totalHarga / perBulan)) : 0;
  const estTahun = Math.floor(estBulan / 12);
  const estSisaBulan = estBulan % 12;

  const paketList = packages.length > 0 ? packages.slice(0, 6) : [];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-emerald-50 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Menabung untuk ibadah suci, kini lebih mudah
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight max-w-3xl mx-auto">
            Wujudkan Niat Umroh dengan{' '}
            <span className="text-amber-400">Tabungan Terencana</span>
          </h1>
          <p className="mt-5 max-w-xl mx-auto text-emerald-100/90 text-lg">
            Tabung sedikit demi sedikit tanpa terbebani. Cicilan ringan, transparan,
            dan gratis biaya administrasi.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold shadow-lg shadow-amber-500/30 transition"
            >
              Mulai Menabung Sekarang <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#paket"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold border border-white/20 transition"
            >
              Lihat Pilihan Paket
            </a>
          </div>

          {/* Stat strip */}
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <div className="rounded-2xl bg-white/10 backdrop-blur p-4">
              <p className="text-2xl font-bold text-white">Rp100rb</p>
              <p className="text-emerald-100/80 text-sm">Mulai menabung</p>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur p-4">
              <p className="text-2xl font-bold text-white">0%</p>
              <p className="text-emerald-100/80 text-sm">Bunga / biaya admin</p>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur p-4">
              <p className="text-2xl font-bold text-white">24/7</p>
              <p className="text-emerald-100/80 text-sm">Pantau tabungan online</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ KEUNGGULAN ============ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {BENEFITS.map((b) => (
            <div key={b.title} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
                <b.icon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900">{b.title}</h3>
              <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ PAKET ============ */}
      <section id="paket" className="bg-white py-16 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-emerald-700 font-semibold text-sm uppercase tracking-wider">Pilihan Paket</p>
              <h2 className="mt-1 text-3xl font-bold text-slate-900">Paket Umroh Kami</h2>
            </div>
            {loading && <p className="text-sm text-slate-400">Memuat paket...</p>}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border border-slate-100 p-6 animate-pulse">
                  <div className="h-4 w-20 bg-slate-100 rounded mb-4" />
                  <div className="h-6 w-2/3 bg-slate-100 rounded mb-3" />
                  <div className="h-4 w-full bg-slate-100 rounded mb-2" />
                  <div className="h-10 w-full bg-slate-100 rounded mt-6" />
                </div>
              ))}
            </div>
          ) : paketList.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
              <p className="text-lg font-semibold text-slate-500">Belum ada paket tersedia</p>
              <p className="text-sm text-slate-400 mt-1">Silakan cek lagi nanti.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paketList.map((pkg) => {
                const price = Number(pkg.price || 0);
                const status = PACKAGE_STATUS[pkg.status] || PACKAGE_STATUS.OPEN;
                return (
                  <div key={pkg.id} className="group rounded-2xl border border-slate-100 bg-slate-50/50 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition">
                    <div className="relative h-40 bg-gradient-to-br from-emerald-700 to-teal-800 flex items-center justify-center">
                      <span className="text-5xl">🕋</span>
                      <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold ${status.badge}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-slate-900 text-lg">{pkg.name}</h3>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span>✈️ {pkg.airline || 'Maskapai terpercaya'}</span>
                        <span>📅 {formatDate(pkg.departureDate)}</span>
                        <span>📍 {pkg.departureCity}</span>
                      </div>
                      <div className="mt-3 text-2xl font-extrabold text-emerald-800">{formatCurrency(price)}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {pkg.durationDays} hari · sisa kuota {pkg.quotaRemaining ?? '-'}
                      </div>
                      <Link
                        to={pkg.status === 'OPEN' ? '/register' : '#'}
                        className={`mt-4 inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                          pkg.status === 'OPEN'
                            ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                            : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {pkg.status === 'OPEN' ? 'Daftar & Mulai Menabung' : pkg.status === 'FULL' ? 'Kuota Penuh' : 'Paket Ditutup'} <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ============ CARA KERJA ============ */}
      <section id="tentang" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-10">
          <p className="text-emerald-700 font-semibold text-sm uppercase tracking-wider">Cara Kerja</p>
          <h2 className="mt-1 text-3xl font-bold text-slate-900">4 Langkah Menuju Tanah Suci</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((s) => (
            <div key={s.step} className="relative bg-white rounded-2xl border border-slate-100 p-6">
              <span className="text-4xl font-extrabold text-emerald-100 absolute top-4 right-5">{s.step}</span>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center text-sm font-bold mb-3">
                {s.step}
              </div>
              <h3 className="font-bold text-slate-900">{s.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ SIMULASI ============ */}
      <section className="bg-gradient-to-br from-emerald-950 to-teal-900 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-amber-400 font-semibold text-sm uppercase tracking-wider">Kalkulator</p>
            <h2 className="mt-1 text-3xl font-bold text-white">Simulasi Cicilan Tabungan</h2>
            <p className="mt-2 text-emerald-100/80 max-w-lg mx-auto">
              Perkirakan berapa lama target umroh Anda tercapai.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white/95 backdrop-blur rounded-3xl p-8">
            <div className="space-y-6">
              <div>
                <label className="flex justify-between text-sm font-semibold text-slate-700 mb-2">
                  <span>Harga Paket Umroh</span>
                  <span className="text-emerald-700">{formatCurrency(simHarga)}</span>
                </label>
                <input
                  type="range"
                  min={10000000}
                  max={100000000}
                  step={5000000}
                  value={simHarga}
                  onChange={(e) => setSimHarga(Number(e.target.value))}
                  className="w-full accent-emerald-700"
                />
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Rp10jt</span>
                  <span>Rp100jt</span>
                </div>
              </div>

              <div>
                <label className="flex justify-between text-sm font-semibold text-slate-700 mb-2">
                  <span>Tabungan per Bulan</span>
                  <span className="text-emerald-700">{formatCurrency(simTabungan)}</span>
                </label>
                <input
                  type="range"
                  min={100000}
                  max={5000000}
                  step={100000}
                  value={simTabungan}
                  onChange={(e) => setSimTabungan(Number(e.target.value))}
                  className="w-full accent-emerald-700"
                />
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Rp100rb</span>
                  <span>Rp5jt</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {[250000, 500000, 1000000, 2000000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setSimTabungan(amt)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                      simTabungan === amt
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400'
                    }`}
                  >
                    {formatCurrencyShort(amt)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col justify-center bg-emerald-50/70 rounded-2xl p-6">
              <p className="text-sm text-slate-500">Estimasi waktu untuk melunasi</p>
              <p className="mt-1 text-4xl font-extrabold text-emerald-900">
                {estBulan > 0 ? (
                  <>
                    {estTahun > 0 && `${estTahun} tahun `}
                    {estSisaBulan > 0 && `${estSisaBulan} bulan`}
                    {estTahun === 0 && estSisaBulan === 0 && '1 bulan'}
                  </>
                ) : (
                  '-'
                )}
              </p>
              <div className="mt-4 h-2 rounded-full bg-white overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 rounded-full transition-all"
                  style={{ width: perBulan > 0 ? `${Math.min(100, (perBulan / 5000000) * 100)}%` : '0%' }}
                />
              </div>
              <p className="mt-3 text-sm text-slate-600">
                Dengan menabung <b>{formatCurrency(perBulan)}</b>/bulan, insya Allah {formatCurrencyShort(totalHarga)} dapat
                tercapai dalam <b>{estBulan} bulan</b>.
              </p>
              <Link
                to="/register"
                className="mt-5 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold transition"
              >
                Mulai Sekarang <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-10">
          <p className="text-emerald-700 font-semibold text-sm uppercase tracking-wider">FAQ</p>
          <h2 className="mt-1 text-3xl font-bold text-slate-900">Pertanyaan Umum</h2>
        </div>
        <div className="space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="group bg-white rounded-xl border border-slate-100 open:shadow-sm">
              <summary className="flex items-center justify-between cursor-pointer px-5 py-4 font-semibold text-slate-800 list-none">
                {f.q}
                <span className="text-emerald-600 group-open:rotate-45 transition-transform">
                  <BadgeCheck className="w-5 h-5" />
                </span>
              </summary>
              <p className="px-5 pb-4 text-sm text-slate-500 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ============ CTA AKHIR ============ */}
      <section className="bg-emerald-700 py-14">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white">Siap Memulai Perjalanan Suci?</h2>
          <p className="mt-2 text-emerald-100 max-w-xl mx-auto">
            Setiap rupiah yang Anda tabung adalah langkah menuju panggilan-Nya.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-emerald-900 font-bold hover:bg-emerald-50 transition"
            >
              Daftar Sekarang <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold hover:bg-emerald-600 transition">
              Sudah punya akun? Masuk
            </Link>
          </div>
        </div>
      </section>

      {/* Trust badges kecil */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm text-slate-400">
          <span className="inline-flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Travel berizin resmi</span>
          <span className="inline-flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Dana transparan</span>
          <span className="inline-flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Verifikasi bank</span>
          <span className="inline-flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Support 7 hari</span>
        </div>
      </section>
    </div>
  );
}