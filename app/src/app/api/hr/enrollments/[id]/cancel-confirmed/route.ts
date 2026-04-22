import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { cancelConfirmedEnrollment } from '@/lib/enrollments/service'

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '請先登入' }, { status: 401 })

  const role = (session.user as { role?: string })?.role
  if (role !== 'HR') return NextResponse.json({ error: '權限不足' }, { status: 403 })

  const { id } = await params
  try {
    const result = await cancelConfirmedEnrollment(id)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : '操作失敗'
    return NextResponse.json({ error: message }, { status: 409 })
  }
}
