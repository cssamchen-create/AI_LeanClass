import { prisma } from '@/lib/prisma'
import { approveEnrollmentByHRAction, rejectEnrollmentByHRAction, cancelConfirmedEnrollmentAction } from '@/lib/enrollments/actions'
import { closeEnrollmentAction } from '@/lib/completions/actions'

export default async function HREnrollmentsPage() {
  const pendingCloseEnrollments = await prisma.courseEnrollment.findMany({
    where: { status: 'PENDING_HR_CLOSE' },
    include: {
      employee: { select: { id: true, name: true, department: true, unit: true } },
      session: { include: { course: { select: { id: true, name: true, measurementUnit: true, measurementValue: true } } } },
    },
    orderBy: { updatedAt: 'asc' },
  })

  const quizGradingEnrollments = await prisma.courseEnrollment.findMany({
    where: { status: 'QUIZ_GRADING' },
    include: {
      employee: { select: { id: true, name: true, department: true, unit: true } },
      session: { include: { course: { select: { id: true, name: true } } } },
    },
    orderBy: { updatedAt: 'asc' },
  })

  const pendingEnrollments = await prisma.courseEnrollment.findMany({
    where: { status: 'PENDING_HR' },
    include: {
      employee: { select: { id: true, name: true, department: true, unit: true } },
      session: { include: { course: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: 'asc' },
  })

  const pendingCommitmentEnrollments = await prisma.courseEnrollment.findMany({
    where: { status: 'PENDING_COMMITMENT' },
    include: {
      employee: { select: { id: true, name: true, department: true, unit: true } },
      session: { include: { course: { select: { id: true, name: true } } } },
    },
    orderBy: { hrReviewedAt: 'asc' },
  })

  const confirmedEnrollments = await prisma.courseEnrollment.findMany({
    where: { status: 'CONFIRMED' },
    include: {
      employee: { select: { id: true, name: true, department: true, unit: true } },
      session: { include: { course: { select: { id: true, name: true } } } },
    },
    orderBy: { hrReviewedAt: 'desc' },
    take: 20,
  })

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">報名審核管理</h1>

      {/* Pending HR Close */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          待結案 <span className="ml-2 text-sm font-normal text-gray-500">({pendingCloseEnrollments.length})</span>
        </h2>
        {pendingCloseEnrollments.length === 0 ? (
          <div className="text-center py-6 text-gray-400 bg-gray-50 rounded-lg">目前無待結案申請</div>
        ) : (
          <div className="space-y-3">
            {pendingCloseEnrollments.map((enrollment) => (
              <div key={enrollment.id} className="bg-white border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-900">{enrollment.session.course.name}</div>
                    <div className="text-sm text-gray-600">
                      {enrollment.employee.name} ｜ {new Date(enrollment.session.startDate).toLocaleDateString('zh-TW')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {enrollment.session.course.measurementValue} {enrollment.session.course.measurementUnit === 'HOURS' ? '小時' : '學分'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={`/hr/enrollments/${enrollment.id}/reflection`}
                      className="px-3 py-1 text-xs text-blue-600 border border-blue-300 hover:bg-blue-50 rounded"
                    >
                      查看心得
                    </a>
                    <a
                      href={`/hr/enrollments/${enrollment.id}/quiz-grading`}
                      className="px-3 py-1 text-xs text-purple-600 border border-purple-300 hover:bg-purple-50 rounded"
                    >
                      評分測驗
                    </a>
                    <form action={async () => { await closeEnrollmentAction(enrollment.id) }}>
                      <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg">
                        結案
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quiz Grading */}
      {quizGradingEnrollments.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            測驗評分中 <span className="ml-2 text-sm font-normal text-gray-500">({quizGradingEnrollments.length})</span>
          </h2>
          <div className="space-y-3">
            {quizGradingEnrollments.map((enrollment) => (
              <div key={enrollment.id} className="bg-white border border-indigo-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-900">{enrollment.session.course.name}</div>
                    <div className="text-sm text-gray-600">
                      {enrollment.employee.name} ｜ {enrollment.employee.department} / {enrollment.employee.unit}
                    </div>
                  </div>
                  <a
                    href={`/hr/enrollments/${enrollment.id}/quiz-grading`}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                  >
                    進行評分
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pending HR Approval */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          待 HR 核准 <span className="ml-2 text-sm font-normal text-gray-500">({pendingEnrollments.length})</span>
        </h2>
        {pendingEnrollments.length === 0 ? (
          <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg">目前無待核准申請</div>
        ) : (
          <div className="space-y-4">
            {pendingEnrollments.map((enrollment) => (
              <div key={enrollment.id} className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="text-base font-semibold text-gray-900">{enrollment.session.course.name}</div>
                    <div className="text-sm text-gray-600">
                      申請人：{enrollment.employee.name}（{enrollment.employee.department} / {enrollment.employee.unit}）
                    </div>
                    <div className="text-sm text-gray-600">
                      開課日期：{new Date(enrollment.session.startDate).toLocaleDateString('zh-TW')}
                    </div>
                  </div>
                  <div className="flex gap-3 ml-6">
                    <form action={async () => { await approveEnrollmentByHRAction(enrollment.id) }}>
                      <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg">
                        核准
                      </button>
                    </form>
                    <HRRejectForm enrollmentId={enrollment.id} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Pending Commitment */}
      {pendingCommitmentEnrollments.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            待簽署承諾書 <span className="ml-2 text-sm font-normal text-gray-500">({pendingCommitmentEnrollments.length})</span>
          </h2>
          <div className="space-y-3">
            {pendingCommitmentEnrollments.map((enrollment) => (
              <div key={enrollment.id} className="bg-white border border-orange-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-900">{enrollment.session.course.name}</div>
                    <div className="text-sm text-gray-600">
                      {enrollment.employee.name} ｜ {new Date(enrollment.session.startDate).toLocaleDateString('zh-TW')}
                    </div>
                  </div>
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                    待簽署承諾書
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Confirmed enrollments (for cancel management) */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">已確認報名（最近 20 筆）</h2>
        <div className="space-y-3">
          {confirmedEnrollments.map((enrollment) => (
            <div key={enrollment.id} className="bg-white border border-gray-100 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-gray-900">{enrollment.session.course.name}</div>
                  <div className="text-sm text-gray-600">
                    {enrollment.employee.name} ｜ {new Date(enrollment.session.startDate).toLocaleDateString('zh-TW')}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">已確認</span>
                  <form action={async () => { await cancelConfirmedEnrollmentAction(enrollment.id) }}>
                    <button type="submit" className="px-3 py-1 text-xs text-red-600 border border-red-300 hover:bg-red-50 rounded">
                      取消報名
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function HRRejectForm({ enrollmentId }: { enrollmentId: string }) {
  return (
    <form action={async (formData: FormData) => {
      'use server'
      const note = formData.get('note') as string
      await rejectEnrollmentByHRAction(enrollmentId, note)
    }}>
      <div className="flex gap-2">
        <input
          name="note"
          type="text"
          placeholder="退回原因（必填）"
          required
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg w-48"
        />
        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg">
          退回
        </button>
      </div>
    </form>
  )
}
