import { prisma } from '@/lib/prisma'
import { approveEnrollmentByHRAction, rejectEnrollmentByHRAction, cancelConfirmedEnrollmentAction } from '@/lib/enrollments/actions'

export default async function HREnrollmentsPage() {
  const pendingEnrollments = await prisma.courseEnrollment.findMany({
    where: { status: 'PENDING_HR' },
    include: {
      employee: { select: { id: true, name: true, department: true, unit: true } },
      session: { include: { course: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: 'asc' },
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
                    <form action={approveEnrollmentByHRAction.bind(null, enrollment.id)}>
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
                  <form action={cancelConfirmedEnrollmentAction.bind(null, enrollment.id)}>
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
