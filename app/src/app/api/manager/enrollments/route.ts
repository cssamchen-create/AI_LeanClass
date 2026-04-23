import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getManagerEnrollments } from '@/lib/enrollments/service'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '請先登入' }, { status: 401 })

  const managerId = (session.user as { id?: string }).id
  if (!managerId) return NextResponse.json({ error: '無法識別使用者' }, { status: 400 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? undefined
  const page = Number(searchParams.get('page') ?? 1)

  const result = await getManagerEnrollments(managerId, { status, page })
  return NextResponse.json(result)
}
