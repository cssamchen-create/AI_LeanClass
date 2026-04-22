'use server'

import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { createCourse, updateCourse, changeCourseStatus } from './service'
import { createSession, cancelSession } from './session-service'
import { createCourseSchema, updateCourseSchema, statusChangeSchema, createSessionSchema } from './validations'

export async function createCourseAction(formData: FormData) {
  const session = await auth()
  if (!session || (session.user as { role?: string })?.role !== 'HR') {
    throw new Error('權限不足')
  }

  const raw = {
    name: formData.get('name') as string,
    categoryId: formData.get('categoryId') as string,
    measurementUnit: formData.get('measurementUnit') as string,
    measurementValue: Number(formData.get('measurementValue')),
    requiresReflection: formData.get('requiresReflection') === 'true',
    isGroupCourse: formData.get('isGroupCourse') === 'true',
  }

  const parsed = createCourseSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error(JSON.stringify(parsed.error.flatten()))
  }

  const course = await createCourse({
    ...parsed.data,
    createdBy: session.user?.email ?? 'unknown',
  })

  redirect(`/courses/${course.id}`)
}

export async function updateCourseAction(id: string, formData: FormData) {
  const session = await auth()
  if (!session || (session.user as { role?: string })?.role !== 'HR') {
    throw new Error('權限不足')
  }

  const raw = {
    name: formData.get('name') as string | undefined,
    categoryId: formData.get('categoryId') as string | undefined,
    measurementUnit: formData.get('measurementUnit') as string | undefined,
    measurementValue: formData.get('measurementValue')
      ? Number(formData.get('measurementValue'))
      : undefined,
    requiresReflection: formData.get('requiresReflection')
      ? formData.get('requiresReflection') === 'true'
      : undefined,
    isGroupCourse: formData.get('isGroupCourse')
      ? formData.get('isGroupCourse') === 'true'
      : undefined,
  }

  const parsed = updateCourseSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error(JSON.stringify(parsed.error.flatten()))
  }

  await updateCourse(id, parsed.data)
  redirect(`/courses/${id}`)
}

export async function changeCourseStatusAction(id: string, formData: FormData) {
  const session = await auth()
  if (!session || (session.user as { role?: string })?.role !== 'HR') {
    throw new Error('權限不足')
  }

  const parsed = statusChangeSchema.safeParse({ status: formData.get('status') })
  if (!parsed.success) throw new Error('無效的狀態值')

  await changeCourseStatus(id, parsed.data.status)
  redirect(`/courses/${id}`)
}

export async function createSessionAction(courseId: string, formData: FormData) {
  const session = await auth()
  if (!session || (session.user as { role?: string })?.role !== 'HR') {
    throw new Error('權限不足')
  }

  const raw = {
    startDate: formData.get('startDate') as string,
    endDate: formData.get('endDate') as string | undefined || undefined,
    location: formData.get('location') as string,
    instructorName: formData.get('instructorName') as string,
    capacity: Number(formData.get('capacity')),
  }

  const parsed = createSessionSchema.safeParse(raw)
  if (!parsed.success) throw new Error(JSON.stringify(parsed.error.flatten()))

  await createSession(courseId, parsed.data)
  redirect(`/courses/${courseId}`)
}

export async function cancelSessionAction(courseId: string, sessionId: string) {
  const session = await auth()
  if (!session || (session.user as { role?: string })?.role !== 'HR') {
    throw new Error('權限不足')
  }

  await cancelSession(sessionId, session.user?.email ?? 'unknown')
  redirect(`/courses/${courseId}`)
}
