import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getHREnrollments } from '@/lib/enrollments/service'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '請先登入' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const result = await getHREnrollments({
    status: searchParams.get('status') ?? undefined,
    courseId: searchParams.get('courseId') ?? undefined,
    sessionId: searchParams.get('sessionId') ?? undefined,
    department: searchParams.get('department') ?? undefined,
    page: Number(searchParams.get('page') ?? 1),
  })
  return NextResponse.json(result)
}
