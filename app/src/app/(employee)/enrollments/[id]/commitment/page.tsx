import { notFound, redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { calculateCompensationSchedule } from '@/lib/commitments/service'
import SignCommitmentButton from './SignCommitmentButton'

export default async function CommitmentPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id: enrollmentId } = await params
  const employeeId = (session.user as { employeeId?: string })?.employeeId

  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      employee: true,
      commitmentRecord: true,
      session: { include: { course: true } },
    },
  })

  if (!enrollment || enrollment.employeeId !== employeeId) notFound()

  const commitment = enrollment.commitmentRecord
  if (!commitment) notFound()

  const course = enrollment.session.course
  const schedule = calculateCompensationSchedule(
    commitment.commitmentMonths,
    commitment.commitmentFee.toString(),
  )

  const isPending = commitment.status === 'PENDING_SIGNATURE' && commitment.signatureDeadline > new Date()
  const isSigned = commitment.status === 'ACTIVE'

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <a href="/enrollments" className="text-sm text-blue-600 hover:underline">← 返回我的申請</a>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">服務承諾書</h1>
        <p className="text-gray-500 text-sm mt-1">{course.name}</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <h2 className="font-semibold text-gray-900 mb-3">承諾書條款</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-gray-500">課程名稱</dt><dd className="mt-1 font-medium">{course.name}</dd></div>
            <div><dt className="text-gray-500">留任年限</dt><dd className="mt-1 font-medium">{commitment.commitmentMonths} 個月</dd></div>
            <div><dt className="text-gray-500">課程費用</dt><dd className="mt-1 font-medium">{Number(commitment.commitmentFee).toLocaleString('zh-TW')} 元</dd></div>
            {isSigned && commitment.commitmentExpiresAt && (
              <div><dt className="text-gray-500">承諾到期日</dt><dd className="mt-1 font-medium">{new Date(commitment.commitmentExpiresAt).toLocaleDateString('zh-TW')}</dd></div>
            )}
          </dl>
        </div>

        {isPending && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800 font-medium">
              請於 {new Date(commitment.signatureDeadline).toLocaleString('zh-TW')} 前完成簽署，逾時報名將自動取消。
            </p>
          </div>
        )}

        {isSigned && commitment.signedAt && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">
              已於 {new Date(commitment.signedAt).toLocaleString('zh-TW')} 完成簽署。
            </p>
          </div>
        )}

        <div>
          <h2 className="font-semibold text-gray-900 mb-3">賠償試算</h2>
          <p className="text-sm text-gray-500 mb-3">若於服務承諾期限內離職，須依下列比例賠償課程費用：</p>
          <table className="min-w-full text-sm border rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-gray-500 font-medium">已完成月數</th>
                <th className="px-4 py-2 text-left text-gray-500 font-medium">剩餘月數</th>
                <th className="px-4 py-2 text-right text-gray-500 font-medium">應賠償金額</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {schedule.map((row) => (
                <tr key={row.monthsCompleted}>
                  <td className="px-4 py-2">{row.monthsCompleted} 個月</td>
                  <td className="px-4 py-2">{row.remainingMonths} 個月</td>
                  <td className="px-4 py-2 text-right font-medium">
                    {Number(row.amount).toLocaleString('zh-TW')} 元
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isPending && <SignCommitmentButton enrollmentId={enrollmentId} />}
      </div>
    </div>
  )
}
