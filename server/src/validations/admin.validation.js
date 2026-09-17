import { z } from 'zod';

export const broadcastSchema = z.object({
  target: z.enum(['ALL', 'USER']),
  userId: z.string().optional(),
  title: z.string().min(1, 'Judul wajib diisi').max(100),
  message: z.string().min(1, 'Pesan wajib diisi').max(500),
}).strict();

export default { broadcastSchema };
