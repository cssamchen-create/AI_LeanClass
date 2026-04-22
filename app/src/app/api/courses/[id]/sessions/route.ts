import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createSession } from '@/lib/courses/session-service'
import { createSessionSchema } from '@/lib/courses/validations'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '未登入' }, { status: 401 })
  if ((session.user as { role?: string })?.role !== 'HR') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const { id: courseId } = await params
  const body = await req.json() as unknown
  const parsed = createSessionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const courseSession = await createSession(courseId, parsed.data)
    return NextResponse.json(courseSession, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : '建立失敗'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
