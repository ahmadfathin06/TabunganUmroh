import { useState } from 'react'
import { PAKET, KATEGORI_PAKET, rupiah } from '../data.js'
import { useStore } from '../store.jsx'

const katEmoji = { reguler: '🕌', vip: '👑', plus: '✈️', ekonomi: '🎒' }

const katClass = { reguler: 'ph-reguler', vip: 'ph-vip', plus: 'ph-plus', ekonomi: 'ph-ekonomi' }

export default function PaketUmroh({ onAction }) {
  const { db, toggleFavorit } = useStore()
  const [kat, setKat] = useState('semua')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('rekomendasi')

  const items = PAKET
    .filter(
      (x) =>
        (kat === 'semua' || x.kat === kat) &&
        x.nama.toLowerCase().includes(q.toLowerCase()),
    )
    .sort((a, b) => {
      if (sort === 'murah') return a.harga - b.harga
      if (sort === 'mahal') return b.harga - a.harga
      if (sort === 'durasi') return a.durasi - b.durasi
      return a.rekomendasi - b.rekomendasi
    })

  return (
    <main className="page">
      <header className="page-head">
        <h1>Paket Umroh</h1>
        <p>Pilih paket yang sesuai dengan rencana Anda</p>
      </header>
      <section className="content">
        <div className="summary-card">
          <div className="summary-row">
            <div className="sum-item">
              <span className="sum-label">Total Paket</span>
              <strong className="sum-value">{PAKET.length}</strong>
            </div>
            <div className="sum-item">
              <span className="sum-label">Favorit</span>
              <strong className="sum-value red">{db.favorit.length}</strong>
            </div>
            <div className="sum-item">
              <span className="sum-label">Harga Termurah</span>
              <strong className="sum-value green">{rupiah(Math.min(...PAKET.map((x) => x.harga)))}</strong>
            </div>
            <div className="sum-item">
              <span className="sum-label">Rentang Durasi</span>
              <strong className="sum-value">{Math.min(...PAKET.map((x) => x.durasi))}-{Math.max(...PAKET.map((x) => x.durasi))} hari</strong>
            </div>
          </div>
        </div>

        {db.favorit.length > 0 && (
          <>
            <div className="section-head">
              <h2>❤️ Paket Favorit Anda</h2>
            </div>
            <div className="cards">
              {PAKET.filter((x) => db.favorit.includes(x.id)).map((x) => (
                <div className="card" key={'fav-' + x.id}>
                  <div className="card-head">
                    <div className="card-emoji">{katEmoji[x.kat]}</div>
                    <div>
                      <div className="card-title">{x.nama}</div>
                      <div className="card-sub">{x.maskapai} · {x.durasi} hari</div>
                    </div>
                    <span className="card-badge badge-tercapai">{rupiah(x.harga)}</span>
                  </div>
                  <div className="card-foot">
                    <span>{x.hotel}</span>
                    <div className="card-actions">
                      <button className="mini-btn" onClick={() => onAction('pilihPaket', x)}>Pilih Paket</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="filter-row">
          {KATEGORI_PAKET.map((k) => (
            <button
              key={k.key}
              className={'fchip' + (kat === k.key ? ' active' : '')}
              onClick={() => setKat(k.key)}
            >
              {k.label}
            </button>
          ))}
        </div>

        <div className="toolbar">
          <div className="search-box">
            <input
              type="text"
              placeholder="Cari paket..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="rekomendasi">Rekomendasi</option>
            <option value="murah">Harga Terendah</option>
            <option value="mahal">Harga Tertinggi</option>
            <option value="durasi">Durasi Terpendek</option>
          </select>
        </div>

        <div className="paket-grid">
          {items.length === 0 ? (
            <div className="empty" style={{ gridColumn: '1/-1' }}>
              <span className="e-icon">🔎</span>
              <p>Paket tidak ditemukan. Coba kata kunci atau filter lain.</p>
            </div>
          ) : (
            items.map((x) => {
              const fav = db.favorit.includes(x.id)
              return (
                <article className="paket-card" key={x.id}>
                  <div className={'paket-head ' + katClass[x.kat]}>
                    <span className={'paket-flag' + (x.kat === 'vip' ? ' gold' : '')}>
                      {x.kat.toUpperCase()}
                    </span>
                    {x.emoji}
                    <button
                      className={'paket-heart' + (fav ? ' on' : '')}
                      onClick={() => toggleFavorit(x.id)}
                      aria-label="Favorit"
                    >
                      {fav ? '❤️' : '🤍'}
                    </button>
                  </div>
                  <div className="paket-body">
                    <div className="paket-title">{x.nama}</div>
                    <div className="paket-agency">{x.maskapai} · {x.hotel}</div>
                    <div className="paket-meta">
                      <span>⏱ <b>{x.durasi} hari</b></span>
                      <span>🛫 <b>Direct</b></span>
                    </div>
                    <ul className="paket-feats">
                      {x.feats.slice(0, 3).map((f) => <li key={f}>{f}</li>)}
                    </ul>
                    <div className="paket-foot">
                      <div className="paket-price">
                        {x.diskon ? <span className="old">{rupiah(x.diskon)}</span> : null}
                        <span className="now">{rupiah(x.harga)} <small>/jamaah</small></span>
                      </div>
                      <button className="btn primary" onClick={() => onAction('pilihPaket', x)}>
                        Pilih
                      </button>
                    </div>
                  </div>
                </article>
              )
            })
          )}
        </div>
      </section>
    </main>
  )
}
