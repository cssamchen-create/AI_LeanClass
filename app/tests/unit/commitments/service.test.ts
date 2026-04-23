import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'

const mockPrisma = vi.hoisted(() => ({
  courseEnrollment: { findUnique: vi.fn(), update: vi.fn() },
  commitmentRecord: { findMany: vi.fn(), update: vi.fn(), create: vi.fn() },
  courseSession: { findUnique: vi.fn() },
  employee: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
}))

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))
vi.mock('@/lib/enrollments/notification-service', () => ({
  sendNotification: vi.fn(),
  buildCommitmentSignedNotification: vi.fn().mockReturnValue({}),
  buildCommitmentSignatureExpiredNotification: vi.fn().mockReturnValue({}),
  buildCommitmentExpiringSoonNotification: vi.fn().mockReturnValue({}),
  buildCommitmentCompensationNotification: vi.fn().mockReturnValue({}),
}))

import { signCommitment, processExpiredCommitments, calculateCompensationSchedule } from '@/lib/commitments/service'

const now = new Date('2026-04-23T10:00:00Z')
const deadline48h = new Date(now.getTime() + 48 * 60 * 60 * 1000)

const mockEnrollment = {
  id: 'enr-1',
  employeeId: 'emp-1',
  sessionId: 'ses-1',
  status: 'PENDING_COMMITMENT',
  employee: { id: 'emp-1', name: '陳員工', email: 'emp@company.com' },
  commitmentRecord: {
    id: 'com-1',
    status: 'PENDING_SIGNATURE',
    signatureDeadline: deadline48h,
    commitmentMonths: 24,
    commitmentFee: new Decimal('30000.00'),
    signedAt: null,
    commitmentExpiresAt: null,
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(now)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('signCommitment', () => {
  it('正常簽署後 CommitmentRecord status → ACTIVE，enrollment status → CONFIRMED', async () => {
    mockPrisma.courseEnrollment.findUnique.mockResolvedValue(mockEnrollment)
    mockPrisma.$transaction.mockImplementation(async (ops: unknown[]) => {
      const results = await Promise.all((ops as Array<Promise<unknown>>))
      return results
    })
    mockPrisma.commitmentRecord.update.mockResolvedValue({
      ...mockEnrollment.commitmentRecord,
      status: 'ACTIVE',
      signedAt: now,
    })
    mockPrisma.courseEnrollment.update.mockResolvedValue({ ...mockEnrollment, status: 'CONFIRMED' })
    mockPrisma.courseSession.findUnique.mockResolvedValue({
      id: 'ses-1',
      course: { name: '進階管理培訓' },
    })

    const result = await signCommitment('enr-1', 'emp-1')
    expect(result.status).toBe('ACTIVE')
    expect(mockPrisma.commitmentRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'ACTIVE', signedAt: now }),
      }),
    )
    expect(mockPrisma.courseEnrollment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'CONFIRMED' }),
      }),
    )
  })

  it('超過 signatureDeadline 拋出錯誤', async () => {
    const expiredDeadline = new Date(now.getTime() - 1000)
    mockPrisma.courseEnrollment.findUnique.mockResolvedValue({
      ...mockEnrollment,
      commitmentRecord: {
        ...mockEnrollment.commitmentRecord,
        signatureDeadline: expiredDeadline,
      },
    })

    await expect(signCommitment('enr-1', 'emp-1')).rejects.toThrow('承諾書簽署期限已過')
  })

  it('非本人嘗試簽署拋出錯誤', async () => {
    mockPrisma.courseEnrollment.findUnique.mockResolvedValue(mockEnrollment)

    await expect(signCommitment('enr-1', 'other-emp')).rejects.toThrow('無權限簽署此承諾書')
  })

  it('申請不在 PENDING_COMMITMENT 狀態時拋出錯誤', async () => {
    mockPrisma.courseEnrollment.findUnique.mockResolvedValue({
      ...mockEnrollment,
      status: 'CONFIRMED',
    })

    await expect(signCommitment('enr-1', 'emp-1')).rejects.toThrow('申請不在待簽署承諾書狀態')
  })
})

describe('processExpiredCommitments', () => {
  it('批次取消逾期未簽署的承諾書與對應申請', async () => {
    const expiredRecord = {
      id: 'com-expired',
      enrollmentId: 'enr-2',
      status: 'PENDING_SIGNATURE',
      signatureDeadline: new Date(now.getTime() - 1000),
      enrollment: {
        id: 'enr-2',
        sessionId: 'ses-2',
        employee: { id: 'emp-2', name: '李員工', email: 'li@company.com' },
      },
    }

    mockPrisma.commitmentRecord.findMany.mockResolvedValue([expiredRecord])
    mockPrisma.$transaction.mockImplementation(async (ops: unknown[]) => Promise.all(ops as Array<Promise<unknown>>))
    mockPrisma.commitmentRecord.update.mockResolvedValue({ ...expiredRecord, status: 'VOIDED' })
    mockPrisma.courseEnrollment.update.mockResolvedValue({ id: 'enr-2', status: 'CANCELLED' })
    mockPrisma.courseSession.findUnique.mockResolvedValue({
      id: 'ses-2',
      course: { name: '進階管理培訓' },
    })
    mockPrisma.employee.findMany.mockResolvedValue([
      { id: 'hr-1', name: 'HR 人員', email: 'hr@company.com', role: 'HR' },
    ])

    const result = await processExpiredCommitments()
    expect(result.processed).toBe(1)
    expect(result.cancelled).toHaveLength(1)
    expect(result.cancelled[0].enrollmentId).toBe('enr-2')
    expect(mockPrisma.commitmentRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'VOIDED' }) }),
    )
    expect(mockPrisma.courseEnrollment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'CANCELLED' }) }),
    )
  })

  it('無逾期記錄時回傳空結果', async () => {
    mockPrisma.commitmentRecord.findMany.mockResolvedValue([])

    const result = await processExpiredCommitments()
    expect(result.processed).toBe(0)
    expect(result.cancelled).toHaveLength(0)
  })
})

describe('calculateCompensationSchedule', () => {
  it('24 個月 30000 元的賠償試算正確', () => {
    const schedule = calculateCompensationSchedule(24, 30000)
    const atMonth0 = schedule.find((s) => s.monthsCompleted === 0)
    const atMonth6 = schedule.find((s) => s.monthsCompleted === 6)
    const atMonth12 = schedule.find((s) => s.monthsCompleted === 12)
    const atMonth18 = schedule.find((s) => s.monthsCompleted === 18)
    const atMonth24 = schedule.find((s) => s.monthsCompleted === 24)

    expect(atMonth0?.amount).toBe('30000.00')
    expect(atMonth6?.amount).toBe('22500.00')
    expect(atMonth12?.amount).toBe('15000.00')
    expect(atMonth18?.amount).toBe('7500.00')
    expect(atMonth24?.amount).toBe('0.00')
  })
})
