import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getCourseById, updateCourse } from '@/lib/courses/service'
import { updateCourseSchema } from '@/lib/courses/validations'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '未登入' }, { status: 401 })

  const { id } = await params
  try {
    const course = await getCourseById(id)
    return NextResponse.json(course)
  } catch {
    return NextResponse.json({ error: '課程不存在' }, { status: 404 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '未登入' }, { status: 401 })
  if ((session.user as { role?: string })?.role !== 'HR') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json() as unknown
  const parsed = updateCourseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const course = await updateCourse(id, parsed.data)
    return NextResponse.json(course)
  } catch (err) {
    const message = err instanceof Error ? err.message : '更新失敗'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
