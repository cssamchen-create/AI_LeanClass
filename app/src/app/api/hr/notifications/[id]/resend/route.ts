import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { resendNotification } from '@/lib/enrollments/notification-service'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '請先登入' }, { status: 401 })

  const { id } = await params
  try {
    await resendNotification(id)
    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : '補發失敗'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
