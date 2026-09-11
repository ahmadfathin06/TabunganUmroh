export const ROLES = {
  USER: 'USER',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
};

export const ROLE_LABELS = {
  USER: 'Jamaah',
  ADMIN: 'Admin',
  SUPER_ADMIN: 'Super Admin',
};

export const DEPOSIT_STATUS = {
  PENDING: { label: 'Menunggu Verifikasi', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  APPROVED: { label: 'Disetujui', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  REJECTED: { label: 'Ditolak', badge: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
};

export const PLAN_STATUS = {
  ACTIVE: { label: 'Aktif', badge: 'bg-emerald-100 text-emerald-700' },
  PAID_OFF: { label: 'Lunas', badge: 'bg-teal-100 text-teal-700' },
  CANCELLED: { label: 'Dibatalkan', badge: 'bg-slate-100 text-slate-600' },
  DEPARTED: { label: 'Berangkat', badge: 'bg-indigo-100 text-indigo-700' },
};

export const PACKAGE_STATUS = {
  OPEN: { label: 'Buka', badge: 'bg-emerald-100 text-emerald-700' },
  CLOSED: { label: 'Tutup', badge: 'bg-rose-100 text-rose-700' },
  FULL: { label: 'Penuh', badge: 'bg-amber-100 text-amber-700' },
};

export const PAYMENT_METHODS = [
  { value: 'TRANSFER', label: 'Transfer Bank' },
  { value: 'CASH', label: 'Tunai (Kantor)' },
];

export const QUICK_AMOUNTS = [100000, 250000, 500000, 1000000, 2000000];