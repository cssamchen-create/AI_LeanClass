import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { approveByManager } from '@/lib/enrollments/service'

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '請先登入' }, { status: 401 })

  const managerId = (session.user as { id?: string }).id
  if (!managerId) return NextResponse.json({ error: '無法識別使用者' }, { status: 400 })

  const { id } = await params
  try {
    const result = await approveByManager(id, managerId)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : '操作失敗'
    const status = message.includes('不存在') ? 404 : message.includes('無權限') ? 403 : 409
    return NextResponse.json({ error: message }, { status })
  }
}
