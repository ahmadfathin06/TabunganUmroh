import { createContext, useContext, useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { uid, monthsDiff, rupiah } from './data.js'

const STORE_KEY = 'tabunganku-umroh-v1'

/* ---------------- Default seed data ---------------- */
function defaultData() {
  const now = new Date()
  const iso = (offsetDays) => new Date(now.getTime() + offsetDays * 86400000).toISOString()
  return {
    profile: {
      nama: 'Ahmad Fauzi',
      email: 'ahmad.fauzi@email.com',
      memberSince: 2024,
      poin: 120,
      umrohSelesai: 0,
      referral: 0,
    },
    rencana: [
      {
        id: 'r1',
        nama: 'Umroh Ramadhan 2027',
        target: 35000000,
        targetDate: new Date(now.getFullYear() + 1, 1, 15).toISOString(),
        paketId: 'p1',
        createdAt: iso(-90),
      },
      {
        id: 'r2',
        nama: 'Umroh Keluarga 2026',
        target: 55000000,
        targetDate: new Date(now.getFullYear() + (now.getMonth() >= 11 ? 2 : 0), 11, 1).toISOString(),
        paketId: 'p3',
        createdAt: iso(-45),
      },
    ],
    saldo: { r1: 6250000, r2: 2200000 },
    transaksi: [
      { id: uid(), tipe: 'setor', jumlah: 2500000, rencanaId: 'r1', metode: 'Transfer Bank', waktu: iso(-60) },
      { id: uid(), tipe: 'setor', jumlah: 1500000, rencanaId: 'r1', metode: 'Virtual Account', waktu: iso(-40) },
      { id: uid(), tipe: 'bunga', jumlah: 120000, rencanaId: 'r1', metode: 'Hasil Kelola', waktu: iso(-30) },
      { id: uid(), tipe: 'setor', jumlah: 2000000, rencanaId: 'r2', metode: 'E-Wallet', waktu: iso(-20) },
      { id: uid(), tipe: 'tarik', jumlah: 500000, rencanaId: 'r2', metode: 'Transfer Bank', waktu: iso(-12) },
      { id: uid(), tipe: 'setor', jumlah: 1000000, rencanaId: 'r2', metode: 'Transfer Bank', waktu: iso(-5) },
      { id: uid(), tipe: 'bunga', jumlah: 95000, rencanaId: 'r1', metode: 'Hasil Kelola', waktu: iso(-2) },
      { id: uid(), tipe: 'setor', jumlah: 750000, rencanaId: 'r1', metode: 'Virtual Account', waktu: iso(-1) },
    ],
    favorit: ['p2'],
    aktivitasLog: [],
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* fall through to default */
  }
  return defaultData()
}

function persist(db) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(db))
  } catch {
    /* ignore quota errors */
  }
}

function logAktivitas(db, icon, judul, sub, amt, plus) {
  db.aktivitasLog.unshift({
    id: uid(),
    icon,
    judul,
    sub,
    amt,
    plus,
    waktu: new Date().toISOString(),
  })
  db.aktivitasLog = db.aktivitasLog.slice(0, 60)
}

/* ---------------- Derived helpers (pure, db passed in) ---------------- */
export const totalSaldo = (db) => Object.values(db.saldo).reduce((s, v) => s + (v || 0), 0)

export const planProgress = (db, plan) => {
  const tercapai = db.saldo[plan.id] || 0
  return { tercapai, pct: Math.min(100, Math.round((tercapai / plan.target) * 100)) }
}

export const rencanaAktif = (db) =>
  db.rencana
    .filter((p) => planProgress(db, p).pct < 100)
    .sort((a, b) => new Date(a.targetDate) - new Date(b.targetDate))[0] || null

export function estimateEta(db, plan) {
  const { tercapai } = planProgress(db, plan)
  if (tercapai >= plan.target) return 'Tercapai!'
  const setoran = db.transaksi.filter((t) => t.tipe === 'setor')
  if (!setoran.length) return '-'
  const oldest = new Date(Math.min(...setoran.map((t) => +new Date(t.waktu))))
  const bulan = monthsDiff(oldest, new Date())
  const perBulan = tercapai / Math.max(1, bulan)
  if (perBulan <= 0) return '-'
  const butuhBulan = Math.ceil((plan.target - tercapai) / perBulan)
  const eta = new Date()
  eta.setMonth(eta.getMonth() + butuhBulan)
  return (
    eta.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) +
    ' (~' + butuhBulan + ' bln)'
  )
}

