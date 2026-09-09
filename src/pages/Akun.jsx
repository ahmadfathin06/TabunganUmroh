import { rupiah, fmtDate } from '../data.js'
import { useStore, planProgress, estimateEta } from '../store.jsx'
import TxItem from '../components/TxItem.jsx'
import { IcEdit } from '../components/Icons.jsx'

export default function Akun({ onAction }) {
  const { db, totalSaldo, rencanaAktif, jumlahRencanaAktif } = useStore()
  const prof = db.profile

  const setoran = db.transaksi.filter((t) => t.tipe === 'setor')
  const rata = setoran.length
    ? setoran.reduce((s, t) => s + t.jumlah, 0) / setoran.length
    : 0

  // Streak: rentang hari transaksi pertama vs terakhir
  let streak = '0 hari'
  if (db.transaksi.length) {
    const times = db.transaksi.map((t) => +new Date(t.waktu))
    const days = Math.max(1, Math.round((Math.max(...times) - Math.min(...times)) / 86400000))
    streak = days + ' hari'
  }

  const p = rencanaAktif
  const pp = p ? planProgress(db, p) : null

  // Gabungkan transaksi + log aktivitas
  const acts = [
    ...db.transaksi.map((t) => {
      const isBunga = t.tipe === 'bunga'
      const plus = t.tipe === 'setor' || isBunga
      return {
        id: t.id,
        icon: t.tipe === 'setor' ? '📥' : isBunga ? '🌱' : '📤',
        judul: t.tipe === 'setor'
          ? 'Setor Tabungan'
          : isBunga
            ? 'Bunga / Hasil Kelola'
            : 'Tarik Dana',
        sub: fmtDate(t.waktu) + (t.metode ? ' · ' + t.metode : ''),
        amt: (plus ? '+' : '−') + rupiah(t.jumlah),
        plus,
        waktu: t.waktu,
      }
    }),
    ...db.aktivitasLog.map((l) => ({ ...l, waktu: l.waktu })),
  ].sort((a, b) => new Date(b.waktu) - new Date(a.waktu))

  return (
    <main className="page">
      <header className="page-head">
        <h1>Akun</h1>
        <p>Profil dan aktivitas Anda</p>
      </header>
      <section className="content">
        <div className="profile-card">
          <div className="avatar xl">{prof.nama.charAt(0).toUpperCase()}</div>
          <div className="p-meta">
            <strong>{prof.nama}</strong>
            <span>{prof.email}</span>
            <span className="member-badge">
              🥇 Member Sejak <b>{prof.memberSince}</b> · <b>{prof.poin}</b> poin
            </span>
          </div>
          <button className="icon-btn" onClick={() => onAction('editProfil')} aria-label="Edit profil">
            <IcEdit />
          </button>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-icon">💰</span>
            <strong>{rupiah(totalSaldo)}</strong>
            <span>Total Saldo</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🎯</span>
            <strong>{jumlahRencanaAktif}</strong>
            <span>Rencana Aktif</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🧾</span>
            <strong>{db.transaksi.length}</strong>
            <span>Total Transaksi</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🔥</span>
            <strong>{streak}</strong>
            <span>Streak Menabung</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🏅</span>
            <strong>{prof.poin}</strong>
            <span>Poin</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🕌</span>
            <strong>{prof.umrohSelesai}</strong>
            <span>Umroh Selesai</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">📣</span>
            <strong>{prof.referral}</strong>
            <span>Referral</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">❤️</span>
            <strong>{db.favorit.length}</strong>
            <span>Paket Favorit</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">⚡</span>
            <strong>{rupiah(rata)}</strong>
            <span>Rata-rata Setoran</span>
          </div>
        </div>

        <div className="plan-detail">
          <div className="plan-detail-head">
            <span className="plan-badge">Rencana Tabungan Umroh Aktif</span>
            <button className="link-btn subtle" onClick={() => onAction('rencana')}>Kelola</button>
          </div>
          <strong className="pd-title">{p ? p.nama : 'Belum ada rencana aktif'}</strong>
          <div className="track"><div className="fill" style={{ width: (pp ? pp.pct : 0) + '%' }} /></div>
          <div className="pd-rows">
            <div className="pd-row"><span>Tercapai</span><b>{pp ? rupiah(pp.tercapai) : 'Rp0'}</b></div>
            <div className="pd-row"><span>Target</span><b>{p ? rupiah(p.target) : 'Rp0'}</b></div>
            <div className="pd-row"><span>Sisa</span><b>{p ? rupiah(Math.max(0, p.target - pp.tercapai)) : 'Rp0'}</b></div>
            <div className="pd-row"><span>Perkiraan Tercapai</span><b>{p ? estimateEta(db, p) : '-'}</b></div>
          </div>
          {p && (
            <>
              <div className="plan-detail-head">
                <span className="plan-badge">Transaksi Rencana Ini</span>
              </div>
              <div className="mini-tx">
                {db.transaksi
                  .filter((t) => !t.rencanaId || t.rencanaId === p.id)
                  .slice(0, 4)
                  .map((t) => (
                    <TxItem key={t.id} tx={t} rencana={db.rencana.find((r) => r.id === t.rencanaId)} />
                  ))}
              </div>
            </>
          )}
        </div>

        <div className="section-head">
          <h2>Semua Aktivitas</h2>
        </div>
        <div className="act-list">
          {acts.length === 0 ? (
            <div className="empty">
              <span className="e-icon">📭</span>
              <p>Belum ada aktivitas.</p>
            </div>
          ) : (
            acts.slice(0, 30).map((a) => (
              <div className="act-item" key={a.id}>
                <div className="act-icon">{a.icon}</div>
                <div className="act-main">
                  <div className="act-title">{a.judul}</div>
                  <div className="act-sub">{a.sub}</div>
                </div>
                {a.amt ? (
                  <span className={'tx-amt ' + (a.plus ? 'plus' : 'minus')}>{a.amt}</span>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  )
}
