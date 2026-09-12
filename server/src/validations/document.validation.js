import { z } from 'zod';

export const verifyDocumentSchema = z.object({
  action: z.enum(['approve', 'reject']),
  rejectionReason: z.string().optional(),
});
