import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { submitReflectionAction } from '@/lib/completions/actions'

export default async function ReflectionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { id: enrollmentId } = await params

  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      session: { include: { course: true } },
      reflection: true,
    },
  })
  if (!enrollment || enrollment.employeeId !== session.user.id) redirect('/employee/enrollments')

  if (
    enrollment.status !== 'PENDING_REFLECTION' &&
    enrollment.status !== 'REFLECTION_RETURNED'
  ) {
    redirect('/employee/enrollments')
  }

  const reflection = enrollment.reflection

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">課程心得填寫</h1>
        <p className="text-gray-600 mt-1">{enrollment.session.course.name}</p>
      </div>

      {reflection?.returnNote && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm font-medium text-yellow-800">HR 退回原因：</p>
          <p className="text-sm text-yellow-700 mt-1">{reflection.returnNote}</p>
        </div>
      )}

      <form
        action={async (formData: FormData) => {
          'use server'
          const content = formData.get('content') as string
          await submitReflectionAction(enrollmentId, { content })
          redirect('/employee/enrollments')
        }}
      >
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">心得內容</span>
            <textarea
              name="content"
              rows={10}
              defaultValue={reflection?.content ?? ''}
              placeholder="請填寫本次課程的學習心得..."
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-3 border"
              required
            />
          </label>

          <div className="flex justify-end gap-3">
            <a
              href="/employee/enrollments"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              返回
            </a>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              送出心得
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
