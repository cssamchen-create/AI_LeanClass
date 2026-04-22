import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCourseById } from '@/lib/courses/service'

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let course
  try {
    course = await getCourseById(id)
  } catch {
    notFound()
  }

  const statusLabel: Record<string, string> = {
    DRAFT: '草稿', ACTIVE: '上架', INACTIVE: '下架',
  }
  const sessionStatusLabel: Record<string, string> = {
    OPEN: '開放報名', CANCELLED: '已取消',
  }

  return (
    <div className="max-w-4xl">
      <div className="flex justify-between items-start mb-6">
        <div>
          <Link href="/courses" className="text-sm text-blue-600 hover:underline">← 返回課程列表</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">{course.name}</h1>
        </div>
        <Link href={`/courses/${id}/edit`} className="bg-white border text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
          編輯
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">課程資訊</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">類別</dt><dd>{course.category.name}</dd></div>
            <div className="flex justify-between">
              <dt className="text-gray-500">計量</dt>
              <dd>{course.measurementValue} {course.measurementUnit === 'HOURS' ? '小時' : '學分'}</dd>
            </div>
            <div className="flex justify-between"><dt className="text-gray-500">心得必填</dt><dd>{course.requiresReflection ? '是' : '否'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">集團內課程</dt><dd>{course.isGroupCourse ? '是' : '否'}</dd></div>
            <div className="flex justify-between">
              <dt className="text-gray-500">狀態</dt>
              <dd><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">{statusLabel[course.status]}</span></dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="font-semibold text-gray-900">梯次列表</h2>
          <Link href={`/courses/${id}/sessions/new`} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700">
            新增梯次
          </Link>
        </div>
        {course.sessions.length === 0 ? (
          <p className="text-center text-gray-500 py-8">尚無梯次</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">開課日期</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">地點</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">講師</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">名額</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">狀態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {course.sessions.map((session) => (
                <tr key={session.id}>
                  <td className="px-6 py-4 text-sm">{new Date(session.startDate).toLocaleDateString('zh-TW')}</td>
                  <td className="px-6 py-4 text-sm">{session.location}</td>
                  <td className="px-6 py-4 text-sm">{session.instructorName}</td>
                  <td className="px-6 py-4 text-sm">{session.enrolledCount} / {session.capacity}</td>
                  <td className="px-6 py-4 text-sm">{sessionStatusLabel[session.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
