import ApiResponse from '../utils/apiResponse.js';

/**
 * Label ramah untuk field yang sering divalidasi. Dipakai untuk menyusun
 * pesan 422 yang bisa langsung dibaca user (bukan "Validasi gagal" polos).
 */
export const FIELD_LABELS = {
  name: 'Nama',
  email: 'Email',
  password: 'Kata sandi',
  confirmPassword: 'Konfirmasi kata sandi',
  phone: 'Nomor HP',
  ktpNumber: 'No. KTP',
  address: 'Alamat',
  referralCode: 'Kode referral',
  hasPassport: 'Status paspor',
  packageId: 'Paket',
  targetAmount: 'Target tabungan',
  monthlyTarget: 'Target cicilan',
  jamaahName: 'Nama jamaah',
  jamaahRelation: 'Hubungan',
  reason: 'Alasan',
  savingsPlanId: 'Rencana tabungan',
  amount: 'Nominal setoran',
  bankAccountId: 'Rekening tujuan',
  action: 'Aksi',
  rejectionReason: 'Alasan penolakan',
  type: 'Jenis dokumen',
};

/**
 * Pesan zod bawaan berbahasa Inggris dan tidak selalu menyebut field yang
 * bermasalah. Untuk isu "unrecognized keys" (payload bawaan client lama /
 * field yang tidak dikenal) ganti dengan pesan yang menyebut key-nya.
 */
const issueMessage = (issue) => {
  if (issue.code === 'unrecognized_keys') {
    const keys = (issue.keys || []).map((k) => `"${k}"`).join(', ');
    return `Data tidak dikenal: ${keys}. Muat ulang halaman lalu coba lagi.`;
  }
  return issue.message;
};

/**
 * Susun ringkasan 422 yang menyebut field + alasannya.
 * Dipakai sebagai `message` utama respons; array `errors` tetap berisi
 * detail per field.
 */
export const summarizeValidationErrors = (errors) => {
  if (!Array.isArray(errors) || errors.length === 0) return 'Validasi gagal';

  const [first] = errors;
  const label = first.label || FIELD_LABELS[first.field] || first.field;
  const head = label ? `${label}: ${first.message}` : first.message;
  const extra = errors.length > 1 ? ` (+${errors.length - 1} masalah lain)` : '';
  return `Validasi gagal — ${head}${extra}`;
};

const validate = (schema) => {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        const errors = result.error.errors.map((err) => {
          const field = err.path.join('.');
          return {
            field,
            label: FIELD_LABELS[field] || null,
            message: issueMessage(err),
            code: err.code,
          };
        });
        return ApiResponse.error(res, summarizeValidationErrors(errors), 422, errors);
      }
      req.validatedData = result.data;
      next();
    } catch (error) {
      return ApiResponse.error(res, 'Validasi gagal', 422);
    }
  };
};

export default validate;
