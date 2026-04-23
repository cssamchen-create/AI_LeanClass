import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { confirmAttendanceAction } from '@/lib/completions/actions'

export default async function AttendancePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const role = (session.user as { role?: string }).role
  if (role !== 'HR') redirect('/unauthorized')

  const { id: sessionId } = await params

  const courseSession = await prisma.courseSession.findUnique({
    where: { id: sessionId },
    include: {
      course: true,
      enrollments: {
        where: { status: 'CONFIRMED' },
        include: { employee: { select: { id: true, name: true, department: true, unit: true } } },
      },
    },
  })
  if (!courseSession) redirect('/hr/enrollments')

  const confirmedEnrollments = courseSession.enrollments

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">出席確認</h1>
        <p className="text-gray-600 mt-1">
          {courseSession.course.name}・{courseSession.startDate.toLocaleDateString('zh-TW')}
        </p>
      </div>

      {confirmedEnrollments.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
          尚無已確認報名的員工
        </div>
      ) : (
        <form
          action={async (formData: FormData) => {
            'use server'
            const attendances = confirmedEnrollments.map((e) => ({
              enrollmentId: e.id,
              attended: formData.get(`attended-${e.id}`) === 'true',
            }))
            await confirmAttendanceAction(sessionId, { attendances })
            redirect('/hr/enrollments')
          }}
        >
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">員工</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">部門</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">出席</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">缺席</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {confirmedEnrollments.map((enrollment) => (
                  <tr key={enrollment.id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {enrollment.employee.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {enrollment.employee.department}・{enrollment.employee.unit}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <input
                        type="radio"
                        name={`attended-${enrollment.id}`}
                        value="true"
                        defaultChecked
                        className="h-4 w-4 text-blue-600"
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <input
                        type="radio"
                        name={`attended-${enrollment.id}`}
                        value="false"
                        className="h-4 w-4 text-red-600"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mt-4">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              確認送出
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
