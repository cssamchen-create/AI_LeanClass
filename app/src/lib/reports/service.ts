import { prisma } from '@/lib/prisma'

// ─── US1: 年度訓練達標率總覽 ──────────────────────────────────────────────────

export async function getComplianceOverview(year: number) {
  const [totalActive, trained] = await Promise.all([
    prisma.employee.count({ where: { isActive: true } }),
    prisma.employeeTrainingRecord.count({
      where: { year, employee: { isActive: true } },
    }),
  ])

  const complianceRate = totalActive > 0 ? (trained / totalActive) * 100 : 0

  return {
    year,
    totalActive,
    trained,
    untrained: totalActive - trained,
    complianceRate: Math.round(complianceRate * 10) / 10,
  }
}

// ─── US2: 部門訓練統計 ────────────────────────────────────────────────────────

export async function getDepartmentStats(year: number) {
  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    select: {
      department: true,
      trainingRecords: { where: { year }, select: { id: true } },
    },
  })

  const map = new Map<string, { total: number; trained: number }>()

  for (const emp of employees) {
    const dept = emp.department || '未分配'
    const entry = map.get(dept) ?? { total: 0, trained: 0 }
    entry.total++
    if (emp.trainingRecords.length > 0) entry.trained++
    map.set(dept, entry)
  }

  return Array.from(map.entries())
    .map(([department, { total, trained }]) => ({
      department,
      totalEmployees: total,
      trained,
      untrained: total - trained,
      complianceRate: total > 0 ? Math.round((trained / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.complianceRate - a.complianceRate)
}

// ─── US3: 員工訓練歷程 ────────────────────────────────────────────────────────

export async function searchEmployees(search: string) {
  const employees = await prisma.employee.findMany({
    where: { isActive: true, name: { contains: search } },
    select: { id: true, name: true, department: true },
    take: 50,
  })
  return { employees, total: employees.length, limitReached: employees.length === 50 }
}

export async function getEmployeeTrainingHistory(employeeId: string) {
  const [employee, enrollments, yearSummaries] = await Promise.all([
    prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, name: true, department: true },
    }),
    prisma.courseEnrollment.findMany({
      where: { employeeId, status: 'COMPLETED' },
      include: {
        session: {
          select: {
            startDate: true,
            course: {
              select: { id: true, name: true, measurementUnit: true, measurementValue: true },
            },
          },
        },
      },
      orderBy: { session: { startDate: 'desc' } },
    }),
    prisma.employeeTrainingRecord.findMany({
      where: { employeeId },
      orderBy: { year: 'desc' },
    }),
  ])

  if (!employee) throw new Error('員工不存在')

  return {
    employee,
    enrollments: enrollments.map((e) => ({
      courseId: e.session.course.id,
      courseName: e.session.course.name,
      sessionStartDate: e.session.startDate,
      year: e.session.startDate.getFullYear(),
      measurementUnit: e.session.course.measurementUnit,
      measurementValue: e.session.course.measurementValue,
      status: e.status,
    })),
    yearSummaries: yearSummaries.map((r) => ({
      year: r.year,
      totalHours: r.totalHours.toString(),
      totalCredits: r.totalCredits.toString(),
    })),
  }
}

// ─── US4: 課程完訓率分析 ──────────────────────────────────────────────────────

export async function getCourseStats(year: number, page: number, pageSize: number) {
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year + 1, 0, 1)

  const yearFilter = { gte: yearStart, lt: yearEnd }

  const [courses, total] = await Promise.all([
    prisma.course.findMany({
      where: { sessions: { some: { startDate: yearFilter } } },
      select: {
        id: true,
        name: true,
        sessions: {
          where: { startDate: yearFilter },
          select: { enrollments: { select: { status: true } } },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.course.count({
      where: { sessions: { some: { startDate: yearFilter } } },
    }),
  ])

  const courseStats = courses.map((course) => {
    const allEnrollments = course.sessions.flatMap((s) => s.enrollments)
    const totalEnrolled = allEnrollments.length
    const completed = allEnrollments.filter((e) => e.status === 'COMPLETED').length
    const completionRate = totalEnrolled > 0 ? Math.round((completed / totalEnrolled) * 1000) / 10 : 0

    return {
      courseId: course.id,
      courseName: course.name,
      totalEnrolled,
      completed,
      completionRate,
    }
  })

  return {
    year,
    courses: courseStats,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}
