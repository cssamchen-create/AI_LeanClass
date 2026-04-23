import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { submitQuiz } from '@/lib/completions/quiz-service'
import { quizSubmitSchema } from '@/lib/completions/validations'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未登入' }, { status: 401 })

  const { id: enrollmentId } = await params
  const body = await request.json()
  const parsed = quizSubmitSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  try {
    const result = await submitQuiz(enrollmentId, session.user.id!, parsed.data.answers)
    return NextResponse.json(result, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '提交失敗'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
