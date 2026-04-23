import { prisma } from '@/lib/prisma'
import type { CreateEnrollmentResult } from '@/types'
import type { CreateEnrollmentInput } from './validations'
import {
  sendNotification,
  buildEnrollmentSubmittedNotification,
  buildManagerReviewNeededNotification,
  buildManagerReviewResultNotification,
  buildHRReviewResultNotification,
  buildCommitmentSignatureRequiredNotification,
} from './notification-service'
import { promoteNextWaitlistEntry } from './waitlist-service'

export async function createEnrollment(
  input: CreateEnrollmentInput,
  employeeId: string,
): Promise<CreateEnrollmentResult> {
  const session = await prisma.courseSession.findUnique({
    where: { id: input.sessionId },
    include: { course: true },
  })
  if (!session) throw new Error('梯次不存在')
  if (session.status !== 'OPEN') throw new Error('梯次不開放報名')

  // Check for existing active enrollment
  const existingEnrollment = await prisma.courseEnrollment.findFirst({
    where: {
      employeeId,
      sessionId: input.sessionId,
      status: { notIn: ['REJECTED', 'CANCELLED'] },
    },
  })
  if (existingEnrollment) throw new Error('已有申請記錄，不可重複申請')

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { manager: { select: { id: true, name: true, email: true } } },
  })
  if (!employee) throw new Error('員工資料不存在')

  const hasCapacity = session.enrolledCount < session.capacity

  if (hasCapacity) {
    const enrollment = await prisma.$transaction(async (tx) => {
      return tx.courseEnrollment.create({
        data: { employeeId, sessionId: input.sessionId, status: 'PENDING_MANAGER' },
      })
    })

    // Notify employee
    await sendNotification(
      buildEnrollmentSubmittedNotification(
        { id: employee.id, email: employee.email, name: employee.name },
        session.course.name,
        session.startDate,
        enrollment.id,
        session.id,
      ),
    )

    // Notify manager
    if (employee.manager) {
      await sendNotification(
        buildManagerReviewNeededNotification(
          { id: employee.manager.id, email: employee.manager.email, name: employee.manager.name },
          employee.name,
          session.course.name,
          enrollment.id,
        ),
      )
    }

    return { type: 'enrollment', enrollment }
  } else {
    // Check existing waitlist entry
    const existingWaitlist = await prisma.waitlistEntry.findUnique({
      where: { employeeId_sessionId: { employeeId, sessionId: input.sessionId } },
    })
    if (existingWaitlist && existingWaitlist.status !== 'CANCELLED' && existingWaitlist.status !== 'EXPIRED') {
      throw new Error('已有申請記錄，不可重複申請')
    }

    const position = (await prisma.waitlistEntry.count({
      where: { sessionId: input.sessionId, status: { in: ['WAITING', 'PENDING_CONFIRMATION'] } },
    })) + 1

    const waitlistEntry = await prisma.waitlistEntry.create({
      data: { employeeId, sessionId: input.sessionId, position, status: 'WAITING' },
    })

    const { buildWaitlistJoinedNotification } = await import('./notification-service')
    await sendNotification(
      buildWaitlistJoinedNotification(
        { id: employee.id, email: employee.email, name: employee.name },
        session.course.name,
        position,
        session.id,
      ),
    )

    return { type: 'waitlist', waitlistEntry }
  }
}

