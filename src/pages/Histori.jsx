import { useState } from 'react'
import { rupiah } from '../data.js'
import { useStore } from '../store.jsx'
import TxItem, { EmptyTx } from '../components/TxItem.jsx'

const FILTERS = [
  { key: 'semua', label: 'Semua' },
  { key: 'setor', label: 'Setor' },
  { key: 'tarik', label: 'Tarik' },
  { key: 'bunga', label: 'Bunga' },
]

export default function Histori() {
  const { db } = useStore()
  const [filter, setFilter] = useState('semua')
  const [q, setQ] = useState('')

  const items = db.transaksi.filter((t) => {
    if (filter !== 'semua' && t.tipe !== filter) return false
    if (q) {
      const ren = db.rencana.find((r) => r.id === t.rencanaId)
      const hay = ((ren ? ren.nama : '') + ' ' + (t.metode || '')).toLowerCase()
      if (!hay.includes(q.toLowerCase())) return false
    }
    return true
  })

  const setoran = db.transaksi.filter((t) => t.tipe === 'setor').reduce((s, t) => s + t.jumlah, 0)
  const tarik = db.transaksi.filter((t) => t.tipe === 'tarik').reduce((s, t) => s + t.jumlah, 0)
  const bunga = db.transaksi.filter((t) => t.tipe === 'bunga').reduce((s, t) => s + t.jumlah, 0)

  return (
    <main className="page">
      <header className="page-head">
        <h1>Histori Transaksi</h1>
        <p>Seluruh riwayat setor, tarik, dan bunga</p>
      </header>
      <section className="content">
        <div className="summary-card">
          <div className="summary-row">
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
            <div className="sum-item">
              <span className="sum-label">Jumlah Transaksi</span>
              <strong className="sum-value">{db.transaksi.length}</strong>
            </div>
          </div>
        </div>

        <div className="filter-row">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={'fchip' + (filter === f.key ? ' active' : '')}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="toolbar">
          <div className="search-box">
            <input
              type="text"
              placeholder="Cari metode / rencana..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <div className="section-head">
          <h2>Riwayat</h2>
          <span className="muted">{items.length} transaksi</span>
        </div>
        <div className="tx-list">
          {items.length === 0 ? (
            <EmptyTx pesan="Tidak ada transaksi yang cocok dengan filter." />
          ) : (
            items.map((t) => (
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
