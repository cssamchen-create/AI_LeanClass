import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { getCourseResources } from '@/lib/knowledge-base/service'

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

export default async function EnrollmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect('/login')

  const employeeId = (session.user as { id?: string })?.id
  if (!employeeId) redirect('/login')

  const { id } = await params

  const employee = await prisma.employee.findUnique({ where: { adAccount: employeeId } })
  if (!employee) redirect('/login')

  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { id },
    include: {
      session: {
        include: { course: true },
      },
    },
  })

  if (!enrollment || enrollment.employeeId !== employee.id) notFound()

  const courseId = enrollment.session.course.id
  const resources = await getCourseResources(courseId)

  return (
    <div className="max-w-3xl p-6">
      <Link href="/employee/enrollments" className="text-sm text-blue-600 hover:underline">
        ← 返回申請列表
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mt-4 mb-1">{enrollment.session.course.name}</h1>
      <p className="text-sm text-gray-500 mb-6">
        開課日期：{new Date(enrollment.session.startDate).toLocaleDateString('zh-TW')}
      </p>

      {/* Enrollment status */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">申請狀態</span>
          <span className="text-sm font-medium text-gray-900">
            {STATUS_LABELS[enrollment.status] ?? enrollment.status}
          </span>
        </div>
        {enrollment.managerNote && (
          <div className="mt-2 text-xs text-red-600">主管意見：{enrollment.managerNote}</div>
        )}
        {enrollment.hrNote && (
          <div className="mt-2 text-xs text-red-600">HR 意見：{enrollment.hrNote}</div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mb-6">
        {enrollment.status === 'PENDING_COMMITMENT' && (
          <Link
            href={`/enrollments/${id}/commitment`}
            className="px-4 py-2 text-sm text-white bg-orange-500 hover:bg-orange-600 rounded"
          >
            簽署承諾書
          </Link>
        )}
        {['PENDING_REFLECTION', 'REFLECTION_RETURNED'].includes(enrollment.status) && (
          <Link
            href={`/employee/enrollments/${id}/reflection`}
            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded"
          >
            填寫心得
          </Link>
        )}
        {enrollment.status === 'PENDING_QUIZ' && (
          <Link
            href={`/employee/enrollments/${id}/quiz`}
            className="px-4 py-2 text-sm text-white bg-purple-600 hover:bg-purple-700 rounded"
          >
            參加測驗
          </Link>
        )}
      </div>

      {/* Knowledge base resources */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-900">學習資源</h2>
        </div>
        {resources.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">尚無學習資源</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {resources.map((r) => (
              <li key={r.id} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 inline-flex px-1.5 py-0.5 text-xs rounded shrink-0 ${
                    r.type === 'LINK' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {r.type === 'LINK' ? '連結' : '說明'}
                  </span>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{r.title}</div>
                    {r.type === 'LINK' ? (
                      <a
                        href={r.content}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-500 hover:underline break-all"
                      >
                        {r.content}
                      </a>
                    ) : (
                      <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{r.content}</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