export async function getMyEnrollments(
  employeeId: string,
  params: { status?: string; page?: number; pageSize?: number } = {},
) {
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 20
  const skip = (page - 1) * pageSize

  const where = {
    employeeId,
    ...(params.status && { status: params.status as Parameters<typeof prisma.courseEnrollment.findMany>[0]['where'] }),
  }

  const [enrollments, total] = await Promise.all([
    prisma.courseEnrollment.findMany({
      where: { employeeId, ...(params.status ? { status: params.status as never } : {}) },
      include: {
        session: {
          include: { course: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.courseEnrollment.count({ where: { employeeId, ...(params.status ? { status: params.status as never } : {}) } }),
  ])

  return { data: enrollments, total, page, pageSize }
}

export async function approveByManager(enrollmentId: string, managerId: string) {
  const enrollment = await prisma.courseEnrollment.findFirst({
    where: { id: enrollmentId },
    include: {
      employee: { include: { manager: { select: { id: true } } } },
      session: { include: { course: true } },
    },
  })

  if (!enrollment) throw new Error('申請不存在')
  if (enrollment.employee.managerId !== managerId) throw new Error('無權限審核此申請')
  if (enrollment.status !== 'PENDING_MANAGER') throw new Error('申請不在可審核狀態')

  const manager = await prisma.employee.findUnique({ where: { id: managerId } })
  if (!manager) throw new Error('主管資料不存在')

  const updated = await prisma.courseEnrollment.update({
    where: { id: enrollmentId },
    data: {
      status: 'PENDING_HR',
      reviewedByManagerId: managerId,
      managerReviewedAt: new Date(),
    },
  })

  await sendNotification(
    buildManagerReviewResultNotification(
      { id: enrollment.employee.id, email: enrollment.employee.email, name: enrollment.employee.name },
      enrollment.session.course.name,
      true,
      null,
      enrollmentId,
    ),
  )

  return updated
}

export async function rejectByManager(enrollmentId: string, managerId: string, note: string) {
  if (!note || note.trim() === '') throw new Error('退回原因為必填')

  const enrollment = await prisma.courseEnrollment.findFirst({
    where: { id: enrollmentId },
    include: {
      employee: true,
      session: { include: { course: true } },
    },
  })

  if (!enrollment) throw new Error('申請不存在')
  if (enrollment.employee.managerId !== managerId) throw new Error('無權限審核此申請')
  if (enrollment.status !== 'PENDING_MANAGER') throw new Error('申請不在可審核狀態')

  const updated = await prisma.courseEnrollment.update({
    where: { id: enrollmentId },
    data: {
      status: 'REJECTED',
      managerNote: note,
      reviewedByManagerId: managerId,
      managerReviewedAt: new Date(),
    },
  })

  await sendNotification(
    buildManagerReviewResultNotification(
      { id: enrollment.employee.id, email: enrollment.employee.email, name: enrollment.employee.name },
      enrollment.session.course.name,
      false,
      note,
      enrollmentId,
    ),
  )

  return updated
}

export async function approveByHR(enrollmentId: string, hrId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const enrollment = await tx.courseEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        employee: true,
        session: { include: { course: true } },
      },
    })

    if (!enrollment) throw new Error('申請不存在')
    if (enrollment.status !== 'PENDING_HR') throw new Error('申請不在可審核狀態')
    if (enrollment.session.enrolledCount >= enrollment.session.capacity) {
      throw new Error('名額已滿，無法核准')
    }

    const course = enrollment.session.course
    const requiresCommitment = course.requiresCommitment

    const newStatus = requiresCommitment ? 'PENDING_COMMITMENT' : 'CONFIRMED'

    const updated = await tx.courseEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: newStatus,
        reviewedByHrId: hrId,
        hrReviewedAt: new Date(),
      },
    })

    await tx.courseSession.update({
      where: { id: enrollment.sessionId },
      data: { enrolledCount: { increment: 1 } },
    })

    if (requiresCommitment && course.commitmentMonths && course.commitmentFee != null) {
      const signatureDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000)
      await tx.commitmentRecord.create({
        data: {
          enrollmentId,
          courseId: course.id,
          employeeId: enrollment.employeeId,
          signatureDeadline,
          commitmentMonths: course.commitmentMonths,
          commitmentFee: course.commitmentFee,
        },
      })
    }

    return { updated, enrollment, requiresCommitment }
  })

  if (result.requiresCommitment) {
    const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000)
    await sendNotification(
      buildCommitmentSignatureRequiredNotification(
        {
          id: result.enrollment.employee.id,
          email: result.enrollment.employee.email,
          name: result.enrollment.employee.name,
        },
        result.enrollment.session.course.name,
        deadline,
        enrollmentId,
      ),
    )
  } else {
    await sendNotification(
      buildHRReviewResultNotification(
        { id: result.enrollment.employee.id, email: result.enrollment.employee.email, name: result.enrollment.employee.name },
        result.enrollment.session.course.name,
        result.enrollment.session.startDate,
        true,
        null,
        enrollmentId,
      ),
    )
  }

  return result.updated
}

