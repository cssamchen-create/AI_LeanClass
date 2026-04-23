import { prisma } from '@/lib/prisma'
import { sendNotification, buildAttendanceConfirmedNotification, buildCourseCompletedNotification } from '@/lib/enrollments/notification-service'
import { updateTrainingRecord } from './training-record-service'
import type { EnrollmentStatus } from '@prisma/client'

function nextStatusAfterAttendance(
  requiresReflection: boolean,
  isGroupCourse: boolean,
  requiresQuiz: boolean,
): EnrollmentStatus {
  if (isGroupCourse) return 'PENDING_HR_CLOSE'
  if (requiresReflection) return 'PENDING_REFLECTION'
  if (requiresQuiz) return 'PENDING_QUIZ'
  return 'PENDING_HR_CLOSE'
}

export async function confirmAttendance(
  sessionId: string,
  attendances: Array<{ enrollmentId: string; attended: boolean }>,
  hrId: string,
) {
  const session = await prisma.courseSession.findUnique({
    where: { id: sessionId },
    include: { course: true },
  })
  if (!session) throw new Error('梯次不存在')

  const results = { updated: 0, attended: 0, absent: 0 }

  for (const { enrollmentId, attended } of attendances) {
    const enrollment = await prisma.courseEnrollment.findFirst({
      where: { id: enrollmentId, sessionId, status: 'CONFIRMED' },
      include: {
        employee: { select: { id: true, name: true, email: true } },
      },
    })
    if (!enrollment) continue

    const newStatus: EnrollmentStatus = attended
      ? nextStatusAfterAttendance(
          session.course.requiresReflection,
          session.course.isGroupCourse,
          session.course.requiresQuiz,
        )
      : 'ABSENT'

    await prisma.courseEnrollment.update({
      where: { id: enrollmentId },
      data: { status: newStatus },
    })

    await sendNotification(
      buildAttendanceConfirmedNotification(enrollment.employee, session.course.name, attended, enrollmentId)
    )

    results.updated++
    if (attended) results.attended++
    else results.absent++
  }

  return results
}

export async function closeEnrollment(enrollmentId: string, hrId: string) {
  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      employee: { select: { id: true, name: true, email: true } },
      session: {
        include: {
          course: true,
        },
      },
      reflection: true,
      quizAttempts: { orderBy: { attemptNumber: 'desc' }, take: 1 },
    },
  })
  if (!enrollment) throw new Error('申請不存在')
  if (enrollment.status !== 'PENDING_HR_CLOSE') {
    throw new Error('申請不在可結案狀態')
  }

  const course = enrollment.session.course

  // Validate all required steps are done
  const incompleteSteps: string[] = []
  if (course.requiresReflection && !course.isGroupCourse && !enrollment.reflection) {
    incompleteSteps.push('心得填寫')
  }
  if (course.requiresQuiz && !course.isGroupCourse) {
    const latestAttempt = enrollment.quizAttempts[0]
    if (!latestAttempt || latestAttempt.passed !== true) {
      incompleteSteps.push('測驗通過')
    }
  }
  if (incompleteSteps.length > 0) {
    throw new Error(`尚有未完成步驟：${incompleteSteps.join('、')}`)
  }

  await prisma.courseEnrollment.update({
    where: { id: enrollmentId },
    data: { status: 'COMPLETED' },
  })

  const trainingRecord = await updateTrainingRecord(enrollment.employeeId, enrollment.sessionId)

  const hoursOrCredits = course.measurementUnit === 'HOURS'
    ? `${course.measurementValue} 小時`
    : `${course.measurementValue} 學分`

  await sendNotification(
    buildCourseCompletedNotification(enrollment.employee, course.name, hoursOrCredits, enrollmentId)
  )

  return { enrollmentId, status: 'COMPLETED', trainingRecord }
}
