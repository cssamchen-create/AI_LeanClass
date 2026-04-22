import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSession, cancelSession } from '@/lib/courses/session-service'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    course: {
      findUnique: vi.fn(),
    },
    courseSession: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'

describe('createSession', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should create a session with OPEN status', async () => {
    vi.mocked(prisma.course.findUnique).mockResolvedValue({ id: 'c1', status: 'ACTIVE' } as never)
    vi.mocked(prisma.courseSession.create).mockResolvedValue({
      id: 's1', courseId: 'c1', status: 'OPEN', capacity: 30,
    } as never)

    const result = await createSession('c1', {
      startDate: '2026-06-01',
      location: '台北 A101',
      instructorName: '王小明',
      capacity: 30,
    })

    expect(result.status).toBe('OPEN')
    expect(prisma.courseSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'OPEN', capacity: 30 }),
      })
    )
  })

  it('should throw error when course not found', async () => {
    vi.mocked(prisma.course.findUnique).mockResolvedValue(null)

    await expect(createSession('non-existent', {
      startDate: '2026-06-01', location: '台北', instructorName: '王', capacity: 10,
    })).rejects.toThrow('課程不存在')
  })
})

describe('cancelSession', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should cancel an OPEN session', async () => {
    vi.mocked(prisma.courseSession.findUnique).mockResolvedValue({
      id: 's1', status: 'OPEN', courseId: 'c1',
    } as never)
    vi.mocked(prisma.courseSession.update).mockResolvedValue({
      id: 's1', status: 'CANCELLED',
    } as never)

    const result = await cancelSession('s1', 'hr-user')
    expect(result.status).toBe('CANCELLED')
    expect(prisma.courseSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'CANCELLED' }),
      })
    )
  })

  it('should throw error when session already cancelled', async () => {
    vi.mocked(prisma.courseSession.findUnique).mockResolvedValue({
      id: 's1', status: 'CANCELLED',
    } as never)

    await expect(cancelSession('s1', 'hr-user'))
      .rejects.toThrow('梯次已取消')
  })

  it('should throw error when session not found', async () => {
    vi.mocked(prisma.courseSession.findUnique).mockResolvedValue(null)

    await expect(cancelSession('non-existent', 'hr-user'))
      .rejects.toThrow('梯次不存在')
  })
})
