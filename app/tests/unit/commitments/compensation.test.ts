import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'

const mockPrisma = vi.hoisted(() => ({
  employee: { findUnique: vi.fn(), update: vi.fn() },
  commitmentRecord: { update: vi.fn() },
}))

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))
vi.mock('@/lib/enrollments/notification-service', () => ({
  sendNotification: vi.fn(),
  buildCommitmentCompensationNotification: vi.fn().mockReturnValue({}),
}))

import { resignEmployee, calculateCompensationSchedule } from '@/lib/commitments/service'

const signedAt = new Date('2026-01-01T00:00:00Z')
const sessionStart = new Date('2026-01-20T09:00:00Z')

function makeRecord(overrides: Partial<{
  signedAt: Date | null
  commitmentMonths: number
  commitmentFee: Decimal
  status: string
  commitmentExpiresAt: Date | null
}> = {}) {
  return {
    id: 'com-1',
    status: 'ACTIVE',
    commitmentMonths: 24,
    commitmentFee: new Decimal('30000.00'),
    signedAt,
    commitmentExpiresAt: new Date('2028-01-01T00:00:00Z'),
    enrollment: {
      id: 'enr-1',
      sessionId: 'ses-1',
      session: {
        startDate: sessionStart,
        course: { name: '進階管理培訓' },
      },
    },
    ...overrides,
  }
}

const mockHR = { id: 'hr-1', name: 'HR 人員', email: 'hr@company.com', role: 'HR' }

beforeEach(() => {
  vi.clearAllMocks()
  mockPrisma.commitmentRecord.update.mockResolvedValue({})
  mockPrisma.employee.update.mockResolvedValue({})
  mockPrisma.employee.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
    if (where.id === 'hr-1') return Promise.resolve(mockHR)
    return Promise.resolve(null)
  })
})

describe('resignEmployee', () => {
  it('6 個月後離職：比例賠償 22500 元', async () => {
    const employee = {
      id: 'emp-1',
      name: '王員工',
      email: 'wang@company.com',
      isActive: true,
      commitmentRecords: [makeRecord()],
    }
    mockPrisma.employee.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === 'hr-1') return Promise.resolve(mockHR)
      return Promise.resolve(employee)
    })

    // 2026-07-01 = ~6 months after signedAt (2026-01-01)
    const result = await resignEmployee('emp-1', '2026-07-01', 'hr-1')
    const comp = result.commitmentCompensations[0]

    // 6 months completed, 18 remaining out of 24 → 30000 × 18/24 = 22500
    expect(Number(comp.compensationAmount)).toBe(22500)
    expect(comp.remainingMonths).toBe(18)
  })

  it('課程尚未開始離職：全額賠償 30000 元', async () => {
    const futureSessionRecord = makeRecord({ signedAt: null })
    futureSessionRecord.enrollment.session.startDate = new Date('2030-01-01')
    const employee = {
      id: 'emp-2',
      name: '李員工',
      email: 'li@company.com',
      isActive: true,
      commitmentRecords: [futureSessionRecord],
    }
    mockPrisma.employee.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === 'hr-1') return Promise.resolve(mockHR)
      return Promise.resolve(employee)
    })

    const result = await resignEmployee('emp-2', '2026-04-23', 'hr-1')
    const comp = result.commitmentCompensations[0]

    expect(Number(comp.compensationAmount)).toBe(30000)
    expect(comp.preCourseResignation).toBe(true)
  })

  it('承諾期已屆滿：賠償金額為 0', async () => {
    const expiredRecord = makeRecord({
      signedAt: new Date('2024-01-01'),
      commitmentExpiresAt: new Date('2026-01-01'), // already expired
    })
    const employee = {
      id: 'emp-3',
      name: '陳員工',
      email: 'chen@company.com',
      isActive: true,
      commitmentRecords: [expiredRecord],
    }
    mockPrisma.employee.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === 'hr-1') return Promise.resolve(mockHR)
      return Promise.resolve(employee)
    })

    const result = await resignEmployee('emp-3', '2026-04-23', 'hr-1')
    const comp = result.commitmentCompensations[0]

    expect(Number(comp.compensationAmount)).toBe(0)
    expect(comp.remainingMonths).toBe(0)
  })

  it('多筆承諾書分別計算並累加合計', async () => {
    const record2 = makeRecord({
      ...makeRecord(),
      id: 'com-2',
      commitmentFee: new Decimal('20000.00'),
      commitmentMonths: 12,
    })
    const employee = {
      id: 'emp-4',
      name: '多筆員工',
      email: 'multi@company.com',
      isActive: true,
      commitmentRecords: [makeRecord(), record2],
    }
    mockPrisma.employee.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === 'hr-1') return Promise.resolve(mockHR)
      return Promise.resolve(employee)
    })

    const result = await resignEmployee('emp-4', '2026-07-01', 'hr-1')
    expect(result.commitmentCompensations).toHaveLength(2)
    expect(Number(result.totalCompensation)).toBeGreaterThan(0)
  })

  it('員工已離職時拋出錯誤', async () => {
    const employee = {
      id: 'emp-5',
      name: '前員工',
      email: 'ex@company.com',
      isActive: false,
      commitmentRecords: [],
    }
    mockPrisma.employee.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === 'hr-1') return Promise.resolve(mockHR)
      return Promise.resolve(employee)
    })

    await expect(resignEmployee('emp-5', '2026-04-23', 'hr-1')).rejects.toThrow('員工已離職')
  })
})

describe('calculateCompensationSchedule', () => {
  it('24 個月 30000 元的完整試算表', () => {
    const schedule = calculateCompensationSchedule(24, 30000)
    expect(schedule.find((s) => s.monthsCompleted === 0)?.amount).toBe('30000.00')
    expect(schedule.find((s) => s.monthsCompleted === 6)?.amount).toBe('22500.00')
    expect(schedule.find((s) => s.monthsCompleted === 12)?.amount).toBe('15000.00')
    expect(schedule.find((s) => s.monthsCompleted === 18)?.amount).toBe('7500.00')
    expect(schedule.find((s) => s.monthsCompleted === 24)?.amount).toBe('0.00')
  })

  it('12 個月的試算表', () => {
    const schedule = calculateCompensationSchedule(12, 12000)
    expect(schedule.find((s) => s.monthsCompleted === 0)?.amount).toBe('12000.00')
    expect(schedule.find((s) => s.monthsCompleted === 6)?.amount).toBe('6000.00')
    expect(schedule.find((s) => s.monthsCompleted === 12)?.amount).toBe('0.00')
  })
})
