import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  courseSession: { findUnique: vi.fn() },
  courseEnrollment: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  courseReflection: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  employeeTrainingRecord: { findUnique: vi.fn(), upsert: vi.fn() },
}))

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))
vi.mock('@/lib/enrollments/notification-service', () => ({
  sendNotification: vi.fn(),
  buildAttendanceConfirmedNotification: vi.fn().mockReturnValue({}),
  buildCourseCompletedNotification: vi.fn().mockReturnValue({}),
}))
vi.mock('@/lib/completions/training-record-service', () => ({
  updateTrainingRecord: vi.fn().mockResolvedValue({ year: 2026, hoursAdded: 6, creditsAdded: 0, newAnnualHours: 6 }),
}))

import { confirmAttendance, closeEnrollment } from '@/lib/completions/service'
import { submitReflection, returnReflection } from '@/lib/completions/reflection-service'

beforeEach(() => vi.clearAllMocks())

const mockCourse = {
  name: '法治教育課程',
  requiresReflection: true,
  isGroupCourse: false,
  requiresQuiz: true,
  isNewHireTraining: false,
  measurementUnit: 'HOURS',
  measurementValue: 6,
}

const mockEmployee = { id: 'emp-1', name: '陳員工', email: 'emp@company.com' }

describe('confirmAttendance', () => {
  it('出席後狀態根據課程屬性自動推進', async () => {
    mockPrisma.courseSession.findUnique.mockResolvedValue({ id: 'ses-1', course: mockCourse })
    mockPrisma.courseEnrollment.findFirst.mockResolvedValue({
      id: 'enr-1', employeeId: 'emp-1', sessionId: 'ses-1', status: 'CONFIRMED',
      employee: mockEmployee,
    })
    mockPrisma.courseEnrollment.update.mockResolvedValue({})

    const result = await confirmAttendance('ses-1', [{ enrollmentId: 'enr-1', attended: true }], 'hr-1')

    expect(mockPrisma.courseEnrollment.update).toHaveBeenCalledWith({
      where: { id: 'enr-1' },
      data: { status: 'PENDING_REFLECTION' }, // requiresReflection=true → PENDING_REFLECTION
    })
    expect(result.attended).toBe(1)
    expect(result.absent).toBe(0)
  })

  it('集團內課程出席後直接推進到 PENDING_HR_CLOSE', async () => {
    const internalCourse = { ...mockCourse, isGroupCourse: true }
    mockPrisma.courseSession.findUnique.mockResolvedValue({ id: 'ses-1', course: internalCourse })
    mockPrisma.courseEnrollment.findFirst.mockResolvedValue({
      id: 'enr-1', employeeId: 'emp-1', sessionId: 'ses-1', status: 'CONFIRMED',
      employee: mockEmployee,
    })
    mockPrisma.courseEnrollment.update.mockResolvedValue({})

    await confirmAttendance('ses-1', [{ enrollmentId: 'enr-1', attended: true }], 'hr-1')

    expect(mockPrisma.courseEnrollment.update).toHaveBeenCalledWith({
      where: { id: 'enr-1' },
      data: { status: 'PENDING_HR_CLOSE' },
    })
  })

  it('無心得無測驗課程出席後直接推進到 PENDING_HR_CLOSE', async () => {
    const simpleCourse = { ...mockCourse, requiresReflection: false, requiresQuiz: false }
    mockPrisma.courseSession.findUnique.mockResolvedValue({ id: 'ses-1', course: simpleCourse })
    mockPrisma.courseEnrollment.findFirst.mockResolvedValue({
      id: 'enr-1', employeeId: 'emp-1', sessionId: 'ses-1', status: 'CONFIRMED',
      employee: mockEmployee,
    })
    mockPrisma.courseEnrollment.update.mockResolvedValue({})

    await confirmAttendance('ses-1', [{ enrollmentId: 'enr-1', attended: true }], 'hr-1')

    expect(mockPrisma.courseEnrollment.update).toHaveBeenCalledWith({
      where: { id: 'enr-1' },
      data: { status: 'PENDING_HR_CLOSE' },
    })
  })

  it('缺席時狀態更新為 ABSENT', async () => {
    mockPrisma.courseSession.findUnique.mockResolvedValue({ id: 'ses-1', course: mockCourse })
    mockPrisma.courseEnrollment.findFirst.mockResolvedValue({
      id: 'enr-1', employeeId: 'emp-1', sessionId: 'ses-1', status: 'CONFIRMED',
      employee: mockEmployee,
    })
    mockPrisma.courseEnrollment.update.mockResolvedValue({})

    const result = await confirmAttendance('ses-1', [{ enrollmentId: 'enr-1', attended: false }], 'hr-1')

    expect(mockPrisma.courseEnrollment.update).toHaveBeenCalledWith({
      where: { id: 'enr-1' },
      data: { status: 'ABSENT' },
    })
    expect(result.absent).toBe(1)
  })

  it('梯次不存在時拋出錯誤', async () => {
    mockPrisma.courseSession.findUnique.mockResolvedValue(null)
    await expect(confirmAttendance('nonexistent', [], 'hr-1')).rejects.toThrow('梯次不存在')
  })
})

