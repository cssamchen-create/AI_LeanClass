import { z } from 'zod'

const baseCourseSchema = z.object({
  name: z.string().min(1, '課程名稱為必填'),
  categoryId: z.string().min(1, '課程類別為必填'),
  measurementUnit: z.enum(['CREDIT', 'HOURS'], { message: '請選擇計量單位' }),
  measurementValue: z.number().positive('數值必須大於 0'),
  requiresReflection: z.boolean().default(true),
  isGroupCourse: z.boolean().default(false),
  requiresCommitment: z.boolean().default(false),
  commitmentMonths: z.number().int().min(1).max(120).optional().nullable(),
  commitmentFee: z.number().min(0).optional().nullable(),
})

const commitmentRefine = (data: { requiresCommitment?: boolean; commitmentMonths?: number | null; commitmentFee?: number | null }) => {
  if (data.requiresCommitment) {
    return data.commitmentMonths != null && data.commitmentFee != null
  }
  return true
}

export const createCourseSchema = baseCourseSchema.refine(commitmentRefine, {
  message: '啟用服務承諾時，留任年限與課程費用為必填',
  path: ['commitmentMonths'],
})

export const updateCourseSchema = baseCourseSchema.partial().refine(commitmentRefine, {
  message: '啟用服務承諾時，留任年限與課程費用為必填',
  path: ['commitmentMonths'],
})

export const statusChangeSchema = z.object({
  status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE']),
})

export const createSessionSchema = z.object({
  startDate: z.string().min(1, '開課日期為必填'),
  endDate: z.string().optional(),
  location: z.string().min(1, '地點為必填'),
  instructorName: z.string().min(1, '講師姓名為必填'),
  capacity: z.number().int().positive('名額必須為正整數'),
})

export type CreateCourseInput = z.infer<typeof createCourseSchema>
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>
export type StatusChangeInput = z.infer<typeof statusChangeSchema>
export type CreateSessionInput = z.infer<typeof createSessionSchema>
