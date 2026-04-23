import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { resignEmployee } from '@/lib/commitments/service'
import { resignSchema } from '@/lib/commitments/validations'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '未登入' }, { status: 401 })

  const hrUser = session.user as { role?: string; employeeId?: string }
  if (hrUser?.role !== 'HR') return NextResponse.json({ error: '權限不足' }, { status: 403 })
  if (!hrUser.employeeId) return NextResponse.json({ error: '未登入' }, { status: 401 })

  const { id: employeeId } = await params
  const body = await req.json() as unknown
  const parsed = resignSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const result = await resignEmployee(employeeId, parsed.data.resignedAt, hrUser.employeeId)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : '操作失敗'
    const status = message.includes('不存在') ? 404 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
