import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  employee: { count: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
  employeeTrainingRecord: { count: vi.fn(), findMany: vi.fn() },
  courseEnrollment: { count: vi.fn(), findMany: vi.fn() },
  course: { findMany: vi.fn(), count: vi.fn() },
}))

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

import {
  getComplianceOverview,
  getDepartmentStats,
  getEmployeeTrainingHistory,
  searchEmployees,
  getCourseStats,
} from '@/lib/reports/service'

beforeEach(() => vi.clearAllMocks())

// ─── US1: getComplianceOverview ───────────────────────────────────────────────

describe('getComplianceOverview', () => {
  it('正確計算達標率', async () => {
    mockPrisma.employee.count.mockResolvedValue(100)
    mockPrisma.employeeTrainingRecord.count.mockResolvedValue(78)

    const result = await getComplianceOverview(2025)

    expect(result.totalActive).toBe(100)
    expect(result.trained).toBe(78)
    expect(result.untrained).toBe(22)
    expect(result.complianceRate).toBe(78)
  })

  it('無訓練紀錄時達標率為 0', async () => {
    mockPrisma.employee.count.mockResolvedValue(50)
    mockPrisma.employeeTrainingRecord.count.mockResolvedValue(0)

    const result = await getComplianceOverview(2025)

    expect(result.complianceRate).toBe(0)
    expect(result.untrained).toBe(50)
  })

  it('無在職員工時回傳 0 不拋錯', async () => {
    mockPrisma.employee.count.mockResolvedValue(0)
    mockPrisma.employeeTrainingRecord.count.mockResolvedValue(0)

    const result = await getComplianceOverview(2025)

    expect(result.totalActive).toBe(0)
    expect(result.complianceRate).toBe(0)
  })
})

// ─── US2: getDepartmentStats ──────────────────────────────────────────────────

describe('getDepartmentStats', () => {
  it('多部門正確分組與比例計算', async () => {
    mockPrisma.employee.findMany.mockResolvedValue([
      { department: '技術部', trainingRecords: [{ id: 'r1' }] },
      { department: '技術部', trainingRecords: [{ id: 'r2' }] },
      { department: '技術部', trainingRecords: [] },
      { department: '業務部', trainingRecords: [{ id: 'r3' }] },
      { department: '業務部', trainingRecords: [] },
    ])

    const result = await getDepartmentStats(2025)

    const tech = result.find((d) => d.department === '技術部')!
    const sales = result.find((d) => d.department === '業務部')!

    expect(tech.totalEmployees).toBe(3)
    expect(tech.trained).toBe(2)
    expect(tech.complianceRate).toBeCloseTo(66.67, 1)
    expect(sales.totalEmployees).toBe(2)
    expect(sales.trained).toBe(1)
  })

  it('無完訓員工的部門顯示 0% 不隱藏', async () => {
    mockPrisma.employee.findMany.mockResolvedValue([
      { department: '財務部', trainingRecords: [] },
      { department: '財務部', trainingRecords: [] },
    ])

    const result = await getDepartmentStats(2025)

    expect(result).toHaveLength(1)
    expect(result[0].complianceRate).toBe(0)
  })

  it('未設定部門員工歸類為「未分配」', async () => {
    mockPrisma.employee.findMany.mockResolvedValue([
      { department: '', trainingRecords: [{ id: 'r1' }] },
      { department: null as unknown as string, trainingRecords: [] },
    ])

    const result = await getDepartmentStats(2025)

    expect(result[0].department).toBe('未分配')
    expect(result[0].totalEmployees).toBe(2)
  })
})

// ─── US3: getEmployeeTrainingHistory ─────────────────────────────────────────

describe('getEmployeeTrainingHistory', () => {
  it('正確回傳多筆歷程並含年度摘要', async () => {
    mockPrisma.employee.findUnique.mockResolvedValue({
      id: 'emp-1', name: '陳員工', department: '技術部',
    })
    mockPrisma.courseEnrollment.findMany.mockResolvedValue([
      {
        session: {
          startDate: new Date('2025-03-01'),
          course: { id: 'crs-1', name: '法治課程', measurementUnit: 'HOURS', measurementValue: 3 },
        },
        status: 'COMPLETED',
      },
    ])
    mockPrisma.employeeTrainingRecord.findMany.mockResolvedValue([
      { year: 2025, totalHours: '3.00', totalCredits: '0.00' },
    ])

    const result = await getEmployeeTrainingHistory('emp-1')

    expect(result.employee.name).toBe('陳員工')
    expect(result.enrollments).toHaveLength(1)
    expect(result.enrollments[0].courseName).toBe('法治課程')
    expect(result.yearSummaries[0].year).toBe(2025)
  })

  it('無歷程員工回傳空陣列不拋錯', async () => {
    mockPrisma.employee.findUnique.mockResolvedValue({
      id: 'emp-2', name: '新員工', department: '業務部',
    })
    mockPrisma.courseEnrollment.findMany.mockResolvedValue([])
    mockPrisma.employeeTrainingRecord.findMany.mockResolvedValue([])

    const result = await getEmployeeTrainingHistory('emp-2')

    expect(result.enrollments).toHaveLength(0)
    expect(result.yearSummaries).toHaveLength(0)
  })
})

// ─── US4: getCourseStats ──────────────────────────────────────────────────────

describe('getCourseStats', () => {
  it('正確計算完訓率（20 人報名、15 完訓 → 75%）', async () => {
    const enrollments = [
      ...Array(15).fill({ status: 'COMPLETED' }),
      ...Array(5).fill({ status: 'PENDING_MANAGER' }),
    ]
    mockPrisma.course.findMany.mockResolvedValue([
      {
        id: 'crs-1',
        name: '法治課程',
        sessions: [{ enrollments }],
      },
    ])
    mockPrisma.course.count.mockResolvedValue(1)

    const result = await getCourseStats(2025, 1, 20)

    expect(result.courses[0].totalEnrolled).toBe(20)
    expect(result.courses[0].completed).toBe(15)
    expect(result.courses[0].completionRate).toBe(75)
  })

  it('無報名時 completionRate 為 0 不除零錯誤', async () => {
    mockPrisma.course.findMany.mockResolvedValue([
      { id: 'crs-2', name: '新課程', sessions: [] },
    ])
    mockPrisma.course.count.mockResolvedValue(1)

    const result = await getCourseStats(2025, 1, 20)

    expect(result.courses[0].completionRate).toBe(0)
    expect(result.courses[0].totalEnrolled).toBe(0)
  })

  it('分頁參數正確帶入 skip/take', async () => {
    mockPrisma.course.findMany.mockResolvedValue([])
    mockPrisma.course.count.mockResolvedValue(0)

    await getCourseStats(2025, 3, 10)

    expect(mockPrisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 }),
    )
  })
})
