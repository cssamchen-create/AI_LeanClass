import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  waitlistEntry: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  courseSession: { findUnique: vi.fn() },
  courseEnrollment: { create: vi.fn() },
}))

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))
vi.mock('@/lib/enrollments/notification-service', () => ({
  sendNotification: vi.fn(),
  buildWaitlistPromotedNotification: vi.fn().mockReturnValue({}),
  buildWaitlistExpiredNotification: vi.fn().mockReturnValue({}),
}))

import { confirmWaitlistEntry, expireWaitlistEntries } from '@/lib/enrollments/waitlist-service'

beforeEach(() => vi.clearAllMocks())

const mockCourse = { name: '法治教育課程' }
const mockSessionData = { id: 'ses-1', course: mockCourse }

describe('confirmWaitlistEntry', () => {
  it('deadline 已過時拋出錯誤', async () => {
    const pastDeadline = new Date(Date.now() - 1000)
    mockPrisma.waitlistEntry.findUnique.mockResolvedValue({
      id: 'entry-1',
      employeeId: 'emp-1',
      sessionId: 'ses-1',
      status: 'PENDING_CONFIRMATION',
      confirmDeadline: pastDeadline,
      session: mockSessionData,
      employee: { id: 'emp-1', name: '陳員工', email: 'emp@company.com' },
    })

    await expect(confirmWaitlistEntry('entry-1', 'emp-1')).rejects.toThrow('確認期限已過')
  })

  it('狀態非 PENDING_CONFIRMATION 時拋出錯誤', async () => {
    mockPrisma.waitlistEntry.findUnique.mockResolvedValue({
      id: 'entry-1',
      employeeId: 'emp-1',
      sessionId: 'ses-1',
      status: 'WAITING',
      confirmDeadline: new Date(Date.now() + 3600000),
      session: mockSessionData,
      employee: { id: 'emp-1', name: '陳員工', email: 'emp@company.com' },
    })

    await expect(confirmWaitlistEntry('entry-1', 'emp-1')).rejects.toThrow('不在可確認狀態')
  })

  it('非本人無法確認', async () => {
    mockPrisma.waitlistEntry.findUnique.mockResolvedValue({
      id: 'entry-1',
      employeeId: 'emp-other',
      sessionId: 'ses-1',
      status: 'PENDING_CONFIRMATION',
      confirmDeadline: new Date(Date.now() + 3600000),
      session: mockSessionData,
      employee: { id: 'emp-other', name: '其他員工', email: 'other@company.com' },
    })

    await expect(confirmWaitlistEntry('entry-1', 'emp-1')).rejects.toThrow('無權限')
  })

  it('有效確認時建立新申請', async () => {
    const futureDeadline = new Date(Date.now() + 3600000)
    mockPrisma.waitlistEntry.findUnique.mockResolvedValue({
      id: 'entry-1',
      employeeId: 'emp-1',
      sessionId: 'ses-1',
      status: 'PENDING_CONFIRMATION',
      confirmDeadline: futureDeadline,
      session: mockSessionData,
      employee: { id: 'emp-1', name: '陳員工', email: 'emp@company.com' },
    })
    mockPrisma.waitlistEntry.update.mockResolvedValue({})
    mockPrisma.courseEnrollment.create.mockResolvedValue({
      id: 'enr-new',
      status: 'PENDING_MANAGER',
      employeeId: 'emp-1',
      sessionId: 'ses-1',
    })

    const result = await confirmWaitlistEntry('entry-1', 'emp-1')

    expect(mockPrisma.courseEnrollment.create).toHaveBeenCalledWith({
      data: { employeeId: 'emp-1', sessionId: 'ses-1', status: 'PENDING_MANAGER' },
    })
    expect(result.enrollment.status).toBe('PENDING_MANAGER')
  })
})

describe('expireWaitlistEntries', () => {
  it('逾期條目 status 更新為 EXPIRED', async () => {
    const expiredEntry = {
      id: 'entry-expired',
      employeeId: 'emp-1',
      sessionId: 'ses-1',
      status: 'PENDING_CONFIRMATION',
      confirmDeadline: new Date(Date.now() - 1000),
      session: mockSessionData,
      employee: { id: 'emp-1', name: '陳員工', email: 'emp@company.com' },
    }
    mockPrisma.waitlistEntry.findMany.mockResolvedValue([expiredEntry])
    mockPrisma.waitlistEntry.update.mockResolvedValue({})
    mockPrisma.waitlistEntry.findFirst.mockResolvedValue(null)

    const result = await expireWaitlistEntries()

    expect(mockPrisma.waitlistEntry.update).toHaveBeenCalledWith({
      where: { id: 'entry-expired' },
      data: { status: 'EXPIRED' },
    })
    expect(result.expired).toBe(1)
    expect(result.promoted).toBe(0)
  })

  it('逾期後有等待者時觸發遞補', async () => {
    const expiredEntry = {
      id: 'entry-expired',
      employeeId: 'emp-1',
      sessionId: 'ses-1',
      status: 'PENDING_CONFIRMATION',
      confirmDeadline: new Date(Date.now() - 1000),
      session: mockSessionData,
      employee: { id: 'emp-1', name: '陳員工', email: 'emp@company.com' },
    }
    const nextEntry = {
      id: 'entry-next',
      employeeId: 'emp-2',
      position: 2,
      session: mockSessionData,
      employee: { id: 'emp-2', name: '王員工', email: 'emp2@company.com' },
    }
    mockPrisma.waitlistEntry.findMany.mockResolvedValue([expiredEntry])
    mockPrisma.waitlistEntry.update.mockResolvedValue({})
    mockPrisma.waitlistEntry.findFirst.mockResolvedValue(nextEntry)

    const result = await expireWaitlistEntries()

    expect(result.expired).toBe(1)
    expect(result.promoted).toBe(1)
  })
})
