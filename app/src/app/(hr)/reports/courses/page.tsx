import { getCourseStats } from '@/lib/reports/service'
import Link from 'next/link'

const currentYear = new Date().getFullYear()
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i)

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; page?: string }>
}) {
  const params = await searchParams
  const year = Number(params.year) || currentYear
  const page = Number(params.page) || 1
  const pageSize = 20

  const data = await getCourseStats(year, page, pageSize)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">課程完訓率分析</h1>
          <p className="text-gray-500 text-sm mt-1">各課程報名與完訓統計</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">年度：</span>
          <div className="flex gap-1">
            {yearOptions.map((y) => (
              <Link
                key={y}
                href={`/reports/courses?year=${y}`}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  y === year
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {y}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {data.courses.length === 0 ? (
        <div className="text-center py-16 text-gray-400">該年度尚無課程資料</div>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">課程名稱</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-700">報名人數</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-700">完訓人數</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-700">完訓率</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.courses.map((course) => (
                  <tr key={course.courseId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{course.courseName}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{course.totalEnrolled}</td>
                    <td className="px-4 py-3 text-right text-green-600">{course.completed}</td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-semibold ${
                          course.completionRate >= 80
                            ? 'text-green-600'
                            : course.completionRate >= 60
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}
                      >
                        {course.completionRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-24">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${Math.min(course.completionRate, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2">
              {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/reports/courses?year=${year}&page=${p}`}
                  className={`px-3 py-1 rounded text-sm ${
                    p === page
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      <div className="mt-6">
        <Link href="/reports" className="text-sm text-blue-600 hover:underline">
          ← 返回報表中心
        </Link>
      </div>
    </div>
  )
}
