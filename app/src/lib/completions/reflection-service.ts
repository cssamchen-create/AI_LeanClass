import { prisma } from '@/lib/prisma'
import { sendNotification, buildReflectionReturnedNotification } from '@/lib/enrollments/notification-service'
import type { EnrollmentStatus } from '@prisma/client'

function nextStatusAfterReflection(requiresQuiz: boolean): EnrollmentStatus {
  return requiresQuiz ? 'PENDING_QUIZ' : 'PENDING_HR_CLOSE'
}

export async function submitReflection(enrollmentId: string, employeeId: string, content: string) {
  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      session: { include: { course: true } },
    },
  })
  if (!enrollment) throw new Error('申請不存在')
  if (enrollment.employeeId !== employeeId) throw new Error('無權限')
  if (
    enrollment.status !== 'PENDING_REFLECTION' &&
    enrollment.status !== 'REFLECTION_RETURNED'
  ) {
    throw new Error('申請不在可填寫心得狀態')
  }

  const trimmed = content.trim()
  if (!trimmed) throw new Error('心得內容不可為空白')

  const existing = await prisma.courseReflection.findUnique({ where: { enrollmentId } })

  if (existing) {
    if (existing.isLocked) throw new Error('心得已送出且已鎖定')
    await prisma.courseReflection.update({
      where: { enrollmentId },
      data: { content: trimmed, isLocked: true, returnedAt: null, returnNote: null, submittedAt: new Date() },
    })
  } else {
    await prisma.courseReflection.create({
      data: { enrollmentId, content: trimmed, isLocked: true },
    })
  }

  const nextStatus = nextStatusAfterReflection(enrollment.session.course.requiresQuiz)
  await prisma.courseEnrollment.update({
    where: { id: enrollmentId },
    data: { status: nextStatus },
  })

  return { submittedAt: new Date() }
}

export async function returnReflection(enrollmentId: string, hrId: string, returnNote: string) {
  if (!returnNote.trim()) throw new Error('退回原因為必填')

  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      employee: { select: { id: true, name: true, email: true } },
      session: { include: { course: { select: { name: true } } } },
      reflection: true,
    },
  })
  if (!enrollment) throw new Error('申請不存在')
  if (!enrollment.reflection) throw new Error('心得尚未提交')

  await prisma.courseReflection.update({
    where: { enrollmentId },
    data: { isLocked: false, returnedAt: new Date(), returnNote: returnNote.trim() },
  })

  await prisma.courseEnrollment.update({
    where: { id: enrollmentId },
    data: { status: 'REFLECTION_RETURNED' },
  })

  await sendNotification(
    buildReflectionReturnedNotification(
      enrollment.employee,
      enrollment.session.course.name,
      returnNote.trim(),
      enrollmentId,
    )
  )

  return { success: true }
}
