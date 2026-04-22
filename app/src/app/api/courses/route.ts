import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createCourse, getCourses } from '@/lib/courses/service'
import { createCourseSchema } from '@/lib/courses/validations'
import type { CourseStatus } from '@prisma/client'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '未登入' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const categoryId = searchParams.get('categoryId') ?? undefined
  const status = (searchParams.get('status') as CourseStatus) ?? undefined
  const page = Number(searchParams.get('page') ?? 1)
  const pageSize = Number(searchParams.get('pageSize') ?? 20)

  const result = await getCourses({ categoryId, status, page, pageSize })
  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '未登入' }, { status: 401 })
  if ((session.user as { role?: string })?.role !== 'HR') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const body = await req.json() as unknown
  const parsed = createCourseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const course = await createCourse({
      ...parsed.data,
      createdBy: session.user?.email ?? 'unknown',
    })
    return NextResponse.json(course, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : '建立失敗'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
