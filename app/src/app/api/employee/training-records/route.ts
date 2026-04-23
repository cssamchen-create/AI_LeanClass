import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未登入' }, { status: 401 })

  const employeeId = session.user.id!
  const { searchParams } = new URL(request.url)
  const yearParam = searchParams.get('year')
  const year = yearParam ? parseInt(yearParam) : new Date().getFullYear()

  const record = await prisma.employeeTrainingRecord.findUnique({
    where: { employeeId_year: { employeeId, year } },
  })

  const completions = await prisma.courseEnrollment.findMany({
    where: {
      employeeId,
      status: 'COMPLETED',
      session: { startDate: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) } },
    },
    include: {
      session: {
        include: {
          course: { select: { name: true, measurementUnit: true, measurementValue: true } },
        },
      },
      quizAttempts: {
        orderBy: { attemptNumber: 'desc' },
        take: 1,
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({
    summary: {
      year,
      annualHours: record ? Number(record.annualHours) : 0,
      totalHours: record ? Number(record.totalHours) : 0,
      totalCredits: record ? Number(record.totalCredits) : 0,
    },
    completions: completions.map((e) => ({
      enrollmentId: e.id,
      courseName: e.session.course.name,
      sessionDate: e.session.startDate,
      hours: e.session.course.measurementUnit === 'HOURS' ? e.session.course.measurementValue : 0,
      credits: e.session.course.measurementUnit === 'CREDIT' ? e.session.course.measurementValue : 0,
      quizScore: e.quizAttempts[0]?.totalScore ?? null,
      quizPassed: e.quizAttempts[0]?.passed ?? null,
      completedAt: e.updatedAt,
    })),
  })
}
