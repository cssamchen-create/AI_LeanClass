import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { changeCourseStatus } from '@/lib/courses/service'
import { statusChangeSchema } from '@/lib/courses/validations'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '未登入' }, { status: 401 })
  if ((session.user as { role?: string })?.role !== 'HR') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json() as unknown
  const parsed = statusChangeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const course = await changeCourseStatus(id, parsed.data.status)
    return NextResponse.json(course)
  } catch (err) {
    const message = err instanceof Error ? err.message : '狀態變更失敗'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
