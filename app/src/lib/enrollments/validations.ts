import { z } from 'zod'

export const createEnrollmentSchema = z.object({
  sessionId: z.string().uuid('梯次 ID 格式錯誤'),
})

export const rejectSchema = z.object({
  note: z.string().min(1, '退回原因為必填'),
})

export const statusChangeSchema = z.object({
  status: z.enum(['PENDING_MANAGER', 'PENDING_HR', 'CONFIRMED', 'REJECTED', 'CANCELLED']),
})

export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>
export type RejectInput = z.infer<typeof rejectSchema>
