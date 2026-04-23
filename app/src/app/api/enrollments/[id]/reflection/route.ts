import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { submitReflection } from '@/lib/completions/reflection-service'
import { reflectionSchema } from '@/lib/completions/validations'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未登入' }, { status: 401 })

  const { id: enrollmentId } = await params
  const enrollment = await prisma.courseEnrollment.findUnique({ where: { id: enrollmentId } })
  if (!enrollment || enrollment.employeeId !== session.user.id) {
    return NextResponse.json({ error: '無權限' }, { status: 403 })
  }

  const reflection = await prisma.courseReflection.findUnique({ where: { enrollmentId } })
  if (!reflection) return NextResponse.json({ error: '尚未提交' }, { status: 404 })

  return NextResponse.json(reflection)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '未登入' }, { status: 401 })

  const { id: enrollmentId } = await params
  const body = await request.json()
  const parsed = reflectionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

  try {
    const result = await submitReflection(enrollmentId, session.user.id!, parsed.data.content)
    return NextResponse.json(result, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '送出失敗'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
