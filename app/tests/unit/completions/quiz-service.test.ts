import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  courseEnrollment: { findUnique: vi.fn(), update: vi.fn() },
  quizAttempt: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), count: vi.fn() },
  quizAnswer: { create: vi.fn(), findMany: vi.fn(), update: vi.fn() },
}))

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))
vi.mock('@/lib/enrollments/notification-service', () => ({
  sendNotification: vi.fn(),
  buildQuizGradedNotification: vi.fn().mockReturnValue({}),
}))

import { submitQuiz, gradeEssayAnswers, allowRetry } from '@/lib/completions/quiz-service'

beforeEach(() => vi.clearAllMocks())

const mcQuestion = {
  id: 'q-mc', type: 'MULTIPLE_CHOICE', content: '選擇題', points: 10, order: 1,
  options: [{ text: 'A', isCorrect: false }, { text: 'B', isCorrect: true }],
}
const essayQuestion = {
  id: 'q-essay', type: 'ESSAY', content: '簡答題', points: 20, order: 2, options: null,
}

const mockEnrollment = (quizQuestions: typeof mcQuestion[]) => ({
  id: 'enr-1', employeeId: 'emp-1', status: 'PENDING_QUIZ',
  session: { course: { quiz: { id: 'quiz-1', passingScore: 60, questions: quizQuestions } } },
})

describe('submitQuiz', () => {
  it('純選擇題答對則推進到 PENDING_HR_CLOSE', async () => {
    mockPrisma.courseEnrollment.findUnique.mockResolvedValue(mockEnrollment([mcQuestion]))
    mockPrisma.quizAttempt.count.mockResolvedValue(0)
    mockPrisma.quizAttempt.create.mockResolvedValue({ id: 'att-1' })
    mockPrisma.quizAnswer.create.mockResolvedValue({})
    mockPrisma.quizAttempt.update.mockResolvedValue({})
    mockPrisma.courseEnrollment.update.mockResolvedValue({})

    const result = await submitQuiz('enr-1', 'emp-1', [{ questionId: 'q-mc', answer: '1' }]) // index 1 = B = correct

    expect(result.pendingEssayGrading).toBe(false)
    expect(result.status).toBe('PENDING_HR_CLOSE')
  })

  it('純選擇題答錯且未通過則推進到 QUIZ_GRADING', async () => {
    mockPrisma.courseEnrollment.findUnique.mockResolvedValue(mockEnrollment([mcQuestion]))
    mockPrisma.quizAttempt.count.mockResolvedValue(0)
    mockPrisma.quizAttempt.create.mockResolvedValue({ id: 'att-1' })
    mockPrisma.quizAnswer.create.mockResolvedValue({})
    mockPrisma.quizAttempt.update.mockResolvedValue({})
    mockPrisma.courseEnrollment.update.mockResolvedValue({})

    const result = await submitQuiz('enr-1', 'emp-1', [{ questionId: 'q-mc', answer: '0' }]) // wrong

    expect(result.status).toBe('QUIZ_GRADING')
  })

  it('含簡答題時推進到 QUIZ_GRADING', async () => {
    mockPrisma.courseEnrollment.findUnique.mockResolvedValue(mockEnrollment([mcQuestion, essayQuestion]))
    mockPrisma.quizAttempt.count.mockResolvedValue(0)
    mockPrisma.quizAttempt.create.mockResolvedValue({ id: 'att-1' })
    mockPrisma.quizAnswer.create.mockResolvedValue({})
    mockPrisma.courseEnrollment.update.mockResolvedValue({})

    const result = await submitQuiz('enr-1', 'emp-1', [
      { questionId: 'q-mc', answer: '1' },
      { questionId: 'q-essay', answer: '我的答案' },
    ])

    expect(result.pendingEssayGrading).toBe(true)
    expect(result.status).toBe('QUIZ_GRADING')
  })

  it('重考時 attemptNumber 遞增', async () => {
    mockPrisma.courseEnrollment.findUnique.mockResolvedValue(mockEnrollment([mcQuestion]))
    mockPrisma.quizAttempt.count.mockResolvedValue(1) // 第一次已作答
    mockPrisma.quizAttempt.create.mockResolvedValue({ id: 'att-2' })
    mockPrisma.quizAnswer.create.mockResolvedValue({})
    mockPrisma.quizAttempt.update.mockResolvedValue({})
    mockPrisma.courseEnrollment.update.mockResolvedValue({})

    await submitQuiz('enr-1', 'emp-1', [{ questionId: 'q-mc', answer: '1' }])

    expect(mockPrisma.quizAttempt.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ attemptNumber: 2 }),
    })
  })
})

describe('gradeEssayAnswers', () => {
  it('所有題目評分完成後計算 totalScore 與 passed', async () => {
    const mockAttempt = {
      id: 'att-1', enrollmentId: 'enr-1', maxScore: 30,
      quiz: { passingScore: 60 },
      answers: [
        { id: 'ans-mc', questionId: 'q-mc', question: { type: 'MULTIPLE_CHOICE' }, score: 10 },
        { id: 'ans-essay', questionId: 'q-essay', question: { type: 'ESSAY' }, score: null },
      ],
      enrollment: {
        employee: { id: 'emp-1', name: '陳員工', email: 'emp@company.com' },
        session: { course: { name: '法治課程' } },
      },
    }
    mockPrisma.quizAttempt.findUnique.mockResolvedValue(mockAttempt)
    mockPrisma.quizAnswer.update.mockResolvedValue({})
    mockPrisma.quizAnswer.findMany.mockResolvedValue([
      { questionId: 'q-mc', question: { type: 'MULTIPLE_CHOICE' }, score: 10 },
      { questionId: 'q-essay', score: 18 },
    ])
    mockPrisma.quizAttempt.update.mockResolvedValue({})
    mockPrisma.courseEnrollment.update.mockResolvedValue({})

    const result = await gradeEssayAnswers('att-1', 'hr-1', [{ questionId: 'q-essay', score: 18 }])

    expect(result.allGraded).toBe(true)
    expect(result.totalScore).toBe(28)
    expect(result.passed).toBe(true) // 28/30 = 93% >= 60%
  })
})

describe('allowRetry', () => {
  it('成功重置為 PENDING_QUIZ', async () => {
    mockPrisma.courseEnrollment.findUnique.mockResolvedValue({ id: 'enr-1', status: 'QUIZ_GRADING' })
    mockPrisma.courseEnrollment.update.mockResolvedValue({})
    mockPrisma.quizAttempt.count.mockResolvedValue(1)

    const result = await allowRetry('enr-1', 'hr-1')

    expect(mockPrisma.courseEnrollment.update).toHaveBeenCalledWith({
      where: { id: 'enr-1' },
      data: { status: 'PENDING_QUIZ' },
    })
    expect(result.newAttemptNumber).toBe(2)
  })

  it('申請不在可重考狀態時拋出錯誤', async () => {
    mockPrisma.courseEnrollment.findUnique.mockResolvedValue({ id: 'enr-1', status: 'COMPLETED' })
    await expect(allowRetry('enr-1', 'hr-1')).rejects.toThrow('申請不在可重考狀態')
  })
})
