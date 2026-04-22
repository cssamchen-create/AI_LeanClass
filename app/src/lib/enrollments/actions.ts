'use server'

import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { createEnrollment, cancelEnrollment, approveByManager, rejectByManager, approveByHR, rejectByHR, cancelConfirmedEnrollment } from './service'
import { confirmWaitlistEntry } from './waitlist-service'
import { resendNotification } from './notification-service'
import { createEnrollmentSchema, rejectSchema } from './validations'

function getEmployeeId(session: Awaited<ReturnType<typeof auth>>): string {
  const id = (session?.user as { id?: string })?.id
  if (!id) throw new Error('無法識別使用者')
  return id
}

export async function createEnrollmentAction(formData: FormData) {
  const session = await auth()
  const employeeId = getEmployeeId(session)
  const parsed = createEnrollmentSchema.safeParse({ sessionId: formData.get('sessionId') })
  if (!parsed.success) throw new Error(Object.values(parsed.error.flatten().fieldErrors).flat().join(', '))
  const result = await createEnrollment(parsed.data, employeeId)
  revalidatePath('/employee/enrollments')
  revalidatePath('/employee/courses')
  return result
}

export async function cancelEnrollmentAction(enrollmentId: string) {
  const session = await auth()
  const employeeId = getEmployeeId(session)
  const result = await cancelEnrollment(enrollmentId, employeeId)
  revalidatePath('/employee/enrollments')
  return result
}

export async function confirmWaitlistAction(entryId: string) {
  const session = await auth()
  const employeeId = getEmployeeId(session)
  const result = await confirmWaitlistEntry(entryId, employeeId)
  revalidatePath('/employee/enrollments')
  return result
}

export async function approveEnrollmentAction(enrollmentId: string) {
  const session = await auth()
  const managerId = getEmployeeId(session)
  const result = await approveByManager(enrollmentId, managerId)
  revalidatePath('/manager/enrollments')
  return result
}

export async function rejectEnrollmentAction(enrollmentId: string, note: string) {
  const parsed = rejectSchema.safeParse({ note })
  if (!parsed.success) throw new Error('退回原因為必填')
  const session = await auth()
  const managerId = getEmployeeId(session)
  const result = await rejectByManager(enrollmentId, managerId, note)
  revalidatePath('/manager/enrollments')
  return result
}

export async function approveEnrollmentByHRAction(enrollmentId: string) {
  const session = await auth()
  const hrId = getEmployeeId(session)
  const result = await approveByHR(enrollmentId, hrId)
  revalidatePath('/hr/enrollments')
  return result
}

export async function rejectEnrollmentByHRAction(enrollmentId: string, note: string) {
  const parsed = rejectSchema.safeParse({ note })
  if (!parsed.success) throw new Error('退回原因為必填')
  const session = await auth()
  const hrId = getEmployeeId(session)
  const result = await rejectByHR(enrollmentId, hrId, note)
  revalidatePath('/hr/enrollments')
  return result
}

export async function cancelConfirmedEnrollmentAction(enrollmentId: string) {
  const result = await cancelConfirmedEnrollment(enrollmentId)
  revalidatePath('/hr/enrollments')
  return result
}

export async function resendNotificationAction(logId: string) {
  await resendNotification(logId)
  revalidatePath('/hr/notifications')
}
