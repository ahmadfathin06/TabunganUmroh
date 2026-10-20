/**
 * Helper parsing nominal uang dari input user.
 *
 * Latar belakang: input uang memakai `type="text"` + `inputMode="numeric"`
 * (bukan `type="number"`) supaya user Indonesia bisa mengetik pemisah ribuan
 * gaya lokal. Dengan `type="number"`, browser melakukan sanitasi otomatis dan
 * "35.000.000" menjadi string kosong — target yang diketik user hilang tanpa
 * pemberitahuan, lalu `Number('')` = NaN → `JSON.stringify` mengubahnya jadi
 * `null` → rencana tersimpan TANPA target padahal user sudah mengisinya.
 */
export const parseAmountInput = (raw) => {
  if (typeof raw === 'number') return raw;
  if (raw == null) return NaN;

  const value = String(raw).trim();
  if (!value) return NaN;

  // "35.000.000" / "35,000,000" → pemisah ribuan gaya Indonesia.
  if (/^\d{1,3}([.,]\d{3})+$/.test(value)) {
    return Number(value.replace(/[.,]/g, ''));
  }

  // "35000000" / "35000.50" / "35000,50".
  if (/^\d+(?:[.,]\d+)?$/.test(value)) {
    return Number(value.replace(',', '.'));
  }

  return NaN;
};

/**
 * True bila input user berisi nominal yang valid (angka, bukan NaN).
 */
export const isValidAmountInput = (raw) => !Number.isNaN(parseAmountInput(raw));
