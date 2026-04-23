import { z } from 'zod'

export const attendanceSchema = z.object({
  attendances: z.array(
    z.object({
      enrollmentId: z.string().min(1),
      attended: z.boolean(),
    })
  ).min(1, '出席名單不可為空'),
})

export const reflectionSchema = z.object({
  content: z.string().min(1, '心得內容不可為空白').trim(),
})

export const returnReflectionSchema = z.object({
  returnNote: z.string().min(1, '退回原因為必填').trim(),
})

export const gradeSchema = z.object({
  grades: z.array(
    z.object({
      questionId: z.string().min(1),
      score: z.number().int().min(0),
      graderNote: z.string().optional(),
    })
  ).min(1),
})

export const quizSubmitSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      answer: z.string().min(0),
    })
  ).min(1, '答案不可為空'),
})

export const quizCreateSchema = z.object({
  passingScore: z.number().int().min(1).max(100),
  questions: z.array(
    z.object({
      type: z.enum(['MULTIPLE_CHOICE', 'ESSAY']),
      content: z.string().min(1),
      points: z.number().int().min(1),
      order: z.number().int().min(1),
      options: z.array(
        z.object({
          text: z.string().min(1),
          isCorrect: z.boolean(),
        })
      ).optional(),
    })
  ).min(1, '測驗至少需要一道題目'),
})

export type AttendanceInput = z.infer<typeof attendanceSchema>
export type ReflectionInput = z.infer<typeof reflectionSchema>
export type ReturnReflectionInput = z.infer<typeof returnReflectionSchema>
export type GradeInput = z.infer<typeof gradeSchema>
export type QuizSubmitInput = z.infer<typeof quizSubmitSchema>
export type QuizCreateInput = z.infer<typeof quizCreateSchema>
