import Link from 'next/link'
import { getCourses } from '@/lib/courses/service'

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ categoryId?: string; status?: string; page?: string }>
}) {
  const params = await searchParams
  const result = await getCourses({
    categoryId: params.categoryId,
    status: params.status as never,
    page: Number(params.page ?? 1),
    pageSize: 20,
  })

  const statusLabel: Record<string, string> = {
    DRAFT: '草稿',
    ACTIVE: '上架',
    INACTIVE: '下架',
  }

  const statusColor: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    ACTIVE: 'bg-green-100 text-green-700',
    INACTIVE: 'bg-red-100 text-red-700',
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">課程管理</h1>
        <Link
          href="/courses/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          建立課程
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">課程名稱</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">類別</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">計量</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">狀態</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">梯次數</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {result.data.map((course) => (
              <tr key={course.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{course.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{course.category.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {course.measurementValue} {course.measurementUnit === 'HOURS' ? '小時' : '學分'}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${statusColor[course.status]}`}>
                    {statusLabel[course.status]}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {(course._count as { sessions: number })?.sessions ?? 0}
                </td>
                <td className="px-6 py-4 text-right">
                  <Link href={`/courses/${course.id}`} className="text-blue-600 hover:text-blue-800 text-sm">
                    查看
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {result.data.length === 0 && (
          <p className="text-center text-gray-500 py-12">尚無課程，請先建立課程</p>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-500">
        共 {result.total} 筆
      </div>
    </div>
  )
}
