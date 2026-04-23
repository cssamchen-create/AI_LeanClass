import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getQuizForEnrollment } from '@/lib/completions/quiz-service'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未登入' }, { status: 401 })

  const { id: enrollmentId } = await params
  try {
    const quiz = await getQuizForEnrollment(enrollmentId, session.user.id!)
    return NextResponse.json(quiz)
  } catch (e) {
    const msg = e instanceof Error ? e.message : '取得測驗失敗'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
