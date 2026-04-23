import { prisma } from '@/lib/prisma'
import {
  sendNotification,
  buildWaitlistPromotedNotification,
  buildWaitlistExpiredNotification,
} from './notification-service'

const CONFIRM_HOURS = 48

export async function promoteNextWaitlistEntry(sessionId: string): Promise<void> {
  const session = await prisma.courseSession.findUnique({
    where: { id: sessionId },
    include: { course: true },
  })
  if (!session) return

  const nextEntry = await prisma.waitlistEntry.findFirst({
    where: { sessionId, status: 'WAITING' },
    include: { employee: true },
    orderBy: { position: 'asc' },
  })

  if (!nextEntry) return

  const confirmDeadline = new Date(Date.now() + CONFIRM_HOURS * 60 * 60 * 1000)

  await prisma.waitlistEntry.update({
    where: { id: nextEntry.id },
    data: {
      status: 'PENDING_CONFIRMATION',
      notifiedAt: new Date(),
      confirmDeadline,
    },
  })

  await sendNotification(
    buildWaitlistPromotedNotification(
      { id: nextEntry.employee.id, email: nextEntry.employee.email, name: nextEntry.employee.name },
      session.course.name,
      confirmDeadline,
      nextEntry.id,
      sessionId,
    ),
  )
}

export async function expireWaitlistEntries(): Promise<{ expired: number; promoted: number }> {
  const expiredEntries = await prisma.waitlistEntry.findMany({
    where: {
      status: 'PENDING_CONFIRMATION',
      confirmDeadline: { lt: new Date() },
    },
    include: {
      employee: true,
      session: { include: { course: true } },
    },
  })

  let promoted = 0

  for (const entry of expiredEntries) {
    await prisma.waitlistEntry.update({
      where: { id: entry.id },
      data: { status: 'EXPIRED' },
    })

    await sendNotification(
      buildWaitlistExpiredNotification(
        { id: entry.employee.id, email: entry.employee.email, name: entry.employee.name },
        entry.session.course.name,
        entry.sessionId,
      ),
    )

    // Promote next entry
    const nextEntry = await prisma.waitlistEntry.findFirst({
      where: { sessionId: entry.sessionId, status: 'WAITING' },
      orderBy: { position: 'asc' },
      include: { employee: true },
    })

    if (nextEntry) {
      const confirmDeadline = new Date(Date.now() + CONFIRM_HOURS * 60 * 60 * 1000)
      await prisma.waitlistEntry.update({
        where: { id: nextEntry.id },
        data: { status: 'PENDING_CONFIRMATION', notifiedAt: new Date(), confirmDeadline },
      })
      await sendNotification(
        buildWaitlistPromotedNotification(
          { id: nextEntry.employee.id, email: nextEntry.employee.email, name: nextEntry.employee.name },
          entry.session.course.name,
          confirmDeadline,
          nextEntry.id,
          entry.sessionId,
        ),
      )
      promoted++
    }
  }

  return { expired: expiredEntries.length, promoted }
}

export async function confirmWaitlistEntry(entryId: string, employeeId: string) {
  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: entryId },
    include: { session: { include: { course: true } }, employee: true },
  })

  if (!entry) throw new Error('等待名單記錄不存在')
  if (entry.employeeId !== employeeId) throw new Error('無權限確認此記錄')
  if (entry.status !== 'PENDING_CONFIRMATION') throw new Error('等待記錄不在可確認狀態')
  if (!entry.confirmDeadline || entry.confirmDeadline < new Date()) {
    throw new Error('確認期限已過，資格已失效')
  }

  await prisma.waitlistEntry.update({
    where: { id: entryId },
    data: { status: 'CONFIRMED' },
  })

  // Create new enrollment
  const enrollment = await prisma.courseEnrollment.create({
    data: {
      employeeId,
      sessionId: entry.sessionId,
      status: 'PENDING_MANAGER',
    },
  })

  return { waitlistEntry: entry, enrollment }
}
