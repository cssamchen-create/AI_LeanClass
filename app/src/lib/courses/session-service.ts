import { prisma } from '@/lib/prisma'
import type { CreateSessionInput } from './validations'

export async function createSession(courseId: string, input: CreateSessionInput) {
  const course = await prisma.course.findUnique({ where: { id: courseId } })
  if (!course) throw new Error('課程不存在')

  return prisma.courseSession.create({
    data: {
      courseId,
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : null,
      location: input.location,
      instructorName: input.instructorName,
      capacity: input.capacity,
      status: 'OPEN',
    },
  })
}

export async function updateSession(sessionId: string, input: Partial<CreateSessionInput>) {
  const session = await prisma.courseSession.findUnique({ where: { id: sessionId } })
  if (!session) throw new Error('梯次不存在')
  if (session.status === 'CANCELLED') throw new Error('已取消的梯次無法編輯')

  return prisma.courseSession.update({
    where: { id: sessionId },
    data: {
      ...(input.startDate && { startDate: new Date(input.startDate) }),
      ...(input.endDate !== undefined && { endDate: input.endDate ? new Date(input.endDate) : null }),
      ...(input.location && { location: input.location }),
      ...(input.instructorName && { instructorName: input.instructorName }),
      ...(input.capacity && { capacity: input.capacity }),
    },
  })
}

export async function cancelSession(sessionId: string, cancelledBy: string) {
  const session = await prisma.courseSession.findUnique({ where: { id: sessionId } })
  if (!session) throw new Error('梯次不存在')
  if (session.status === 'CANCELLED') throw new Error('梯次已取消')

  return prisma.courseSession.update({
    where: { id: sessionId },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancelledBy,
    },
  })
}
