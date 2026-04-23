import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { calculateCompensationSchedule } from '@/lib/commitments/service'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '未登入' }, { status: 401 })

  const { id: enrollmentId } = await params
  const employeeId = (session.user as { employeeId?: string })?.employeeId

  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      commitmentRecord: true,
      session: { include: { course: true } },
    },
  })

  if (!enrollment) return NextResponse.json({ error: '申請不存在' }, { status: 404 })
  if (enrollment.employeeId !== employeeId) return NextResponse.json({ error: '無權限查看' }, { status: 403 })

  const commitment = enrollment.commitmentRecord
  if (!commitment) return NextResponse.json({ error: '此申請無承諾書記錄' }, { status: 404 })

  const course = enrollment.session.course
  const compensationSchedule = calculateCompensationSchedule(
    commitment.commitmentMonths,
    commitment.commitmentFee.toString(),
  )

  return NextResponse.json({
    id: commitment.id,
    status: commitment.status,
    signatureDeadline: commitment.signatureDeadline,
    signedAt: commitment.signedAt,
    commitmentMonths: commitment.commitmentMonths,
    commitmentFee: commitment.commitmentFee.toString(),
    commitmentExpiresAt: commitment.commitmentExpiresAt,
    course: {
      name: course.name,
      measurementValue: course.measurementValue,
      measurementUnit: course.measurementUnit,
    },
    compensationSchedule,
  })
}
