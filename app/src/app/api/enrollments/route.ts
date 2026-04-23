import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createEnrollmentSchema } from '@/lib/enrollments/validations'
import { createEnrollment, getMyEnrollments } from '@/lib/enrollments/service'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '請先登入' }, { status: 401 })

  const employeeId = (session.user as { id?: string }).id
  if (!employeeId) return NextResponse.json({ error: '無法識別使用者' }, { status: 400 })

  const body = await req.json()
  const parsed = createEnrollmentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  try {
    const result = await createEnrollment(parsed.data, employeeId)
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : '申請失敗'
    const status = message.includes('已有申請') ? 409 : 400
    return NextResponse.json({ error: message }, { status })
  }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '請先登入' }, { status: 401 })

  const employeeId = (session.user as { id?: string }).id
  if (!employeeId) return NextResponse.json({ error: '無法識別使用者' }, { status: 400 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? undefined
  const page = Number(searchParams.get('page') ?? 1)
  const pageSize = Number(searchParams.get('pageSize') ?? 20)

  const result = await getMyEnrollments(employeeId, { status, page, pageSize })
  return NextResponse.json(result)
}
