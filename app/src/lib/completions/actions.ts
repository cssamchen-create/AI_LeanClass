'use server'

import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { confirmAttendance } from './service'
import { submitReflection, returnReflection } from './reflection-service'
import { submitQuiz, gradeEssayAnswers, allowRetry } from './quiz-service'
import { closeEnrollment } from './service'
import { createQuiz, updateQuiz } from './quiz-management-service'
import type { AttendanceInput, ReflectionInput, ReturnReflectionInput, GradeInput, QuizSubmitInput, QuizCreateInput } from './validations'

function getHrId(role: string | undefined, userId: string): string {
  if (role !== 'HR') redirect('/unauthorized')
  return userId
}

function getEmployeeId(userId: string): string {
  return userId
}

export async function confirmAttendanceAction(sessionId: string, data: AttendanceInput) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const hrId = getHrId((session.user as { role?: string }).role, session.user.id!)
  return confirmAttendance(sessionId, data.attendances, hrId)
}

export async function submitReflectionAction(enrollmentId: string, data: ReflectionInput) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const employeeId = getEmployeeId(session.user.id!)
  return submitReflection(enrollmentId, employeeId, data.content)
}

export async function returnReflectionAction(enrollmentId: string, data: ReturnReflectionInput) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const hrId = getHrId((session.user as { role?: string }).role, session.user.id!)
  return returnReflection(enrollmentId, hrId, data.returnNote)
}

export async function closeEnrollmentAction(enrollmentId: string) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const hrId = getHrId((session.user as { role?: string }).role, session.user.id!)
  return closeEnrollment(enrollmentId, hrId)
}

export async function submitQuizAction(enrollmentId: string, data: QuizSubmitInput) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const employeeId = getEmployeeId(session.user.id!)
  return submitQuiz(enrollmentId, employeeId, data.answers)
}

export async function gradeEssayAction(attemptId: string, data: GradeInput) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const hrId = getHrId((session.user as { role?: string }).role, session.user.id!)
  return gradeEssayAnswers(attemptId, hrId, data.grades)
}

export async function allowRetryAction(enrollmentId: string) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const hrId = getHrId((session.user as { role?: string }).role, session.user.id!)
  return allowRetry(enrollmentId, hrId)
}

export async function createQuizAction(courseId: string, data: QuizCreateInput) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const hrId = getHrId((session.user as { role?: string }).role, session.user.id!)
  return createQuiz(courseId, hrId, data)
}

export async function updateQuizAction(quizId: string, data: QuizCreateInput) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const hrId = getHrId((session.user as { role?: string }).role, session.user.id!)
  return updateQuiz(quizId, hrId, data)
}
