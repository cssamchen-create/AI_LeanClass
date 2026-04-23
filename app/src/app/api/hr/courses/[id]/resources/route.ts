import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { getCourseResources, addResource } from '@/lib/knowledge-base/service'
import { createResourceSchema } from '@/lib/knowledge-base/validations'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '未登入' }, { status: 401 })

  const role = (session.user as { role?: string })?.role
  if (role !== 'HR') return NextResponse.json({ error: '權限不足' }, { status: 403 })

  const { id } = await params
  const resources = await getCourseResources(id)
  return NextResponse.json(resources)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '未登入' }, { status: 401 })

  const role = (session.user as { role?: string })?.role
  if (role !== 'HR') return NextResponse.json({ error: '權限不足' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const parsed = createResourceSchema.safeParse(body)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? '輸入格式錯誤'
    return NextResponse.json({ error: firstError }, { status: 400 })
  }

  const resource = await addResource(id, parsed.data)
  return NextResponse.json(resource, { status: 201 })
}
