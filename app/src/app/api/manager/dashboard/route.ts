import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { getManagerDashboard } from '@/lib/manager/service'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '未登入' }, { status: 401 })

  const role = (session.user as { role?: string })?.role
  if (role !== 'MANAGER' && role !== 'HR') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const adAccount = (session.user as { id?: string })?.id
  if (!adAccount) return NextResponse.json({ error: '無法識別使用者' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const yearParam = searchParams.get('year')
  const year = yearParam ? parseInt(yearParam, 10) : undefined

  const employee = await prisma.employee.findUnique({ where: { adAccount } })
  if (!employee) return NextResponse.json({ error: '員工資料不存在' }, { status: 404 })

  const data = await getManagerDashboard(employee.id, year)
  return NextResponse.json(data)
}
