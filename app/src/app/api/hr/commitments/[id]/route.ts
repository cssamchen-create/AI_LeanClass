import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '未登入' }, { status: 401 })
  if ((session.user as { role?: string })?.role !== 'HR') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const { id } = await params
  const record = await prisma.commitmentRecord.findUnique({
    where: { id },
    include: {
      employee: { select: { id: true, name: true, email: true, department: true, unit: true } },
      course: { select: { id: true, name: true, measurementValue: true, measurementUnit: true } },
      enrollment: { select: { id: true, status: true, session: { select: { startDate: true } } } },
    },
  })

  if (!record) return NextResponse.json({ error: '承諾書不存在' }, { status: 404 })

  return NextResponse.json({
    id: record.id,
    status: record.status,
    employee: record.employee,
    course: record.course,
    enrollment: {
      id: record.enrollment.id,
      sessionStartDate: record.enrollment.session.startDate,
    },
    signatureDeadline: record.signatureDeadline,
    signedAt: record.signedAt,
    commitmentMonths: record.commitmentMonths,
    commitmentFee: record.commitmentFee.toString(),
    commitmentExpiresAt: record.commitmentExpiresAt,
    compensationAmount: record.compensationAmount?.toString() ?? null,
    compensationNote: record.compensationNote,
  })
}
