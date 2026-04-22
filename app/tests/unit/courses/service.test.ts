import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createCourse } from '@/lib/courses/service'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    courseCategory: {
      findUnique: vi.fn(),
    },
    course: {
      create: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'

describe('createCourse', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a course with DRAFT status', async () => {
    const mockCategory = { id: 'cat-1', name: '法治教育', defaultHours: null, countsTowardAnnualHours: true }
    const mockCourse = {
      id: 'course-1',
      name: '法治教育課程',
      categoryId: 'cat-1',
      measurementUnit: 'HOURS',
      measurementValue: 3,
      requiresReflection: true,
      isGroupCourse: false,
      status: 'DRAFT',
      createdBy: 'hr-user-1',
    }

    vi.mocked(prisma.courseCategory.findUnique).mockResolvedValue(mockCategory as never)
    vi.mocked(prisma.course.create).mockResolvedValue(mockCourse as never)

    const result = await createCourse({
      name: '法治教育課程',
      categoryId: 'cat-1',
      measurementUnit: 'HOURS',
      measurementValue: 3,
      requiresReflection: true,
      isGroupCourse: false,
      createdBy: 'hr-user-1',
    })

    expect(result.status).toBe('DRAFT')
    expect(prisma.course.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'DRAFT' }),
      })
    )
  })

  it('should apply defaultHours from category (年度特訓)', async () => {
    const mockCategory = { id: 'cat-2', name: '年度特訓', defaultHours: 12, countsTowardAnnualHours: true }
    vi.mocked(prisma.courseCategory.findUnique).mockResolvedValue(mockCategory as never)
    vi.mocked(prisma.course.create).mockResolvedValue({ id: 'c1', measurementValue: 12 } as never)

    await createCourse({
      name: '年度特訓課程',
      categoryId: 'cat-2',
      measurementUnit: 'HOURS',
      measurementValue: 12,
      requiresReflection: true,
      isGroupCourse: false,
      createdBy: 'hr-user-1',
    })

    expect(prisma.course.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ measurementValue: 12 }),
      })
    )
  })

  it('should throw error when category not found', async () => {
    vi.mocked(prisma.courseCategory.findUnique).mockResolvedValue(null)

    await expect(
      createCourse({
        name: '測試課程',
        categoryId: 'non-existent',
        measurementUnit: 'HOURS',
        measurementValue: 3,
        requiresReflection: true,
        isGroupCourse: false,
        createdBy: 'hr-user-1',
      })
    ).rejects.toThrow('課程類別不存在')
  })
})