/* ---------------- Context ---------------- */
const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const [db, setDb] = useState(load)
  const dbRef = useRef(db)
  useEffect(() => {
    dbRef.current = db
  }, [db])

  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  const showToast = useCallback((msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }, [])

  /** Commit a mutated clone of the current db, persist, and rerender. */
  const commit = useCallback((next) => {
    dbRef.current = next
    persist(next)
    setDb(next)
  }, [])

  const actions = useMemo(() => ({
    setor(jumlah, metode, rencanaId, mode) {
      jumlah = Math.round(jumlah)
      const next = structuredClone(dbRef.current)
      const ren = next.rencana.find((r) => r.id === rencanaId) || rencanaAktif(next)

      if (mode === 'tarik') {
        const saldoRen = ren ? next.saldo[ren.id] || 0 : totalSaldo(next)
        if (saldoRen < jumlah) {
          return { toast: '❌ Saldo tidak mencukupi untuk penarikan' }
        }
        if (ren) next.saldo[ren.id] -= jumlah
        next.transaksi.unshift({
          id: uid(), tipe: 'tarik', jumlah, rencanaId: ren ? ren.id : null,
          metode, waktu: new Date().toISOString(),
        })
        logAktivitas(next, '📤', 'Tarik Dana', metode + (ren ? ' · ' + ren.nama : ''), '−' + rupiah(jumlah), false)
        commit(next)
        return { toast: '✅ Penarikan ' + rupiah(jumlah) + ' berhasil' }
      }

      // setor
      if (ren) next.saldo[ren.id] = (next.saldo[ren.id] || 0) + jumlah
      next.transaksi.unshift({
        id: uid(), tipe: 'setor', jumlah, rencanaId: ren ? ren.id : null,
        metode, waktu: new Date().toISOString(),
      })
      logAktivitas(next, '📥', 'Setor Tabungan', metode + (ren ? ' · ' + ren.nama : ''), '+' + rupiah(jumlah), true)
      next.profile.poin += Math.floor(jumlah / 100000)
      commit(next)
      if (ren && planProgress(next, ren).pct >= 100) {
        // catat milestone di state terbaru
        const after = structuredClone(next)
        logAktivitas(after, '🏆', 'Rencana Tercapai! 🎉', ren.nama, '', true)
        commit(after)
        return { toast: '🎉 Selamat! Rencana "' + ren.nama + '" tercapai!' }
      }
      return { toast: '✅ Setoran ' + rupiah(jumlah) + ' berhasil' }
    },

    hapusRencana(id) {
      const next = structuredClone(dbRef.current)
      next.rencana = next.rencana.filter((r) => r.id !== id)
      delete next.saldo[id]
      logAktivitas(next, '🗑️', 'Rencana Dihapus', '', '', true)
      commit(next)
      return { toast: '🗑️ Rencana dihapus' }
    },

    tambahRencana({ nama, target, targetDate, paketId }) {
      const next = structuredClone(dbRef.current)
      const id = uid()
      next.rencana.push({
        id,
        nama,
        target,
        targetDate: new Date(targetDate).toISOString(),
        paketId: paketId || null,
        createdAt: new Date().toISOString(),
      })
      if (!next.saldo[id]) next.saldo[id] = 0
      logAktivitas(next, '🎯', 'Rencana Baru Dibuat', nama + ' · target ' + rupiah(target), '', true)
      commit(next)
      return { toast: '✅ Rencana "' + nama + '" dibuat' }
    },

    toggleFavorit(id) {
      const next = structuredClone(dbRef.current)
      if (next.favorit.includes(id)) next.favorit = next.favorit.filter((f) => f !== id)
      else next.favorit.push(id)
      commit(next)
      return {}
    },

    simpanProfil({ nama, email }) {
      const next = structuredClone(dbRef.current)
      next.profile.nama = nama
      next.profile.email = email
      logAktivitas(next, '✏️', 'Profil Diperbarui', nama + ' · ' + email, '', true)
      commit(next)
      return { toast: '✅ Profil diperbarui' }
    },

    notif() {
      return { toast: '🔔 Tidak ada notifikasi baru' }
    },

    refreshBerita() {
      return { toast: '📰 Berita & tips dimuat ulang' }
    },
  }), [commit])

  const value = useMemo(() => {
    const wrapped = {}
    for (const [name, fn] of Object.entries(actions)) {
      wrapped[name] = (...args) => {
        const res = fn(...args)
        if (res && res.toast) showToast(res.toast)
        return res
      }
    }
    return {
      db,
      totalSaldo: totalSaldo(db),
      rencanaAktif: rencanaAktif(db),
      jumlahRencanaAktif: db.rencana.filter((p) => planProgress(db, p).pct < 100).length,
      ...wrapped,
      showToast,
      toast,
    }
  }, [db, actions, showToast, toast])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore harus dipakai di dalam StoreProvider')
  return ctx
}
