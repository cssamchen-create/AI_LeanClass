import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getManagerDashboard } from '@/lib/manager/service'

const mockPrisma = vi.hoisted(() => ({
  employee: {
    findMany: vi.fn(),
  },
  courseEnrollment: {
    findMany: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

describe('getManagerDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns correct compliance rate when some subordinates are trained', async () => {
    mockPrisma.employee.findMany.mockResolvedValue([
      {
        id: 'emp-1', name: '陳員工', department: '業務部',
        trainingRecords: [{ year: 2025 }],
        enrollments: [],
      },
      {
        id: 'emp-2', name: '林員工', department: '業務部',
        trainingRecords: [],
        enrollments: [],
      },
    ])
    mockPrisma.courseEnrollment.findMany.mockResolvedValue([])

    const result = await getManagerDashboard('mgr-1', 2025)

    expect(result.totalSubordinates).toBe(2)
    expect(result.trainedCount).toBe(1)
    expect(result.complianceRate).toBe(50)
    expect(result.subordinates[0].trained).toBe(true)
    expect(result.subordinates[1].trained).toBe(false)
  })

  it('returns 0% compliance when no subordinates are trained', async () => {
    mockPrisma.employee.findMany.mockResolvedValue([
      { id: 'emp-1', name: '陳員工', department: '業務部', trainingRecords: [], enrollments: [] },
    ])
    mockPrisma.courseEnrollment.findMany.mockResolvedValue([])

    const result = await getManagerDashboard('mgr-1', 2025)

    expect(result.trainedCount).toBe(0)
    expect(result.complianceRate).toBe(0)
  })

  it('returns empty arrays when manager has no subordinates', async () => {
    mockPrisma.employee.findMany.mockResolvedValue([])
    mockPrisma.courseEnrollment.findMany.mockResolvedValue([])

    const result = await getManagerDashboard('mgr-1', 2025)

    expect(result.totalSubordinates).toBe(0)
    expect(result.trainedCount).toBe(0)
    expect(result.complianceRate).toBe(0)
    expect(result.subordinates).toEqual([])
    expect(result.pendingApprovals).toEqual([])
  })

  it('returns pending approvals for subordinates', async () => {
    mockPrisma.employee.findMany.mockResolvedValue([
      { id: 'emp-1', name: '陳員工', department: '業務部', trainingRecords: [], enrollments: [] },
    ])
    mockPrisma.courseEnrollment.findMany.mockResolvedValue([
      {
        id: 'enr-1',
        employee: { name: '陳員工' },
        session: { course: { name: '法治課程' } },
        createdAt: new Date('2025-04-01'),
      },
    ])

    const result = await getManagerDashboard('mgr-1', 2025)

    expect(result.pendingApprovals).toHaveLength(1)
    expect(result.pendingApprovals[0].enrollmentId).toBe('enr-1')
    expect(result.pendingApprovals[0].employeeName).toBe('陳員工')
    expect(result.pendingApprovals[0].courseName).toBe('法治課程')
  })

  it('uses current year when year is not specified', async () => {
    mockPrisma.employee.findMany.mockResolvedValue([])
    mockPrisma.courseEnrollment.findMany.mockResolvedValue([])

    const result = await getManagerDashboard('mgr-1')

    expect(result.year).toBe(new Date().getFullYear())
  })

  it('maps enrollment details for each subordinate', async () => {
    mockPrisma.employee.findMany.mockResolvedValue([
      {
        id: 'emp-1', name: '陳員工', department: '業務部',
        trainingRecords: [{ year: 2025 }],
        enrollments: [
          {
            id: 'enr-1',
            status: 'COMPLETED',
            createdAt: new Date('2025-03-01'),
            session: { course: { name: '法治課程' } },
          },
        ],
      },
    ])
    mockPrisma.courseEnrollment.findMany.mockResolvedValue([])

    const result = await getManagerDashboard('mgr-1', 2025)

    expect(result.subordinates[0].enrollments[0].id).toBe('enr-1')
    expect(result.subordinates[0].enrollments[0].courseName).toBe('法治課程')
    expect(result.subordinates[0].enrollments[0].status).toBe('COMPLETED')
  })
})
