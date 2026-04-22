import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { cancelSession } from '@/lib/courses/session-service'

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '未登入' }, { status: 401 })
  if ((session.user as { role?: string })?.role !== 'HR') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const { sessionId } = await params

  try {
    const cancelled = await cancelSession(sessionId, session.user?.email ?? 'unknown')
    return NextResponse.json(cancelled)
  } catch (err) {
    const message = err instanceof Error ? err.message : '取消失敗'
    const status = message === '梯次已取消' ? 409 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
