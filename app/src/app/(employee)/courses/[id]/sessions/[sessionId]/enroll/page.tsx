import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { createEnrollmentAction } from '@/lib/enrollments/actions'

interface PageProps {
  params: Promise<{ id: string; sessionId: string }>
}

export default async function EnrollPage({ params }: PageProps) {
  const { id: courseId, sessionId } = await params

  const session = await prisma.courseSession.findUnique({
    where: { id: sessionId },
    include: { course: { include: { category: true } } },
  })

  if (!session || session.course.id !== courseId || session.status !== 'OPEN') {
    notFound()
  }

  const available = session.capacity - session.enrolledCount

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {available > 0 ? '確認報名' : '加入等待名單'}
      </h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{session.course.name}</h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">課程類別</dt>
            <dd className="text-gray-900">{session.course.category.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">開課日期</dt>
            <dd className="text-gray-900">{new Date(session.startDate).toLocaleDateString('zh-TW')}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">地點</dt>
            <dd className="text-gray-900">{session.location}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">講師</dt>
            <dd className="text-gray-900">{session.instructorName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">名額狀況</dt>
            <dd className={available > 0 ? 'text-green-600' : 'text-red-600'}>
              {session.enrolledCount}/{session.capacity}
              {available > 0 ? `（剩餘 ${available} 名）` : '（名額已滿）'}
            </dd>
          </div>
        </dl>
      </div>

      {available === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-sm text-yellow-800">
          名額已滿。送出後將加入等待名單，有名額釋出時系統會 Email 通知您。
        </div>
      )}

      <form action={async (formData) => { await createEnrollmentAction(formData) }}>
        <input type="hidden" name="sessionId" value={sessionId} />
        <div className="flex gap-4">
          <button
            type="submit"
            className="flex-1 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            {available > 0 ? '確認送出申請' : '加入等待名單'}
          </button>
          <a
            href="/employee/courses"
            className="flex-1 py-3 text-sm font-medium text-center text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            返回課程列表
          </a>
        </div>
      </form>
    </div>
  )
}
