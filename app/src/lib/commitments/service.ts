import { Decimal } from '@prisma/client-runtime-utils'
import { addMonths, differenceInMonths } from 'date-fns'
import { prisma } from '@/lib/prisma'
import {
  buildCommitmentSignatureRequiredNotification,
  buildCommitmentSignedNotification,
  buildCommitmentSignatureExpiredNotification,
  buildCommitmentExpiringSoonNotification,
  buildCommitmentCompensationNotification,
  sendNotification,
} from '@/lib/enrollments/notification-service'

export async function signCommitment(enrollmentId: string, employeeId: string) {
  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      employee: true,
      commitmentRecord: true,
    },
  })

  if (!enrollment) throw new Error('申請不存在')
  if (enrollment.employeeId !== employeeId) throw new Error('無權限簽署此承諾書')
  if (enrollment.status !== 'PENDING_COMMITMENT') throw new Error('申請不在待簽署承諾書狀態')

  const commitment = enrollment.commitmentRecord
  if (!commitment) throw new Error('承諾書記錄不存在')
  if (commitment.status !== 'PENDING_SIGNATURE') throw new Error('承諾書已簽署或已失效')
  if (commitment.signatureDeadline < new Date()) throw new Error('承諾書簽署期限已過')

  const signedAt = new Date()
  const commitmentExpiresAt = addMonths(signedAt, commitment.commitmentMonths)

  const [updatedCommitment] = await prisma.$transaction([
    prisma.commitmentRecord.update({
      where: { id: commitment.id },
      data: { status: 'ACTIVE', signedAt, commitmentExpiresAt },
    }),
    prisma.courseEnrollment.update({
      where: { id: enrollmentId },
      data: { status: 'CONFIRMED' },
    }),
  ])

  await sendNotification(
    buildCommitmentSignedNotification(
      { id: enrollment.employee.id, email: enrollment.employee.email, name: enrollment.employee.name },
      (await prisma.courseSession.findUnique({ where: { id: enrollment.sessionId }, include: { course: true } }))!.course.name,
      commitmentExpiresAt,
      enrollmentId,
    ),
  )

  return updatedCommitment
}

export async function processExpiredCommitments() {
  const now = new Date()

  const expired = await prisma.commitmentRecord.findMany({
    where: {
      status: 'PENDING_SIGNATURE',
      signatureDeadline: { lt: now },
    },
    include: {
      enrollment: { include: { employee: true } },
    },
  })

  const results: Array<{ commitmentId: string; enrollmentId: string; employeeName: string }> = []

  for (const record of expired) {
    await prisma.$transaction([
      prisma.commitmentRecord.update({
        where: { id: record.id },
        data: { status: 'VOIDED' },
      }),
      prisma.courseEnrollment.update({
        where: { id: record.enrollmentId },
        data: { status: 'CANCELLED' },
      }),
    ])

    const courseName = (
      await prisma.courseSession.findUnique({
        where: { id: record.enrollment.sessionId },
        include: { course: true },
      })
    )!.course.name

    const employee = record.enrollment.employee

    await sendNotification(
      buildCommitmentSignatureExpiredNotification(
        { id: employee.id, email: employee.email, name: employee.name },
        courseName,
        record.enrollmentId,
      ),
    )

    // Notify all HR employees
    const hrList = await prisma.employee.findMany({
      where: { role: 'HR', isActive: true },
    })
    for (const hr of hrList) {
      await sendNotification(
        buildCommitmentSignatureExpiredNotification(
          { id: hr.id, email: hr.email, name: hr.name },
          `${employee.name} - ${courseName}`,
          record.enrollmentId,
        ),
      )
    }

    results.push({
      commitmentId: record.id,
      enrollmentId: record.enrollmentId,
      employeeName: employee.name,
    })
  }

  return { processed: expired.length, cancelled: results }
}

