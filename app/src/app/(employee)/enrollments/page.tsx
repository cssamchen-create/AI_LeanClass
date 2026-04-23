import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { cancelEnrollmentAction, confirmWaitlistAction } from '@/lib/enrollments/actions'

const STATUS_LABELS: Record<string, string> = {
  PENDING_MANAGER: '待主管審核',
  PENDING_HR: '待 HR 核准',
  PENDING_COMMITMENT: '待簽署承諾書',
  CONFIRMED: '已確認',
  REJECTED: '已退回',
  CANCELLED: '已取消',
  ATTENDED: '已出席',
  ABSENT: '缺席',
  PENDING_REFLECTION: '待填寫心得',
  REFLECTION_RETURNED: '心得退回',
  PENDING_QUIZ: '待完成測驗',
  QUIZ_GRADING: '測驗評分中',
  PENDING_HR_CLOSE: '待結案',
  COMPLETED: '已結案',
}

const STATUS_COLORS: Record<string, string> = {
  PENDING_MANAGER: 'bg-yellow-100 text-yellow-800',
  PENDING_HR: 'bg-blue-100 text-blue-800',
  PENDING_COMMITMENT: 'bg-orange-100 text-orange-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-700',
  ATTENDED: 'bg-teal-100 text-teal-800',
  ABSENT: 'bg-red-100 text-red-800',
  PENDING_REFLECTION: 'bg-orange-100 text-orange-800',
  REFLECTION_RETURNED: 'bg-yellow-100 text-yellow-800',
  PENDING_QUIZ: 'bg-purple-100 text-purple-800',
  QUIZ_GRADING: 'bg-indigo-100 text-indigo-800',
  PENDING_HR_CLOSE: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
}

export default async function MyEnrollmentsPage() {
  const session = await auth()
  const employeeId = (session?.user as { id?: string })?.id

  if (!employeeId) return <div className="p-6">請先登入</div>

  const [enrollments, waitlistEntries] = await Promise.all([
    prisma.courseEnrollment.findMany({
      where: { employeeId },
      include: {
        session: {
          include: { course: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.waitlistEntry.findMany({
      where: { employeeId, status: { notIn: ['EXPIRED', 'CANCELLED', 'CONFIRMED'] } },
      include: {
        session: {
          include: { course: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">我的申請</h1>

      {/* Waitlist section */}
      {waitlistEntries.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">等待名單</h2>
          <div className="space-y-3">
            {waitlistEntries.map((entry) => (
              <div key={entry.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{entry.session.course.name}</div>
                    <div className="text-sm text-gray-600">
                      {new Date(entry.session.startDate).toLocaleDateString('zh-TW')} ｜ 等待第 {entry.position} 位
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {entry.status === 'PENDING_CONFIRMATION' && entry.confirmDeadline && (
                      <div className="text-right">
                        <div className="text-xs text-orange-600 font-medium">請確認遞補</div>
                        <div className="text-xs text-gray-500">
                          期限：{new Date(entry.confirmDeadline).toLocaleString('zh-TW')}
                        </div>
                        <form action={async () => { await confirmWaitlistAction(entry.id) }}>
                          <button type="submit" className="mt-1 px-3 py-1 text-xs text-white bg-green-600 hover:bg-green-700 rounded">
                            確認報名
                          </button>
                        </form>
                      </div>
                    )}
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      entry.status === 'PENDING_CONFIRMATION' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {entry.status === 'PENDING_CONFIRMATION' ? '遞補待確認' : '等待中'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enrollments section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">申請記錄</h2>
        {enrollments.length === 0 ? (
          <div className="text-center py-12 text-gray-400">尚無申請記錄</div>
        ) : (
          <div className="space-y-3">
            {enrollments.map((enrollment) => (
              <div key={enrollment.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-900">{enrollment.session.course.name}</div>
                    <div className="text-sm text-gray-600">
                      {new Date(enrollment.session.startDate).toLocaleDateString('zh-TW')}
                    </div>
                    {enrollment.managerNote && (
                      <div className="text-xs text-red-600">主管意見：{enrollment.managerNote}</div>
                    )}
                    {enrollment.hrNote && (
                      <div className="text-xs text-red-600">HR 意見：{enrollment.hrNote}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {['PENDING_MANAGER', 'PENDING_HR'].includes(enrollment.status) && (
                      <form action={async () => { await cancelEnrollmentAction(enrollment.id) }}>
                        <button
                          type="submit"
                          className="px-3 py-1 text-xs text-red-600 border border-red-300 hover:bg-red-50 rounded"
                        >
                          取消申請
                        </button>
                      </form>
                    )}
                    {enrollment.status === 'PENDING_COMMITMENT' && (
                      <a
                        href={`/enrollments/${enrollment.id}/commitment`}
                        className="px-3 py-1 text-xs text-orange-600 border border-orange-300 hover:bg-orange-50 rounded"
                      >
                        簽署承諾書
                      </a>
                    )}
                    {['PENDING_REFLECTION', 'REFLECTION_RETURNED'].includes(enrollment.status) && (
                      <a
                        href={`/employee/enrollments/${enrollment.id}/reflection`}
                        className="px-3 py-1 text-xs text-orange-600 border border-orange-300 hover:bg-orange-50 rounded"
                      >
                        填寫心得
                      </a>
                    )}
                    {enrollment.status === 'PENDING_QUIZ' && (
                      <a
                        href={`/employee/enrollments/${enrollment.id}/quiz`}
                        className="px-3 py-1 text-xs text-purple-600 border border-purple-300 hover:bg-purple-50 rounded"
                      >
                        參加測驗
                      </a>
                    )}
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[enrollment.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {STATUS_LABELS[enrollment.status] ?? enrollment.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
