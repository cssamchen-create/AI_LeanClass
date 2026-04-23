import { prisma } from '@/lib/prisma'
import type { QuizCreateInput } from './validations'

export async function getQuizByCourse(courseId: string) {
  return prisma.quiz.findUnique({
    where: { courseId },
    include: { questions: { orderBy: { order: 'asc' } } },
  })
}

export async function createQuiz(courseId: string, _hrId: string, data: QuizCreateInput) {
  const existing = await prisma.quiz.findUnique({ where: { courseId } })
  if (existing) throw new Error('課程已有測驗，請使用更新功能')

  const quiz = await prisma.quiz.create({
    data: {
      courseId,
      passingScore: data.passingScore,
      questions: {
        create: data.questions.map((q) => ({
          type: q.type,
          content: q.content,
          points: q.points,
          order: q.order,
          options: q.options ?? undefined,
        })),
      },
    },
  })

  await prisma.course.update({ where: { id: courseId }, data: { requiresQuiz: true } })

  return { quizId: quiz.id }
}

export async function updateQuiz(quizId: string, _hrId: string, data: QuizCreateInput) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, include: { attempts: { take: 1 } } })
  if (!quiz) throw new Error('測驗不存在')
  if (quiz.attempts.length > 0) throw new Error('已有員工作答記錄，不可修改題目內容')

  await prisma.quizQuestion.deleteMany({ where: { quizId } })
  await prisma.quiz.update({
    where: { id: quizId },
    data: {
      passingScore: data.passingScore,
      questions: {
        create: data.questions.map((q) => ({
          type: q.type,
          content: q.content,
          points: q.points,
          order: q.order,
          options: q.options ?? undefined,
        })),
      },
    },
  })

  return { quizId }
}
