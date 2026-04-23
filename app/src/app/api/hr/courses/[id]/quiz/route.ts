import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getQuizByCourse, createQuiz, updateQuiz } from '@/lib/completions/quiz-management-service'
import { quizCreateSchema } from '@/lib/completions/validations'

function requireHR(role: string | undefined) {
  if (role !== 'HR') return NextResponse.json({ error: '無權限' }, { status: 403 })
  return null
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未登入' }, { status: 401 })
  const guard = requireHR((session.user as { role?: string }).role)
  if (guard) return guard

  const { id: courseId } = await params
  const quiz = await getQuizByCourse(courseId)
  if (!quiz) return NextResponse.json({ error: '尚未設定測驗' }, { status: 404 })
  return NextResponse.json(quiz)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未登入' }, { status: 401 })
  const guard = requireHR((session.user as { role?: string }).role)
  if (guard) return guard

  const { id: courseId } = await params
  const body = await request.json()
  const parsed = quizCreateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  try {
    const result = await createQuiz(courseId, session.user.id!, parsed.data)
    return NextResponse.json(result, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '建立失敗'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未登入' }, { status: 401 })
  const guard = requireHR((session.user as { role?: string }).role)
  if (guard) return guard

  const { id: courseId } = await params
  const body = await request.json()
  const parsed = quizCreateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  try {
    const quiz = await getQuizByCourse(courseId)
    if (!quiz) return NextResponse.json({ error: '測驗不存在' }, { status: 404 })
    const result = await updateQuiz(quiz.id, session.user.id!, parsed.data)
    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : '更新失敗'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
