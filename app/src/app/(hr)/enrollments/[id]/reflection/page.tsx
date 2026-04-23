import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { returnReflectionAction } from '@/lib/completions/actions'

export default async function HRReflectionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const role = (session.user as { role?: string }).role
  if (role !== 'HR') redirect('/unauthorized')

  const { id: enrollmentId } = await params

  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      employee: { select: { id: true, name: true, department: true } },
      session: { include: { course: { select: { name: true } } } },
      reflection: true,
    },
  })
  if (!enrollment || !enrollment.reflection) redirect('/hr/enrollments')

  const reflection = enrollment.reflection

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">心得審查</h1>
        <p className="text-gray-600 mt-1">
          {enrollment.session.course.name}・{enrollment.employee.name}
        </p>
      </div>

      <div className="bg-white rounded-lg border p-6 space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-700">心得內容</p>
          <p className="mt-2 text-sm text-gray-900 whitespace-pre-wrap">{reflection.content}</p>
          <p className="mt-2 text-xs text-gray-500">
            送出時間：{reflection.submittedAt.toLocaleString('zh-TW')}
          </p>
        </div>

        {!reflection.isLocked && (
          <div className="border-t pt-4">
            <p className="text-sm text-gray-500">此心得已被退回，等待員工重新填寫。</p>
          </div>
        )}
      </div>

      {reflection.isLocked && (
        <form
          action={async (formData: FormData) => {
            'use server'
            const returnNote = formData.get('returnNote') as string
            await returnReflectionAction(enrollmentId, { returnNote })
            redirect('/hr/enrollments')
          }}
        >
          <div className="bg-white rounded-lg border p-6 space-y-4">
            <h2 className="text-sm font-medium text-gray-900">退回心得</h2>
            <label className="block">
              <span className="text-sm text-gray-700">退回原因（必填）</span>
              <textarea
                name="returnNote"
                rows={3}
                placeholder="請說明退回原因..."
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm p-3 border"
                required
              />
            </label>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                退回心得
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
