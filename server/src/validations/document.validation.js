import { z } from 'zod';

export const uploadDocumentSchema = z.object({
  type: z.enum(['KTP', 'PASSPORT', 'PHOTO', 'OTHER']),
}).strict();

export const verifyDocumentSchema = z.object({
  action: z.enum(['approve', 'reject']),
  rejectionReason: z.string().optional(),
}).strict();
