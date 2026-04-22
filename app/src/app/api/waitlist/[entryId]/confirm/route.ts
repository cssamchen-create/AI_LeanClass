import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { confirmWaitlistEntry } from '@/lib/enrollments/waitlist-service'

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ entryId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '請先登入' }, { status: 401 })

  const employeeId = (session.user as { id?: string }).id
  if (!employeeId) return NextResponse.json({ error: '無法識別使用者' }, { status: 400 })

  const { entryId } = await params
  try {
    const result = await confirmWaitlistEntry(entryId, employeeId)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : '操作失敗'
    const status = message.includes('期限已過') ? 410 : message.includes('無權限') ? 403 : 409
    return NextResponse.json({ error: message }, { status })
  }
}
