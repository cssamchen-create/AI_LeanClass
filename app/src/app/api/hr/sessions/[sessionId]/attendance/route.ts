import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { confirmAttendance } from '@/lib/completions/service'
import { attendanceSchema } from '@/lib/completions/validations'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未登入' }, { status: 401 })
  const role = (session.user as { role?: string }).role
  if (role !== 'HR') return NextResponse.json({ error: '無權限' }, { status: 403 })

  const { sessionId } = await params
  const body = await request.json()
  const parsed = attendanceSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

  try {
    const result = await confirmAttendance(sessionId, parsed.data.attendances, session.user.id!)
    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : '出席確認失敗'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
