import type {
  Course, CourseCategory, CourseSession, CourseStatus, MeasurementUnit, SessionStatus,
  Employee, EmployeeRole,
  CourseEnrollment, EnrollmentStatus,
  WaitlistEntry, WaitlistStatus,
  NotificationLog, NotificationStatus, NotificationEventType,
} from '@prisma/client'

export type {
  Course, CourseCategory, CourseSession, CourseStatus, MeasurementUnit, SessionStatus,
  Employee, EmployeeRole,
  CourseEnrollment, EnrollmentStatus,
  WaitlistEntry, WaitlistStatus,
  NotificationLog, NotificationStatus, NotificationEventType,
}

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

export type EnrollmentWithDetails = CourseEnrollment & {
  employee: Pick<Employee, 'id' | 'name' | 'department' | 'unit'>
  session: CourseSession & {
    course: Pick<Course, 'id' | 'name'>
  }
}

export type WaitlistEntryWithDetails = WaitlistEntry & {
  employee: Pick<Employee, 'id' | 'name' | 'department'>
  session: CourseSession & {
    course: Pick<Course, 'id' | 'name'>
  }
}

export type CreateEnrollmentResult =
  | { type: 'enrollment'; enrollment: CourseEnrollment }
  | { type: 'waitlist'; waitlistEntry: WaitlistEntry }
