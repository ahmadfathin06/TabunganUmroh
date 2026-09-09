export const PAKET = [
  { id: 'p1', kat: 'reguler', nama: 'Umroh Reguler 9 Hari', maskapai: 'Garuda Airlines', hotel: 'Makkah 3★ · Madinah 3★', durasi: 9, harga: 28500000, diskon: 31500000, emoji: '🕌', rekomendasi: 3, feats: ['Visa + handling', 'Hotel 3★ dekat masjid', 'Makan 3x sehari', 'Pendamping religi'] },
  { id: 'p2', kat: 'vip', nama: 'Umroh VIP 12 Hari', maskapai: 'Saudia Airlines', hotel: 'Makkah 5★ (300m)', durasi: 12, harga: 55000000, diskon: null, emoji: '👑', rekomendasi: 1, feats: ['Hotel bintang 5 dekat Haram', 'Bus VIP AC', 'Ziarah lengkap', 'Manasik eksklusif'] },
  { id: 'p3', kat: 'plus', nama: 'Umroh Plus Turkey 14 Hari', maskapai: 'Turkish Airlines', hotel: 'Makkah 4★ + Istanbul 4★', durasi: 14, harga: 42500000, diskon: 45000000, emoji: '✈️', rekomendasi: 2, feats: ['Umroh + city tour Istanbul', 'Hotel bintang 4', 'Makan + guide lokal', 'Blue Mosque & Topkapi'] },
  { id: 'p4', kat: 'ekonomi', nama: 'Umroh Ekonomi 11 Hari', maskapai: 'Sriwijaya Air', hotel: 'Makkah 2★ · Madinah 2★', durasi: 11, harga: 22500000, diskon: null, emoji: '🎒', rekomendasi: 5, feats: ['Harga paling hemat', 'Hotel nyaman', 'Makan 2x sehari', 'Grup 40 jamaah'] },
  { id: 'p5', kat: 'reguler', nama: 'Umroh Reguler Plus 10 Hari', maskapai: 'Citilink', hotel: 'Makkah 4★ · Madinah 4★', durasi: 10, harga: 32000000, diskon: 34000000, emoji: '🕋', rekomendasi: 4, feats: ['Hotel 4★', 'Visa + perlengkapan', 'Ziarah Madinah', 'Catering Indonesia'] },
  { id: 'p6', kat: 'vip', nama: 'Umroh Executive 9 Hari', maskapai: 'Emirates', hotel: 'Swissotel Makkah 5★', durasi: 9, harga: 68000000, diskon: null, emoji: '💎', rekomendasi: 6, feats: ['Hotel in-front Haram', 'Layanan butler', 'Transpor privat', 'Doa di Roudoh'] },
]

export const BERITA = [
  { tag: 'Tips', emoji: '🧳', judul: '10 Packing Wajib Saat Berangkat Umroh', desc: 'Dari ihram hingga obat pribadi — cek daftar ini sebelum terbang.', date: '2 hari lalu' },
  { tag: 'Berita', emoji: '📢', judul: 'Kemenag Umumkan Jadwal Penyelenggaraan Umroh 2027', desc: 'Kuota jamaah Indonesia naik 15% dibanding tahun lalu.', date: '4 hari lalu' },
  { tag: 'Tips', emoji: '💪', judul: 'Persiapan Fisik Sebelum Keberangkatan', desc: 'Latihan jalan rutin 30 menit/hari membantu tawaf lebih nyaman.', date: '1 minggu lalu' },
  { tag: 'Finansial', emoji: '💰', judul: 'Strategi Menabung Umroh Rp35 Juta dalam 18 Bulan', desc: 'Simulasi setor rutin otomatis + hasil kelola simpanan.', date: '1 minggu lalu' },
  { tag: 'Berita', emoji: '🛂', judul: 'Proses Visa Umroh Kini Lebih Cepat Lewat Nusuk', desc: 'Rata-rata penerbitan visa turun menjadi 5 hari kerja.', date: '2 minggu lalu' },
  { tag: 'Tips', emoji: '🤲', judul: 'Panduan Ibadah: Amalan Saat di Tanah Suci', desc: 'Dzikir, doa, dan urutan rangkaian ibadah umroh.', date: '3 minggu lalu' },
]

export const KATEGORI_PAKET = [
  { key: 'semua', label: 'Semua' },
  { key: 'reguler', label: 'Reguler' },
  { key: 'vip', label: 'VIP' },
  { key: 'plus', label: 'Plus Turkey' },
  { key: 'ekonomi', label: 'Ekonomi' },
]

export const rupiah = (n) => 'Rp' + Math.round(n).toLocaleString('id-ID')

export const fmtDate = (iso) => {
  const d = new Date(iso)
  return (
    d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  )
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

export const monthsDiff = (d1, d2) => {
  const a = new Date(d1)
  const b = new Date(d2)
  return Math.max(1, Math.round((b - a) / (1000 * 60 * 60 * 24 * 30.44)))
}
