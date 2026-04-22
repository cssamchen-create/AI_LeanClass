import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createCourse, updateCourse, changeCourseStatus } from '@/lib/courses/service'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    courseCategory: {
      findUnique: vi.fn(),
    },
    course: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'

describe('createCourse', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should create a course with DRAFT status', async () => {
    const mockCategory = { id: 'cat-1', name: '法治教育', defaultHours: null, countsTowardAnnualHours: true }
    const mockCourse = { id: 'course-1', name: '法治教育課程', status: 'DRAFT', createdBy: 'hr-user-1' }

    vi.mocked(prisma.courseCategory.findUnique).mockResolvedValue(mockCategory as never)
    vi.mocked(prisma.course.create).mockResolvedValue(mockCourse as never)

    const result = await createCourse({
      name: '法治教育課程', categoryId: 'cat-1', measurementUnit: 'HOURS',
      measurementValue: 3, requiresReflection: true, isGroupCourse: false, createdBy: 'hr-user-1',
    })

    expect(result.status).toBe('DRAFT')
    expect(prisma.course.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'DRAFT' }) })
    )
  })

  it('should apply defaultHours from category (年度特訓)', async () => {
    const mockCategory = { id: 'cat-2', name: '年度特訓', defaultHours: 12, countsTowardAnnualHours: true }
    vi.mocked(prisma.courseCategory.findUnique).mockResolvedValue(mockCategory as never)
    vi.mocked(prisma.course.create).mockResolvedValue({ id: 'c1', measurementValue: 12 } as never)

    await createCourse({
      name: '年度特訓課程', categoryId: 'cat-2', measurementUnit: 'HOURS',
      measurementValue: 12, requiresReflection: true, isGroupCourse: false, createdBy: 'hr-user-1',
    })

    expect(prisma.course.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ measurementValue: 12 }) })
    )
  })

  it('should throw error when category not found', async () => {
    vi.mocked(prisma.courseCategory.findUnique).mockResolvedValue(null)

    await expect(createCourse({
      name: '測試課程', categoryId: 'non-existent', measurementUnit: 'HOURS',
      measurementValue: 3, requiresReflection: true, isGroupCourse: false, createdBy: 'hr-user-1',
    })).rejects.toThrow('課程類別不存在')
  })
})

describe('updateCourse', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should update course fields', async () => {
    const mockCourse = { id: 'c1', name: '舊名稱', status: 'DRAFT' }
    const updatedCourse = { ...mockCourse, name: '新名稱' }

    vi.mocked(prisma.course.findUnique).mockResolvedValue(mockCourse as never)
    vi.mocked(prisma.course.update).mockResolvedValue(updatedCourse as never)

    const result = await updateCourse('c1', { name: '新名稱' })
    expect(result.name).toBe('新名稱')
    expect(prisma.course.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'c1' }, data: { name: '新名稱' } })
    )
  })

  it('should throw error when course not found', async () => {
    vi.mocked(prisma.course.findUnique).mockResolvedValue(null)

    await expect(updateCourse('non-existent', { name: '新名稱' }))
      .rejects.toThrow('課程不存在')
  })
})

describe('changeCourseStatus', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should allow DRAFT → ACTIVE transition', async () => {
    vi.mocked(prisma.course.findUnique).mockResolvedValue({ id: 'c1', status: 'DRAFT' } as never)
    vi.mocked(prisma.course.update).mockResolvedValue({ id: 'c1', status: 'ACTIVE' } as never)

    const result = await changeCourseStatus('c1', 'ACTIVE')
    expect(result.status).toBe('ACTIVE')
  })

  it('should allow ACTIVE → INACTIVE transition', async () => {
    vi.mocked(prisma.course.findUnique).mockResolvedValue({ id: 'c1', status: 'ACTIVE' } as never)
    vi.mocked(prisma.course.update).mockResolvedValue({ id: 'c1', status: 'INACTIVE' } as never)

    const result = await changeCourseStatus('c1', 'INACTIVE')
    expect(result.status).toBe('INACTIVE')
  })

  it('should reject invalid status transition (DRAFT → INACTIVE)', async () => {
    vi.mocked(prisma.course.findUnique).mockResolvedValue({ id: 'c1', status: 'DRAFT' } as never)

    await expect(changeCourseStatus('c1', 'INACTIVE'))
      .rejects.toThrow('無法從 DRAFT 轉換至 INACTIVE')
  })

  it('should throw error when course not found', async () => {
    vi.mocked(prisma.course.findUnique).mockResolvedValue(null)

    await expect(changeCourseStatus('non-existent', 'ACTIVE'))
      .rejects.toThrow('課程不存在')
  })
})
