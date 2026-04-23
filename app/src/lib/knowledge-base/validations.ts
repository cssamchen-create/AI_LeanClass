import { z } from 'zod'

export const createResourceSchema = z.object({
  title: z.string().min(1, '標題為必填'),
  type: z.enum(['LINK', 'TEXT']),
  content: z.string().min(1, '內容為必填'),
  order: z.coerce.number().int().min(0).default(0),
})

export const updateResourceSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.enum(['LINK', 'TEXT']).optional(),
  content: z.string().min(1).optional(),
  order: z.coerce.number().int().min(0).optional(),
})

export type CreateResourceInput = z.infer<typeof createResourceSchema>
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>
