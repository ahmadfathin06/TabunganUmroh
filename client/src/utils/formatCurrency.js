export const formatCurrency = (value) => {
  const num = Number(value || 0);
  return 'Rp' + Math.round(num).toLocaleString('id-ID');
};

export const formatCurrencyShort = (value) => {
  const num = Number(value || 0);
  if (num >= 1000000000) return 'Rp' + (num / 1000000000).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' M';
  if (num >= 1000000) return 'Rp' + (num / 1000000).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' jt';
  if (num >= 1000) return 'Rp' + (num / 1000).toLocaleString('id-ID', { maximumFractionDigits: 0 }) + ' rb';
  return 'Rp' + num.toLocaleString('id-ID');
};