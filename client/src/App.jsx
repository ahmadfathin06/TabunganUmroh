import { useState, useCallback } from 'react'
import { useStore } from './store.jsx'
import BottomNav from './components/BottomNav.jsx'
import { SetorModal, RencanaModal, ProfilModal } from './components/Modals.jsx'
import Beranda from './pages/Beranda.jsx'
import Tabungan from './pages/Tabungan.jsx'
import PaketUmroh from './pages/PaketUmroh.jsx'
import Akun from './pages/Akun.jsx'
import Histori from './pages/Histori.jsx'
import Rencana from './pages/Rencana.jsx'
import Profil from './pages/Profil.jsx'

export default function App() {
  const [page, setPage] = useState('beranda')
  const [setorModal, setSetorModal] = useState(null) // { mode, rencanaId }
  const [rencanaModal, setRencanaModal] = useState(null) // paket preset | null
  const [profilModal, setProfilModal] = useState(false)

  const nav = useCallback((p) => {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const closeSetor = useCallback(() => setSetorModal(null), [])
  const closeRencana = useCallback(() => setRencanaModal(null), [])
  const closeProfil = useCallback(() => setProfilModal(false), [])

  const handleAction = useCallback((action, payload) => {
    switch (action) {
      case 'setor':
        setSetorModal({ mode: 'setor', rencanaId: null })
        break
      case 'tarik':
        setSetorModal({ mode: 'tarik', rencanaId: null })
        break
      case 'setorTo':
        setSetorModal({ mode: 'setor', rencanaId: payload })
        break
      case 'tarikTo':
        setSetorModal({ mode: 'tarik', rencanaId: payload })
        break
      case 'rencana':
        nav('rencana')
        break
      case 'buatRencana':
        setRencanaModal(true) // modal kosong
        break
      case 'pilihPaket':
        setRencanaModal(payload) // preset paket
        break
      case 'histori':
        nav('histori')
        break
      case 'paket':
        nav('paket')
        break
      case 'editProfil':
        setProfilModal(true)
        break
      default:
        break
    }
  }, [nav])

  return (
    <>
      {page === 'beranda' && <Beranda onAction={handleAction} />}
      {page === 'tabungan' && <Tabungan onAction={handleAction} />}
      {page === 'paket' && <PaketUmroh onAction={handleAction} />}
      {page === 'akun' && <Akun onAction={handleAction} />}
      {page === 'histori' && <Histori />}
      {page === 'rencana' && <Rencana onAction={handleAction} />}
      {page === 'profil' && <Profil onAction={handleAction} />}

      <BottomNav page={page} onNav={nav} />

      <SetorModal
        show={!!setorModal}
        onClose={closeSetor}
        mode={setorModal ? setorModal.mode : 'setor'}
        rencanaId={setorModal ? setorModal.rencanaId : null}
      />
      <RencanaModal
        show={rencanaModal !== null}
        onClose={closeRencana}
        preset={rencanaModal && rencanaModal.id ? rencanaModal : null}
      />
      <ProfilModal show={profilModal} onClose={closeProfil} />

      <Toast />
    </>
  )
}

function Toast() {
  const { toast } = useStore()
  return <div className={'toast' + (toast ? ' show' : '')}>{toast || ''}</div>
}
