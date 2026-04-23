import { prisma } from '@/lib/prisma'
import { sendNotification, buildQuizGradedNotification } from '@/lib/enrollments/notification-service'
import type { EnrollmentStatus } from '@prisma/client'

export async function getQuizForEnrollment(enrollmentId: string, employeeId: string) {
  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { id: enrollmentId },
    include: { session: { include: { course: { include: { quiz: { include: { questions: { orderBy: { order: 'asc' } } } } } } } } },
  })
  if (!enrollment) throw new Error('申請不存在')
  if (enrollment.employeeId !== employeeId) throw new Error('無權限')
  if (enrollment.status !== 'PENDING_QUIZ') throw new Error('申請不在可作答測驗狀態')

  const quiz = enrollment.session.course.quiz
  if (!quiz) throw new Error('課程尚未設定測驗')

  const attemptCount = await prisma.quizAttempt.count({ where: { enrollmentId } })

  return {
    quizId: quiz.id,
    passingScore: quiz.passingScore,
    totalPoints: quiz.questions.reduce((sum, q) => sum + q.points, 0),
    attemptNumber: attemptCount + 1,
    questions: quiz.questions.map((q) => ({
      id: q.id,
      type: q.type,
      content: q.content,
      points: q.points,
      order: q.order,
      options: q.type === 'MULTIPLE_CHOICE' && q.options
        ? (q.options as Array<{ text: string; isCorrect: boolean }>).map((o) => o.text)
        : undefined,
    })),
  }
}

export async function submitQuiz(
  enrollmentId: string,
  employeeId: string,
  answers: Array<{ questionId: string; answer: string }>,
) {
  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      session: { include: { course: { include: { quiz: { include: { questions: true } } } } } },
    },
  })
  if (!enrollment) throw new Error('申請不存在')
  if (enrollment.employeeId !== employeeId) throw new Error('無權限')
  if (enrollment.status !== 'PENDING_QUIZ') throw new Error('申請不在可作答測驗狀態')

  const quiz = enrollment.session.course.quiz
  if (!quiz) throw new Error('課程尚未設定測驗')

  const attemptCount = await prisma.quizAttempt.count({ where: { enrollmentId } })
  const maxScore = quiz.questions.reduce((sum, q) => sum + q.points, 0)

  const attempt = await prisma.quizAttempt.create({
    data: {
      enrollmentId,
      quizId: quiz.id,
      attemptNumber: attemptCount + 1,
      maxScore,
    },
  })

  let autoScore = 0
  let hasEssay = false

  for (const { questionId, answer } of answers) {
    const question = quiz.questions.find((q) => q.id === questionId)
    if (!question) continue

    let score: number | null = null
    if (question.type === 'MULTIPLE_CHOICE') {
      const options = question.options as Array<{ text: string; isCorrect: boolean }> | null
      const correctIdx = options?.findIndex((o) => o.isCorrect) ?? -1
      score = parseInt(answer) === correctIdx ? question.points : 0
      autoScore += score
    } else {
      hasEssay = true
    }

    await prisma.quizAnswer.create({
      data: {
        attemptId: attempt.id,
        questionId,
        answer,
        score,
        gradedAt: score !== null ? new Date() : null,
      },
    })
  }

  let newStatus: EnrollmentStatus
  if (hasEssay) {
    newStatus = 'QUIZ_GRADING'
  } else {
    const percentage = maxScore > 0 ? (autoScore / maxScore) * 100 : 0
    const passed = percentage >= quiz.passingScore
    await prisma.quizAttempt.update({
      where: { id: attempt.id },
      data: { totalScore: autoScore, passed, gradedAt: new Date() },
    })
    newStatus = passed ? 'PENDING_HR_CLOSE' : 'QUIZ_GRADING'
  }

  await prisma.courseEnrollment.update({ where: { id: enrollmentId }, data: { status: newStatus } })

  return {
    attemptId: attempt.id,
    autoScore,
    maxAutoScore: hasEssay ? undefined : maxScore,
    pendingEssayGrading: hasEssay,
    status: newStatus,
  }
}

export async function gradeEssayAnswers(
  attemptId: string,
  _hrId: string,
  grades: Array<{ questionId: string; score: number; graderNote?: string }>,
) {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      answers: true,
      quiz: { include: { questions: true } },
      enrollment: {
        include: {
          employee: { select: { id: true, name: true, email: true } },
          session: { include: { course: { select: { name: true } } } },
        },
      },
    },
  })
  if (!attempt) throw new Error('作答記錄不存在')

  for (const { questionId, score, graderNote } of grades) {
    const answer = attempt.answers.find((a) => a.questionId === questionId)
    if (!answer) continue
    if (score < 0) throw new Error('分數不可為負數')
    const question = attempt.quiz.questions.find((q) => q.id === questionId)
    if (question && score > question.points) throw new Error(`分數不可超過題目配分（${question.points} 分）`)

    await prisma.quizAnswer.update({
      where: { id: answer.id },
      data: { score, graderNote: graderNote ?? null, gradedAt: new Date() },
    })
  }

  const updatedAnswers = await prisma.quizAnswer.findMany({ where: { attemptId } })
  const allGraded = updatedAnswers.every((a) => a.score !== null)

  if (allGraded) {
    const totalScore = updatedAnswers.reduce((sum, a) => sum + (a.score ?? 0), 0)
    const percentage = attempt.maxScore > 0 ? (totalScore / attempt.maxScore) * 100 : 0
    const passed = percentage >= attempt.quiz.passingScore

    await prisma.quizAttempt.update({
      where: { id: attemptId },
      data: { totalScore, passed, gradedAt: new Date() },
    })

    const newStatus: EnrollmentStatus = passed ? 'PENDING_HR_CLOSE' : 'QUIZ_GRADING'
    await prisma.courseEnrollment.update({
      where: { id: attempt.enrollmentId },
      data: { status: newStatus },
    })

    await sendNotification(
      buildQuizGradedNotification(
        attempt.enrollment.employee,
        attempt.enrollment.session.course.name,
        totalScore,
        attempt.maxScore,
        passed,
        attempt.enrollmentId,
      )
    )

    return { totalScore, maxScore: attempt.maxScore, passed, allGraded }
  }

  return { allGraded: false }
}

export async function allowRetry(enrollmentId: string, _hrId: string) {
  const enrollment = await prisma.courseEnrollment.findUnique({ where: { id: enrollmentId } })
  if (!enrollment) throw new Error('申請不存在')
  if (enrollment.status !== 'QUIZ_GRADING' && enrollment.status !== 'PENDING_QUIZ') {
    throw new Error('申請不在可重考狀態')
  }

  await prisma.courseEnrollment.update({ where: { id: enrollmentId }, data: { status: 'PENDING_QUIZ' } })

  const attemptCount = await prisma.quizAttempt.count({ where: { enrollmentId } })
  return { newAttemptNumber: attemptCount + 1 }
}
