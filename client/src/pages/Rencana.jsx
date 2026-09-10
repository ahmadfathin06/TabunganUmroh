import { PAKET, rupiah, fmtDate } from '../data.js'
import { useStore, planProgress, estimateEta, totalSaldo } from '../store.jsx'
import TxItem from '../components/TxItem.jsx'

export default function Rencana({ onAction }) {
  const { db, hapusRencana } = useStore()

  const selesaiCount = db.rencana.filter((x) => planProgress(db, x).pct >= 100).length
  const totalTarget = db.rencana.reduce((s, x) => s + x.target, 0)
  const totalTercapai = totalSaldo(db)

  return (
    <main className="page">
      <header className="page-head">
        <h1>Rencana Umroh</h1>
        <p>Kelola target dan progres menabung</p>
      </header>
      <section className="content">
        <div className="summary-card">
          <div className="summary-row">
            <div className="sum-item">
              <span className="sum-label">Total Rencana</span>
              <strong className="sum-value">{db.rencana.length}</strong>
            </div>
            <div className="sum-item">
              <span className="sum-label">Sudah Tercapai</span>
              <strong className="sum-value green">{selesaiCount}</strong>
            </div>
            <div className="sum-item">
              <span className="sum-label">Total Target</span>
              <strong className="sum-value">{rupiah(totalTarget)}</strong>
            </div>
            <div className="sum-item">
              <span className="sum-label">Terkumpul</span>
              <strong className="sum-value green">{rupiah(totalTercapai)}</strong>
            </div>
          </div>
        </div>

        <button className="btn primary full" onClick={() => onAction('buatRencana')}>
          + Buat Rencana Baru
        </button>

        <div className="cards">
          {db.rencana.length === 0 ? (
            <div className="empty">
              <span className="e-icon">🎯</span>
              <p>Belum ada rencana umroh. Buat rencana pertama Anda!</p>
            </div>
          ) : (
            db.rencana.map((x) => {
              const { tercapai, pct } = planProgress(db, x)
              const selesai = pct >= 100
              const paket = x.paketId ? PAKET.find((p) => p.id === x.paketId) : null
              const txPlan = db.transaksi.filter((t) => t.rencanaId === x.id)
              return (
                <div className="card" key={x.id}>
                  <div className="card-head">
                    <div className="card-emoji">{selesai ? '🏆' : '🎯'}</div>
                    <div>
                      <div className="card-title">{x.nama}</div>
                      <div className="card-sub">
                        Target {fmtDate(x.targetDate).split(' · ')[0]} · {rupiah(x.target)}
                        {paket ? ' · ' + paket.nama : ''}
                      </div>
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
                  <div className="pd-rows">
                    <div className="pd-row"><span>Progres</span><b>{pct}%</b></div>
                    <div className="pd-row"><span>Perkiraan Tercapai</span><b>{estimateEta(db, x)}</b></div>
                    <div className="pd-row"><span>Jumlah Transaksi</span><b>{txPlan.length}</b></div>
                    <div className="pd-row"><span>Dibuat</span><b>{fmtDate(x.createdAt).split(' · ')[0]}</b></div>
                  </div>
                  {txPlan.length > 0 && (
                    <>
                      <div className="section-head" style={{ marginTop: 12 }}>
                        <h2>Transaksi Rencana Ini</h2>
                        <button className="link-btn subtle" onClick={() => onAction('histori')}>
                          Lihat semua
                        </button>
                      </div>
                      <div className="mini-tx">
                        {txPlan.slice(0, 3).map((t) => (
                          <TxItem key={t.id} tx={t} rencana={db.rencana.find((r) => r.id === t.rencanaId)} />
                        ))}
                      </div>
                    </>
                  )}
                  <div className="card-foot">
                    <span>{pct}% dari {rupiah(x.target)}</span>
                    <div className="card-actions">
                      <button className="mini-btn" onClick={() => onAction('setorTo', x.id)}>+ Setor</button>
                      <button className="mini-btn danger" onClick={() => onAction('tarikTo', x.id)}>Tarik</button>
                      <button className="mini-btn danger" onClick={() => hapusRencana(x.id)}>Hapus</button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>
    </main>
  )
}
