import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { signCommitment } from '@/lib/commitments/service'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '未登入' }, { status: 401 })

  const employeeId = (session.user as { employeeId?: string })?.employeeId
  if (!employeeId) return NextResponse.json({ error: '未登入' }, { status: 401 })

  const { id: enrollmentId } = await params

  try {
    const commitment = await signCommitment(enrollmentId, employeeId)
    return NextResponse.json({
      commitmentId: commitment.id,
      signedAt: commitment.signedAt,
      commitmentExpiresAt: commitment.commitmentExpiresAt,
      enrollmentStatus: 'CONFIRMED',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : '簽署失敗'
    const status = message.includes('無權限') ? 403 : message.includes('不存在') ? 404 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
