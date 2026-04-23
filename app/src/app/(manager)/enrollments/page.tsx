import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { approveEnrollmentAction, rejectEnrollmentAction } from '@/lib/enrollments/actions'

export default async function ManagerEnrollmentsPage() {
  const session = await auth()
  const managerId = (session?.user as { id?: string })?.id

  if (!managerId) return <div className="p-6">請先登入</div>

  // Get subordinates
  const subordinates = await prisma.employee.findMany({
    where: { managerId, isActive: true },
    select: { id: true },
  })
  const subordinateIds = subordinates.map((s) => s.id)

  const enrollments = await prisma.courseEnrollment.findMany({
    where: { employeeId: { in: subordinateIds }, status: 'PENDING_MANAGER' },
    include: {
      employee: { select: { id: true, name: true, department: true, unit: true } },
      session: {
        include: { course: { select: { id: true, name: true } } },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">待審核申請</h1>
        <span className="text-sm text-gray-500">共 {enrollments.length} 筆</span>
      </div>

      {enrollments.length === 0 ? (
        <div className="text-center py-12 text-gray-400">目前無待審核申請</div>
      ) : (
        <div className="space-y-4">
          {enrollments.map((enrollment) => (
            <div key={enrollment.id} className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="text-base font-semibold text-gray-900">
                    {enrollment.session.course.name}
                  </div>
                  <div className="text-sm text-gray-600">
                    申請人：{enrollment.employee.name}（{enrollment.employee.department} / {enrollment.employee.unit}）
                  </div>
                  <div className="text-sm text-gray-600">
                    開課日期：{new Date(enrollment.session.startDate).toLocaleDateString('zh-TW')}
                  </div>
                  <div className="text-xs text-gray-400">
                    申請時間：{new Date(enrollment.createdAt).toLocaleString('zh-TW')}
                  </div>
                </div>

                <div className="flex gap-3 ml-6">
                  <form action={approveEnrollmentAction.bind(null, enrollment.id)}>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg"
                    >
                      核准
                    </button>
                  </form>
                  <RejectForm enrollmentId={enrollment.id} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RejectForm({ enrollmentId }: { enrollmentId: string }) {
  return (
    <form action={async (formData: FormData) => {
      'use server'
      const note = formData.get('note') as string
      await rejectEnrollmentAction(enrollmentId, note)
    }}>
      <div className="flex gap-2">
        <input
          name="note"
          type="text"
          placeholder="退回原因（必填）"
          required
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg w-48"
        />
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg"
        >
          退回
        </button>
      </div>
    </form>
  )
}
