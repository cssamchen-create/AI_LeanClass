import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '未登入' }, { status: 401 })
  if ((session.user as { role?: string })?.role !== 'HR') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const statusParam = searchParams.get('status')
  const expiring = searchParams.get('expiring')
  const employeeId = searchParams.get('employeeId')
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? '20')))

  const statusFilter = statusParam
    ? { in: statusParam.split(',') as never[] }
    : undefined

  const now = new Date()
  const expiringFilter = expiring
    ? { gte: now, lte: new Date(now.getTime() + Number(expiring) * 24 * 60 * 60 * 1000) }
    : undefined

  const where = {
    ...(statusFilter && { status: statusFilter }),
    ...(expiringFilter && { commitmentExpiresAt: expiringFilter }),
    ...(employeeId && { employeeId }),
  }

  const [records, total] = await Promise.all([
    prisma.commitmentRecord.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true, department: true, unit: true } },
        course: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.commitmentRecord.count({ where }),
  ])

  const data = records.map((r) => ({
    id: r.id,
    status: r.status,
    employee: r.employee,
    course: r.course,
    signedAt: r.signedAt,
    commitmentExpiresAt: r.commitmentExpiresAt,
    commitmentMonths: r.commitmentMonths,
    commitmentFee: r.commitmentFee.toString(),
    daysUntilExpiry: r.commitmentExpiresAt
      ? Math.ceil((r.commitmentExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null,
  }))

  return NextResponse.json({ total, page, pageSize, data })
}
