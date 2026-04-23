import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { allowRetry } from '@/lib/completions/quiz-service'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未登入' }, { status: 401 })
  const role = (session.user as { role?: string }).role
  if (role !== 'HR') return NextResponse.json({ error: '無權限' }, { status: 403 })

  const { id: enrollmentId } = await params
  try {
    const result = await allowRetry(enrollmentId, session.user.id!)
    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : '操作失敗'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
