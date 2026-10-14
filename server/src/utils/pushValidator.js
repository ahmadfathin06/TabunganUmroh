/**
 * Validasi endpoint Web Push (anti-SSRF).
 *
 * Endpoint push subscription dikirim client dan
 * dipakai server untuk mengirim permintaan HTTP ke
 * penyedia push (Google/Mozilla). Sebelumnya hanya
 * divalidasi `z.string().url()` — memungkinkan
 * endpoint seperti `http://localhost/admin`,
 * `http://169.254.169.254/...` (metadata cloud),
 * atau host arbitrer → SSRF dari server.
 *
 * Modul ini membatasi endpoint:
 *   - WAJIB https;
 *   - host HARUS penyedia push yang didukung
 *     (allowlist), bukan host arbitrer;
 *   - menolak localhost/loopback/private/link-local/
 *     metadata IP;
 *   - membatasi panjang endpoint & key.
 */

/** Penyedia push yang diizinkan (allowlist host). */
export const ALLOWED_PUSH_HOSTS = new Set([
  // Google (Chrome/Edge/Firebase)
  'fcm.googleapis.com',
  'android.googleapis.com',
  'updates.push.services.mozilla.com',
  'push.services.mozilla.com',
  // Mozilla autopush
  'autopush.services.mozilla.com',
]);

/** Panjang maksimum (byte) endpoint & key base64. */
export const MAX_ENDPOINT_LENGTH = 2048;
export const MAX_KEY_LENGTH = 512;

/** Skema yang diizinkan. */
export const ALLOWED_PROTOCOL = 'https:';

const PORT_BLACKLIST = new Set(['', '443']);

/**
 * Apakah host termasuk IP literal yang dilarang
 * (loopback, private, link-local, metadata)?
 * @param {string} host
 */
export const isForbiddenIpHost = (host) => {
  if (!host) return false;

  // IPv4 literal.
  const ipv4 = host.match(/^(\d{1,3})(?:\.(\d{1,3})){3}$/);
  if (ipv4) {
    const octets = [ipv4[1], ipv4[2], ipv4[3], ipv4[4]].map(Number);
    if (octets.some((o) => o > 255)) return true; // malformed → larang
    const [a, b] = octets;
    if (a === 127) return true; // loopback
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 169 && b === 254) return true; // link-local + metadata
    if (a === 0) return true; // 0.0.0.0
    return false;
  }

  // IPv6 literal (dalam tanda kurung sudah di-strip).
  if (host.includes(':')) {
    const normalized = host.toLowerCase();
    if (normalized === '::1' || normalized === '::') return true;
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // ULA
    if (normalized.startsWith('fe8') || normalized.startsWith('fe9')
      || normalized.startsWith('fea') || normalized.startsWith('feb')) return true; // link-local
    if (normalized.startsWith('169.254')) return true;
    return false;
  }

  // Hostname biasa (bukan IP).
  return false;
};

/**
 * Validasi endpoint push subscription.
 *
 * @param {string} endpoint URL endpoint push
 * @returns {{ok: boolean, reason?: string, host?: string}}
 */
export const validatePushEndpoint = (endpoint) => {
  const raw = String(endpoint ?? '').trim();

  if (!raw) return { ok: false, reason: 'EMPTY' };
  if (raw.length > MAX_ENDPOINT_LENGTH) return { ok: false, reason: 'TOO_LONG' };

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, reason: 'INVALID_URL' };
  }

  if (parsed.protocol !== ALLOWED_PROTOCOL) {
    return { ok: false, reason: 'NOT_HTTPS' };
  }

  // Host tanpa port, lowercased.
  const host = parsed.hostname.toLowerCase();

  if (isForbiddenIpHost(host)) {
    return { ok: false, reason: 'FORBIDDEN_IP' };
  }

  // localhost / loopback aliases.
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) {
    return { ok: false, reason: 'LOCALHOST' };
  }

  if (!ALLOWED_PUSH_HOSTS.has(host)) {
    return { ok: false, reason: 'HOST_NOT_ALLOWED' };
  }

  // Port non-standar dilarang (kecuali 443/default).
  const p = parsed.port;
  if (p && !PORT_BLACKLIST.has(p)) {
    return { ok: false, reason: 'PORT_NOT_ALLOWED' };
  }

  return { ok: true, host };
};

/**
 * Validasi kunci push (p256dh / auth) — base64url,
 * panjang terbatas.
 */
export const validatePushKey = (key) => {
  const raw = String(key ?? '').trim();
  if (!raw) return { ok: false, reason: 'EMPTY' };
  if (raw.length > MAX_KEY_LENGTH) return { ok: false, reason: 'TOO_LONG' };
  if (!/^[A-Za-z0-9_-]+={0,2}$/.test(raw)) {
    return { ok: false, reason: 'INVALID_ENCODING' };
  }
  return { ok: true };
};

export default {
  ALLOWED_PUSH_HOSTS,
  validatePushEndpoint,
  validatePushKey,
  isForbiddenIpHost,
};
