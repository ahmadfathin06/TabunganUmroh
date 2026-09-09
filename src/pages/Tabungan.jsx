import { useState } from 'react'
import { rupiah } from '../data.js'
import { useStore, planProgress, estimateEta } from '../store.jsx'
import TxItem, { EmptyTx } from '../components/TxItem.jsx'

export default function Tabungan({ onAction }) {
  const { db, totalSaldo, rencanaAktif } = useStore()
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('progress')

  const items = db.rencana
    .filter((x) => x.nama.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'progress') return planProgress(db, b).pct - planProgress(db, a).pct
      if (sort === 'besar') return (db.saldo[b.id] || 0) - (db.saldo[a.id] || 0)
      if (sort === 'nama') return a.nama.localeCompare(b.nama)
      return new Date(b.createdAt) - new Date(a.createdAt)
    })

  const tx = db.transaksi.slice(0, 5)

  return (
    <main className="page">
      <header className="page-head">
        <h1>Tabungan</h1>
        <p>Kelola dana tabungan umroh Anda</p>
      </header>
      <section className="content">
        <div className="balance-hero">
          <span className="bh-label">Total Saldo Tabungan</span>
          <strong className="bh-value">{rupiah(totalSaldo)}</strong>
          <div className="bh-chips">
            <span className="chip">🏆 Target: <b>{rencanaAktif ? rupiah(rencanaAktif.target) : '-'}</b></span>
            <span className="chip">⏱ ETA: <b>{rencanaAktif ? estimateEta(db, rencanaAktif) : '-'}</b></span>
          </div>
          <div className="bh-actions">
            <button className="btn primary" onClick={() => onAction('setor')}>+ Setor Tabungan</button>
            <button className="btn ghost" onClick={() => onAction('tarik')}>Tarik Dana</button>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-row">
            <div className="sum-item">
              <span className="sum-label">Jumlah Tabungan</span>
              <strong className="sum-value">{db.rencana.length}</strong>
            </div>
            <div className="sum-item">
              <span className="sum-label">Total Setoran</span>
              <strong className="sum-value green">{rupiah(db.transaksi.filter((t) => t.tipe === 'setor').reduce((s, t) => s + t.jumlah, 0))}</strong>
            </div>
            <div className="sum-item">
              <span className="sum-label">Total Penarikan</span>
              <strong className="sum-value red">{rupiah(db.transaksi.filter((t) => t.tipe === 'tarik').reduce((s, t) => s + t.jumlah, 0))}</strong>
            </div>
            <div className="sum-item">
              <span className="sum-label">Bunga/Hasil</span>
              <strong className="sum-value green">{rupiah(db.transaksi.filter((t) => t.tipe === 'bunga').reduce((s, t) => s + t.jumlah, 0))}</strong>
            </div>
          </div>
        </div>

        <div className="toolbar">
          <div className="search-box">
            <input
              type="text"
              placeholder="Cari tabungan..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="progress">Terbaik</option>
            <option value="baru">Terbaru</option>
            <option value="besar">Saldo Terbesar</option>
            <option value="nama">Nama A-Z</option>
          </select>
        </div>

        <div className="cards">
          {items.length === 0 ? (
            <div className="empty">
              <span className="e-icon">🪙</span>
              <p>Belum ada tabungan. Buat rencana dan mulai menabung!</p>
              <button className="btn primary" onClick={() => onAction('rencana')}>+ Buat Rencana</button>
            </div>
          ) : (
            items.map((x) => {
              const { tercapai, pct } = planProgress(db, x)
              const selesai = pct >= 100
              return (
                <div className="card" key={x.id}>
                  <div className="card-head">
                    <div className="card-emoji">{selesai ? '🏆' : '🎯'}</div>
                    <div>
                      <div className="card-title">{x.nama}</div>
                      <div className="card-sub">Target {new Date(x.targetDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    </div>
                    <span className={'card-badge ' + (selesai ? 'badge-tercapai' : 'badge-aktif')}>
                      {selesai ? 'Tercapai' : 'Aktif · ' + pct + '%'}
                    </span>
                  </div>
                  <div className="card-amounts">
                    <span>Terkumpul: <b>{rupiah(tercapai)}</b></span>
                    <span className="sisa">Sisa: {rupiah(Math.max(0, x.target - tercapai))}</span>
                  </div>
                  <div className="track"><div className="fill" style={{ width: pct + '%' }} /></div>
                  <div className="card-foot">
                    <span>{pct}% dari {rupiah(x.target)}</span>
                    <div className="card-actions">
                      <button className="mini-btn" onClick={() => onAction('setorTo', x.id)}>+ Setor</button>
                      <button className="mini-btn danger" onClick={() => onAction('tarikTo', x.id)}>Tarik</button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="section-head">
          <h2>Histori Transaksi</h2>
          <button className="link-btn" onClick={() => onAction('histori')}>Lihat semua</button>
        </div>
        <div className="tx-list">
          {tx.length === 0 ? (
            <EmptyTx />
          ) : (
            tx.map((t) => <TxItem key={t.id} tx={t} rencana={db.rencana.find((r) => r.id === t.rencanaId)} />)
          )}
        </div>
      </section>
    </main>
  )
}
