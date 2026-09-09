import { useState } from 'react'
import { rupiah } from '../data.js'
import { useStore, planProgress, estimateEta } from '../store.jsx'

export default function Profil({ onAction }) {
  const { db, simpanProfil, rencanaAktif } = useStore()
  const [nama, setNama] = useState(db.profile.nama)
  const [email, setEmail] = useState(db.profile.email)

  const submit = (e) => {
    e.preventDefault()
    simpanProfil({ nama, email })
  }

  const prof = db.profile
  const p = rencanaAktif
  const pp = p ? planProgress(db, p) : null
  const totalSaldo = Object.values(db.saldo).reduce((s, v) => s + (v || 0), 0)

  return (
    <main className="page">
      <header className="page-head">
        <h1>Edit Profil</h1>
        <p>Perbarui data diri Anda</p>
      </header>
      <section className="content">
        <div className="profile-card">
          <div className="avatar xl">{nama ? nama.charAt(0).toUpperCase() : '?'}</div>
          <div className="p-meta">
            <strong>{nama || '-'}</strong>
            <span>{email || '-'}</span>
            <span className="member-badge">
              🥇 Member Sejak <b>{prof.memberSince}</b> · <b>{prof.poin}</b> poin
            </span>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-icon">💰</span>
            <strong>{rupiah(totalSaldo)}</strong>
            <span>Total Saldo</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🎯</span>
            <strong>{db.rencana.length}</strong>
            <span>Rencana</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🧾</span>
            <strong>{db.transaksi.length}</strong>
            <span>Transaksi</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🕌</span>
            <strong>{prof.umrohSelesai}</strong>
            <span>Umroh Selesai</span>
          </div>
        </div>

        {p && pp && (
          <div className="plan-detail">
            <div className="plan-detail-head">
              <span className="plan-badge">Rencana Aktif</span>
              <button className="link-btn subtle" onClick={() => onAction('rencana')}>Kelola</button>
            </div>
            <strong className="pd-title">{p.nama}</strong>
            <div className="track"><div className="fill" style={{ width: pp.pct + '%' }} /></div>
            <div className="pd-rows">
              <div className="pd-row"><span>Tercapai</span><b>{rupiah(pp.tercapai)}</b></div>
              <div className="pd-row"><span>Target</span><b>{rupiah(p.target)}</b></div>
              <div className="pd-row"><span>Sisa</span><b>{rupiah(Math.max(0, p.target - pp.tercapai))}</b></div>
              <div className="pd-row"><span>Perkiraan Tercapai</span><b>{estimateEta(db, p)}</b></div>
            </div>
          </div>
        )}

        <form className="form-card" onSubmit={submit}>
          <div className="f-row">
            <label htmlFor="pNama">Nama</label>
            <input id="pNama" type="text" value={nama} onChange={(e) => setNama(e.target.value)} required />
          </div>
          <div className="f-row">
            <label htmlFor="pEmail">Email</label>
            <input id="pEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <button className="btn primary full" type="submit">Simpan Perubahan</button>
        </form>
      </section>
    </main>
  )
}
