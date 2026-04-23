import { prisma } from '@/lib/prisma'

export type SubordinateTrainingStatus = {
  employee: { id: string; name: string; department: string }
  trained: boolean
  enrollments: Array<{
    id: string
    courseName: string
    status: string
    createdAt: Date
  }>
}

export type ManagerDashboard = {
  year: number
  totalSubordinates: number
  trainedCount: number
  complianceRate: number
  subordinates: SubordinateTrainingStatus[]
  pendingApprovals: Array<{
    enrollmentId: string
    employeeName: string
    courseName: string
    createdAt: Date
  }>
}

export async function getManagerDashboard(managerId: string, year?: number): Promise<ManagerDashboard> {
  const currentYear = year ?? new Date().getFullYear()

  const subordinates = await prisma.employee.findMany({
    where: { managerId, isActive: true },
    include: {
      trainingRecords: { where: { year: currentYear } },
      enrollments: {
        include: { session: { include: { course: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  const subordinateIds = subordinates.map((e) => e.id)

  const pendingApprovals = await prisma.courseEnrollment.findMany({
    where: { employeeId: { in: subordinateIds }, status: 'PENDING_MANAGER' },
    include: { employee: true, session: { include: { course: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const subordinateStatuses: SubordinateTrainingStatus[] = subordinates.map((sub) => ({
    employee: { id: sub.id, name: sub.name, department: sub.department },
    trained: sub.trainingRecords.length > 0,
    enrollments: sub.enrollments.map((enr) => ({
      id: enr.id,
      courseName: enr.session.course.name,
      status: enr.status,
      createdAt: enr.createdAt,
    })),
  }))

  const trainedCount = subordinateStatuses.filter((s) => s.trained).length
  const total = subordinateStatuses.length
  const complianceRate = total > 0 ? Math.round((trainedCount / total) * 1000) / 10 : 0

  return {
    year: currentYear,
    totalSubordinates: total,
    trainedCount,
    complianceRate,
    subordinates: subordinateStatuses,
    pendingApprovals: pendingApprovals.map((enr) => ({
      enrollmentId: enr.id,
      employeeName: enr.employee.name,
      courseName: enr.session.course.name,
      createdAt: enr.createdAt,
    })),
  }
}
