import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  courseSession: { findUnique: vi.fn() },
  courseEnrollment: { findFirst: vi.fn(), create: vi.fn(), findMany: vi.fn(), update: vi.fn(), count: vi.fn() },
  waitlistEntry: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), count: vi.fn(), update: vi.fn() },
  employee: { findUnique: vi.fn() },
  $transaction: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))
vi.mock('@/lib/enrollments/notification-service', () => ({
  sendNotification: vi.fn(),
  buildEnrollmentSubmittedNotification: vi.fn().mockReturnValue({}),
  buildManagerReviewNeededNotification: vi.fn().mockReturnValue({}),
  buildManagerReviewResultNotification: vi.fn().mockReturnValue({}),
  buildHRReviewResultNotification: vi.fn().mockReturnValue({}),
  buildWaitlistJoinedNotification: vi.fn().mockReturnValue({}),
}))
vi.mock('@/lib/enrollments/waitlist-service', () => ({
  promoteNextWaitlistEntry: vi.fn(),
}))

import { createEnrollment, approveByManager, rejectByManager } from '@/lib/enrollments/service'

const mockSessionData = {
  id: 'ses-1',
  status: 'OPEN',
  capacity: 10,
  enrolledCount: 5,
  course: { id: 'crs-1', name: '法治教育課程', requiresReflection: true },
  startDate: new Date('2026-05-10'),
}

const mockEmployeeData = {
  id: 'emp-1',
  name: '陳員工',
  email: 'emp@company.com',
  managerId: 'mgr-1',
  manager: { id: 'mgr-1', name: '張主管', email: 'mgr@company.com' },
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createEnrollment', () => {
  it('有名額時建立 PENDING_MANAGER 申請', async () => {
    mockPrisma.courseSession.findUnique.mockResolvedValue(mockSessionData)
    mockPrisma.courseEnrollment.findFirst.mockResolvedValue(null)
    mockPrisma.employee.findUnique.mockResolvedValue(mockEmployeeData)
    const createdEnrollment = { id: 'enr-1', status: 'PENDING_MANAGER', employeeId: 'emp-1', sessionId: 'ses-1' }
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma))
    mockPrisma.courseEnrollment.create.mockResolvedValue(createdEnrollment)

    const result = await createEnrollment({ sessionId: 'ses-1' }, 'emp-1')

    expect(result.type).toBe('enrollment')
    if (result.type === 'enrollment') {
      expect(result.enrollment.status).toBe('PENDING_MANAGER')
    }
  })

  it('名額已滿時建立等待名單', async () => {
    const fullSession = { ...mockSessionData, enrolledCount: 10 }
    mockPrisma.courseSession.findUnique.mockResolvedValue(fullSession)
    mockPrisma.courseEnrollment.findFirst.mockResolvedValue(null)
    mockPrisma.waitlistEntry.findUnique.mockResolvedValue(null)
    mockPrisma.employee.findUnique.mockResolvedValue(mockEmployeeData)
    mockPrisma.waitlistEntry.count.mockResolvedValue(2)
    const createdEntry = { id: 'wl-1', status: 'WAITING', position: 3, employeeId: 'emp-1', sessionId: 'ses-1' }
    mockPrisma.waitlistEntry.create.mockResolvedValue(createdEntry)

    const result = await createEnrollment({ sessionId: 'ses-1' }, 'emp-1')

    expect(result.type).toBe('waitlist')
    if (result.type === 'waitlist') {
      expect(result.waitlistEntry.status).toBe('WAITING')
    }
  })

  it('梯次不是 OPEN 時拒絕申請', async () => {
    const cancelledSession = { ...mockSessionData, status: 'CANCELLED' }
    mockPrisma.courseSession.findUnique.mockResolvedValue(cancelledSession)

    await expect(createEnrollment({ sessionId: 'ses-1' }, 'emp-1')).rejects.toThrow('梯次不開放報名')
  })

  it('已有有效申請時拒絕重複申請', async () => {
    mockPrisma.courseSession.findUnique.mockResolvedValue(mockSessionData)
    mockPrisma.courseEnrollment.findFirst.mockResolvedValue({ id: 'enr-existing', status: 'PENDING_MANAGER' })

    await expect(createEnrollment({ sessionId: 'ses-1' }, 'emp-1')).rejects.toThrow('已有申請記錄')
  })

  it('梯次不存在時拋出錯誤', async () => {
    mockPrisma.courseSession.findUnique.mockResolvedValue(null)

    await expect(createEnrollment({ sessionId: 'nonexistent' }, 'emp-1')).rejects.toThrow('梯次不存在')
  })
})

describe('approveByManager', () => {
  it('狀態非 PENDING_MANAGER 時拋出錯誤', async () => {
    mockPrisma.courseEnrollment.findFirst.mockResolvedValue({
      id: 'enr-1',
      status: 'PENDING_HR',
      employeeId: 'emp-1',
      employee: mockEmployeeData,
      session: mockSessionData,
    })
    mockPrisma.employee.findUnique.mockResolvedValue({ ...mockEmployeeData, id: 'mgr-1' })

    await expect(approveByManager('enr-1', 'mgr-1')).rejects.toThrow('申請不在可審核狀態')
  })
})

describe('rejectByManager', () => {
  it('退回原因為空時拋出錯誤', async () => {
    await expect(rejectByManager('enr-1', 'mgr-1', '')).rejects.toThrow('退回原因為必填')
  })
})
