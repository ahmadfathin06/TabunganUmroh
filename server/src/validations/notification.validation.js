import { z } from 'zod';

export const pushSubscribeSchema = z.object({
  endpoint: z.string().url('Endpoint tidak valid'),
  keys: z.object({
    p256dh: z.string().min(1, 'Key p256dh wajib diisi'),
    auth: z.string().min(1, 'Key auth wajib diisi'),
  }),
}).strict();

export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().url('Endpoint tidak valid'),
}).strict();
