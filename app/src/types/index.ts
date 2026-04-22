import type { Course, CourseCategory, CourseSession, CourseStatus, MeasurementUnit, SessionStatus } from '@prisma/client'

export type { Course, CourseCategory, CourseSession, CourseStatus, MeasurementUnit, SessionStatus }

export type CourseWithCategory = Course & {
  category: CourseCategory
}

export type CourseWithDetails = CourseWithCategory & {
  sessions: CourseSession[]
  _count?: { sessions: number }
}

export type CourseListItem = {
  id: string
  name: string
  category: { id: string; name: string }
  measurementUnit: MeasurementUnit
  measurementValue: number
  requiresReflection: boolean
  isGroupCourse: boolean
  status: CourseStatus
  sessionCount: number
  createdAt: Date
}

export type PaginatedResponse<T> = {
  data: T[]
  total: number
  page: number
  pageSize: number
}
