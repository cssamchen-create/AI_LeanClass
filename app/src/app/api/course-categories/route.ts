import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '未登入' }, { status: 401 })

  const categories = await prisma.courseCategory.findMany({
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(categories)
}
