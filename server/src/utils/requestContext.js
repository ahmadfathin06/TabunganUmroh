/**
 * Correlation / request ID + redaksi log.
 *
 * Setiap request diberi ID korelasi (dari header `x-request-id` bila
 * valid, atau dibuat acak) yang disematkan ke `req.id` dan header
 * respons `x-request-id`. Error handler memakai ID ini agar jejak
 * request dapat dilacak di log tanpa mencetak token/secret/PII.
 *
 * `redact()` memetakan nilai mentah (error, header, body) menjadi
 * representasi aman untuk log — Authorization, Cookie, password,
 * token, API key, dan connection string TIDAK pernah tercetak.
 */
import crypto from 'crypto';

const REQUEST_ID_HEADER = 'x-request-id';
const MAX_ID_LENGTH = 128;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

/** Buat request ID acak yang tidak bisa ditebak. */
export const newRequestId = () => crypto.randomUUID();

/**
 * Normalisasi request ID dari header. Header publik tidak boleh
 * dipakai apa adanya (bisa membawa payload injection) — hanya
 * karakter aman yang diterima, sisanya diganti ID baru.
 */
export const sanitizeRequestId = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw || raw.length > MAX_ID_LENGTH) return null;
  return REQUEST_ID_PATTERN.test(raw) ? raw : null;
};

/**
 * Middleware: tentukan request ID, sematkan ke req + respons.
 */
export const requestContext = (req, res, next) => {
  const id = sanitizeRequestId(req.get(REQUEST_ID_HEADER)) || newRequestId();
  req.id = id;
  res.setHeader(REQUEST_ID_HEADER, id);
  next();
};

/** Header yang nilainya selalu diredaksi. */
const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'proxy-authorization',
]);

/** Kunci objek yang nilainya diredaksi (case-insensitive). */
const SENSITIVE_KEYS = [
  'password',
  'token',
  'accesstoken',
  'refreshtoken',
  'apikey',
  'api_key',
  'secret',
  'authorization',
  'cookie',
  'database_url',
  'connection_string',
];

const isSensitiveKey = (key) => {
  const normalized = String(key).replace(/[^a-z0-9]/gi, '').toLowerCase();
  return SENSITIVE_KEYS.some((sensitive) => normalized === sensitive || normalized.includes(sensitive));
};

/** Redaksi string — ganti substring mencurigakan dengan *** (tanpa menampilkan aslinya). */
const REDACT_PATTERNS = [
  /Bearer\s+[A-Za-z0-9._\-+/=]+/gi,
  /postgres(?:ql)?:\/\/[^\s"']+/gi,
  /re_[A-Za-z0-9]+/g, // Resend API key prefix
];

export const redactString = (value) => {
  let out = String(value ?? '');
  for (const pattern of REDACT_PATTERNS) out = out.replace(pattern, '[REDACTED]');
  return out;
};

/**
 * Redaksi struktur (header/body/error) secara rekursif, dangkal.
 * Hanya untuk log — TIDAK mengubah objek asli.
 */
export const redact = (value, depth = 0) => {
  if (value == null || typeof value !== 'object') {
    return typeof value === 'string' ? redactString(value) : value;
  }
  if (depth > 4) return '[MAX_DEPTH]';

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => redact(item, depth + 1));
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message),
      ...(value.status != null && { status: value.status }),
      ...(value.code && { code: value.code }),
    };
  }

  // Headers (insensitif case).
  const result = {};
  for (const [key, item] of Object.entries(value)) {
    const lower = String(key).toLowerCase();
    if (SENSITIVE_HEADERS.has(lower) || isSensitiveKey(key)) {
      result[key] = '[REDACTED]';
    } else {
      result[key] = redact(item, depth + 1);
    }
  }
  return result;
};

/** Format pesan log dengan request ID (tanpa data sensitif). */
export const logLine = (req, level, message, extra) => {
  const entry = {
    level,
    requestId: req?.id || null,
    message,
    ...(extra !== undefined && { extra: redact(extra) }),
  };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
  return line;
};

export default { requestContext, newRequestId, sanitizeRequestId, redact, redactString, logLine };
