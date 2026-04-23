import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'

const mockPrisma = vi.hoisted(() => ({
  courseSession: { findUnique: vi.fn() },
  employeeTrainingRecord: { findUnique: vi.fn(), upsert: vi.fn() },
}))

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

import { updateTrainingRecord } from '@/lib/completions/training-record-service'

beforeEach(() => vi.clearAllMocks())

const makeSession = (overrides = {}) => ({
  id: 'ses-1',
  startDate: new Date('2026-05-10'),
  course: {
    measurementUnit: 'HOURS',
    measurementValue: 6,
    isNewHireTraining: false,
    ...overrides,
  },
})

describe('updateTrainingRecord', () => {
  it('一般課程時數正確累加 totalHours 與 annualHours', async () => {
    mockPrisma.courseSession.findUnique.mockResolvedValue(makeSession())
    mockPrisma.employeeTrainingRecord.findUnique.mockResolvedValue({
      totalHours: new Decimal(12),
      annualHours: new Decimal(12),
      totalCredits: new Decimal(0),
    })
    mockPrisma.employeeTrainingRecord.upsert.mockResolvedValue({})

    const result = await updateTrainingRecord('emp-1', 'ses-1')

    expect(mockPrisma.employeeTrainingRecord.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          totalHours: new Decimal(18),
          annualHours: new Decimal(18),
          totalCredits: new Decimal(0),
        }),
      })
    )
    expect(result.hoursAdded).toBe(6)
    expect(result.newAnnualHours).toBe(18)
  })

  it('新進人員訓練：totalHours 增加但 annualHours 不增加', async () => {
    mockPrisma.courseSession.findUnique.mockResolvedValue(makeSession({ isNewHireTraining: true }))
    mockPrisma.employeeTrainingRecord.findUnique.mockResolvedValue({
      totalHours: new Decimal(0),
      annualHours: new Decimal(12),
      totalCredits: new Decimal(0),
    })
    mockPrisma.employeeTrainingRecord.upsert.mockResolvedValue({})

    await updateTrainingRecord('emp-1', 'ses-1')

    expect(mockPrisma.employeeTrainingRecord.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          totalHours: new Decimal(6),
          annualHours: new Decimal(12), // 不增加
        }),
      })
    )
  })

  it('學分課程正確累加 totalCredits', async () => {
    mockPrisma.courseSession.findUnique.mockResolvedValue(makeSession({ measurementUnit: 'CREDIT', measurementValue: 2 }))
    mockPrisma.employeeTrainingRecord.findUnique.mockResolvedValue({
      totalHours: new Decimal(0),
      annualHours: new Decimal(0),
      totalCredits: new Decimal(1),
    })
    mockPrisma.employeeTrainingRecord.upsert.mockResolvedValue({})

    const result = await updateTrainingRecord('emp-1', 'ses-1')

    expect(mockPrisma.employeeTrainingRecord.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          totalCredits: new Decimal(3),
          totalHours: new Decimal(0),
        }),
      })
    )
    expect(result.creditsAdded).toBe(2)
  })

  it('首次結案時 upsert 使用 create', async () => {
    mockPrisma.courseSession.findUnique.mockResolvedValue(makeSession())
    mockPrisma.employeeTrainingRecord.findUnique.mockResolvedValue(null) // 無既有記錄
    mockPrisma.employeeTrainingRecord.upsert.mockResolvedValue({})

    await updateTrainingRecord('emp-1', 'ses-1')

    expect(mockPrisma.employeeTrainingRecord.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          employeeId: 'emp-1',
          year: 2026,
          totalHours: new Decimal(6),
          annualHours: new Decimal(6),
        }),
      })
    )
  })
})
