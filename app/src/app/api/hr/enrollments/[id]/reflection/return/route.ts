import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { returnReflection } from '@/lib/completions/reflection-service'
import { returnReflectionSchema } from '@/lib/completions/validations'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未登入' }, { status: 401 })
  const role = (session.user as { role?: string }).role
  if (role !== 'HR') return NextResponse.json({ error: '無權限' }, { status: 403 })

  const { id: enrollmentId } = await params
  const body = await request.json()
  const parsed = returnReflectionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  try {
    const result = await returnReflection(enrollmentId, session.user.id!, parsed.data.returnNote)
    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : '退回失敗'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