describe('closeEnrollment', () => {
  it('申請不在 PENDING_HR_CLOSE 時拋出錯誤', async () => {
    mockPrisma.courseEnrollment.findUnique.mockResolvedValue({
      id: 'enr-1', status: 'ATTENDED', employee: mockEmployee,
      session: { course: mockCourse }, reflection: null, quizAttempts: [],
    })
    await expect(closeEnrollment('enr-1', 'hr-1')).rejects.toThrow('申請不在可結案狀態')
  })

  it('有未完成步驟時拒絕結案', async () => {
    mockPrisma.courseEnrollment.findUnique.mockResolvedValue({
      id: 'enr-1', status: 'PENDING_HR_CLOSE', employeeId: 'emp-1',
      employee: mockEmployee,
      session: { id: 'ses-1', course: { ...mockCourse, requiresReflection: true, requiresQuiz: false } },
      reflection: null, // 心得未填
      quizAttempts: [],
    })
    await expect(closeEnrollment('enr-1', 'hr-1')).rejects.toThrow('尚有未完成步驟')
  })

  it('所有步驟完成時成功結案', async () => {
    mockPrisma.courseEnrollment.findUnique.mockResolvedValue({
      id: 'enr-1', status: 'PENDING_HR_CLOSE', employeeId: 'emp-1',
      sessionId: 'ses-1',
      employee: mockEmployee,
      session: {
        id: 'ses-1',
        course: { ...mockCourse, requiresReflection: false, requiresQuiz: false },
      },
      reflection: null,
      quizAttempts: [],
    })
    mockPrisma.courseEnrollment.update.mockResolvedValue({})

    const result = await closeEnrollment('enr-1', 'hr-1')
    expect(result.status).toBe('COMPLETED')
  })
})

describe('submitReflection', () => {
  it('心得必填課程送出後狀態推進到 PENDING_QUIZ（若有測驗）', async () => {
    mockPrisma.courseEnrollment.findUnique.mockResolvedValue({
      id: 'enr-1', employeeId: 'emp-1', status: 'PENDING_REFLECTION',
      session: { course: { ...mockCourse, requiresQuiz: true } },
    })
    mockPrisma.courseReflection.findUnique.mockResolvedValue(null)
    mockPrisma.courseReflection.create.mockResolvedValue({})
    mockPrisma.courseEnrollment.update.mockResolvedValue({})

    await submitReflection('enr-1', 'emp-1', '本次課程讓我了解...')

    expect(mockPrisma.courseEnrollment.update).toHaveBeenCalledWith({
      where: { id: 'enr-1' },
      data: { status: 'PENDING_QUIZ' },
    })
  })

  it('無測驗課程送出心得後狀態推進到 PENDING_HR_CLOSE', async () => {
    mockPrisma.courseEnrollment.findUnique.mockResolvedValue({
      id: 'enr-1', employeeId: 'emp-1', status: 'PENDING_REFLECTION',
      session: { course: { ...mockCourse, requiresQuiz: false } },
    })
    mockPrisma.courseReflection.findUnique.mockResolvedValue(null)
    mockPrisma.courseReflection.create.mockResolvedValue({})
    mockPrisma.courseEnrollment.update.mockResolvedValue({})

    await submitReflection('enr-1', 'emp-1', '本次課程讓我了解...')

    expect(mockPrisma.courseEnrollment.update).toHaveBeenCalledWith({
      where: { id: 'enr-1' },
      data: { status: 'PENDING_HR_CLOSE' },
    })
  })

  it('已鎖定的心得不可重複送出', async () => {
    mockPrisma.courseEnrollment.findUnique.mockResolvedValue({
      id: 'enr-1', employeeId: 'emp-1', status: 'PENDING_REFLECTION',
      session: { course: mockCourse },
    })
    mockPrisma.courseReflection.findUnique.mockResolvedValue({ isLocked: true })

    await expect(submitReflection('enr-1', 'emp-1', '內容')).rejects.toThrow('心得已送出且已鎖定')
  })

  it('非本人無法送出心得', async () => {
    mockPrisma.courseEnrollment.findUnique.mockResolvedValue({
      id: 'enr-1', employeeId: 'emp-other', status: 'PENDING_REFLECTION',
      session: { course: mockCourse },
    })
    await expect(submitReflection('enr-1', 'emp-1', '內容')).rejects.toThrow('無權限')
  })
})
