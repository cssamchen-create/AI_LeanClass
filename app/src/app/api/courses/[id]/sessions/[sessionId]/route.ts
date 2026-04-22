import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { updateSession } from '@/lib/courses/session-service'
import { createSessionSchema } from '@/lib/courses/validations'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '未登入' }, { status: 401 })
  if ((session.user as { role?: string })?.role !== 'HR') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const { sessionId } = await params
  const body = await req.json() as unknown
  const parsed = createSessionSchema.partial().safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const updated = await updateSession(sessionId, parsed.data)
    return NextResponse.json(updated)
  } catch (err) {
    const message = err instanceof Error ? err.message : '更新失敗'
    const status = message === '已取消的梯次無法編輯' ? 409 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
