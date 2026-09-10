import { IcHome, IcWallet, IcTag, IcUser } from './Icons.jsx'

const items = [
  { key: 'beranda', label: 'Beranda', Icon: IcHome },
  { key: 'tabungan', label: 'Tabungan', Icon: IcWallet },
  { key: 'paket', label: 'Paket', Icon: IcTag },
  { key: 'akun', label: 'Akun', Icon: IcUser },
]

export default function BottomNav({ page, onNav }) {
  return (
    <nav className="bottom-nav">
      {items.map(({ key, label, Icon }) => (
        <button
          key={key}
          className={'nav-item' + (page === key ? ' active' : '')}
          onClick={() => onNav(key)}
        >
          <Icon />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
