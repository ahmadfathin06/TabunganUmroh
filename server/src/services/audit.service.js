/**
 * Audit log terstruktur untuk aksi admin/sensitif.
 *
 * Mencatat: approve/reject setoran, verifikasi dokumen,
 * perubahan paket, broadcast, perubahan role/status user.
 *
 * FORMAT: JSON terstruktur dengan requestId + aktor + aksi.
 * TIDAK pernah mencetak password, token, atau secret.
 *
 * CATATAN (residual risk): implementasi ini menulis ke
 * structured log. Untuk audit yang immutable/tertahan
 * (tamper-evident), sambungkan ke tabel `audit_log` atau
 * layanan SIEM — lihat laporan remediasi.
 */
import { redact } from '../utils/requestContext.js';

/**
 * Catat peristiwa audit.
 *
 * @param {object} req request Express (memuat req.id, req.user)
 * @param {'admin'|'system'} actorType jenis aktor
 * @param {string} action aksi (mis. 'deposit.approve')
 * @param {object} detail detail tambahan (diredaksi otomatis)
 */
export const auditLog = (req, actorType, action, detail = {}) => {
  const entry = {
    level: 'audit',
    requestId: req?.id || null,
    actorType,
    actorId: req?.user?.id || 'system',
    actorRole: req?.user?.role || null,
    action,
    detail: redact(detail),
    at: new Date().toISOString(),
  };
  console.log(JSON.stringify(entry));
  return entry;
};

/**
 * Catat perubahan role / status user (admin).
 */
export const auditUserChange = (req, targetUserId, change) =>
  auditLog(req, 'admin', 'user.change', { targetUserId, change });

export default { auditLog, auditUserChange };
