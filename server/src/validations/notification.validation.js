import { z } from 'zod';
import {
  validatePushEndpoint,
  validatePushKey,
  MAX_ENDPOINT_LENGTH,
  MAX_KEY_LENGTH,
} from '../utils/pushValidator.js';

/**
 * Validasi subscription Web Push (P1 — anti-SSRF).
 *
 * Sebelumnya hanya `z.string().url()` — endpoint
 * arbitrer (http://localhost, http://169.254.169.254,
 * host internal) diterima dan server mengirim push
 * ke sana → SSRF.
 *
 * Sekarang endpoint divalidasi dengan validator
 * khusus: https + host allowlist + menolak
 * loopback/private/metadata IP + batas panjang.
 */
const pushEndpoint = z
  .string()
  .refine((value) => validatePushEndpoint(value).ok, {
    message: `Endpoint push tidak valid (wajib HTTPS dari penyedia push; maks ${MAX_ENDPOINT_LENGTH} karakter)`,
  });

const pushKey = z
  .string()
  .refine((value) => validatePushKey(value).ok, {
    message: `Key push tidak valid (base64url, maks ${MAX_KEY_LENGTH} karakter)`,
  });

export const pushSubscribeSchema = z
  .object({
    endpoint: pushEndpoint,
    keys: z.object({
      p256dh: pushKey,
      auth: pushKey,
    }),
  })
  .strict();

export const pushUnsubscribeSchema = z
  .object({
    endpoint: pushEndpoint,
  })
  .strict();

export default { pushSubscribeSchema, pushUnsubscribeSchema };
