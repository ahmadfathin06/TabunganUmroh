import { BERITA, rupiah } from '../data.js'
import { useStore, estimateEta } from '../store.jsx'
import TxItem from '../components/TxItem.jsx'
import { IcBell, IcPlus, IcClock, IcBox } from '../components/Icons.jsx'

export default function Beranda({ onAction }) {
  const { db, totalSaldo, rencanaAktif, jumlahRencanaAktif } = useStore()
  const prof = db.profile

  const h = new Date().getHours()
  const waktu =
    h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam'

  const setoran = db.transaksi.filter((t) => t.tipe === 'setor').reduce((s, t) => s + t.jumlah, 0)
  const tarik = db.transaksi.filter((t) => t.tipe === 'tarik').reduce((s, t) => s + t.jumlah, 0)
  const bunga = db.transaksi.filter((t) => t.tipe === 'bunga').reduce((s, t) => s + t.jumlah, 0)

  const p = rencanaAktif
  const tercapai = p ? db.saldo[p.id] || 0 : 0
  const pct = p ? Math.min(100, Math.round((tercapai / p.target) * 100)) : 0

  return (
    <main className="page active">
      <header className="hero">
        <div className="hero-top">
          <div className="user-chip">
            <div className="avatar">{prof.nama.charAt(0).toUpperCase()}</div>
            <div className="user-meta">
              <span className="greet">Assalamu'alaikum, {waktu}</span>
              <strong className="greet-name">{prof.nama}</strong>
            </div>
          </div>
          <button className="icon-btn" onClick={() => onAction('notif')} aria-label="Notifikasi">
            <IcBell />
          </button>
        </div>
        <h1 className="hero-title">Semoga perjalanan suci Anda dimudahkan 🕋</h1>
      </header>

      <section className="content">
        <div className="quick-grid">
          <button className="quick-btn" onClick={() => onAction('setor')}>
            <span className="qi"><IcPlus /></span>
            Setor Tabungan
          </button>
          <button className="quick-btn" onClick={() => onAction('rencana')}>
            <span className="qi"><IcClock /></span>
            Rencana Umroh
          </button>
          <button className="quick-btn" onClick={() => onAction('histori')}>
            <span className="qi"><IcClock /></span>
            Histori Transaksi
          </button>
          <button className="quick-btn" onClick={() => onAction('paket')}>
            <span className="qi"><IcBox /></span>
            Paket Umroh
          </button>
        </div>

        <div className="plan-bar">
          <div className="plan-bar-head">
            <span className="plan-badge">Rencana Tabungan Umroh Aktif</span>
            <span className="plan-pct">{p ? pct + '%' : '-'}</span>
          </div>
          <div className="plan-names">
            <strong>{p ? p.nama : 'Belum ada rencana aktif'}</strong>
            <span>
              {p
                ? rupiah(tercapai) + ' / ' + rupiah(p.target)
                : 'Buat rencana untuk mulai menabung'}
            </span>
          </div>
          <div className="track">
            <div className="fill" style={{ width: (p ? pct : 0) + '%' }} />
          </div>
          <div className="plan-foot">
            <span>⏱ Est. <b>{p ? estimateEta(db, p) : '-'}</b></span>
            <span>{p ? 'Tersisa ' + rupiah(p.target - tercapai) : ''}</span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-row">
            <div className="sum-item">
              <span className="sum-label">Total Saldo Tabungan</span>
              <strong className="sum-value">{rupiah(totalSaldo)}</strong>
            </div>
            <div className="sum-item">
              <span className="sum-label">Rencana Aktif</span>
              <strong className="sum-value">{jumlahRencanaAktif}</strong>
            </div>
            <div className="sum-item">
              <span className="sum-label">Total Setoran</span>
              <strong className="sum-value green">{rupiah(setoran)}</strong>
            </div>
            <div className="sum-item">
              <span className="sum-label">Total Penarikan</span>
              <strong className="sum-value red">{rupiah(tarik)}</strong>
            </div>
            <div className="sum-item">
              <span className="sum-label">Total Bunga/Hasil</span>
              <strong className="sum-value green">{rupiah(bunga)}</strong>
            </div>
          </div>
        </div>

        <div className="section-head">
          <h2>Berita &amp; Tips Umroh</h2>
          <button className="link-btn subtle" onClick={() => onAction('refreshBerita')}>
            Muat ulang
          </button>
        </div>
        <div className="news-grid">
          {BERITA.map((b) => (
            <article className="news-card" key={b.judul}>
              <div className="news-thumb">{b.emoji}</div>
              <div className="news-body">
                <span className="news-tag">{b.tag}</span>
                <div className="news-title">{b.judul}</div>
                <div className="news-date">{b.desc} · {b.date}</div>
              </div>
            </article>
          ))}
        </div>

        <div className="section-head">
          <h2>Transaksi Terbaru</h2>
          <button className="link-btn" onClick={() => onAction('histori')}>Lihat semua</button>
        </div>
        <div className="tx-list">
          {db.transaksi.length === 0 ? (
            <div className="empty">
              <span className="e-icon">🧾</span>
              <p>Belum ada transaksi. Yuk mulai menabung!</p>
            </div>
          ) : (
            db.transaksi.slice(0, 4).map((t) => (
              <TxItem
                key={t.id}
                tx={t}
                rencana={db.rencana.find((r) => r.id === t.rencanaId)}
              />
            ))
          )}
        </div>
      </section>
    </main>
  )
}
