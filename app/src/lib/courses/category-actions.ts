'use server'

import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

const categorySchema = z.object({
  name: z.string().min(1, '類別名稱為必填'),
  countsTowardAnnualHours: z.boolean().default(true),
  defaultHours: z.number().positive().nullable().optional(),
})

export async function createCategoryAction(formData: FormData) {
  const session = await auth()
  if (!session || (session.user as { role?: string })?.role !== 'HR') {
    throw new Error('權限不足')
  }

  const raw = {
    name: formData.get('name') as string,
    countsTowardAnnualHours: formData.get('countsTowardAnnualHours') === 'true',
    defaultHours: formData.get('defaultHours')
      ? Number(formData.get('defaultHours'))
      : null,
  }

  const parsed = categorySchema.safeParse(raw)
  if (!parsed.success) throw new Error(JSON.stringify(parsed.error.flatten()))

  await prisma.courseCategory.create({ data: parsed.data })
  revalidatePath('/course-categories')
}

export async function updateCategoryAction(id: string, formData: FormData) {
  const session = await auth()
  if (!session || (session.user as { role?: string })?.role !== 'HR') {
    throw new Error('權限不足')
  }

  const raw = {
    name: formData.get('name') as string,
    countsTowardAnnualHours: formData.get('countsTowardAnnualHours') === 'true',
    defaultHours: formData.get('defaultHours')
      ? Number(formData.get('defaultHours'))
      : null,
  }

  const parsed = categorySchema.safeParse(raw)
  if (!parsed.success) throw new Error(JSON.stringify(parsed.error.flatten()))

  await prisma.courseCategory.update({ where: { id }, data: parsed.data })
  revalidatePath('/course-categories')
}
