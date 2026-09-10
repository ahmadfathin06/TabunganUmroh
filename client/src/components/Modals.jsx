import { useEffect, useState } from 'react'
import { PAKET, rupiah } from '../data.js'
import { useStore } from '../store.jsx'

function Modal({ show, onClose, title, children }) {
  useEffect(() => {
    if (!show) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [show, onClose])

  if (!show) return null
  return (
    <div className="modal show" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function SetorModal({ show, onClose, mode, rencanaId }) {
  const { db, rencanaAktif, setor } = useStore()
  const [nominal, setNominal] = useState('')
  const [metode, setMetode] = useState('Transfer Bank')

  useEffect(() => {
    if (show) setNominal('')
  }, [show, mode])

  const ren = db.rencana.find((r) => r.id === rencanaId) || rencanaAktif

  const submit = (e) => {
    e.preventDefault()
    const jumlah = parseInt(nominal, 10)
    if (!jumlah || jumlah <= 0) return
    setor(jumlah, metode, ren ? ren.id : null, mode)
    onClose()
  }

  return (
    <Modal show={show} onClose={onClose} title={mode === 'tarik' ? 'Tarik Dana' : 'Setor Tabungan'}>
      <p className="muted">
        {mode === 'tarik'
          ? 'Tarik dana dari rencana. Saldo akan tercatat pada histori transaksi.'
          : 'Saldo akan langsung tercatat pada histori transaksi.'}
      </p>
      {ren && (
        <p className="muted">
          {mode === 'tarik' ? 'Dari' : 'Ke'} rencana: <b>{ren.nama}</b>
        </p>
      )}
      <form onSubmit={submit}>
        <div className="f-row">
          <label htmlFor="setorNominal">Nominal (Rp)</label>
          <input
            id="setorNominal"
            type="number"
            min="10000"
            step="10000"
            placeholder="500000"
            value={nominal}
            onChange={(e) => setNominal(e.target.value)}
            required
          />
        </div>
        <div className="quick-amounts">
          {[100000, 500000, 1000000, 2000000].map((amt) => (
            <button key={amt} type="button" className="qamt" onClick={() => setNominal(String(amt))}>
              {amt >= 1000000 ? amt / 1000000 + 'jt' : amt / 1000 + 'rb'}
            </button>
          ))}
        </div>
        <div className="f-row">
          <label htmlFor="setorMetode">Metode</label>
          <select id="setorMetode" value={metode} onChange={(e) => setMetode(e.target.value)}>
            <option>Transfer Bank</option>
            <option>Virtual Account</option>
            <option>E-Wallet</option>
          </select>
        </div>
        <button className="btn primary full" type="submit">
          {mode === 'tarik' ? 'Konfirmasi Penarikan' : 'Konfirmasi Setoran'}
        </button>
      </form>
    </Modal>
  )
}

export function RencanaModal({ show, onClose, preset }) {
  const { tambahRencana } = useStore()
  const [nama, setNama] = useState('')
  const [target, setTarget] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [paketId, setPaketId] = useState('')

  useEffect(() => {
    if (!show) return
    if (preset && preset.id) {
      setNama('Tabungan ' + preset.nama)
      setTarget(String(preset.harga))
      setPaketId(preset.id)
      const d = new Date()
      d.setMonth(d.getMonth() + Math.ceil(preset.harga / 3000000))
      setTargetDate(d.toISOString().slice(0, 10))
    } else {
      setNama('')
      setTarget('')
      setPaketId('')
      setTargetDate('')
    }
  }, [show, preset])

  const submit = (e) => {
    e.preventDefault()
    tambahRencana({ nama, target: parseInt(target, 10), targetDate, paketId: paketId || null })
    onClose()
  }

  return (
    <Modal show={show} onClose={onClose} title="Tambah Rencana Umroh">
      <form onSubmit={submit}>
        <div className="f-row">
          <label htmlFor="rencanaNama">Nama Rencana</label>
          <input id="rencanaNama" type="text" placeholder="Umroh Ramadhan 2027" value={nama} onChange={(e) => setNama(e.target.value)} required />
        </div>
        <div className="f-row">
          <label htmlFor="rencanaTarget">Target (Rp)</label>
          <input id="rencanaTarget" type="number" min="1000000" step="500000" placeholder="35000000" value={target} onChange={(e) => setTarget(e.target.value)} required />
        </div>
        <div className="f-row">
          <label htmlFor="rencanaTargetDate">Target Tanggal</label>
          <input id="rencanaTargetDate" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} required />
        </div>
        <div className="f-row">
          <label htmlFor="rencanaPaket">Paket (opsional)</label>
          <select id="rencanaPaket" value={paketId} onChange={(e) => setPaketId(e.target.value)}>
            <option value="">— Tanpa paket —</option>
            {PAKET.map((x) => (
              <option key={x.id} value={x.id}>
                {x.nama} — {rupiah(x.harga)}
              </option>
            ))}
          </select>
        </div>
        <button className="btn primary full" type="submit">Simpan</button>
      </form>
    </Modal>
  )
}

export function ProfilModal({ show, onClose }) {
  const { db, simpanProfil } = useStore()
  const [nama, setNama] = useState(db.profile.nama)
  const [email, setEmail] = useState(db.profile.email)

  useEffect(() => {
    if (show) {
      setNama(db.profile.nama)
      setEmail(db.profile.email)
    }
  }, [show, db.profile.nama, db.profile.email])

  const submit = (e) => {
    e.preventDefault()
    simpanProfil({ nama, email })
    onClose()
  }

  return (
    <Modal show={show} onClose={onClose} title="Edit Profil">
      <form onSubmit={submit}>
        <div className="f-row">
          <label htmlFor="profilNama">Nama</label>
          <input id="profilNama" type="text" value={nama} onChange={(e) => setNama(e.target.value)} required />
        </div>
        <div className="f-row">
          <label htmlFor="profilEmail">Email</label>
          <input id="profilEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <button className="btn primary full" type="submit">Simpan</button>
      </form>
    </Modal>
  )
}
