import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { rejectByHR } from '@/lib/enrollments/service'
import { rejectSchema } from '@/lib/enrollments/validations'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '請先登入' }, { status: 401 })

  const hrId = (session.user as { id?: string }).id
  if (!hrId) return NextResponse.json({ error: '無法識別使用者' }, { status: 400 })

  const body = await req.json()
  const parsed = rejectSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: '退回原因為必填' }, { status: 400 })

  const { id } = await params
  try {
    const result = await rejectByHR(id, hrId, parsed.data.note)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : '操作失敗'
    return NextResponse.json({ error: message }, { status: 409 })
  }
}
