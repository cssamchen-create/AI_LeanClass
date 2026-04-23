import type {
  Course, CourseCategory, CourseSession, CourseStatus, MeasurementUnit, SessionStatus,
  Employee, EmployeeRole,
  CourseEnrollment, EnrollmentStatus,
  WaitlistEntry, WaitlistStatus,
  NotificationLog, NotificationStatus, NotificationEventType,
  CourseReflection,
  Quiz, QuizQuestion, QuizAttempt, QuizAnswer, QuestionType,
  EmployeeTrainingRecord,
} from '@prisma/client'

export type {
  Course, CourseCategory, CourseSession, CourseStatus, MeasurementUnit, SessionStatus,
  Employee, EmployeeRole,
  CourseEnrollment, EnrollmentStatus,
  WaitlistEntry, WaitlistStatus,
  NotificationLog, NotificationStatus, NotificationEventType,
  CourseReflection,
  Quiz, QuizQuestion, QuizAttempt, QuizAnswer, QuestionType,
  EmployeeTrainingRecord,
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

export type QuizQuestionWithOptions = QuizQuestion & {
  options: Array<{ text: string; isCorrect: boolean }> | null
}

export type QuizWithQuestions = Quiz & {
  questions: QuizQuestionWithOptions[]
}

export type QuizAnswerWithQuestion = QuizAnswer & {
  question: QuizQuestion
}

export type QuizAttemptWithDetails = QuizAttempt & {
  answers: QuizAnswerWithQuestion[]
  quiz: Quiz
  enrollment: CourseEnrollment & {
    employee: Pick<Employee, 'id' | 'name' | 'email'>
  }
}

export type CompletionWithDetails = CourseEnrollment & {
  employee: Pick<Employee, 'id' | 'name' | 'email' | 'department'>
  session: CourseSession & {
    course: Pick<Course, 'id' | 'name' | 'measurementUnit' | 'measurementValue' | 'requiresReflection' | 'isGroupCourse' | 'requiresQuiz' | 'isNewHireTraining'>
  }
  reflection?: CourseReflection | null
  quizAttempts?: QuizAttempt[]
}

export type TrainingRecordSummary = {
  summary: {
    year: number
    annualHours: number
    totalHours: number
    totalCredits: number
  }
  completions: Array<{
    enrollmentId: string
    courseName: string
    sessionDate: Date
    hours: number
    credits: number
    quizScore?: number | null
    quizPassed?: boolean | null
    completedAt: Date
  }>
}
