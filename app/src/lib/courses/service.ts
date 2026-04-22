import { prisma } from '@/lib/prisma'
import type { CreateCourseInput, UpdateCourseInput } from './validations'
import type { CourseStatus } from '@prisma/client'

const VALID_STATUS_TRANSITIONS: Record<CourseStatus, CourseStatus[]> = {
  DRAFT: ['ACTIVE'],
  ACTIVE: ['INACTIVE'],
  INACTIVE: ['ACTIVE'],
}

export async function createCourse(input: CreateCourseInput & { createdBy: string }) {
  const category = await prisma.courseCategory.findUnique({
    where: { id: input.categoryId },
  })

  if (!category) throw new Error('課程類別不存在')

  const measurementValue =
    input.measurementValue ?? (category.defaultHours ?? 0)

  return prisma.course.create({
    data: {
      name: input.name,
      categoryId: input.categoryId,
      measurementUnit: input.measurementUnit,
      measurementValue,
      requiresReflection: input.requiresReflection ?? true,
      isGroupCourse: input.isGroupCourse ?? false,
      status: 'DRAFT',
      createdBy: input.createdBy,
    },
    include: { category: true },
  })
}

export async function getCourses(params: {
  categoryId?: string
  status?: CourseStatus
  page?: number
  pageSize?: number
}) {
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 20
  const skip = (page - 1) * pageSize

  const where = {
    ...(params.categoryId && { categoryId: params.categoryId }),
    ...(params.status && { status: params.status }),
  }

  const [courses, total] = await Promise.all([
    prisma.course.findMany({
      where,
      include: {
        category: true,
        _count: { select: { sessions: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.course.count({ where }),
  ])

  return { data: courses, total, page, pageSize }
}

export async function getCourseById(id: string) {
  const course = await prisma.course.findUnique({
    where: { id },
    include: { category: true, sessions: { orderBy: { startDate: 'asc' } } },
  })

  if (!course) throw new Error('課程不存在')
  return course
}

export async function updateCourse(id: string, input: UpdateCourseInput) {
  const course = await prisma.course.findUnique({ where: { id } })
  if (!course) throw new Error('課程不存在')

  return prisma.course.update({
    where: { id },
    data: input,
    include: { category: true },
  })
}

export async function changeCourseStatus(id: string, newStatus: CourseStatus) {
  const course = await prisma.course.findUnique({ where: { id } })
  if (!course) throw new Error('課程不存在')

  const allowedTransitions = VALID_STATUS_TRANSITIONS[course.status]
  if (!allowedTransitions.includes(newStatus)) {
    throw new Error(`無法從 ${course.status} 轉換至 ${newStatus}`)
  }

  return prisma.course.update({
    where: { id },
    data: { status: newStatus },
  })
}
