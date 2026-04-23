import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { updateResource, deleteResource } from '@/lib/knowledge-base/service'
import { updateResourceSchema } from '@/lib/knowledge-base/validations'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; resourceId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '未登入' }, { status: 401 })

  const role = (session.user as { role?: string })?.role
  if (role !== 'HR') return NextResponse.json({ error: '權限不足' }, { status: 403 })

  const { resourceId } = await params
  const body = await req.json()
  const parsed = updateResourceSchema.safeParse(body)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? '輸入格式錯誤'
    return NextResponse.json({ error: firstError }, { status: 400 })
  }

  const resource = await updateResource(resourceId, parsed.data)
  return NextResponse.json(resource)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; resourceId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '未登入' }, { status: 401 })

  const role = (session.user as { role?: string })?.role
  if (role !== 'HR') return NextResponse.json({ error: '權限不足' }, { status: 403 })

  const { resourceId } = await params
  await deleteResource(resourceId)
  return NextResponse.json({ success: true })
}
