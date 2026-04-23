import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { gradeEssayAnswers } from '@/lib/completions/quiz-service'
import { gradeSchema } from '@/lib/completions/validations'

async function handleGrade(request: NextRequest, attemptId: string, userId: string) {
  const body = await request.json()
  const parsed = gradeSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

  try {
    const result = await gradeEssayAnswers(attemptId, userId, parsed.data.grades)
    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : '評分失敗'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未登入' }, { status: 401 })
  const role = (session.user as { role?: string }).role
  if (role !== 'HR') return NextResponse.json({ error: '無權限' }, { status: 403 })

  const { attemptId } = await params
  return handleGrade(request, attemptId, session.user.id!)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未登入' }, { status: 401 })
  const role = (session.user as { role?: string }).role
  if (role !== 'HR') return NextResponse.json({ error: '無權限' }, { status: 403 })

  const { attemptId } = await params
  return handleGrade(request, attemptId, session.user.id!)
}
