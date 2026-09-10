import { rupiah, fmtDate } from '../data.js'

export default function TxItem({ tx, rencana }) {
  const isBunga = tx.tipe === 'bunga'
  const plus = tx.tipe === 'setor' || isBunga
  const icon = tx.tipe === 'setor' ? '📥' : isBunga ? '🌱' : '📤'
  const label = tx.tipe === 'setor' ? 'Setor Tabungan' : isBunga ? 'Bunga / Hasil Kelola' : 'Tarik Dana'
  const sub =
    fmtDate(tx.waktu) +
    (tx.metode ? ' · ' + tx.metode : '') +
    (rencana ? ' · ' + rencana.nama : '')

  return (
    <div className="tx-item">
      <div className={'tx-icon ' + (isBunga ? 'tx-bunga' : plus ? 'tx-in' : 'tx-out')}>{icon}</div>
      <div className="tx-main">
        <div className="tx-title">{label}</div>
        <div className="tx-sub">{sub}</div>
      </div>
      <span className={'tx-amt ' + (plus ? 'plus' : 'minus')}>
        {plus ? '+' : '−'}
        {rupiah(tx.jumlah)}
      </span>
    </div>
  )
}

export function EmptyTx({ pesan = 'Belum ada transaksi. Yuk mulai menabung!' }) {
  return (
    <div className="empty">
      <span className="e-icon">🧾</span>
      <p>{pesan}</p>
    </div>
  )
}
