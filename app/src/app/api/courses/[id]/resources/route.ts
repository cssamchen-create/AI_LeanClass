import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { getCourseResources } from '@/lib/knowledge-base/service'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '未登入' }, { status: 401 })

  const { id } = await params
  const resources = await getCourseResources(id)
  return NextResponse.json(resources)
}
