import { motion } from 'motion/react';
import { Wallet, Clock } from 'lucide-react';
import { KaabaIcon } from '../landing/Ornament';

const ITEMS = [
  { key: 'deposit', label: 'Setor Tabungan', Icon: Wallet },
  { key: 'plan', label: 'Rencana Umrah', Icon: KaabaIcon },
  { key: 'history', label: 'Histori Transaksi', Icon: Clock },
];

/**
 * Tiga aksi cepat bergaya emas (icon di atas, label di bawah).
 * Selalu 3 kolom — nyaman di layar kecil maupun lebar.
 */
export default function QuickActions({ onDeposit, onPlan, onHistory }) {
  const handlers = { deposit: onDeposit, plan: onPlan, history: onHistory };

  return (
    <div className="grid grid-cols-3 gap-3 md:gap-4">
      {ITEMS.map(({ key, label, Icon }, i) => (
        <motion.button
          key={key}
          type="button"
          onClick={handlers[key]}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.97 }}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-gold-200 via-gold-300 to-gold-500 px-2 py-3.5 text-night shadow-[0_12px_30px_-16px_rgba(212,162,76,0.95)] ring-1 ring-inset ring-white/40 transition-colors hover:from-gold-300 hover:to-gold-600 md:gap-2.5 md:py-5"
        >
          <Icon className="h-6 w-6 text-night md:h-7 md:w-7" />
          <span className="text-[11px] font-bold leading-tight md:text-xs">{label}</span>
        </motion.button>
      ))}
    </div>
  );
}
