import { z } from 'zod'

export const commitmentCourseSchema = z.object({
  requiresCommitment: z.boolean(),
  commitmentMonths: z.number().int().min(1).max(120).optional().nullable(),
  commitmentFee: z.number().min(0).optional().nullable(),
}).refine(
  (data) => {
    if (data.requiresCommitment) {
      return data.commitmentMonths != null && data.commitmentFee != null
    }
    return true
  },
  { message: '啟用服務承諾時，留任年限與課程費用為必填', path: ['commitmentMonths'] },
)

export const resignSchema = z.object({
  resignedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '離職日期格式必須為 YYYY-MM-DD'),
})

export type CommitmentCourseInput = z.infer<typeof commitmentCourseSchema>
export type ResignInput = z.infer<typeof resignSchema>