export async function rejectByHR(enrollmentId: string, hrId: string, note: string) {
  if (!note || note.trim() === '') throw new Error('退回原因為必填')

  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      employee: true,
      session: { include: { course: true } },
    },
  })

  if (!enrollment) throw new Error('申請不存在')
  if (enrollment.status !== 'PENDING_HR') throw new Error('申請不在可審核狀態')

  const updated = await prisma.courseEnrollment.update({
    where: { id: enrollmentId },
    data: {
      status: 'REJECTED',
      hrNote: note,
      reviewedByHrId: hrId,
      hrReviewedAt: new Date(),
    },
  })

  await sendNotification(
    buildHRReviewResultNotification(
      { id: enrollment.employee.id, email: enrollment.employee.email, name: enrollment.employee.name },
      enrollment.session.course.name,
      enrollment.session.startDate,
      false,
      note,
      enrollmentId,
    ),
  )

  return updated
}

export async function cancelEnrollment(enrollmentId: string, employeeId: string) {
  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { id: enrollmentId },
    include: { employee: true, session: { include: { course: true } } },
  })

  if (!enrollment) throw new Error('申請不存在')
  if (enrollment.employeeId !== employeeId) throw new Error('無權限取消此申請')
  if (!['PENDING_MANAGER', 'PENDING_HR'].includes(enrollment.status)) {
    throw new Error('此申請狀態無法直接取消，已確認報名請聯繫 HR')
  }

  return prisma.courseEnrollment.update({
    where: { id: enrollmentId },
    data: { status: 'CANCELLED' },
  })
}

export async function cancelConfirmedEnrollment(enrollmentId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const enrollment = await tx.courseEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { employee: true, session: { include: { course: true } } },
    })

    if (!enrollment) throw new Error('申請不存在')
    if (enrollment.status !== 'CONFIRMED') throw new Error('僅已確認報名可申請取消')

    const updated = await tx.courseEnrollment.update({
      where: { id: enrollmentId },
      data: { status: 'CANCELLED' },
    })

    await tx.courseSession.update({
      where: { id: enrollment.sessionId },
      data: { enrolledCount: { decrement: 1 } },
    })

    return { updated, sessionId: enrollment.sessionId }
  })

  // Trigger waitlist promotion
  await promoteNextWaitlistEntry(result.sessionId)

  return result.updated
}

export async function getManagerEnrollments(
  managerId: string,
  params: { status?: string; page?: number; pageSize?: number } = {},
) {
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 20

  // Get subordinate IDs
  const subordinates = await prisma.employee.findMany({
    where: { managerId, isActive: true },
    select: { id: true },
  })
  const subordinateIds = subordinates.map((s) => s.id)

  const statusFilter = (params.status ?? 'PENDING_MANAGER') as never

  const [enrollments, total] = await Promise.all([
    prisma.courseEnrollment.findMany({
      where: { employeeId: { in: subordinateIds }, status: statusFilter },
      include: {
        employee: { select: { id: true, name: true, department: true, unit: true } },
        session: { include: { course: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.courseEnrollment.count({
      where: { employeeId: { in: subordinateIds }, status: statusFilter },
    }),
  ])

  return { data: enrollments, total, page, pageSize }
}

export async function getHREnrollments(
  params: { status?: string; courseId?: string; sessionId?: string; department?: string; page?: number; pageSize?: number } = {},
) {
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 20
  const statusFilter = (params.status ?? 'PENDING_HR') as never

  const [enrollments, total] = await Promise.all([
    prisma.courseEnrollment.findMany({
      where: {
        status: statusFilter,
        ...(params.sessionId ? { sessionId: params.sessionId } : {}),
        ...(params.department ? { employee: { department: params.department } } : {}),
        ...(params.courseId ? { session: { courseId: params.courseId } } : {}),
      },
      include: {
        employee: { select: { id: true, name: true, department: true, unit: true } },
        session: { include: { course: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.courseEnrollment.count({
      where: {
        status: statusFilter,
        ...(params.sessionId ? { sessionId: params.sessionId } : {}),
        ...(params.department ? { employee: { department: params.department } } : {}),
        ...(params.courseId ? { session: { courseId: params.courseId } } : {}),
      },
    }),
  ])

  return { data: enrollments, total, page, pageSize }
}
