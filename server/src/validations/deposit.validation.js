import { z } from 'zod';

export const createDepositSchema = z.object({
  savingsPlanId: z.string().min(1, 'Savings plan ID wajib'),
  amount: z.number().min(10000, 'Minimal setor Rp 10.000'),
  bankAccountId: z.string().min(1, 'Rekening tujuan wajib dipilih'),
});

export const verifyDepositSchema = z.object({
  action: z.enum(['approve', 'reject']),
  rejectionReason: z.string().optional(),
});