export async function resignEmployee(employeeId: string, resignedAt: string, hrId: string) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      commitmentRecords: {
        where: { status: 'ACTIVE' },
        include: {
          enrollment: {
            include: { session: { include: { course: true } } },
          },
        },
      },
    },
  })

  if (!employee) throw new Error('員工不存在')
  if (!employee.isActive) throw new Error('員工已離職')

  const resignDate = new Date(resignedAt)
  const commitmentCompensations: Array<{
    commitmentId: string
    courseName: string
    commitmentMonths: number
    commitmentFee: string
    monthsCompleted: number
    remainingMonths: number
    compensationAmount: string
    note: string
    preCourseResignation: boolean
  }> = []

  let totalCompensation = new Decimal(0)

  for (const record of employee.commitmentRecords) {
    const sessionStartDate = record.enrollment.session.startDate
    const courseName = record.enrollment.session.course.name
    const fee = new Decimal(record.commitmentFee.toString())
    const months = record.commitmentMonths

    let compensationAmount: Decimal
    let note: string
    let preCourseResignation = false
    let monthsCompleted = 0
    let remainingMonths = months

    if (resignDate <= sessionStartDate) {
      // Pre-course resignation: full amount
      compensationAmount = fee
      note = `全額賠償（課程尚未開始即離職）`
      preCourseResignation = true
    } else if (record.signedAt && resignDate >= addMonths(record.signedAt, months)) {
      // Past commitment period: no compensation
      compensationAmount = new Decimal(0)
      note = `承諾期已屆滿，無需賠償`
      remainingMonths = 0
      monthsCompleted = months
    } else {
      // Calculate proportional compensation
      const startRef = record.signedAt ?? sessionStartDate
      monthsCompleted = differenceInMonths(resignDate, startRef)
      remainingMonths = Math.max(0, months - monthsCompleted)
      compensationAmount = fee.mul(remainingMonths).div(months).toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
      note = `依比例計算：${fee.toFixed(0)} × ${remainingMonths}/${months}`
    }

    await prisma.commitmentRecord.update({
      where: { id: record.id },
      data: {
        status: 'COMPENSATION_NOTED',
        compensationAmount,
        compensationNote: note,
        compensationAt: new Date(),
      },
    })

    totalCompensation = totalCompensation.add(compensationAmount)
    commitmentCompensations.push({
      commitmentId: record.id,
      courseName,
      commitmentMonths: months,
      commitmentFee: fee.toFixed(2),
      monthsCompleted,
      remainingMonths,
      compensationAmount: compensationAmount.toFixed(2),
      note,
      preCourseResignation,
    })
  }

  await prisma.employee.update({
    where: { id: employeeId },
    data: { isActive: false, resignedAt: resignDate },
  })

  // Notify HR about compensation
  const hr = await prisma.employee.findUnique({ where: { id: hrId } })
  if (hr && commitmentCompensations.length > 0) {
    await sendNotification(
      buildCommitmentCompensationNotification(
        { id: hr.id, email: hr.email, name: hr.name },
        employee.name,
        resignDate,
        totalCompensation.toFixed(2),
        commitmentCompensations.map((c) => ({
          courseName: c.courseName,
          compensationAmount: c.compensationAmount,
          note: c.note,
        })),
      ),
    )
  }

  return {
    employeeId,
    resignedAt,
    commitmentCompensations,
    totalCompensation: totalCompensation.toFixed(2),
  }
}

export async function sendMonthlyCommitmentReminder() {
  const now = new Date()
  const thirtyDaysLater = addMonths(now, 1)

  const expiringRecords = await prisma.commitmentRecord.findMany({
    where: {
      status: 'ACTIVE',
      commitmentExpiresAt: {
        gte: now,
        lte: thirtyDaysLater,
      },
    },
    include: {
      employee: { select: { id: true, name: true } },
      course: { select: { name: true } },
    },
  })

  if (expiringRecords.length === 0) {
    return { expiringCount: 0, notificationSent: false, hrCount: 0 }
  }

  const hrList = await prisma.employee.findMany({
    where: { role: 'HR', isActive: true },
  })

  const items = expiringRecords.map((r) => ({
    employeeName: r.employee.name,
    courseName: r.course.name,
    expiresAt: r.commitmentExpiresAt!,
    daysLeft: Math.ceil((r.commitmentExpiresAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
  }))

  for (const hr of hrList) {
    await sendNotification(
      buildCommitmentExpiringSoonNotification(
        { id: hr.id, email: hr.email, name: hr.name },
        items,
      ),
    )
  }

  return { expiringCount: expiringRecords.length, notificationSent: true, hrCount: hrList.length }
}

export function calculateCompensationSchedule(
  commitmentMonths: number,
  commitmentFee: number | string,
): Array<{ monthsCompleted: number; remainingMonths: number; amount: string }> {
  const fee = new Decimal(commitmentFee.toString())
  const milestones = [0, 6, 12, 18, 24].filter((m) => m <= commitmentMonths)
  if (!milestones.includes(commitmentMonths)) milestones.push(commitmentMonths)

  return milestones.map((monthsCompleted) => {
    const remainingMonths = commitmentMonths - monthsCompleted
    const amount = remainingMonths === 0
      ? new Decimal(0)
      : fee.mul(remainingMonths).div(commitmentMonths).toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    return {
      monthsCompleted,
      remainingMonths,
      amount: amount.toFixed(2),
    }
  })
}
